/**
 * Plant Selector System
 * Manages plant selection, codex unlocking, and UI
 */

const PLANT_DATABASE = {
    peashooter: {
        name: 'Uhorkoň',
        description: 'Strieľa alkohol s uhorkami, čo sa dá povedať',
        image: 'dpea1.png',
        cost: 100,
        stats: 'utočík: 50 | dosah: riadok | životík: 50',
        unlocked: true, // Unlocked by default
        unlockedByLevel: null,
        song: 'assets/duchonmp3/7.mp3',
        levelSong: 'assets/duchonmp3/7.mp3'
    },
    sunflower: {
        name: 'Slnkoň',
        description: 'je to naše slniečko (produkuje ich)',
        image: 'dsunflower.png',
        cost: 50,
        stats: 'slniečko/8s | nemá dosah, si sprostý? | životík: 20',
        unlocked: false,
        unlockedByLevel: 1, // Unlocked after completing level 1
        song: 'assets/duchonmp3/8.mp3',
        levelSong: 'assets/duchonmp3/8.mp3'
    },
    orechon: {
        name: 'Orechoň',
        description: 'vpodstate ako vilo, len sedí',
        image: 'dnut1.png',
        cost: 75,
        stats: 'útočík: 0 | životík: 3500 | hej ani tento nemá dosah',
        unlocked: false,
        unlockedByLevel: 2, // Unlocked after completing level 2
        song: 'assets/duchonmp3/2.mp3',
        levelSong: 'assets/duchonmp3/2.mp3'
    },
    cherry: {
        name: 'Čerešchňon',
        description: 'ruská ofenzíva, zabíja všetko (dokonca aj mimo ukrajiny)',
        image: 'dcherry.png',
        cost: 150,
        stats: 'výbuch po 3s | životík: 500 | 3x3 pole',
        unlocked: false,
        unlockedByLevel: 4, // Unlocked after completing level 4
        song: 'assets/duchonmp3/3.mp3',
        levelSong: 'assets/duchonmp3/3.mp3'
    },
    coldpea: {
        name: 'Chladničkouhorkoň',
        description: 'mrazivý rastliňochoň (spomaluje alkohol, nie jeho účinky)',
        image: 'dchpea.png',
        cost: 175,
        stats: 'útočík: 40 | spomalenie: 2x | životík: 50',
        unlocked: false,
        unlockedByLevel: 5, // Unlocked after completing level 5
        song: 'assets/duchonmp3/10.mp3',
        levelSong: 'assets/duchonmp3/10.mp3'
    },
    objekt76: {
        name: 'objekt#76',
        description: 'máš tento objekt (neviem ako sa mu nadáva)',
        image: 'dcarnivore1empty.png',
        cost: 150,
        stats: 'zožerie nepriateľa vpravo do 50px, potom je plný 10s | životík: 150',
        unlocked: false,
        unlockedByLevel: 5, // Unlocked after completing level 5
        song: 'assets/duchonmp3/11.mp3',
        levelSong: 'assets/duchonmp3/11.mp3'
    },
    shovel: {
        name: 'Chlopatoň',
        description: 'teoreticky nie rastlina ale si retard',
        image: 'dshovel.png',
        cost: 0,
        stats: 'smrdíš | životík: 0 | špeci freaky nástroj',
        unlocked: false,
        unlockedByLevel: 3, // Unlocked after completing level 3
        song: 'assets/Karol Duchoň - Čardáš dvoch sŕdc.mp3'
    }
};

// Background Music Manager - handles background and level music
const bgMusicManager = {
    backgroundAudio: null,
    currentBackgroundSongIndex: 0,
    
    // Get a random duchonmp3 song (1-12)
    getRandomDuchonSong() {
        const randomNum = Math.floor(Math.random() * 12) + 1;
        return `assets/duchonmp3/${randomNum}.mp3`;
    },
    
    // Play random background music (when not in level)
    playBackgroundMusic() {
        // Stop any existing background music
        this.stopBackgroundMusic();
        
        // Play random song
        const songPath = this.getRandomDuchonSong();
        const audio = new Audio(songPath);
        audio.loop = true;
        audio.volume = 0.3;
        audio.play().catch(err => {
            console.warn(`Failed to play background music ${songPath}:`, err);
        });
        
        this.backgroundAudio = audio;
    },
    
    stopBackgroundMusic() {
        if (this.backgroundAudio) {
            this.backgroundAudio.pause();
            this.backgroundAudio.currentTime = 0;
            this.backgroundAudio = null;
        }
    }
};

// Plant Audio Manager - handles plant singing system
const plantAudioManager = {
    activeSongs: {}, // Track active audio instances
    
    playPlantSong(songId, songPath) {
        // Stop existing song if it exists
        if (this.activeSongs[songId]) {
            this.activeSongs[songId].pause();
            this.activeSongs[songId].currentTime = 0;
        }
        
        // Create new audio instance
        const audio = new Audio(songPath);
        audio.loop = true;
        audio.volume = 0.3;
        audio.play().catch(err => {
            console.warn(`Failed to play plant song ${songPath}:`, err);
        });
        
        this.activeSongs[songId] = audio;
    },
    
    stopPlantSongs(songId) {
        if (this.activeSongs[songId]) {
            this.activeSongs[songId].pause();
            this.activeSongs[songId].currentTime = 0;
            delete this.activeSongs[songId];
        }
    },
    
    stopAllSongs() {
        Object.values(this.activeSongs).forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
        this.activeSongs = {};
    }
};

class PlantSelector {
    constructor() {
        this.selectedPlants = [];
        this.unlockedPlants = new Set(['peashooter']); // Start with peashooter
        this.currentHoveredPlant = null;
        this.maxSelections = 5;
        this.completedLevels = new Set(); // Track completed levels
        this.previewSongId = null;
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.checkAndUnlockPlants();
        this.createUI();
        this.attachEventListeners();
        // Start background music when on levels screen
        bgMusicManager.playBackgroundMusic();
    }

    createUI() {
        const levelsScreen = document.getElementById('levels-screen');

        // Check if plant selector button already exists
        if (document.getElementById('plant-selector-btn')) {
            return; // Already created, don't create again
        }
        
        // Create plant selector button - make it bigger
        const btn = document.createElement('button');
        btn.className = 'plant-selector-button';
        btn.textContent = 'záhrada duchoňov';
        btn.id = 'plant-selector-btn';
        btn.title = 'výber rastlichoňov';
        btn.style.width = '250px';
        btn.style.height = '80px';
        btn.style.fontSize = '20px';
        levelsScreen.appendChild(btn);

        // Create plant selector screen
        const screen = document.createElement('div');
        screen.id = 'plant-selector-screen';
        screen.className = 'screen hidden';
        screen.style.display = 'none';
        screen.innerHTML = `
            <button class="back-button" id="plant-selector-back-btn" style="top: 15px; left: 15px;">← Späť</button>
            <div class="plant-selector-container">
                <div class="plant-selector-info-panel">
                    <div class="plant-info-label">
                        <div class="plant-info-name" id="plant-info-name">výber rastlichoňa</div>
                        <div class="plant-info-description" id="plant-info-description">klikni na rastlichoňov a prečítaj si</div>
                        <div class="plant-info-stats" id="plant-info-stats">Výber duchoňov</div>
                    </div>
                </div>
                <div class="plant-selector-content">
                    <div class="plant-codex" id="plant-codex"></div>
                    <div class="plant-selected-list">
                        <div class="selected-count" id="selected-count">0 / 5 rastlichoňov</div>
                        <div class="selected-plants" id="selected-plants-list"></div>
                        <button id="reset-progression-btn" class="reset-btn" style="margin-top: auto; width: 100%; padding: 12px 20px; background-color: #ff4444; color: white; border: none; borde[...]
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(screen);

        // Initial render
        this.renderCodex();
        this.renderSelectedList();
    }

    attachEventListeners() {
        const btn = document.getElementById('plant-selector-btn');
        const backBtn = document.getElementById('plant-selector-back-btn');
        const codex = document.getElementById('plant-codex');
        const resetBtn = document.getElementById('reset-progression-btn');

        if (btn) btn.addEventListener('click', () => this.show());
        if (backBtn) backBtn.addEventListener('click', () => this.hide());
        if (codex) {
            codex.addEventListener('click', (e) => this.handlePlantClick(e));
            codex.addEventListener('mouseover', (e) => this.handlePlantHover(e));
            codex.addEventListener('mouseleave', () => this.stopPreviewSong());
        }
        if (resetBtn) resetBtn.addEventListener('click', () => this.showResetConfirmation());
    }

    renderCodex() {
        const codex = document.getElementById('plant-codex');
        if (!codex) return;
        codex.innerHTML = '';

        // Get all plants and sort by unlock status
        const plantEntries = Object.entries(PLANT_DATABASE).sort((a, b) => {
            const aUnlocked = this.unlockedPlants.has(a[0]);
            const bUnlocked = this.unlockedPlants.has(b[0]);
            return bUnlocked - aUnlocked; // Unlocked plants first
        });

        plantEntries.forEach(([plantKey, plant]) => {
            const isUnlocked = this.unlockedPlants.has(plantKey);
            const isSelected = this.selectedPlants.includes(plantKey);
            
            const card = document.createElement('div');
            card.className = `plant-card ${isSelected ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}`;
            card.dataset.plant = plantKey;
            
            let lockInfo = '';
            if (!isUnlocked && plant.unlockedByLevel !== null) {
                lockInfo = `<div class="plant-card-lock">🔒 Level ${plant.unlockedByLevel + 1}</div>`;
            }
            
            card.innerHTML = `
                <div class="plant-card-image">
                    <img src="./assets/${plant.image}" alt="${plant.name}" onerror="this.style.display='none'">
                </div>
                <div class="plant-card-name">${plant.name}</div>
                <div class="plant-card-cost">☀️ ${plant.cost}</div>
                ${lockInfo}
            `;
            codex.appendChild(card);
        });
    }

    renderSelectedList() {
        const list = document.getElementById('selected-plants-list');
        const count = document.getElementById('selected-count');
        
        if (!list || !count) return;
        
        list.innerHTML = '';
        count.textContent = `${this.selectedPlants.length} / ${this.maxSelections} Selected`;

        this.selectedPlants.forEach(plantKey => {
            const plant = PLANT_DATABASE[plantKey];
            const badge = document.createElement('div');
            badge.className = 'selected-plant-badge';
            badge.innerHTML = `
                <span class="selected-plant-name">${plant.name}</span>
                <button class="deselect-btn" data-plant="${plantKey}">✕</button>
            `;
            badge.querySelector('.deselect-btn').addEventListener('click', () => this.deselectPlant(plantKey));
            list.appendChild(badge);
        });

        // Re-attach reset button listener
        const resetBtn = document.getElementById('reset-progression-btn');
        if (resetBtn) {
            resetBtn.removeEventListener('click', () => this.showResetConfirmation());
            resetBtn.addEventListener('click', () => this.showResetConfirmation());
        }
    }

    handlePlantClick(e) {
        const card = e.target.closest('.plant-card');
        if (!card) return;

        const plantKey = card.dataset.plant;
        
        // Can only select unlocked plants
        if (!this.unlockedPlants.has(plantKey)) {
            this.showPlantInfo(plantKey);
            return;
        }
        
        if (this.selectedPlants.includes(plantKey)) {
            this.deselectPlant(plantKey);
        } else {
            if (this.selectedPlants.length < this.maxSelections) {
                this.selectPlant(plantKey);
            } else {
                // Show info but don't select
                this.showPlantInfo(plantKey);
            }
        }
    }

    handlePlantHover(e) {
        const card = e.target.closest('.plant-card');
        if (card) {
            const plantKey = card.dataset.plant;
            this.showPlantInfo(plantKey);
            this.playPreviewSong(plantKey);
        }
    }

    playPreviewSong(plantKey) {
        const plant = PLANT_DATABASE[plantKey];
        if (!plant || !plant.song) return;
        
        // Stop previous preview song
        this.stopPreviewSong();
        
        // Play new preview song
        this.previewSongId = `preview_${plantKey}`;
        plantAudioManager.playPlantSong(this.previewSongId, plant.song);
    }

    stopPreviewSong() {
        if (this.previewSongId) {
            plantAudioManager.stopPlantSongs(this.previewSongId);
            this.previewSongId = null;
        }
    }

    selectPlant(plantKey) {
        if (!this.selectedPlants.includes(plantKey) && this.selectedPlants.length < this.maxSelections && this.unlockedPlants.has(plantKey)) {
            this.selectedPlants.push(plantKey);
            this.saveToStorage();
            this.renderCodex();
            this.renderSelectedList();
            this.showPlantInfo(plantKey);
        }
    }

    deselectPlant(plantKey) {
        this.selectedPlants = this.selectedPlants.filter(p => p !== plantKey);
        this.saveToStorage();
        this.renderCodex();
        this.renderSelectedList();
        this.showPlantInfo(plantKey);
    }

    showPlantInfo(plantKey) {
        const plant = PLANT_DATABASE[plantKey];
        if (plant) {
            const nameEl = document.getElementById('plant-info-name');
            const descEl = document.getElementById('plant-info-description');
            const statsEl = document.getElementById('plant-info-stats');
            if (nameEl) nameEl.textContent = plant.name;
            if (descEl) descEl.textContent = plant.description;
            if (statsEl) statsEl.textContent = plant.stats;
        }
    }

    show() {
        const screen = document.getElementById('plant-selector-screen');
        const levelsScreen = document.getElementById('levels-screen');
        
        if (screen && levelsScreen) {
            levelsScreen.style.display = 'none';
            levelsScreen.classList.add('hidden');
            screen.style.display = 'flex';
            screen.classList.remove('hidden');
        }
    }

    hide() {
        const screen = document.getElementById('plant-selector-screen');
        const levelsScreen = document.getElementById('levels-screen');
        
        this.stopPreviewSong();
        
        if (screen && levelsScreen) {
            screen.style.display = 'none';
            screen.classList.add('hidden');
            levelsScreen.style.display = 'flex';
            levelsScreen.classList.remove('hidden');
            // Resume background music when returning to levels screen
            bgMusicManager.playBackgroundMusic();
        }
    }

    toggleScreen() {
        const screen = document.getElementById('plant-selector-screen');
        if (screen && screen.classList.contains('hidden')) {
            this.show();
        } else {
            this.hide();
        }
    }

    unlockPlant(plantKey) {
        if (PLANT_DATABASE[plantKey] && !this.unlockedPlants.has(plantKey)) {
            this.unlockedPlants.add(plantKey);
            this.saveToStorage();
            this.renderCodex();
        }
    }

    completeLevel(levelNumber) {
        this.completedLevels.add(levelNumber);
        this.checkAndUnlockPlants();
        this.saveToStorage();
    }

    checkAndUnlockPlants() {
        Object.entries(PLANT_DATABASE).forEach(([plantKey, plant]) => {
            if (plant.unlockedByLevel !== null && this.completedLevels.has(plant.unlockedByLevel)) {
                this.unlockPlant(plantKey);
            }
        });
    }

    isLevelUnlocked(levelNumber) {
        // Level 0 (first level) is always unlocked
        if (levelNumber === 0) return true;
        // All other levels unlock when the previous level is completed
        return this.completedLevels.has(levelNumber - 1);
    }

    getSelectedPlants() {
        return [...this.selectedPlants];
    }

    showResetConfirmation() {
        const confirmReset = confirm('Naozaj chceš sprsviť sebavraždu (pls)?');
        if (confirmReset) {
            const captchaPrompt = prompt('Zadaj náhodné 4-ciferné číslo ako overenie že ti to neklikol Kubo:');
            if (captchaPrompt && captchaPrompt.length === 4 && /^\d+$/.test(captchaPrompt)) {
                this.resetProgression();
            } else {
                alert('Ha ha ha, dostal som ťa ty fiškus! Progres resetovaný NIE JE.');
            }
        }
    }

    resetProgression() {
        this.selectedPlants = [];
        this.unlockedPlants = new Set(['peashooter']);
        this.completedLevels = new Set();
        this.saveToStorage();
        this.renderCodex();
        this.renderSelectedList();
        alert('Zabil si sa! Prajem pekný víkend!');
    }

    saveToStorage() {
        localStorage.setItem('selectedPlants', JSON.stringify(this.selectedPlants));
        localStorage.setItem('unlockedPlants', JSON.stringify([...this.unlockedPlants]));
        localStorage.setItem('completedLevels', JSON.stringify([...this.completedLevels]));
    }

    loadFromStorage() {
        const saved = localStorage.getItem('selectedPlants');
        const unlockedSaved = localStorage.getItem('unlockedPlants');
        const completedSaved = localStorage.getItem('completedLevels');
        
        if (saved) this.selectedPlants = JSON.parse(saved);
        if (unlockedSaved) this.unlockedPlants = new Set(JSON.parse(unlockedSaved));
        if (completedSaved) this.completedLevels = new Set(JSON.parse(completedSaved).map(Number));
    }
}

// Initialize when DOM is ready
let plantSelector;
document.addEventListener('DOMContentLoaded', () => {
    plantSelector = new PlantSelector();
});
