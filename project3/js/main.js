/**
 * Enumeration of possible game states
 */
const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    GAME_OVER: 'game_over'
};

class AimTrainer {
    constructor() {
        this.state = GameState.MENU;
        this.score = 0;
        this.timeLeft = 30;
        this.totalClicks = 0;
        this.hits = 0;
        this.targets = [];
        this.gameLoop = null;
        this.lastTime = 0;
        this.soundEnabled = true;
        
        this.app = null;
        this.leaderboard = new Leaderboard();
        
        this.dom = {};
        
        this.sounds = {
            click: new Audio('media/click.mp3'),
            miss: new Audio('media/miss.mp3'),
            gameOver: new Audio('media/game-over.mp3')
        };
        
        this.initializeSounds();
    }
    
    /**
     * Initialize sound volumes and preload audio assets
     */
    initializeSounds() {
        this.sounds.click.volume = 0.4;
        this.sounds.miss.volume = 0.3;
        this.sounds.gameOver.volume = 0.5;
        
        Object.values(this.sounds).forEach(sound => {
            sound.load();
        });
    }
    
    /**
     * Play a named sound effect if sound is enabled
     */
    playSound(soundName) {
        if (!this.soundEnabled) return;
        
        const sound = this.sounds[soundName];
        if (!sound) return;
        
        try {
            sound.currentTime = 0;
            sound.play();
        } catch (error) {}
    }

    /**
     * Toggle sound on/off and update UI button text
     */
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        const text = this.soundEnabled ? 'SOUND: ON' : 'SOUND: OFF';
        this.dom.soundToggleBtn.textContent = text;
    }
    
    /**
     * Initialize the game
     */
    init() {
        this.initDOM();
        this.setupEventListeners();
        this.initPixi();
        this.updateHighScore();
        this.leaderboard.render(this.dom.leaderboard);
    }
    
    /**
     * Cache frequently used DOM elements
     */
    initDOM() {
        this.dom = {
            gameScreen: document.getElementById('gameScreen'),
            hud: document.getElementById('hud'),
            
            timer: document.getElementById('timer'),
            score: document.getElementById('score'),
            highScore: document.getElementById('highScore'),
            
            menuOverlay: document.getElementById('menuOverlay'),
            leaderboardPanel: document.getElementById('leaderboardPanel'),
            gameOverOverlay: document.getElementById('gameOverOverlay'),
            
            startBtn: document.getElementById('startBtn'),
            leaderboardBtn: document.getElementById('leaderboardBtn'),
            soundToggleBtn: document.getElementById('soundToggleBtn'),
            clearScoresBtn: document.getElementById('clearScoresBtn'),
            playAgainBtn: document.getElementById('playAgainBtn'),
            menuBtn: document.getElementById('menuBtn'),
            
            finalScore: document.getElementById('finalScore'),
            finalAccuracy: document.getElementById('finalAccuracy'),
            targetsHit: document.getElementById('targetsHit'),
            
            leaderboard: document.getElementById('leaderboard')
        };
    }
    
    /**
     * Register UI and keyboard event listeners
     */
    setupEventListeners() {
        this.dom.startBtn.addEventListener('click', () => this.startGame());
        this.dom.leaderboardBtn.addEventListener('click', () => this.toggleLeaderboard());
        this.dom.soundToggleBtn.addEventListener('click', () => this.toggleSound());
        
        this.dom.clearScoresBtn.addEventListener('click', () => this.clearLeaderboard());
        
        this.dom.playAgainBtn.addEventListener('click', () => this.startGame());
        this.dom.menuBtn.addEventListener('click', () => this.showMenu());
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Enter' && this.state === GameState.MENU) {
                this.startGame();
            }
        });
    }
    
    /**
     * Handle missed clicks (clicks not hitting a target)
     */
    handleMiss() {
        this.totalClicks++;
        
        this.playSound('miss');
        
        this.updateUI();
    }
    
    /**
     * Initialize PixiJS application and stage interactions
     */
    initPixi() {
        try {
            this.app = new PIXI.Application({
                width: window.innerWidth,
                height: window.innerHeight,
                backgroundColor: 0x1a1a2e,
                antialias: true,
                resolution: window.devicePixelRatio || 1,
                eventMode: 'static'
            });
            
            this.dom.gameScreen.innerHTML = '';
            this.dom.gameScreen.appendChild(this.app.view);
            
            this.app.view.style.width = '100%';
            this.app.view.style.height = '100%';
            this.app.view.style.display = 'block';
            this.app.view.style.cursor = 'crosshair';
            
            this.app.stage.eventMode = 'static';
            this.app.stage.hitArea = this.app.screen;
            
            this.app.stage.on('pointerdown', (event) => {
                if (this.state === GameState.PLAYING) {
                    const clickX = event.global.x;
                    const clickY = event.global.y;
                    
                    let hitTarget = false;
                    for (const target of this.targets) {
                        if (target.isActive && target.isHit(clickX, clickY)) {
                            hitTarget = true;
                            break;
                        }
                    }
                    
                    if (!hitTarget) {
                        this.handleMiss();
                    }
                }
            });
            
            window.addEventListener('resize', () => {
                this.resizeApp();
            });
            
        } catch (error) {
            this.dom.gameScreen.innerHTML = '<div style="color: #f1f1f1; padding: 20px; background: #1a1a2e;">Failed to load game graphics. Please refresh.</div>';
        }
    }
    
    /**
     * Resize PixiJS renderer and reposition targets on window resize
     */
    resizeApp() {
        if (!this.app) return;
        
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.app.renderer.resize(width, height);
        
        this.app.stage.hitArea = this.app.screen;
        
        if (this.state === GameState.PLAYING) {
            this.repositionTargets();
        }
    }
    
    /**
     * Start a new game session and reset all gameplay values
     */
    startGame() {
        this.dom.menuOverlay.classList.remove('active');
        this.dom.gameOverOverlay.classList.remove('active');
        this.hideLeaderboard();
        
        this.score = 0;
        this.timeLeft = 30;
        this.totalClicks = 0;
        this.hits = 0;
        
        this.clearTargets();
        
        this.createTargets(3);
        
        this.updateUI();
        
        this.state = GameState.PLAYING;
        this.lastTime = performance.now();
        
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
        }
        
        this.gameLoop = requestAnimationFrame((timestamp) => this.gameUpdate(timestamp));
    }
    
    /**
     * Return to the main menu and stop gameplay loop
     */
    showMenu() {
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
            this.gameLoop = null;
        }
        
        this.state = GameState.MENU;
        this.dom.menuOverlay.classList.add('active');
        this.dom.gameOverOverlay.classList.remove('active');
        this.hideLeaderboard();
        
        this.updateHighScore();
    }
    
    /**
     * Toggle leaderboard panel visibility
     */
    toggleLeaderboard() {
        if (this.dom.leaderboardPanel.classList.contains('active')) {
            this.hideLeaderboard();
        } else {
            this.showLeaderboard();
        }
    }
    
    /**
     * Display leaderboard panel
     */
    showLeaderboard() {
        this.dom.leaderboardPanel.classList.add('active');
        this.leaderboard.render(this.dom.leaderboard);
    }
    
    /**
     * Hide leaderboard panel
     */
    hideLeaderboard() {
        this.dom.leaderboardPanel.classList.remove('active');
    }
    
    /**
     * Show game-over overlay
     */
    showGameOver() {
        this.dom.gameOverOverlay.classList.add('active');
    }
    
    /**
     * Remove all targets from stage and reset target list
     */
    clearTargets() {
        this.targets.forEach(target => {
            if (target && target.graphics && target.graphics.parent) {
                target.graphics.parent.removeChild(target.graphics);
            }
        });
        this.targets = [];
        
        if (this.app && this.app.stage) {
            this.app.stage.removeChildren();
        }
    }
    
    /**
     * Create a specified number of targets at random positions
     */
    createTargets(count) {
        if (!this.app) return;
        
        const width = this.app.screen.width;
        const height = this.app.screen.height;
        
        this.clearTargets();
        
        for (let i = 0; i < count; i++) {
            try {
                const padding = 120;
                const x = padding + Math.random() * (width - padding * 2);
                const y = padding + Math.random() * (height - padding * 2);
                
                const target = new Target(x, y, 65);
                
                target.graphics.on('pointerdown', (event) => {
                    this.handleTargetClick(target, event);
                });
                
                this.app.stage.addChild(target.graphics);
                this.targets.push(target);
                
            } catch (error) {}
        }
    }
    
    /**
     * Reposition all active targets randomly within bounds
     */
    repositionTargets() {
        if (!this.app || this.targets.length === 0) return;
        
        const width = this.app.screen.width;
        const height = this.app.screen.height;
        const padding = 120;
        
        this.targets.forEach(target => {
            if (target) {
                target.moveToRandomPosition(width, height, padding);
            }
        });
    }
    
    /**
     * Handle successful target click events
     */
    handleTargetClick(target, event) {
        if (!target || !target.isActive || this.state !== GameState.PLAYING) return;
        
        this.totalClicks++;
        this.hits++;
        this.score += 10;
        
        this.playSound('click');
        
        target.animateHit().then(() => {
            const width = this.app.screen.width;
            const height = this.app.screen.height;
            const padding = 120;
            
            target.moveToRandomPosition(width, height, padding);
            
            this.updateUI();
        });
        
        this.updateUI();
        
        event.stopPropagation();
    }
    
    /**
     * Main game loop update (called via requestAnimationFrame)
     */
    gameUpdate(timestamp) {
        if (this.state !== GameState.PLAYING) return;
        
        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        
        this.timeLeft -= deltaTime;
        
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.endGame();
            return;
        }
        
        this.updateUI();
        
        this.gameLoop = requestAnimationFrame((ts) => this.gameUpdate(ts));
    }
    
    /**
     * Update HUD elements (timer, score, high score)
     */
    updateUI() {
        const timerElement = this.dom.timer;
        timerElement.textContent = `${this.timeLeft.toFixed(1)}s`;
        
        timerElement.classList.remove('timer-warning', 'timer-critical');
        if (this.timeLeft < 10) {
            timerElement.classList.add('timer-critical');
        } else if (this.timeLeft < 20) {
            timerElement.classList.add('timer-warning');
        }
        
        this.dom.score.textContent = this.score;
        
        const currentHighScore = parseInt(this.dom.highScore.textContent) || 0;
        if (this.score > currentHighScore) {
            this.dom.highScore.textContent = this.score;
        }
    }
    
    /**
     * Update displayed high score from leaderboard data
     */
    updateHighScore() {
        const best = this.leaderboard.getHighScore();
        this.dom.highScore.textContent = best;
    }
    
    /**
     * End the game, calculate accuracy, save score, and show game-over screen
     */
    endGame() {
        this.state = GameState.GAME_OVER;
        
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
            this.gameLoop = null;
        }
        
        this.playSound('gameOver');
        
        const accuracy = this.totalClicks > 0 ? 
            Math.round((this.hits / this.totalClicks) * 100) : 100;
        
        this.dom.finalScore.textContent = this.score;
        this.dom.finalAccuracy.textContent = `${accuracy}%`;
        this.dom.targetsHit.textContent = this.hits;
        
        this.leaderboard.addScore(this.score, accuracy);
        this.leaderboard.render(this.dom.leaderboard);
        
        this.updateHighScore();
        
        this.showGameOver();
    }
    
    /**
     * Clear all leaderboard scores after user confirmation
     */
    clearLeaderboard() {
        if (confirm('Are you sure you want to clear all scores?')) {
            this.leaderboard.clearScores();
            this.leaderboard.render(this.dom.leaderboard);
            this.updateHighScore();
        }
    }
}

/**
 * Ensures PixiJS is loaded before starting the game
 */
document.addEventListener('DOMContentLoaded', () => {
    if (typeof PIXI === 'undefined') {
        document.body.innerHTML = '<div style="color: #f1f1f1; padding: 20px; background: #1a1a2e;">Error: PixiJS failed to load. Check console.</div>';
        return;
    }
    
    const game = new AimTrainer();
    game.init();
    window.game = game;
});