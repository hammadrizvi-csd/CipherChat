const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Uploads folder automatically banao agar nahi hai
const uploadDir = path.join(__dirname, "../public/uploads");
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir, { recursive: true }); }

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'))
});

module.exports = multer({ storage: storage });