
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const axios = require("axios");
require("dotenv").config();

const { upload, cloudinary } = require("./cloudinary");

const app = express();
const PORT = process.env.PORT || 8080;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Middleware
app.use(cors());
app.use(express.json());

// Multer setup to save uploaded file to disk temporarily
const tempDir = path.join(__dirname, "temp");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const storage = multer.diskStorage({
  destination: tempDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const localUpload = multer({ storage });

app.post("/dub", localUpload.single("file"), async (req, res) => {
  const uploadedPath = req.file.path;

  try {
    const sourceLang = req.body.fromLang;
    const targetLang = req.body.toLang;

    // Step 1: Send to ElevenLabs
    const form = new FormData();
    form.append("file", fs.createReadStream(uploadedPath));
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
    if (!dubbing_id) throw new Error("Failed to start dubbing");

    const pollUrl = `https://api.elevenlabs.io/v1/dubbing/${dubbing_id}`;
    let status = "queued";

    // Step 2: Poll until dubbing complete
    while (status !== "dubbed") {
      await new Promise((r) => setTimeout(r, 3000));
      const pollRes = await axios.get(pollUrl, {
        headers: { "xi-api-key": ELEVENLABS_API_KEY },
      });
      status = pollRes.data.status;

      if (status === "failed") {
        throw new Error("Dubbing failed at ElevenLabs");
      }
    }

    // Step 3: Get dubbed stream
    const audioUrl = `https://api.elevenlabs.io/v1/dubbing/${dubbing_id}/audio/${targetLang}`;
    const dubbedRes = await axios.get(audioUrl, {
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
      responseType: "stream",
    });

    // Step 4: Upload dubbed video to Cloudinary
    const cloudRes = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "neurodub/dubs",
          resource_type: "video",
          format: "mp4",
          public_id: `dubbed-${Date.now()}-${req.file.originalname}`,
        },
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );
      dubbedRes.data.pipe(uploadStream);
    });

    // Step 5: Cleanup local temp file
    fs.unlink(uploadedPath, () => {});

    // Step 6: Schedule auto-delete from Cloudinary after 2 hours
    setTimeout(() => {
      cloudinary.uploader.destroy(cloudRes.public_id, {
        resource_type: "video",
      }).then(() => {
        console.log("Dubbed video auto-deleted:", cloudRes.public_id);
      }).catch((err) => {
        console.error("Auto-delete failed:", err.message);
      });
    }, 2 * 60 * 60 * 1000); // 2 hours

    // Step 7: Return dubbed video URL
    res.json({
      success: true,
      dubbedUrl: cloudRes.secure_url,
    });

  } catch (err) {
    console.error("Dubbing failed:", err.message);
    fs.unlink(uploadedPath, () => {});
    res.status(500).json({ success: false, error: "Dubbing failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at port - ${PORT}`);
});
