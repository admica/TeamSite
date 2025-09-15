/**
 * Admin Panel JavaScript
 * Handles all admin panel functionality including CRUD operations
 */

// Global variables
let currentEditingPlayer = null;
let currentEditingTeam = null;
let colorPickers = {};

// Initialize admin panel
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize feather icons
    feather.replace();
    
    // Load initial data
    await loadAllData();
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Initialize color pickers
    initializeColorPickers();
    
    // Show default tab
    showTab('players');
});

// Tab management
function showTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Remove active state from all tabs
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('border-blue-500', 'text-blue-600');
        button.classList.add('border-transparent', 'text-gray-500');
    });
    
    // Show selected tab content
    document.getElementById(tabName + '-tab-content').classList.remove('hidden');
    
    // Activate selected tab button
    const activeTab = document.getElementById(tabName + '-tab');
    activeTab.classList.remove('border-transparent', 'text-gray-500');
    activeTab.classList.add('border-blue-500', 'text-blue-600');
    
    // Load data for the tab
    if (tabName === 'players') {
        loadPlayersList();
    } else if (tabName === 'teams') {
        loadTeamsList();
    } else if (tabName === 'settings') {
        loadSettings();
    } else if (tabName === 'data') {
        loadDataStats();
    }
}

// Load all data
async function loadAllData() {
    try {
        await dataManager.initialize();
        loadTeamsList();
        loadPlayersList();
        loadSettings();
        loadDataStats();
    } catch (error) {
        console.error('Error loading data:', error);
        Utils.showNotification('Error loading data from server', 'error');
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // Player form
    document.getElementById('playerForm').addEventListener('submit', handlePlayerSubmit);
    document.getElementById('playerImage').addEventListener('change', handleImagePreview);
    document.getElementById('playerSearch').addEventListener('input', handlePlayerSearch);
    
    // Team form
    document.getElementById('teamForm').addEventListener('submit', handleTeamSubmit);
    document.getElementById('teamColor').addEventListener('change', handleTeamColorChange);
    document.getElementById('teamColorText').addEventListener('input', handleTeamColorTextChange);
    
    // Settings form
    document.getElementById('settingsForm').addEventListener('submit', handleSettingsSubmit);
    
    // Data management
    document.getElementById('importFile').addEventListener('change', handleDataImport);
    
    // Listen for data changes
    dataManager.addListener('playerAdded', loadPlayersList);
    dataManager.addListener('playerUpdated', loadPlayersList);
    dataManager.addListener('playerDeleted', loadPlayersList);
    dataManager.addListener('teamAdded', loadTeamsList);
    dataManager.addListener('teamUpdated', loadTeamsList);
    dataManager.addListener('teamDeleted', loadTeamsList);
    dataManager.addListener('siteConfigUpdated', loadSettings);
}

// Initialize color pickers
function initializeColorPickers() {
    const config = dataManager.getSiteConfig();
    
    colorPickers.primary = new iro.ColorPicker("#primaryColorPicker", {
        width: 180,
        color: config.theme.primary,
        borderWidth: 1,
        borderColor: "#e5e7eb"
    });
    
    colorPickers.secondary = new iro.ColorPicker("#secondaryColorPicker", {
        width: 180,
        color: config.theme.secondary,
        borderWidth: 1,
        borderColor: "#e5e7eb"
    });
    
    colorPickers.accent = new iro.ColorPicker("#accentColorPicker", {
        width: 180,
        color: config.theme.accent,
        borderWidth: 1,
        borderColor: "#e5e7eb"
    });
    
    // Update color previews
    colorPickers.primary.on('color:change', function(color) {
        document.querySelectorAll('.color-preview')[0].style.backgroundColor = color.hexString;
    });
    
    colorPickers.secondary.on('color:change', function(color) {
        document.querySelectorAll('.color-preview')[1].style.backgroundColor = color.hexString;
    });
    
    colorPickers.accent.on('color:change', function(color) {
        document.querySelectorAll('.color-preview')[2].style.backgroundColor = color.hexString;
    });
}

// Player management functions
function openPlayerForm(player = null) {
    currentEditingPlayer = player;
    const formContainer = document.getElementById('playerFormContainer');
    const form = document.getElementById('playerForm');
    
    if (player) {
        // Edit mode
        populatePlayerForm(player);
        form.querySelector('button[type="submit"]').innerHTML = '<i data-feather="save" class="mr-2"></i> Update Player';
    } else {
        // Add mode
        form.reset();
        form.querySelector('button[type="submit"]').innerHTML = '<i data-feather="save" class="mr-2"></i> Save Player';
    }
    
    formContainer.classList.remove('hidden');
    loadTeamOptions();
    feather.replace();
}

function closePlayerForm() {
    document.getElementById('playerFormContainer').classList.add('hidden');
    currentEditingPlayer = null;
    clearFormErrors('playerForm');
}

function populatePlayerForm(player) {
    document.getElementById('playerName').value = player.name || '';
    document.getElementById('playerNumber').value = player.number || '';
    document.getElementById('playerTeam').value = player.teamId || '';
    document.getElementById('playerPosition').value = player.position || '';
    document.getElementById('playerBio').value = player.bio || '';
    document.getElementById('battingAverage').value = player.stats?.battingAverage || '';
    document.getElementById('homeRuns').value = player.stats?.homeRuns || '';
    document.getElementById('rbi').value = player.stats?.rbi || '';
    document.getElementById('gamesPlayed').value = player.stats?.gamesPlayed || '';
    
    if (player.image) {
        document.getElementById('imagePreview').src = player.image;
    } else {
        document.getElementById('imagePreview').src = '';
    }
}

function handlePlayerSubmit(e) {
    e.preventDefault();
    clearFormErrors('playerForm');
    
    const formData = new FormData(e.target);
    const playerData = {
        name: formData.get('playerName'),
        number: parseInt(formData.get('playerNumber')),
        teamId: formData.get('playerTeam'),
        position: formData.get('playerPosition'),
        bio: formData.get('playerBio'),
        stats: {
            battingAverage: parseFloat(formData.get('battingAverage')) || 0,
            homeRuns: parseInt(formData.get('homeRuns')) || 0,
            rbi: parseInt(formData.get('rbi')) || 0,
            gamesPlayed: parseInt(formData.get('gamesPlayed')) || 0
        }
    };
    
    // Handle image upload
    const imageFile = formData.get('playerImage');
    if (imageFile && imageFile.size > 0) {
        Utils.fileToBase64(imageFile).then(base64 => {
            playerData.image = base64;
            savePlayer(playerData);
        }).catch(error => {
            Utils.showNotification('Error processing image: ' + error.message, 'error');
        });
    } else if (currentEditingPlayer && currentEditingPlayer.image) {
        playerData.image = currentEditingPlayer.image;
        savePlayer(playerData);
    } else {
        savePlayer(playerData);
    }
}

async function savePlayer(playerData) {
    try {
        if (currentEditingPlayer) {
            await dataManager.updatePlayer(currentEditingPlayer.id, playerData);
            Utils.showNotification('Player updated successfully!', 'success');
        } else {
            await dataManager.addPlayer(playerData);
            Utils.showNotification('Player added successfully!', 'success');
        }
        closePlayerForm();
    } catch (error) {
        Utils.showNotification('Error saving player: ' + error.message, 'error');
        showFormErrors('playerForm', error.message);
    }
}

function loadPlayersList() {
    const players = dataManager.getPlayers();
    const container = document.getElementById('playersList');
    
    if (players.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">No players found. Add your first player!</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${players.map(player => {
                        const team = dataManager.getTeam(player.teamId);
                        return `
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="flex items-center">
                                        <div class="flex-shrink-0 h-10 w-10">
                                            <img class="h-10 w-10 rounded-full object-cover" src="${player.image || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMEMyNi4wNzcgMjAgMzEuMTExIDE0Ljk1NiAzMS4xMTEgOC44ODlDMzEuMTExIDIuODIyIDI2LjA3NyAtMi4yMjIgMjAgLTIuMjIyQzEzLjkyMyAtMi4yMjIgOC44ODkgMi44MjIgOC44ODkgOC44ODlDOC44ODkgMTQuOTU2IDEzLjkyMyAyMCAyMCAyMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTIwIDI0QzE0LjQ3NyAyNCA5Ljk0NCAyNi4yMjIgNi42NjcgMjkuNUMyLjIyMiAzMy45NDQgMCAzOS40NDQgMCA0NUg0MEM0MCAzOS40NDQgMzcuNzc4IDMzLjk0NCAzMy4zMzMgMjkuNUMyOS4wNTYgMjYuMjIyIDI0LjUyMyAyNCAyMCAyNFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+'}">
                                        </div>
                                        <div class="ml-4">
                                            <div class="text-sm font-medium text-gray-900">${player.name}</div>
                                            <div class="text-sm text-gray-500">${player.bio || 'No bio available'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#${player.number}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${team ? team.name : 'Unknown'}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${player.position}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <button onclick="openPlayerForm(${JSON.stringify(player).replace(/"/g, '&quot;')})" class="text-blue-600 hover:text-blue-900 mr-3">
                                        <i data-feather="edit" class="w-4 h-4"></i>
                                    </button>
                                    <button onclick="deletePlayer('${player.id}')" class="text-red-600 hover:text-red-900">
                                        <i data-feather="trash-2" class="w-4 h-4"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    feather.replace();
}

function deletePlayer(playerId) {
    Utils.confirm('Are you sure you want to delete this player? This action cannot be undone.', 'Delete Player')
        .then(async (confirmed) => {
            if (confirmed) {
                try {
                    await dataManager.deletePlayer(playerId);
                    Utils.showNotification('Player deleted successfully!', 'success');
                } catch (error) {
                    Utils.showNotification('Error deleting player: ' + error.message, 'error');
                }
            }
        });
}

function loadTeamOptions() {
    const teams = dataManager.getTeams();
    const select = document.getElementById('playerTeam');
    select.innerHTML = '<option value="">Select a team</option>' + 
        teams.map(team => `<option value="${team.id}">${team.name}</option>`).join('');
}

function handleImagePreview(e) {
    const file = e.target.files[0];
    if (file) {
        const validation = ValidationUtils.validateFileUpload(file);
        if (!validation.valid) {
            Utils.showNotification(validation.errors.join(', '), 'error');
            e.target.value = '';
            return;
        }
        
        Utils.fileToBase64(file).then(base64 => {
            document.getElementById('imagePreview').src = base64;
        }).catch(error => {
            Utils.showNotification('Error processing image: ' + error.message, 'error');
        });
    }
}

function handlePlayerSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#playersList tbody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function exportPlayers() {
    const players = dataManager.getPlayers();
    Utils.downloadJSON(players, 'players.json');
}

// Team management functions
function openTeamForm(team = null) {
    currentEditingTeam = team;
    const formContainer = document.getElementById('teamFormContainer');
    const form = document.getElementById('teamForm');
    
    if (team) {
        populateTeamForm(team);
        form.querySelector('button[type="submit"]').innerHTML = '<i data-feather="save" class="mr-2"></i> Update Team';
    } else {
        form.reset();
        form.querySelector('button[type="submit"]').innerHTML = '<i data-feather="save" class="mr-2"></i> Save Team';
    }
    
    formContainer.classList.remove('hidden');
    feather.replace();
}

function closeTeamForm() {
    document.getElementById('teamFormContainer').classList.add('hidden');
    currentEditingTeam = null;
    clearFormErrors('teamForm');
}

function populateTeamForm(team) {
    document.getElementById('teamName').value = team.name || '';
    document.getElementById('teamColor').value = team.color || '#3b82f6';
    document.getElementById('teamColorText').value = team.color || '#3b82f6';
    document.getElementById('teamDescription').value = team.description || '';
}

async function handleTeamSubmit(e) {
    e.preventDefault();
    clearFormErrors('teamForm');
    
    const formData = new FormData(e.target);
    const teamData = {
        name: formData.get('teamName'),
        color: formData.get('teamColor'),
        description: formData.get('teamDescription')
    };
    
    try {
        if (currentEditingTeam) {
            await dataManager.updateTeam(currentEditingTeam.id, teamData);
            Utils.showNotification('Team updated successfully!', 'success');
        } else {
            await dataManager.addTeam(teamData);
            Utils.showNotification('Team added successfully!', 'success');
        }
        closeTeamForm();
    } catch (error) {
        Utils.showNotification('Error saving team: ' + error.message, 'error');
        showFormErrors('teamForm', error.message);
    }
}

function loadTeamsList() {
    const teams = dataManager.getTeams();
    const container = document.getElementById('teamsList');
    
    if (teams.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8 col-span-full">No teams found. Add your first team!</p>';
        return;
    }
    
    container.innerHTML = teams.map(team => `
        <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 rounded-full" style="background-color: ${team.color}"></div>
                    <h3 class="text-lg font-semibold text-gray-900">${team.name}</h3>
                </div>
                <div class="flex space-x-2">
                    <button onclick="openTeamForm(${JSON.stringify(team).replace(/"/g, '&quot;')})" class="text-blue-600 hover:text-blue-900">
                        <i data-feather="edit" class="w-4 h-4"></i>
                    </button>
                    <button onclick="deleteTeam('${team.id}')" class="text-red-600 hover:text-red-900">
                        <i data-feather="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
            <p class="text-gray-600 text-sm">${team.description || 'No description available'}</p>
            <div class="mt-2 text-xs text-gray-500">
                Players: ${dataManager.getPlayersByTeam(team.id).length}
            </div>
        </div>
    `).join('');
    
    feather.replace();
}

function deleteTeam(teamId) {
    const players = dataManager.getPlayersByTeam(teamId);
    if (players.length > 0) {
        Utils.showNotification(`Cannot delete team with ${players.length} players. Move or delete players first.`, 'error');
        return;
    }
    
    Utils.confirm('Are you sure you want to delete this team? This action cannot be undone.', 'Delete Team')
        .then(async (confirmed) => {
            if (confirmed) {
                try {
                    await dataManager.deleteTeam(teamId);
                    Utils.showNotification('Team deleted successfully!', 'success');
                } catch (error) {
                    Utils.showNotification('Error deleting team: ' + error.message, 'error');
                }
            }
        });
}

function handleTeamColorChange(e) {
    document.getElementById('teamColorText').value = e.target.value;
}

function handleTeamColorTextChange(e) {
    if (ValidationUtils.isValidColor(e.target.value)) {
        document.getElementById('teamColor').value = e.target.value;
    }
}

// Settings management
function loadSettings() {
    const config = dataManager.getSiteConfig();
    
    document.getElementById('siteTitle').value = config.title;
    document.getElementById('siteYear').value = config.season.year;
    document.getElementById('siteDescription').value = config.description;
    document.getElementById('startDate').value = Utils.formatDateForInput(config.season.startDate);
    document.getElementById('endDate').value = Utils.formatDateForInput(config.season.endDate);
    document.getElementById('allStarDate').value = Utils.formatDateForInput(config.season.allStarWeekend);
}

async function handleSettingsSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const settings = {
        title: formData.get('siteTitle'),
        description: formData.get('siteDescription'),
        season: {
            year: parseInt(formData.get('siteYear')),
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            allStarWeekend: formData.get('allStarDate')
        },
        theme: {
            primary: colorPickers.primary.color.hexString,
            secondary: colorPickers.secondary.color.hexString,
            accent: colorPickers.accent.color.hexString
        }
    };
    
    try {
        await dataManager.updateSiteConfig(settings);
        Utils.showNotification('Settings saved successfully!', 'success');
    } catch (error) {
        Utils.showNotification('Error saving settings: ' + error.message, 'error');
    }
}

// Data management
function loadDataStats() {
    const data = dataManager.data;
    const container = document.getElementById('dataStats');
    
    container.innerHTML = `
        <div class="bg-blue-50 p-4 rounded-lg">
            <div class="text-2xl font-bold text-blue-600">${data.players.length}</div>
            <div class="text-sm text-blue-800">Players</div>
        </div>
        <div class="bg-green-50 p-4 rounded-lg">
            <div class="text-2xl font-bold text-green-600">${data.teams.length}</div>
            <div class="text-sm text-green-800">Teams</div>
        </div>
        <div class="bg-purple-50 p-4 rounded-lg">
            <div class="text-2xl font-bold text-purple-600">${data.events.length}</div>
            <div class="text-sm text-purple-800">Events</div>
        </div>
        <div class="bg-orange-50 p-4 rounded-lg">
            <div class="text-2xl font-bold text-orange-600">${Utils.formatDate(data.lastUpdated)}</div>
            <div class="text-sm text-orange-800">Last Updated</div>
        </div>
    `;
}

function exportAllData() {
    const data = dataManager.exportData();
    Utils.downloadJSON(JSON.parse(data), 'teamsite-backup.json');
}

function importData() {
    document.getElementById('importFile').click();
}

function handleDataImport(e) {
    const file = e.target.files[0];
    if (file) {
        Utils.readJSONFile(file).then(data => {
            if (dataManager.importData(JSON.stringify(data))) {
                Utils.showNotification('Data imported successfully!', 'success');
                loadAllData();
            } else {
                Utils.showNotification('Failed to import data. Please check the file format.', 'error');
            }
        }).catch(error => {
            Utils.showNotification('Error importing data: ' + error.message, 'error');
        });
    }
}

function resetAllData() {
    Utils.confirm('Are you sure you want to reset ALL data? This will delete everything and cannot be undone!', 'Reset All Data')
        .then(confirmed => {
            if (confirmed) {
                dataManager.resetToDefaults();
                Utils.showNotification('All data has been reset to defaults!', 'success');
                loadAllData();
            }
        });
}

// Utility functions
function clearFormErrors(formId) {
    const form = document.getElementById(formId);
    form.querySelectorAll('.text-red-500').forEach(error => {
        error.classList.add('hidden');
    });
}

function showFormErrors(formId, message) {
    // This is a simplified error display - in a real app you'd show specific field errors
    Utils.showNotification(message, 'error');
}
