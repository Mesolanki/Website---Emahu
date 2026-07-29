const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads folder exists in parent backend directory
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer memory storage engine for universal compatibility (VPS + Vercel Serverless)
const storage = multer.memoryStorage();

// File validation filter
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf' || file.mimetype === 'application/x-pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only image files and PDF documents are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB file limit
  }
});

module.exports = upload;
