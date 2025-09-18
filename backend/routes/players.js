/**
 * Players API Routes
 * CRUD operations for players
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth');

// Get all players
router.get('/', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const rows = await db.all(`
            SELECT p.*, t.name as team_name, t.color as team_color
            FROM players p
            LEFT JOIN teams t ON p.team_id = t.id
            ORDER BY p.name
        `);
        // Map DB shape -> API shape
        const players = rows.map(r => ({
            id: r.id,
            name: r.name,
            number: r.number,
            teamId: r.team_id,
            position: r.position,
            image: r.image_path,
            bio: r.bio,
            battingAverage: r.batting_average,
            homeRuns: r.home_runs,
            rbi: r.rbi,
            gamesPlayed: r.games_played,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            team_name: r.team_name,
            team_color: r.team_color
        }));

        res.json({ success: true, data: players });
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message,
            code: 'PLAYERS_FETCH_ERROR'
        });
    }
});

// Get player by ID
router.get('/:id', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const r = await db.get(`
            SELECT p.*, t.name as team_name, t.color as team_color
            FROM players p
            LEFT JOIN teams t ON p.team_id = t.id
            WHERE p.id = ?
        `, [req.params.id]);
        
        if (!r) {
            return res.status(404).json({
                error: true,
                message: 'Player not found',
                code: 'PLAYER_NOT_FOUND'
            });
        }
        const player = {
            id: r.id,
            name: r.name,
            number: r.number,
            teamId: r.team_id,
            position: r.position,
            image: r.image_path,
            bio: r.bio,
            battingAverage: r.batting_average,
            homeRuns: r.home_runs,
            rbi: r.rbi,
            gamesPlayed: r.games_played,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            team_name: r.team_name,
            team_color: r.team_color
        };

        res.json({ success: true, data: player });
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message,
            code: 'PLAYER_FETCH_ERROR'
        });
    }
});

// Create new player
// Protected by requireAuth defined in server
router.post('/', requireAuth, async (req, res) => {
    try {
        const { name, number, teamId, position, image, bio, stats } = req.body;
        
        // Validate required fields
        if (!name || !number || !teamId || !position) {
            return res.status(400).json({
                error: true,
                message: 'Missing required fields: name, number, teamId, position',
                code: 'VALIDATION_ERROR'
            });
        }
        
        // Check if team exists
        const db = req.app.locals.db;
        const team = await db.get('SELECT id FROM teams WHERE id = ?', [teamId]);
        if (!team) {
            return res.status(400).json({
                error: true,
                message: 'Team not found',
                code: 'TEAM_NOT_FOUND'
            });
        }
        
        // Check for duplicate number in team
        const existingPlayer = await db.get(
            'SELECT id FROM players WHERE team_id = ? AND number = ?',
            [teamId, number]
        );
        if (existingPlayer) {
            return res.status(400).json({
                error: true,
                message: `Player number ${number} already exists in this team`,
                code: 'DUPLICATE_NUMBER'
            });
        }
        
        // Generate ID
        const id = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Insert player
        await db.run(`
            INSERT INTO players (id, name, number, team_id, position, image_path, bio, batting_average, home_runs, rbi, games_played)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id, name, number, teamId, position, image || null, bio || null,
            stats?.battingAverage || 0, stats?.homeRuns || 0, stats?.rbi || 0, stats?.gamesPlayed || 0
        ]);
        
        // Get the created player
        const r = await db.get(`
            SELECT p.*, t.name as team_name, t.color as team_color
            FROM players p
            LEFT JOIN teams t ON p.team_id = t.id
            WHERE p.id = ?
        `, [id]);
        const newPlayer = {
            id: r.id,
            name: r.name,
            number: r.number,
            teamId: r.team_id,
            position: r.position,
            image: r.image_path,
            bio: r.bio,
            battingAverage: r.batting_average,
            homeRuns: r.home_runs,
            rbi: r.rbi,
            gamesPlayed: r.games_played,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            team_name: r.team_name,
            team_color: r.team_color
        };

        res.status(201).json({ success: true, data: newPlayer });
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message,
            code: 'PLAYER_CREATE_ERROR'
        });
    }
});

// Update player
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { name, number, teamId, position, image, bio, stats } = req.body;
        
        const db = req.app.locals.db;
        
        // Check if player exists
        const existingPlayer = await db.get('SELECT * FROM players WHERE id = ?', [req.params.id]);
        if (!existingPlayer) {
            return res.status(404).json({
                error: true,
                message: 'Player not found',
                code: 'PLAYER_NOT_FOUND'
            });
        }
        
        // Check for duplicate number if number is being changed
        if (number && number !== existingPlayer.number) {
            const duplicatePlayer = await db.get(
                'SELECT id FROM players WHERE team_id = ? AND number = ? AND id != ?',
                [teamId || existingPlayer.team_id, number, req.params.id]
            );
            if (duplicatePlayer) {
                return res.status(400).json({
                    error: true,
                    message: `Player number ${number} already exists in this team`,
                    code: 'DUPLICATE_NUMBER'
                });
            }
        }
        
        // Update player
        await db.run(`
            UPDATE players SET
                name = COALESCE(?, name),
                number = COALESCE(?, number),
                team_id = COALESCE(?, team_id),
                position = COALESCE(?, position),
                image_path = COALESCE(?, image_path),
                bio = COALESCE(?, bio),
                batting_average = COALESCE(?, batting_average),
                home_runs = COALESCE(?, home_runs),
                rbi = COALESCE(?, rbi),
                games_played = COALESCE(?, games_played),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            name, number, teamId, position, image, bio,
            stats?.battingAverage, stats?.homeRuns, stats?.rbi, stats?.gamesPlayed,
            req.params.id
        ]);
        
        // Get updated player
        const r2 = await db.get(`
            SELECT p.*, t.name as team_name, t.color as team_color
            FROM players p
            LEFT JOIN teams t ON p.team_id = t.id
            WHERE p.id = ?
        `, [req.params.id]);
        const updatedPlayer = {
            id: r2.id,
            name: r2.name,
            number: r2.number,
            teamId: r2.team_id,
            position: r2.position,
            image: r2.image_path,
            bio: r2.bio,
            battingAverage: r2.batting_average,
            homeRuns: r2.home_runs,
            rbi: r2.rbi,
            gamesPlayed: r2.games_played,
            createdAt: r2.created_at,
            updatedAt: r2.updated_at,
            team_name: r2.team_name,
            team_color: r2.team_color
        };

        res.json({ success: true, data: updatedPlayer });
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message,
            code: 'PLAYER_UPDATE_ERROR'
        });
    }
});

// Delete player
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        
        // Check if player exists
        const player = await db.get('SELECT * FROM players WHERE id = ?', [req.params.id]);
        if (!player) {
            return res.status(404).json({
                error: true,
                message: 'Player not found',
                code: 'PLAYER_NOT_FOUND'
            });
        }
        
        // Delete player (and images folder best-effort)
        await db.run('DELETE FROM players WHERE id = ?', [req.params.id]);
        try {
            const path = require('path');
            const fs = require('fs');
            const dir = path.join(__dirname, '..', 'uploads', 'images', req.params.id);
            if (fs.existsSync(dir)) {
                fs.rmSync(dir, { recursive: true, force: true });
            }
        } catch (e) {
            console.warn('Failed to remove player image folder:', e.message);
        }
        
        res.json({
            success: true,
            message: 'Player deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message,
            code: 'PLAYER_DELETE_ERROR'
        });
    }
});

module.exports = router;
