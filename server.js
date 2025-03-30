require('dotenv').config();

const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

const app = express();
const PORT = process.env.PORT || 5000;

const MONGO_URI ="mongodb+srv://pokemongo123vishal:S5mk5iWeVA5y4R0w@cluster0.xumptes.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

// Ensure the URI is not undefined
if (!MONGO_URI) {
    console.error("❌ ERROR: MONGO_URI is undefined!");
    process.exit(1);
  }
  
  console.log("🔍 Trying to connect to MongoDB...");
  
  mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
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
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ Multer Storage Setup
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ✅ Upload Image & Store in MongoDB
app.post("/upload", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "No image uploaded" });

        // Upload to Cloudinary
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream({ resource_type: "image" }, (error, result) => {
                if (error) reject(error);
                else resolve(result);
            });
            uploadStream.end(req.file.buffer);
        });

        // Save image link to MongoDB
        const newImage = new Image({ url: result.secure_url });
        await newImage.save();

        res.json({ success: true, imageUrl: result.secure_url });
    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ success: false, message: "Upload failed", error });
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

// ✅ Start the Server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
