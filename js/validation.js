/**
 * Validation Utilities for TeamSite
 * Centralized validation functions for all data types
 */

class ValidationUtils {
    /**
     * Validate player data
     */
    static validatePlayer(player, existingPlayers = []) {
        const errors = [];
        const warnings = [];

        // Required fields
        if (!player.name || player.name.trim().length === 0) {
            errors.push('Player name is required');
        } else if (player.name.trim().length < 2) {
            errors.push('Player name must be at least 2 characters');
        } else if (player.name.trim().length > 50) {
            errors.push('Player name must be less than 50 characters');
        }

        if (!player.number) {
            errors.push('Player number is required');
        } else if (!Number.isInteger(player.number) || player.number < 1 || player.number > 99) {
            errors.push('Player number must be between 1 and 99');
        }

        if (!player.teamId) {
            errors.push('Team selection is required');
        }

        if (!player.position || player.position.trim().length === 0) {
            errors.push('Player position is required');
        } else if (player.position.trim().length > 100) {
            errors.push('Player position must be 100 characters or less');
        }

        // Check for duplicate numbers
        const duplicateNumber = existingPlayers.find(p => 
            p.number === player.number && p.id !== player.id
        );
        if (duplicateNumber) {
            errors.push(`Player number ${player.number} is already taken by ${duplicateNumber.name}`);
        }

        // Image validation
        if (player.image) {
            if (!this.isValidImageUrl(player.image)) {
                warnings.push('Image URL may not be valid');
            }
        }

        // Stats validation
        if (player.stats) {
            const statsErrors = this.validateStats(player.stats);
            errors.push(...statsErrors);
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate team data
     */
    static validateTeam(team, existingTeams = []) {
        const errors = [];
        const warnings = [];

        if (!team.name || team.name.trim().length === 0) {
            errors.push('Team name is required');
        } else if (team.name.trim().length < 2) {
            errors.push('Team name must be at least 2 characters');
        } else if (team.name.trim().length > 30) {
            errors.push('Team name must be less than 30 characters');
        }

        // Check for duplicate names
        const duplicateName = existingTeams.find(t => 
            t.name.toLowerCase() === team.name.toLowerCase() && t.id !== team.id
        );
        if (duplicateName) {
            errors.push(`Team name "${team.name}" already exists`);
        }

        // Color validation
        if (team.color && !this.isValidColor(team.color)) {
            errors.push('Team color must be a valid hex color');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate site configuration
     */
    static validateSiteConfig(config) {
        const errors = [];
        const warnings = [];

        if (!config.title || config.title.trim().length === 0) {
            errors.push('Site title is required');
        }

        if (config.theme) {
            const themeErrors = this.validateTheme(config.theme);
            errors.push(...themeErrors);
        }

        if (config.season) {
            const seasonErrors = this.validateSeason(config.season);
            errors.push(...seasonErrors);
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate theme configuration
     */
    static validateTheme(theme) {
        const errors = [];
        const requiredColors = ['primary', 'secondary', 'accent'];

        requiredColors.forEach(color => {
            if (!theme[color]) {
                errors.push(`${color} color is required`);
            } else if (!this.isValidColor(theme[color])) {
                errors.push(`${color} color must be a valid hex color`);
            }
        });

        return errors;
    }

    /**
     * Validate season configuration
     */
    static validateSeason(season) {
        const errors = [];

        if (!season.year || !Number.isInteger(season.year) || season.year < 2020) {
            errors.push('Season year must be 2020 or later');
        }

        if (season.startDate && !this.isValidDate(season.startDate)) {
            errors.push('Start date must be a valid date');
        }

        if (season.endDate && !this.isValidDate(season.endDate)) {
            errors.push('End date must be a valid date');
        }

        if (season.startDate && season.endDate) {
            const start = new Date(season.startDate);
            const end = new Date(season.endDate);
            if (start >= end) {
                errors.push('End date must be after start date');
            }
        }

        return errors;
    }

    /**
     * Validate player statistics
     */
    static validateStats(stats) {
        const errors = [];

        if (stats.battingAverage !== undefined) {
            if (stats.battingAverage < 0 || stats.battingAverage > 1) {
                errors.push('Batting average must be between 0 and 1');
            }
        }

        if (stats.homeRuns !== undefined) {
            if (!Number.isInteger(stats.homeRuns) || stats.homeRuns < 0) {
                errors.push('Home runs must be a non-negative integer');
            }
        }

        if (stats.rbi !== undefined) {
            if (!Number.isInteger(stats.rbi) || stats.rbi < 0) {
                errors.push('RBI must be a non-negative integer');
            }
        }

        if (stats.gamesPlayed !== undefined) {
            if (!Number.isInteger(stats.gamesPlayed) || stats.gamesPlayed < 0) {
                errors.push('Games played must be a non-negative integer');
            }
        }

        return errors;
    }

    /**
     * Validate image URL
     */
    static isValidImageUrl(url) {
        try {
            const urlObj = new URL(url);
            const validProtocols = ['http:', 'https:'];
            const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
            
            if (!validProtocols.includes(urlObj.protocol)) {
                return false;
            }

            const pathname = urlObj.pathname.toLowerCase();
            return validExtensions.some(ext => pathname.endsWith(ext));
        } catch {
            return false;
        }
    }

    /**
     * Validate color hex code
     */
    static isValidColor(color) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
    }

    /**
     * Validate date string
     */
    static isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    /**
     * Sanitize string input
     */
    static sanitizeString(str, maxLength = 100) {
        if (typeof str !== 'string') return '';
        return str.trim().substring(0, maxLength);
    }

    /**
     * Sanitize number input
     */
    static sanitizeNumber(num, min = 0, max = 999) {
        const parsed = parseInt(num, 10);
        if (isNaN(parsed)) return min;
        return Math.max(min, Math.min(max, parsed));
    }

    /**
     * Validate file upload
     */
    static validateFileUpload(file, options = {}) {
        const {
            maxSize = 5 * 1024 * 1024, // 5MB default
            allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            maxWidth = 2048,
            maxHeight = 2048
        } = options;

        const errors = [];

        if (!file) {
            errors.push('No file selected');
            return { valid: false, errors };
        }

        if (file.size > maxSize) {
            errors.push(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
        }

        if (!allowedTypes.includes(file.type)) {
            errors.push(`File type must be one of: ${allowedTypes.join(', ')}`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Format validation errors for display
     */
    static formatErrors(errors) {
        if (errors.length === 0) return '';
        return errors.map(error => `• ${error}`).join('\n');
    }

    /**
     * Format warnings for display
     */
    static formatWarnings(warnings) {
        if (warnings.length === 0) return '';
        return warnings.map(warning => `⚠ ${warning}`).join('\n');
    }
}

// Make available globally
window.ValidationUtils = ValidationUtils;
