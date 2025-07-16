const express = require("express");
const multer = require("multer");
const cors = require("cors");
const FormData = require("form-data");
const axios = require("axios");
require("dotenv").config();
const { cloudinary } = require("./cloudinary");

const app = express();
const PORT = process.env.PORT || 8080;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Multer setup (in-memory)
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(cors());
app.use(express.json());

app.post("/dub", upload.single("file"), async (req, res) => {
  try {
    const { toLang, fromLang } = req.body;
    const buffer = req.file.buffer;

    // Step 1: Send buffer directly to ElevenLabs
    const form = new FormData();
    form.append("file", buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype || "video/mp4",
    });
    form.append("source_lang", fromLang);
    form.append("target_lang", toLang);
    form.append("watermark", JSON.stringify(true));

    const startRes = await axios.post("https://api.elevenlabs.io/v1/dubbing", form, {
      headers: {
        ...form.getHeaders(),
        "xi-api-key": ELEVENLABS_API_KEY,
      },
    });

    if (!startRes.data?.dubbing_id) throw new Error("Dubbing initiation failed");

    const dubbingId = startRes.data.dubbing_id;

    // Step 2: Poll until dubbing is complete
    let status = "queued";
    while (status !== "dubbed") {
      await new Promise((r) => setTimeout(r, 3000));
      const poll = await axios.get(`https://api.elevenlabs.io/v1/dubbing/${dubbingId}`, {
        headers: { "xi-api-key": ELEVENLABS_API_KEY },
      });
      status = poll.data.status;
      if (status === "failed") throw new Error("Dubbing failed during processing.");
    }

    // Step 3: Fetch dubbed video/audio stream
    const dubbedStream = await axios.get(
      `https://api.elevenlabs.io/v1/dubbing/${dubbingId}/audio/${toLang}`,
      {
        headers: { "xi-api-key": ELEVENLABS_API_KEY },
        responseType: "stream",
      }
    );

    // Step 4: Upload dubbed stream to Cloudinary
    const uploaded = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "video",
          folder: "neurodub/dubs",
          format: "mp4",
          public_id: `dubbed-${Date.now()}-${req.file.originalname}`,
        },
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );
      dubbedStream.data.pipe(stream);
    });

    // Step 5: Return final URL
    res.json({ success: true, dubbedUrl: uploaded.secure_url });
  } catch (err) {
   console.error("Dubbing failed:");
  if (err.response) {
    console.error("Status:", err.response.status);
    console.error("Headers:", err.response.headers);
    console.error("Data:", err.response.data);
  } else {
    console.error(err.message);
  }
  res.status(500).json({ success: false, error: "Dubbing failed" });
}
  }
});

app.listen(PORT, () => {
  console.log(`Server running at port - ${PORT}`);
});
