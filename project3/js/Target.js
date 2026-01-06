class Target {
    /**
     * Creates a new Target instance
     */
    constructor(x, y, radius = 65) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.isActive = true;
        
        this.graphics = new PIXI.Graphics();
        this.drawTarget();
        
        this.graphics.x = x;
        this.graphics.y = y;
        
        this.graphics.eventMode = 'static';
        this.graphics.cursor = 'pointer';
        
        this.graphics.hitArea = new PIXI.Circle(0, 0, radius);
    }
    
    /**
     * Draws or redraws the target graphics
     */
    drawTarget() {
        this.graphics.clear();
        
        this.graphics.beginFill(0xFF0000);
        this.graphics.drawCircle(0, 0, this.radius);
        this.graphics.endFill();
        
        this.graphics.lineStyle(2, 0x990000);
        this.graphics.drawCircle(0, 0, this.radius);
    }
    
    /**
     * Determines whether a point hits the target
     */
    isHit(pointX, pointY) {
        const distance = Math.sqrt(
            Math.pow(pointX - this.x, 2) + 
            Math.pow(pointY - this.y, 2)
        );
        return distance <= this.radius;
    }
    
    /**
     * Plays a short hit animation and disables the target
     */
    animateHit() {
        return new Promise((resolve) => {
            this.isActive = false;
            
            this.graphics.visible = false;
            
            setTimeout(() => {
                resolve();
            }, 50);
        });
    }
    
    /**
     * Moves the target to a random position within bounds
     */
    moveToRandomPosition(maxX, maxY, padding = 100) {
        this.x = padding + Math.random() * (maxX - padding * 2);
        this.y = padding + Math.random() * (maxY - padding * 2);
        
        this.graphics.x = this.x;
        this.graphics.y = this.y;
        this.graphics.visible = true;
        this.isActive = true;
        
        this.drawTarget();
    }
    
    /**
     * Removes the target from the PIXI display tree
     */
    remove() {
        if (this.graphics && this.graphics.parent) {
            this.graphics.parent.removeChild(this.graphics);
        }
    }
}
