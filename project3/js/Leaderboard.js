class Leaderboard {
    /**
     * Creates a new Leaderboard instance
     */
    constructor(maxEntries = 10) {
        this.maxEntries = maxEntries;
        this.scores = [];
        this.storageKey = 'aimTrainerLeaderboard';
        this.loadScores();
    }
    
    /**
     * Loads saved scores from localStorage
     */
    loadScores() {
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            this.scores = JSON.parse(saved);
        } else {
            this.scores = [];
        }
    }
    
    /**
     * Saves the current scores array to localStorage
     */
    saveScores() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.scores));
    }
    
    /**
     * Adds a new score entry to the leaderboard
     */
    addScore(score, accuracy) {
        const entry = {
            score: score,
            accuracy: accuracy,
            date: new Date().toISOString(),
            timestamp: Date.now()
        };
        
        this.scores.push(entry);
        this.scores.sort((a, b) => b.score - a.score);
        
        if (this.scores.length > this.maxEntries) {
            this.scores = this.scores.slice(0, this.maxEntries);
        }
        
        this.saveScores();
        return entry;
    }
    
    /**
     * Returns scores with ranking applied
     */
    getScores() {
        return this.scores.map((score, index) => ({
            ...score,
            rank: index + 1
        }));
    }
    
    /**
     * Gets the highest score on the leaderboard
     */
    getHighScore() {
        return this.scores.length > 0 ? this.scores[0].score : 0;
    }
    
    /**
     * Clears all leaderboard scores
     */
    clearScores() {
        this.scores = [];
        this.saveScores();
    }
    
    /**
     * Generates HTML markup for displaying the leaderboard
     */
    generateHTML() {
        if (this.scores.length === 0) {
            return '<div class="leaderboard-entry empty">No scores yet. Be the first!</div>';
        }
        
        return this.scores.map((score, index) => {
            const date = new Date(score.date);
            const formattedDate = date.toLocaleDateString();
            
            return `
                <div class="leaderboard-entry" data-rank="${index + 1}">
                    <div class="rank-score">
                        <div class="rank">#${index + 1}</div>
                        <div class="score">${score.score}</div>
                    </div>
                    <div class="accuracy-date">
                        <div class="accuracy">${score.accuracy}% Accuracy</div>
                        <div class="date">${formattedDate}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Renders the leaderboard into a DOM element
     */
    render(element) {
        if (element) {
            element.innerHTML = this.generateHTML();
        }
    }
}
