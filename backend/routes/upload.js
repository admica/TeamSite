/**
 * File Upload API Routes
 * Handle image uploads for players
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { requireAuth } = require('../auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const playerId = req.body.playerId || 'unknown';
        const uploadDir = path.join(__dirname, '..', 'uploads', 'images', playerId);
        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: uuid.extension (timestamp included)
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `${timestamp}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Check file type
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
        }
    }
});

// Upload single image
router.post('/image', requireAuth, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: true,
                message: 'No image file provided',
                code: 'NO_FILE'
            });
        }
        
        const playerId = req.body.playerId || 'unknown';
        // Return the file path relative to the uploads directory
        const filePath = `/uploads/images/${playerId}/${req.file.filename}`;
        
        res.json({
            success: true,
            data: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                path: filePath,
                size: req.file.size,
                mimetype: req.file.mimetype
            }
        });
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message,
            code: 'UPLOAD_ERROR'
        });
    }
});

// Error handling for multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: true,
                message: 'File too large. Maximum size is 2MB.',
                code: 'FILE_TOO_LARGE'
            });
        }
    }
    
    res.status(400).json({
        error: true,
        message: error.message,
        code: 'UPLOAD_ERROR'
    });
});

module.exports = router;
