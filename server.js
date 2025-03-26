const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// Define Image Schema
const imageSchema = new mongoose.Schema({
    url: String, // Store Cloudinary image URL
});
const Image = mongoose.model("Image", imageSchema);

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Upload Image & Save to MongoDB
app.post("/upload", upload.array("images"), async (req, res) => {
    try {
        let uploadedImages = [];
        for (const file of req.files) {
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream({ resource_type: "image" }, (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                });
                uploadStream.end(file.buffer);
            });
            const newImage = new Image({ url: result.secure_url });
            await newImage.save(); // Save to MongoDB
            uploadedImages.push(result.secure_url);
        }
        res.json({ success: true, images: uploadedImages });
    } catch (error) {
        res.status(500).json({ success: false, message: "Upload failed", error });
    }
});

// Retrieve Images from MongoDB
app.get("/images", async (req, res) => {
    const images = await Image.find();
    res.json(images.map(img => img.url));
});

// Delete Image
app.delete("/delete", async (req, res) => {
    const { filename } = req.body;
    if (!filename) {
        return res.status(400).json({ success: false, message: "Filename required" });
    }
    try {
        const publicId = filename.split("/").pop().split(".")[0]; // Extract Cloudinary public ID
        await cloudinary.uploader.destroy(publicId);
        await Image.findOneAndDelete({ url: { $regex: filename } }); // Remove from MongoDB
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: "Delete failed", error });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
