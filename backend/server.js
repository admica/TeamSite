/**
 * TeamSite Backend Server
 * Express.js server with SQLite database
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { authRouter, requireAuth } = require('./auth');
const Database = require('./database');

// Import routes
const playersRoutes = require('./routes/players');
const teamsRoutes = require('./routes/teams');
const configRoutes = require('./routes/config');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const db = new Database();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased limit for image uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Auth routes
app.use('/api/auth', authRouter);

// Routes
app.use('/api/players', playersRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/config', configRoutes);
app.use('/api/upload', uploadRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: true,
        message: err.message || 'Internal server error',
        code: 'INTERNAL_ERROR'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: true,
        message: 'Endpoint not found',
        code: 'NOT_FOUND'
    });
});

// Initialize database and start server
async function startServer() {
    try {
        await db.init();
        
        // Make database available to routes
        app.locals.db = db;
        
        app.listen(PORT, () => {
            console.log(`🚀 TeamSite Backend Server running on port ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
            console.log(`📁 Upload directory: ${path.join(__dirname, 'uploads')}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    db.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down server...');
    db.close();
    process.exit(0);
});

startServer();
