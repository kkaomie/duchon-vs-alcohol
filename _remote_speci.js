/**
 * Special Level (Špeci) Modifier Selector System
 */

class SpeciLevel {
    constructor() {
        this.modifiers = {
            timeSpeed: 1.0,
            enemyDamage: 1.0,
            enemySpeed: 1.0,
            unlockedRows: 6,
            kosackonEnabled: true
        };
        this.history = [];
        this.currentScreen = 'main'; // 'main', 'modifiers', 'history'
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.createUI();
        this.attachEventListeners();
    }

    createUI() {
        // Create main speci screen
        const screen = document.createElement('div');
        screen.id = 'speci-level-screen';
        screen.className = 'screen hidden';
        screen.style.display = 'none';
        screen.style.backgroundImage = "url('./assets/specibcg.png')";
        screen.style.backgroundSize = 'cover';
        screen.style.backgroundPosition = 'center';
        screen.innerHTML = `
            <div class="speci-main-container">
                <button id="speci-play-btn" class="speci-button speci-large-btn">hrať hríčku²</button>
                <button id="speci-history-btn" class="speci-button speci-large-btn">história</button>
                <button id="speci-back-btn" class="speci-button speci-back-btn">ic het</button>
            </div>
        `;
        document.body.appendChild(screen);

        // Create modifiers screen
        const modifiersScreen = document.createElement('div');
        modifiersScreen.id = 'speci-modifiers-screen';
        modifiersScreen.className = 'screen hidden';
        modifiersScreen.style.display = 'none';
        modifiersScreen.style.background = 'linear-gradient(135deg, #1a3a1a 0%, #2d5a2d 100%)';
        modifiersScreen.style.overflowY = 'auto';
        modifiersScreen.innerHTML = `
            <button id="speci-modifiers-back-btn" class="back-button" style="top: 15px; left: 15px;">← Späť</button>
            <div class="speci-modifiers-container">
                <h2 class="speci-title">Vyber si úpravu úrovne</h2>
                
                <div class="speci-modifier-group">
                    <label>Rýchlosť času: <span id="timeSpeedValue">1.0x</span></label>
                    <input type="range" id="timeSpeedSlider" min="0.1" max="10" step="0.1" value="1.0" class="speci-slider">
                </div>

                <div class="speci-modifier-group">
                    <label>Poškodenie nepriateľov: <span id="enemyDamageValue">1.0x</span></label>
                    <input type="range" id="enemyDamageSlider" min="0.1" max="10" step="0.1" value="1.0" class="speci-slider">
                </div>

                <div class="speci-modifier-group">
                    <label>Rýchlosť nepriateľov: <span id="enemySpeedValue">1.0x</span></label>
                    <input type="range" id="enemySpeedSlider" min="0.1" max="10" step="0.1" value="1.0" class="speci-slider">
                </div>

                <div class="speci-modifier-group">
                    <label>Odomknuté riadky: <span id="unlockedRowsValue">6</span></label>
                    <input type="range" id="unlockedRowsSlider" min="1" max="6" step="1" value="6" class="speci-slider">
                </div>

                <div class="speci-modifier-group">
                    <label>
                        <input type="checkbox" id="kosackonCheckbox" checked>
                        Kosackon povolený
                    </label>
                </div>

                <button id="speci-play-modifiers-btn" class="speci-button speci-large-btn">Hrať</button>
            </div>
        `;
        document.body.appendChild(modifiersScreen);

        // Create history screen
        const historyScreen = document.createElement('div');
        historyScreen.id = 'speci-history-screen';
        historyScreen.className = 'screen hidden';
        historyScreen.style.display = 'none';
        historyScreen.style.background = 'linear-gradient(135deg, #1a3a1a 0%, #2d5a2d 100%)';
        historyScreen.style.overflowY = 'auto';
        historyScreen.innerHTML = `
            <button id="speci-history-back-btn" class="back-button" style="top: 15px; left: 15px;">← Späť</button>
            <div class="speci-history-container">
                <h2 class="speci-title">História špeci úrovne</h2>
                <div id="speci-history-list" class="speci-history-list"></div>
            </div>
        `;
        document.body.appendChild(historyScreen);
    }

    attachEventListeners() {
        const playBtn = document.getElementById('speci-play-btn');
        const historyBtn = document.getElementById('speci-history-btn');
        const backBtn = document.getElementById('speci-back-btn');
        const modifiersBackBtn = document.getElementById('speci-modifiers-back-btn');
        const playModifiersBtn = document.getElementById('speci-play-modifiers-btn');
        const historyBackBtn = document.getElementById('speci-history-back-btn');

        // Slider listeners
        const timeSpeedSlider = document.getElementById('timeSpeedSlider');
        const enemyDamageSlider = document.getElementById('enemyDamageSlider');
        const enemySpeedSlider = document.getElementById('enemySpeedSlider');
        const unlockedRowsSlider = document.getElementById('unlockedRowsSlider');
        const kosackonCheckbox = document.getElementById('kosackonCheckbox');

        if (playBtn) playBtn.addEventListener('click', () => this.showModifiers());
        if (historyBtn) historyBtn.addEventListener('click', () => this.showHistory());
        if (backBtn) backBtn.addEventListener('click', () => this.hide());
        if (modifiersBackBtn) modifiersBackBtn.addEventListener('click', () => this.showMain());
        if (playModifiersBtn) playModifiersBtn.addEventListener('click', () => this.startLevel());
        if (historyBackBtn) historyBackBtn.addEventListener('click', () => this.showMain());

        // Slider value updates
        if (timeSpeedSlider) {
            timeSpeedSlider.addEventListener('input', (e) => {
                this.modifiers.timeSpeed = parseFloat(e.target.value);
                document.getElementById('timeSpeedValue').textContent = this.modifiers.timeSpeed.toFixed(1) + 'x';
            });
        }
        if (enemyDamageSlider) {
            enemyDamageSlider.addEventListener('input', (e) => {
                this.modifiers.enemyDamage = parseFloat(e.target.value);
                document.getElementById('enemyDamageValue').textContent = this.modifiers.enemyDamage.toFixed(1) + 'x';
            });
        }
        if (enemySpeedSlider) {
            enemySpeedSlider.addEventListener('input', (e) => {
                this.modifiers.enemySpeed = parseFloat(e.target.value);
                document.getElementById('enemySpeedValue').textContent = this.modifiers.enemySpeed.toFixed(1) + 'x';
            });
        }
        if (unlockedRowsSlider) {
            unlockedRowsSlider.addEventListener('input', (e) => {
                this.modifiers.unlockedRows = parseInt(e.target.value);
                document.getElementById('unlockedRowsValue').textContent = this.modifiers.unlockedRows;
            });
        }
        if (kosackonCheckbox) {
            kosackonCheckbox.addEventListener('change', (e) => {
                this.modifiers.kosackonEnabled = e.target.checked;
            });
        }
    }

    show() {
        const screen = document.getElementById('speci-level-screen');
        if (screen) {
            screen.style.display = 'flex';
            screen.classList.remove('hidden');
        }
        this.currentScreen = 'main';
    }

    hide() {
        const screen = document.getElementById('speci-level-screen');
        const modifiersScreen = document.getElementById('speci-modifiers-screen');
        const historyScreen = document.getElementById('speci-history-screen');
        
        if (screen) {
            screen.style.display = 'none';
            screen.classList.add('hidden');
        }
        if (modifiersScreen) {
            modifiersScreen.style.display = 'none';
            modifiersScreen.classList.add('hidden');
        }
        if (historyScreen) {
            historyScreen.style.display = 'none';
            historyScreen.classList.add('hidden');
        }
        
        // Show levels screen
        const levelsScreen = document.getElementById('levels-screen');
        if (levelsScreen) {
            levelsScreen.style.display = 'flex';
            levelsScreen.classList.remove('hidden');
        }
    }

    showModifiers() {
        const screen = document.getElementById('speci-level-screen');
        const modifiersScreen = document.getElementById('speci-modifiers-screen');
        
        if (screen) {
            screen.style.display = 'none';
            screen.classList.add('hidden');
        }
        if (modifiersScreen) {
            modifiersScreen.style.display = 'flex';
            modifiersScreen.classList.remove('hidden');
        }
        this.currentScreen = 'modifiers';
    }

    showMain() {
        const screen = document.getElementById('speci-level-screen');
        const modifiersScreen = document.getElementById('speci-modifiers-screen');
        const historyScreen = document.getElementById('speci-history-screen');
        
        if (screen) {
            screen.style.display = 'flex';
            screen.classList.remove('hidden');
        }
        if (modifiersScreen) {
            modifiersScreen.style.display = 'none';
            modifiersScreen.classList.add('hidden');
        }
        if (historyScreen) {
            historyScreen.style.display = 'none';
            historyScreen.classList.add('hidden');
        }
        this.currentScreen = 'main';
    }

    showHistory() {
        const screen = document.getElementById('speci-level-screen');
        const historyScreen = document.getElementById('speci-history-screen');
        
        if (screen) {
            screen.style.display = 'none';
            screen.classList.add('hidden');
        }
        if (historyScreen) {
            historyScreen.style.display = 'flex';
            historyScreen.classList.remove('hidden');
        }
        
        this.renderHistory();
        this.currentScreen = 'history';
    }

    renderHistory() {
        const historyList = document.getElementById('speci-history-list');
        if (!historyList) return;
        
        if (this.history.length === 0) {
            historyList.innerHTML = '<p style="color: white; text-align: center;">Zatiaľ žiadna história</p>';
            return;
        }
        
        historyList.innerHTML = '';
        this.history.forEach((entry, index) => {
            const item = document.createElement('div');
            item.className = 'speci-history-item';
            item.innerHTML = `
                <div class="speci-history-title">Pokus #${index + 1}</div>
                <div class="speci-history-details">
                    <div>Čas: ${entry.timeSpeed.toFixed(1)}x</div>
                    <div>Poškodenie: ${entry.enemyDamage.toFixed(1)}x</div>
                    <div>Rýchlosť: ${entry.enemySpeed.toFixed(1)}x</div>
                    <div>Riadky: ${entry.unlockedRows}</div>
                    <div>Kosackon: ${entry.kosackonEnabled ? 'Áno' : 'Nie'}</div>
                </div>
            `;
            historyList.appendChild(item);
        });
    }

    startLevel() {
        // Store current modifiers for the level
        window.speciModifiers = {
            timeSpeed: this.modifiers.timeSpeed,
            enemyDamage: this.modifiers.enemyDamage,
            enemySpeed: this.modifiers.enemySpeed,
            unlockedRows: this.modifiers.unlockedRows,
            kosackonEnabled: this.modifiers.kosackonEnabled
        };

        // Close speci screens and start game
        const levelsScreen = document.getElementById('levels-screen');
        const modifiersScreen = document.getElementById('speci-modifiers-screen');
        const gameScreen = document.getElementById('game-screen');

        if (modifiersScreen) {
            modifiersScreen.style.display = 'none';
            modifiersScreen.classList.add('hidden');
        }
        if (levelsScreen) {
            levelsScreen.style.display = 'none';
            levelsScreen.classList.add('hidden');
        }
        if (gameScreen) {
            gameScreen.style.display = 'flex';
            gameScreen.classList.remove('hidden');
        }

        // Start the special level (level 99 or use a special marker)
        if (typeof window.initGame === 'function') {
            window.initGame(99); // 99 is the special level marker
        }
    }

    addToHistory(modifiers) {
        this.history.push({...modifiers});
        this.saveToStorage();
    }

    levelCompleted() {
        this.addToHistory(this.modifiers);
    }

    resetHistory() {
        this.history = [];
        this.saveToStorage();
    }

    saveToStorage() {
        localStorage.setItem('speciLevelHistory', JSON.stringify(this.history));
    }

    loadFromStorage() {
        const saved = localStorage.getItem('speciLevelHistory');
        if (saved) {
            this.history = JSON.parse(saved);
        }
    }
}

// Initialize when needed
let speciLevel;
document.addEventListener('DOMContentLoaded', () => {
    speciLevel = new SpeciLevel();
});
