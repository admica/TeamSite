/**
 * Teams API Routes
 * CRUD operations for teams
 */

const express = require('express');
const router = express.Router();

// Get all teams
router.get('/', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const teams = await db.all(`
            SELECT t.*, COUNT(p.id) as player_count
            FROM teams t
            LEFT JOIN players p ON t.id = p.team_id
            GROUP BY t.id
            ORDER BY t.name
        `);
        
        res.json({
            success: true,
            data: teams
        });
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message,
            code: 'TEAMS_FETCH_ERROR'
        });
    }
});

// Get team by ID
router.get('/:id', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const team = await db.get(`
            SELECT t.*, COUNT(p.id) as player_count
            FROM teams t
            LEFT JOIN players p ON t.id = p.team_id
            WHERE t.id = ?
            GROUP BY t.id
        `, [req.params.id]);
        
        if (!team) {
            return res.status(404).json({
                error: true,
                message: 'Team not found',
                code: 'TEAM_NOT_FOUND'
            });
        }
        
        res.json({
            success: true,
            data: team
        });
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message,
            code: 'TEAM_FETCH_ERROR'
        });
    }
});

// Create new team
router.post('/', async (req, res) => {
    try {
        const { name, color, description } = req.body;
        
        // Validate required fields
        if (!name) {
            return res.status(400).json({
                error: true,
                message: 'Team name is required',
                code: 'VALIDATION_ERROR'
            });
        }
        
        // Check for duplicate name
        const db = req.app.locals.db;
        const existingTeam = await db.get('SELECT id FROM teams WHERE name = ?', [name]);
        if (existingTeam) {
            return res.status(400).json({
                error: true,
                message: 'Team name already exists',
                code: 'DUPLICATE_NAME'
            });
        }
        
        // Generate ID
        const id = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Insert team
        await db.run(`
            INSERT INTO teams (id, name, color, description)
            VALUES (?, ?, ?, ?)
        `, [id, name, color || '#3b82f6', description || null]);
        
        // Get the created team
        const newTeam = await db.get(`
            SELECT t.*, COUNT(p.id) as player_count
            FROM teams t
            LEFT JOIN players p ON t.id = p.team_id
            WHERE t.id = ?
            GROUP BY t.id
        `, [id]);
        
        res.status(201).json({
            success: true,
            data: newTeam
        });
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message,
            code: 'TEAM_CREATE_ERROR'
        });
    }
});

// Update team
router.put('/:id', async (req, res) => {
    try {
        const { name, color, description } = req.body;
        
        const db = req.app.locals.db;
        
        // Check if team exists
        const existingTeam = await db.get('SELECT * FROM teams WHERE id = ?', [req.params.id]);
        if (!existingTeam) {
            return res.status(404).json({
                error: true,
                message: 'Team not found',
                code: 'TEAM_NOT_FOUND'
            });
        }
        
        // Check for duplicate name if name is being changed
        if (name && name !== existingTeam.name) {
            const duplicateTeam = await db.get(
                'SELECT id FROM teams WHERE name = ? AND id != ?',
                [name, req.params.id]
            );
            if (duplicateTeam) {
                return res.status(400).json({
                    error: true,
                    message: 'Team name already exists',
                    code: 'DUPLICATE_NAME'
                });
            }
        }
        
        // Update team
        await db.run(`
            UPDATE teams SET
                name = COALESCE(?, name),
                color = COALESCE(?, color),
                description = COALESCE(?, description),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [name, color, description, req.params.id]);
        
        // Get updated team
        const updatedTeam = await db.get(`
            SELECT t.*, COUNT(p.id) as player_count
            FROM teams t
            LEFT JOIN players p ON t.id = p.team_id
            WHERE t.id = ?
            GROUP BY t.id
        `, [req.params.id]);
        
        res.json({
            success: true,
            data: updatedTeam
        });
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message,
            code: 'TEAM_UPDATE_ERROR'
        });
    }
});

// Delete team
router.delete('/:id', async (req, res) => {
    try {
        const db = req.app.locals.db;
        
        // Check if team exists
        const team = await db.get('SELECT * FROM teams WHERE id = ?', [req.params.id]);
        if (!team) {
            return res.status(404).json({
                error: true,
                message: 'Team not found',
                code: 'TEAM_NOT_FOUND'
            });
        }
        
        // Check if team has players
        const playerCount = await db.get(
            'SELECT COUNT(*) as count FROM players WHERE team_id = ?',
            [req.params.id]
        );
        
        if (playerCount.count > 0) {
            return res.status(400).json({
                error: true,
                message: `Cannot delete team with ${playerCount.count} players. Move or delete players first.`,
                code: 'TEAM_HAS_PLAYERS'
            });
        }
        
        // Delete team
        await db.run('DELETE FROM teams WHERE id = ?', [req.params.id]);
        
        res.json({
            success: true,
            message: 'Team deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message,
            code: 'TEAM_DELETE_ERROR'
        });
    }
});

module.exports = router;
