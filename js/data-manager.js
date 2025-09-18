/**
 * Data Manager - Core data architecture for TeamSite
 * Handles all data operations, validation, and persistence via API
 */

class DataManager {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api';
        this.version = '1.0.0';
        this.data = {
            siteConfig: null,
            teams: [],
            players: []
        };
        this.listeners = new Map();
        this.isLoading = false;
        this.retryCount = 0;
        this.maxRetries = 3;
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
     * Initialize data from API
     */
    async initialize() {
        if (this.isLoading) return;
        this.isLoading = true;
        
        try {
            await Promise.all([
                this.loadSiteConfig(),
                this.loadTeams(),
                this.loadPlayers()
            ]);
            this.retryCount = 0;
        } catch (error) {
            console.error('Error initializing data:', error);
            this.handleApiError(error);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * API utility methods
     */
    async apiCall(endpoint, options = {}) {
        const url = `${this.apiBaseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        // Attach auth token if present
        try {
            const token = sessionStorage.getItem('teamsite_token');
            if (token) {
                config.headers = config.headers || {};
                config.headers['Authorization'] = `Bearer ${token}`;
            }
        } catch (_) {}

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`API call failed for ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Handle API errors with retry logic
     */
    handleApiError(error) {
        if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            console.log(`Retrying API call (attempt ${this.retryCount}/${this.maxRetries})`);
            setTimeout(() => this.initialize(), 1000 * this.retryCount);
        } else {
            console.error('Max retries reached, falling back to offline mode');
            this.notifyListeners('apiError', { error: error.message });
        }
    }

    /**
     * Load site configuration from API
     */
    async loadSiteConfig() {
        try {
            const response = await this.apiCall('/config');
            this.data.siteConfig = response.data || this.getDefaultSiteConfig();
        } catch (error) {
            console.warn('Failed to load site config, using default');
            this.data.siteConfig = this.getDefaultSiteConfig();
        }
    }

    /**
     * Load teams from API
     */
    async loadTeams() {
        try {
            const response = await this.apiCall('/teams');
            this.data.teams = response.data || [];
        } catch (error) {
            console.warn('Failed to load teams, using empty array');
            this.data.teams = [];
        }
    }

    /**
     * Load players from API
     */
    async loadPlayers() {
        try {
            const response = await this.apiCall('/players');
            // Ensure adapter mapping exists even if backend already mapped
            const rows = response.data || [];
            this.data.players = rows.map(p => ({
                id: p.id,
                name: p.name,
                number: p.number,
                teamId: p.teamId ?? p.team_id,
                position: p.position,
                image: p.image ?? p.image_path,
                bio: p.bio,
                battingAverage: p.battingAverage ?? p.batting_average ?? 0,
                homeRuns: p.homeRuns ?? p.home_runs ?? 0,
                rbi: p.rbi ?? 0,
                gamesPlayed: p.gamesPlayed ?? p.games_played ?? 0,
                createdAt: p.createdAt ?? p.created_at,
                updatedAt: p.updatedAt ?? p.updated_at
            }));
        } catch (error) {
            console.warn('Failed to load players, using empty array');
            this.data.players = [];
        }
    }

    /**
     * Get default site configuration
     */
    getDefaultSiteConfig() {
        return {
            title: "Little League Champions",
            description: "The future stars of baseball in our interactive 3D showcase",
            primary_color: "#3b82f6",
            secondary_color: "#10b981",
            accent_color: "#f59e0b",
            season_year: 2024,
            start_date: "2024-04-06",
            end_date: "2024-06-15",
            all_star_date: "2024-05-18"
        };
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
    async addPlayer(playerData) {
        const validation = this.validatePlayer(playerData);
        if (!validation.valid) {
            throw new Error(`Player validation failed: ${validation.errors.join(', ')}`);
        }

        try {
            // Map UI -> API shape
            const payload = {
                name: playerData.name,
                number: playerData.number,
                teamId: playerData.teamId,
                position: playerData.position,
                image: playerData.image || null,
                bio: playerData.bio || null,
                stats: {
                    battingAverage: playerData.battingAverage || 0,
                    homeRuns: playerData.homeRuns || 0,
                    rbi: playerData.rbi || 0,
                    gamesPlayed: playerData.gamesPlayed || 0
                }
            };
            const response = await this.apiCall('/players', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            
            const player = response.data;
            this.data.players.push(player);
            this.notifyListeners('playerAdded', player);
            return player;
        } catch (error) {
            console.error('Failed to add player:', error);
            throw error;
        }
    }

    /**
     * Update existing player
     */
    async updatePlayer(id, updates) {
        const index = this.data.players.findIndex(player => player.id === id);
        if (index === -1) {
            throw new Error(`Player with ID ${id} not found`);
        }

        const validation = this.validatePlayer({...this.data.players[index], ...updates});
        if (!validation.valid) {
            throw new Error(`Player validation failed: ${validation.errors.join(', ')}`);
        }

        try {
            const payload = {
                name: updates.name,
                number: updates.number,
                teamId: updates.teamId,
                position: updates.position,
                image: updates.image,
                bio: updates.bio,
                stats: {
                    battingAverage: updates.battingAverage,
                    homeRuns: updates.homeRuns,
                    rbi: updates.rbi,
                    gamesPlayed: updates.gamesPlayed
                }
            };
            const response = await this.apiCall(`/players/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            
            const updatedPlayer = response.data;
            this.data.players[index] = updatedPlayer;
            this.notifyListeners('playerUpdated', updatedPlayer);
            return updatedPlayer;
        } catch (error) {
            console.error('Failed to update player:', error);
            throw error;
        }
    }

    /**
     * Delete player
     */
    async deletePlayer(id) {
        const index = this.data.players.findIndex(player => player.id === id);
        if (index === -1) {
            throw new Error(`Player with ID ${id} not found`);
        }

        try {
            await this.apiCall(`/players/${id}`, {
                method: 'DELETE'
            });
            
            const player = this.data.players[index];
            this.data.players.splice(index, 1);
            this.notifyListeners('playerDeleted', player);
            return player;
        } catch (error) {
            console.error('Failed to delete player:', error);
            throw error;
        }
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
        
        if (!player.position || player.position.trim().length === 0) {
            errors.push('Position is required');
        } else if (player.position.trim().length > 100) {
            errors.push('Position must be 100 characters or less');
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

    async addTeam(teamData) {
        try {
            const response = await this.apiCall('/teams', {
                method: 'POST',
                body: JSON.stringify(teamData)
            });
            
            const team = response.data;
            this.data.teams.push(team);
            this.notifyListeners('teamAdded', team);
            return team;
        } catch (error) {
            console.error('Failed to add team:', error);
            throw error;
        }
    }

    async updateTeam(id, updates) {
        const index = this.data.teams.findIndex(team => team.id === id);
        if (index === -1) {
            throw new Error(`Team with ID ${id} not found`);
        }

        try {
            const response = await this.apiCall(`/teams/${id}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
            
            const updatedTeam = response.data;
            this.data.teams[index] = updatedTeam;
            this.notifyListeners('teamUpdated', updatedTeam);
            return updatedTeam;
        } catch (error) {
            console.error('Failed to update team:', error);
            throw error;
        }
    }

    async deleteTeam(id) {
        // Check if team has players
        const players = this.getPlayersByTeam(id);
        if (players.length > 0) {
            throw new Error('Cannot delete team with existing players');
        }

        const index = this.data.teams.findIndex(team => team.id === id);
        if (index === -1) {
            throw new Error(`Team with ID ${id} not found`);
        }

        try {
            await this.apiCall(`/teams/${id}`, {
                method: 'DELETE'
            });
            
            const team = this.data.teams[index];
            this.data.teams.splice(index, 1);
            this.notifyListeners('teamDeleted', team);
            return team;
        } catch (error) {
            console.error('Failed to delete team:', error);
            throw error;
        }
    }

    // ===== SITE CONFIG OPERATIONS =====

    getSiteConfig() {
        return {...this.data.siteConfig};
    }

    async updateSiteConfig(updates) {
        try {
            const response = await this.apiCall('/config', {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
            
            this.data.siteConfig = response.data;
            this.notifyListeners('siteConfigUpdated', this.data.siteConfig);
            return this.data.siteConfig;
        } catch (error) {
            console.error('Failed to update site config:', error);
            throw error;
        }
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
