import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary Storage for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "uploads", // Optional folder to store files in Cloudinary
    allowed_formats: ["jpg", "png", "pdf"], // Restrict file formats

    public_id: (req, file) => `${Date.now()}_${file.originalname}`, // Use original file name as public_id
  },
});

// Configure Multer to use Cloudinary storage
export const upload = multer({ storage: storage });
