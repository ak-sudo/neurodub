const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const FormData = require("form-data");
const axios = require("axios");
const path = require("path");
require("dotenv").config({ override: true });
const videoRoute = require("./routes/video");

const app = express();
const PORT = process.env.PORT || 4000;

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const uploadsDir = path.join(__dirname, "uploads");
const dubsDir = path.join(__dirname, "dubs");

// Ensure necessary directories exist
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(dubsDir)) fs.mkdirSync(dubsDir);

// Middleware
app.use(cors({
  origin: "*", // For testing. Restrict to your frontend domain in prod
}));
app.use(express.json());
app.use("/dubs", express.static(dubsDir));

// Video route
app.use("/stream", videoRoute);

const upload = multer({ dest: uploadsDir });

app.post("/dub", upload.single("file"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const fileStream = fs.createReadStream(filePath);
    const targetLang = req.body.toLang;
    const sourceLang = req.body.fromLang;

    // Step 1: Submit dubbing request
    const form = new FormData();
    form.append("file", fileStream, {
      filename: req.file.originalname,
      contentType: req.file.mimetype || "video/mp4",
    });
    form.append("source_lang", sourceLang);
    form.append("target_lang", targetLang);
    form.append("watermark", JSON.stringify(true));

    const startRes = await axios.post(
      "https://api.elevenlabs.io/v1/dubbing",
      form,
      {
        headers: {
          ...form.getHeaders(),
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    );

    const { dubbing_id } = startRes.data;
    const pollUrl = `https://api.elevenlabs.io/v1/dubbing/${dubbing_id}`;

    // Step 2: Poll until dubbing is ready
    let status = "queued";
    while (status !== "dubbed") {
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait 3s
      const pollRes = await axios.get(pollUrl, {
        headers: { "xi-api-key": ELEVENLABS_API_KEY },
      });
      status = pollRes.data.status;

      if (status === "failed") {
        throw new Error("Dubbing failed during processing.");
      }
    }

    // Step 3: Download final dubbed video
    const audioUrl = `https://api.elevenlabs.io/v1/dubbing/${dubbing_id}/audio/${targetLang}`;
    const videoRes = await axios.get(audioUrl, {
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
      responseType: "arraybuffer",
    });

    const outputFilename = `dubbed-${Date.now()}.mp4`;
    const outputPath = path.join(dubsDir, outputFilename);
    fs.writeFileSync(outputPath, videoRes.data);

    // Schedule deletion in 2 minutes (120,000 ms)
    setTimeout(() => {
      fs.unlink(outputPath, (err) => {
        if (err) {
          console.error(`Failed to delete ${outputPath}:`, err);
        } else {
          console.log(`Deleted ${outputPath}`);
        }
      });
    }, 2 * 60 * 1000); // 2 minutes

    // Cleanup
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      dubbedFile: `/dubs/${outputFilename}`,
    });
  } catch (err) {
    console.error("Dubbing failed:", err.message || err);
    res.status(500).json({ success: false, error: "Dubbing failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
