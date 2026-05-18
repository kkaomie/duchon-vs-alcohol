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
        stats: 'utočík: 50 | dosah: riadok | životík: 50'
    },
    sunflower: {
        name: 'Slnkoň',
        description: 'je to naše slniečko (produkuje ich)',
        image: 'dsunflower.png',
        cost: 50,
        stats: 'slniečko/8s | nemá dosah, si sprostý? | životík: 20'
    }
};

class PlantSelector {
    constructor() {
        this.selectedPlants = [];
        this.unlockedPlants = new Set(['peashooter']); // Start with peashooter
        this.currentHoveredPlant = null;
        this.maxSelections = 5;
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.createUI();
        this.attachEventListeners();
    }

    createUI() {
        const levelsScreen = document.getElementById('levels-screen');
        
        // Create plant selector button
        const btn = document.createElement('button');
        btn.className = 'plant-selector-button';
        btn.textContent = '🌿';
        btn.id = 'plant-selector-btn';
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
                        <div class="plant-info-name" id="plant-info-name">Select a plant</div>
                        <div class="plant-info-description" id="plant-info-description">Click on plants from the codex to select or view them</div>
                        <div class="plant-info-stats" id="plant-info-stats">Výber duchoňov</div>
                    </div>
                </div>
                <div class="plant-selector-content">
                    <div class="plant-codex" id="plant-codex"></div>
                    <div class="plant-selected-list">
                        <div class="selected-count" id="selected-count">0 / 5 Selected</div>
                        <div class="selected-plants" id="selected-plants-list"></div>
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

        btn.addEventListener('click', () => this.show());
        backBtn.addEventListener('click', () => this.hide());
        codex.addEventListener('click', (e) => this.handlePlantClick(e));
        codex.addEventListener('mouseover', (e) => this.handlePlantHover(e));
    }

    renderCodex() {
        const codex = document.getElementById('plant-codex');
        codex.innerHTML = '';

        this.unlockedPlants.forEach(plantKey => {
            const plant = PLANT_DATABASE[plantKey];
            const isSelected = this.selectedPlants.includes(plantKey);
            
            const card = document.createElement('div');
            card.className = `plant-card ${isSelected ? 'selected' : ''}`;
            card.dataset.plant = plantKey;
            card.innerHTML = `
                <div class="plant-card-image">
                    <img src="./assets/${plant.image}" alt="${plant.name}" onerror="this.style.display='none'">
                </div>
                <div class="plant-card-name">${plant.name}</div>
                <div class="plant-card-cost">💰 ${plant.cost}</div>
            `;
            codex.appendChild(card);
        });
    }

    renderSelectedList() {
        const list = document.getElementById('selected-plants-list');
        const count = document.getElementById('selected-count');
        
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
    }

    handlePlantClick(e) {
        const card = e.target.closest('.plant-card');
        if (!card) return;

        const plantKey = card.dataset.plant;
        
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
        }
    }

    selectPlant(plantKey) {
        if (!this.selectedPlants.includes(plantKey) && this.selectedPlants.length < this.maxSelections) {
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
            document.getElementById('plant-info-name').textContent = plant.name;
            document.getElementById('plant-info-description').textContent = plant.description;
            document.getElementById('plant-info-stats').textContent = plant.stats;
        }
    }

    show() {
        const screen = document.getElementById('plant-selector-screen');
        const levelsScreen = document.getElementById('levels-screen');
        
        levelsScreen.style.display = 'none';
        levelsScreen.classList.add('hidden');
        screen.style.display = 'flex';
        screen.classList.remove('hidden');
    }

    hide() {
        const screen = document.getElementById('plant-selector-screen');
        const levelsScreen = document.getElementById('levels-screen');
        
        screen.style.display = 'none';
        screen.classList.add('hidden');
        levelsScreen.style.display = 'flex';
        levelsScreen.classList.remove('hidden');
    }

    unlockPlant(plantKey) {
        if (PLANT_DATABASE[plantKey] && !this.unlockedPlants.has(plantKey)) {
            this.unlockedPlants.add(plantKey);
            this.saveToStorage();
            this.renderCodex();
        }
    }

    getSelectedPlants() {
        return [...this.selectedPlants];
    }

    saveToStorage() {
        localStorage.setItem('selectedPlants', JSON.stringify(this.selectedPlants));
        localStorage.setItem('unlockedPlants', JSON.stringify([...this.unlockedPlants]));
    }

    loadFromStorage() {
        const saved = localStorage.getItem('selectedPlants');
        const unlockedSaved = localStorage.getItem('unlockedPlants');
        
        if (saved) this.selectedPlants = JSON.parse(saved);
        if (unlockedSaved) this.unlockedPlants = new Set(JSON.parse(unlockedSaved));
    }
}

// Initialize when DOM is ready
let plantSelector;
document.addEventListener('DOMContentLoaded', () => {
    plantSelector = new PlantSelector();
});
