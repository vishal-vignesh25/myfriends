const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

let images = [];

// Upload Image
app.post("/upload", upload.array("images"), async (req, res) => {
  try {
    const uploadedImages = await Promise.all(req.files.map(async (file) => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream({ resource_type: "image" }, (error, result) => {
          if (error) reject(error);
          images.push(result.secure_url);
          resolve(result.secure_url);
        });
        uploadStream.end(file.buffer);
      });
    }));
    res.json({ success: true, images: uploadedImages });
  } catch (error) {
    res.status(500).json({ success: false, message: "Upload failed", error });
  }
});

// Get Images
app.get("/images", (req, res) => {
  res.json(images);
});

// Delete Image
app.delete("/delete", async (req, res) => {
  const { filename } = req.body;
  try {
    await cloudinary.uploader.destroy(filename);
    images = images.filter(img => !img.includes(filename));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Delete failed", error });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
