const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

router.get("/:filename", async (req, res) => {
  const { filename } = req.params;
  const videoPath = path.resolve(__dirname, "../dubs", filename);

  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({ error: "Video not found" });
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    // Parse range
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    // Chunk size
    const chunkSize = end - start + 1;
    const file = fs.createReadStream(videoPath, { start, end });

    const headers = {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "video/mp4",
    };

    res.writeHead(206, headers);
    file.pipe(res);

  } else {
    // Send entire file (not recommended for large videos)
    const headers = {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
    };
    res.writeHead(200, headers);
    fs.createReadStream(videoPath).pipe(res);
  }
});

module.exports = router;
