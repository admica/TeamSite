/**
 * Database setup and connection for TeamSite
 * SQLite database with schema initialization
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, 'teamsite.db');
    }

    /**
     * Initialize database connection and create tables
     */
    async init() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err);
                    reject(err);
                } else {
                    console.log('Connected to SQLite database');
                    this.createTables()
                        .then(() => this.insertDefaultData())
                        .then(() => resolve())
                        .catch(reject);
                }
            });
        });
    }

    /**
     * Create database tables
     */
    async createTables() {
        return new Promise((resolve, reject) => {
            const createTablesSQL = `
                -- Teams table
                CREATE TABLE IF NOT EXISTS teams (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL UNIQUE,
                    color TEXT NOT NULL DEFAULT '#3b82f6',
                    description TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Players table
                CREATE TABLE IF NOT EXISTS players (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    number INTEGER NOT NULL,
                    team_id TEXT NOT NULL,
                    position TEXT NOT NULL,
                    image_path TEXT,
                    bio TEXT,
                    batting_average REAL DEFAULT 0,
                    home_runs INTEGER DEFAULT 0,
                    rbi INTEGER DEFAULT 0,
                    games_played INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
                    UNIQUE(team_id, number)
                );

                -- Site configuration
                CREATE TABLE IF NOT EXISTS site_config (
                    id INTEGER PRIMARY KEY DEFAULT 1,
                    title TEXT NOT NULL DEFAULT 'Little League Champions',
                    description TEXT DEFAULT 'The future stars of baseball',
                    primary_color TEXT DEFAULT '#3b82f6',
                    secondary_color TEXT DEFAULT '#10b981',
                    accent_color TEXT DEFAULT '#f59e0b',
                    season_year INTEGER DEFAULT 2024,
                    start_date TEXT,
                    end_date TEXT,
                    all_star_date TEXT,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `;

            this.db.exec(createTablesSQL, (err) => {
                if (err) {
                    console.error('Error creating tables:', err);
                    reject(err);
                } else {
                    console.log('Database tables created successfully');
                    resolve();
                }
            });
        });
    }

    /**
     * Insert default data
     */
    async insertDefaultData() {
        return new Promise((resolve, reject) => {
            // Check if data already exists
            this.db.get("SELECT COUNT(*) as count FROM teams", (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (row.count > 0) {
                    console.log('Default data already exists');
                    resolve();
                    return;
                }

                // Insert default data
                const insertDataSQL = `
                    INSERT INTO site_config (id) VALUES (1);
                    INSERT INTO teams (id, name, color, description) 
                    VALUES ('tigers', 'Tigers', '#f59e0b', 'The mighty Tigers team');
                    INSERT INTO players (id, name, number, team_id, position, image_path, bio, batting_average, home_runs, rbi, games_played) VALUES
                    ('player_1', 'Jason Miller', 12, 'tigers', 'Pitcher', 'http://static.photos/sport/640x360/1', 'Jason is our star pitcher with a powerful fastball.', 0.285, 3, 15, 12),
                    ('player_2', 'Mike Johnson', 7, 'tigers', 'Shortstop', 'http://static.photos/sport/640x360/2', 'Mike''s quick reflexes make him an excellent shortstop.', 0.320, 5, 22, 12),
                    ('player_3', 'David Wilson', 23, 'tigers', 'Outfield', 'http://static.photos/sport/640x360/3', 'David''s speed and agility make him a great outfielder.', 0.275, 2, 18, 12);
                `;

                this.db.exec(insertDataSQL, (err) => {
                    if (err) {
                        console.error('Error inserting default data:', err);
                        reject(err);
                    } else {
                        console.log('Default data inserted successfully');
                        resolve();
                    }
                });
            });
        });
    }

    /**
     * Get database instance
     */
    getDB() {
        return this.db;
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('Database connection closed');
                }
            });
        }
    }

    /**
     * Execute a query with parameters
     */
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    /**
     * Get a single row
     */
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    /**
     * Get all rows
     */
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
}

module.exports = Database;
