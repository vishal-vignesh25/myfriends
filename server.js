require('dotenv').config();

const streamifier = require("streamifier");
const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

const MONGO_URI ="mongodb+srv://pokemongo123vishal:S5mk5iWeVA5y4R0w@cluster0.xumptes.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

// Ensure the URI is not undefined
if (!MONGO_URI) {
    console.error("❌ ERROR: MONGO_URI is undefined!");
    process.exit(1);
  }
  
  console.log("🔍 Trying to connect to MongoDB...");
  
  mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB! 🚀"))
    .catch((err) => console.error("❌ MongoDB Connection Error:", err.message));

// ✅ Define Image Schema & Model
const imageSchema = new mongoose.Schema({
    url: String,  
    caption: String,  
    uploadedAt: { type: Date, default: Date.now },
});
const Image = mongoose.model("Image", imageSchema);

// ✅ Cloudinary Config
cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ Multer Storage Setup
const storage = multer.memoryStorage(); // Store file in memory before uploading to Cloudinary
const upload = multer({
    storage: multer.memoryStorage(),
});
  
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    console.log("REQ BODY:", req.body);
    console.log("REQ FILE:", req.file);

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Upload to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: "image" },
      async (error, cloudinaryResult) => {
        if (error) {
          console.error("❌ Cloudinary Upload Error:", error);
          return res.status(500).json({ error: `Upload to Cloudinary failed: ${error.message}` });
        }

        // Save to MongoDB
        try {
          const newImage = new Image({ imageUrl: cloudinaryResult.secure_url });
          await newImage.save();
          res.json({ message: "✅ Image uploaded & saved in MongoDB", url: cloudinaryResult.secure_url });
        } catch (mongoError) {
          console.error("❌ MongoDB Save Error:", mongoError);
          return res.status(500).json({ error: `MongoDB Save Error: ${mongoError.message}` });
        }
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  } catch (error) {
    console.error("❌ Internal Error:", error);
    res.status(500).json({ error: `Internal Error: ${error.message}` });
  }
});

// ✅ Retrieve All Images from MongoDB
app.get("/images", async (req, res) => {
    try {
        const images = await Image.find();
        res.json(images);
    } catch (error) {
        console.error("Fetch Images Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch images", error });
    }
});

// ✅ Delete Image from Cloudinary & MongoDB
app.delete("/delete", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, message: "Image URL required" });

    try {
        const publicId = url.split("/").pop().split(".")[0]; // Extract Cloudinary public ID
        await cloudinary.uploader.destroy(publicId);
        await Image.findOneAndDelete({ url });

        res.json({ success: true, message: "Image deleted successfully" });
    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ success: false, message: "Delete failed", error });
    }
});

// ✅ Root Route
app.get("/", (req, res) => {
    res.send("✅ Server is running!");
  });

// ✅ Start the Server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
