const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const FormData = require("form-data");
const axios = require("axios");
const path = require("path");
require("dotenv").config();
const videoRoute = require("./routes/video");
const { upload, cloudinary } = require("./cloudinary");

const app = express();
const PORT = process.env.PORT || 8080;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Middleware
app.use(cors());
app.use(express.json());
app.use("/stream", videoRoute);

app.post("/dub", upload.single("file"), async (req, res) => {
  try {
    const targetLang = req.body.toLang;
    const sourceLang = req.body.fromLang;
    const cloudinaryUrl = req.file.path;

    // Step 1: Download video stream from Cloudinary
    const videoResp = await axios.get(cloudinaryUrl, { responseType: "stream" });

    // Step 2: Submit dubbing request to ElevenLabs
    const form = new FormData();
    form.append("file", videoResp.data, {
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

    // Step 3: Poll until dubbed
    let status = "queued";
    while (status !== "dubbed") {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const pollRes = await axios.get(pollUrl, {
        headers: { "xi-api-key": ELEVENLABS_API_KEY },
      });
      status = pollRes.data.status;

      if (status === "failed") {
        throw new Error("Dubbing failed during processing.");
      }
    }

    // Step 4: Get dubbed video stream
    const audioUrl = `https://api.elevenlabs.io/v1/dubbing/${dubbing_id}/audio/${targetLang}`;
    const dubbedRes = await axios.get(audioUrl, {
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
      responseType: "stream",
    });

    // Step 5: Upload dubbed video to Cloudinary
    const uploaded = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "neurodub/dubs",
          resource_type: "video",
          format: "mp4",
          public_id: `dubbed-${Date.now()}-${req.file.originalname}`,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      dubbedRes.data.pipe(uploadStream);
    });

    // Step 6: Schedule deletion from Cloudinary
    setTimeout(async () => {
      try {
        await cloudinary.uploader.destroy(uploaded.public_id, {
          resource_type: "video",
        });
        console.log(`Deleted dubbed video from Cloudinary: ${uploaded.public_id}`);
      } catch (err) {
        console.error("Failed to delete dubbed video from Cloudinary:", err.message);
      }
    }, 2 * 60 * 60 * 1000); // 2 hours

    // Step 7: Respond with dubbed video URL
    res.json({
      success: true,
      dubbedUrl: uploaded.secure_url,
    });
  } catch (err) {
    console.error("Dubbing failed:", err.message || err);
    res.status(500).json({ success: false, error: "Dubbing failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at port - ${PORT}`);
});
