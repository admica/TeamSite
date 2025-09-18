/**
 * Site Configuration API Routes
 * Get and update site configuration
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth');

// Get site configuration
router.get('/', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const config = await db.get('SELECT * FROM site_config WHERE id = 1');
        
        if (!config) {
            return res.status(404).json({
                error: true,
                message: 'Site configuration not found',
                code: 'CONFIG_NOT_FOUND'
            });
        }
        
        // Format the response to match frontend expectations
        const formattedConfig = {
            title: config.title,
            description: config.description,
            theme: {
                primary: config.primary_color,
                secondary: config.secondary_color,
                accent: config.accent_color
            },
            season: {
                year: config.season_year,
                startDate: config.start_date,
                endDate: config.end_date,
                allStarWeekend: config.all_star_date
            }
        };
        
        res.json({
            success: true,
            data: formattedConfig
        });
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message,
            code: 'CONFIG_FETCH_ERROR'
        });
    }
});

// Update site configuration
router.put('/', requireAuth, async (req, res) => {
    try {
        const { title, description, theme, season } = req.body;
        
        const db = req.app.locals.db;
        
        // Check if config exists
        const existingConfig = await db.get('SELECT id FROM site_config WHERE id = 1');
        if (!existingConfig) {
            return res.status(404).json({
                error: true,
                message: 'Site configuration not found',
                code: 'CONFIG_NOT_FOUND'
            });
        }
        
        // Update configuration
        await db.run(`
            UPDATE site_config SET
                title = COALESCE(?, title),
                description = COALESCE(?, description),
                primary_color = COALESCE(?, primary_color),
                secondary_color = COALESCE(?, secondary_color),
                accent_color = COALESCE(?, accent_color),
                season_year = COALESCE(?, season_year),
                start_date = COALESCE(?, start_date),
                end_date = COALESCE(?, end_date),
                all_star_date = COALESCE(?, all_star_date),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
        `, [
            title,
            description,
            theme?.primary,
            theme?.secondary,
            theme?.accent,
            season?.year,
            season?.startDate,
            season?.endDate,
            season?.allStarWeekend
        ]);
        
        // Get updated configuration
        const updatedConfig = await db.get('SELECT * FROM site_config WHERE id = 1');
        
        // Format the response
        const formattedConfig = {
            title: updatedConfig.title,
            description: updatedConfig.description,
            theme: {
                primary: updatedConfig.primary_color,
                secondary: updatedConfig.secondary_color,
                accent: updatedConfig.accent_color
            },
            season: {
                year: updatedConfig.season_year,
                startDate: updatedConfig.start_date,
                endDate: updatedConfig.end_date,
                allStarWeekend: updatedConfig.all_star_date
            }
        };
        
        res.json({
            success: true,
            data: formattedConfig
        });
    } catch (error) {
        res.status(500).json({
            error: true,
            message: error.message,
            code: 'CONFIG_UPDATE_ERROR'
        });
    }
});

module.exports = router;
