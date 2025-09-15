/**
 * Data Manager - Core data architecture for TeamSite
 * Handles all data operations, validation, and persistence
 */

class DataManager {
    constructor() {
        this.storageKey = 'teamsite_data';
        this.version = '1.0.0';
        this.data = this.loadData();
        this.listeners = new Map();
    }

    /**
     * Initialize default data structure
     */
    getDefaultData() {
        return {
            version: this.version,
            lastUpdated: new Date().toISOString(),
            siteConfig: {
                title: "Little League Champions",
                description: "The future stars of baseball in our interactive 3D showcase",
                theme: {
                    primary: "#3b82f6",
                    secondary: "#10b981", 
                    accent: "#f59e0b",
                    background: "#f8fafc",
                    text: "#1f2937"
                },
                season: {
                    year: 2024,
                    startDate: "2024-04-06",
                    endDate: "2024-06-15",
                    allStarWeekend: "2024-05-18"
                }
            },
            teams: [
                {
                    id: "tigers",
                    name: "Tigers",
                    color: "#f59e0b",
                    logo: null,
                    description: "The mighty Tigers team"
                }
            ],
            players: [
                {
                    id: "player_1",
                    name: "Jason Miller",
                    number: 12,
                    teamId: "tigers",
                    position: "Pitcher",
                    image: "http://static.photos/sport/640x360/1",
                    stats: {
                        battingAverage: 0.285,
                        homeRuns: 3,
                        rbi: 15,
                        gamesPlayed: 12
                    },
                    bio: "Jason is our star pitcher with a powerful fastball.",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: "player_2", 
                    name: "Mike Johnson",
                    number: 7,
                    teamId: "tigers",
                    position: "Shortstop",
                    image: "http://static.photos/sport/640x360/2",
                    stats: {
                        battingAverage: 0.320,
                        homeRuns: 5,
                        rbi: 22,
                        gamesPlayed: 12
                    },
                    bio: "Mike's quick reflexes make him an excellent shortstop.",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: "player_3",
                    name: "David Wilson", 
                    number: 23,
                    teamId: "tigers",
                    position: "Outfield",
                    image: "http://static.photos/sport/640x360/3",
                    stats: {
                        battingAverage: 0.275,
                        homeRuns: 2,
                        rbi: 18,
                        gamesPlayed: 12
                    },
                    bio: "David's speed and agility make him a great outfielder.",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ],
            events: [
                {
                    id: "event_1",
                    title: "Opening Day",
                    date: "2024-04-06",
                    type: "game",
                    description: "Season opener against the Eagles"
                },
                {
                    id: "event_2", 
                    title: "Championship Game",
                    date: "2024-06-15",
                    type: "game",
                    description: "Championship finals"
                },
                {
                    id: "event_3",
                    title: "All-Star Weekend", 
                    date: "2024-05-18",
                    type: "event",
                    description: "All-Star game and skills competition"
                }
            ]
        };
    }

    /**
     * Load data from localStorage or return default
     */
    loadData() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Validate data structure
                if (this.validateDataStructure(parsed)) {
                    return parsed;
                } else {
                    console.warn('Stored data is invalid, using defaults');
                    return this.getDefaultData();
                }
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
        return this.getDefaultData();
    }

    /**
     * Save data to localStorage
     */
    saveData() {
        try {
            this.data.lastUpdated = new Date().toISOString();
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
            this.notifyListeners('dataSaved', this.data);
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            this.notifyListeners('dataSaveError', error);
            return false;
        }
    }

    /**
     * Validate data structure integrity
     */
    validateDataStructure(data) {
        const required = ['version', 'siteConfig', 'teams', 'players', 'events'];
        return required.every(key => data.hasOwnProperty(key));
    }

    /**
     * Event listener system for data changes
     */
    addListener(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    removeListener(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    notifyListeners(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in listener callback:', error);
                }
            });
        }
    }

    // ===== PLAYER OPERATIONS =====

    /**
     * Get all players
     */
    getPlayers() {
        return [...this.data.players];
    }

    /**
     * Get player by ID
     */
    getPlayer(id) {
        return this.data.players.find(player => player.id === id);
    }

    /**
     * Get players by team
     */
    getPlayersByTeam(teamId) {
        return this.data.players.filter(player => player.teamId === teamId);
    }

    /**
     * Add new player
     */
    addPlayer(playerData) {
        const validation = this.validatePlayer(playerData);
        if (!validation.valid) {
            throw new Error(`Player validation failed: ${validation.errors.join(', ')}`);
        }

        const player = {
            id: this.generateId('player'),
            ...playerData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.data.players.push(player);
        this.saveData();
        this.notifyListeners('playerAdded', player);
        return player;
    }

    /**
     * Update existing player
     */
    updatePlayer(id, updates) {
        const index = this.data.players.findIndex(player => player.id === id);
        if (index === -1) {
            throw new Error(`Player with ID ${id} not found`);
        }

        const validation = this.validatePlayer({...this.data.players[index], ...updates});
        if (!validation.valid) {
            throw new Error(`Player validation failed: ${validation.errors.join(', ')}`);
        }

        this.data.players[index] = {
            ...this.data.players[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        this.saveData();
        this.notifyListeners('playerUpdated', this.data.players[index]);
        return this.data.players[index];
    }

    /**
     * Delete player
     */
    deletePlayer(id) {
        const index = this.data.players.findIndex(player => player.id === id);
        if (index === -1) {
            throw new Error(`Player with ID ${id} not found`);
        }

        const player = this.data.players[index];
        this.data.players.splice(index, 1);
        this.saveData();
        this.notifyListeners('playerDeleted', player);
        return player;
    }

    /**
     * Validate player data
     */
    validatePlayer(player, existingPlayers = null) {
        const errors = [];
        
        if (!player.name || player.name.trim().length === 0) {
            errors.push('Name is required');
        }
        
        if (!player.number || player.number < 1 || player.number > 99) {
            errors.push('Number must be between 1 and 99');
        }
        
        if (!player.teamId) {
            errors.push('Team is required');
        } else if (!this.data.teams.find(team => team.id === player.teamId)) {
            errors.push('Team does not exist');
        }
        
        // Check for duplicate numbers (exclude current player if updating)
        const playersToCheck = existingPlayers || this.data.players;
        if (player.number && playersToCheck.some(p => p.number === player.number && p.id !== player.id)) {
            errors.push('Player number already exists');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // ===== TEAM OPERATIONS =====

    getTeams() {
        return [...this.data.teams];
    }

    getTeam(id) {
        return this.data.teams.find(team => team.id === id);
    }

    addTeam(teamData) {
        const team = {
            id: this.generateId('team'),
            ...teamData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.data.teams.push(team);
        this.saveData();
        this.notifyListeners('teamAdded', team);
        return team;
    }

    updateTeam(id, updates) {
        const index = this.data.teams.findIndex(team => team.id === id);
        if (index === -1) {
            throw new Error(`Team with ID ${id} not found`);
        }

        this.data.teams[index] = {
            ...this.data.teams[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        this.saveData();
        this.notifyListeners('teamUpdated', this.data.teams[index]);
        return this.data.teams[index];
    }

    deleteTeam(id) {
        // Check if team has players
        const players = this.getPlayersByTeam(id);
        if (players.length > 0) {
            throw new Error('Cannot delete team with existing players');
        }

        const index = this.data.teams.findIndex(team => team.id === id);
        if (index === -1) {
            throw new Error(`Team with ID ${id} not found`);
        }

        const team = this.data.teams[index];
        this.data.teams.splice(index, 1);
        this.saveData();
        this.notifyListeners('teamDeleted', team);
        return team;
    }

    // ===== SITE CONFIG OPERATIONS =====

    getSiteConfig() {
        return {...this.data.siteConfig};
    }

    updateSiteConfig(updates) {
        this.data.siteConfig = {
            ...this.data.siteConfig,
            ...updates,
            updatedAt: new Date().toISOString()
        };
        this.saveData();
        this.notifyListeners('siteConfigUpdated', this.data.siteConfig);
        return this.data.siteConfig;
    }

    // ===== UTILITY FUNCTIONS =====

    generateId(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    exportData() {
        return JSON.stringify(this.data, null, 2);
    }

    importData(jsonData) {
        try {
            const imported = JSON.parse(jsonData);
            if (this.validateDataStructure(imported)) {
                this.data = imported;
                this.saveData();
                this.notifyListeners('dataImported', this.data);
                return true;
            } else {
                throw new Error('Invalid data structure');
            }
        } catch (error) {
            console.error('Error importing data:', error);
            this.notifyListeners('dataImportError', error);
            return false;
        }
    }

    resetToDefaults() {
        this.data = this.getDefaultData();
        this.saveData();
        this.notifyListeners('dataReset', this.data);
    }
}

// Create global instance
window.dataManager = new DataManager();
