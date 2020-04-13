import Scene = Phaser.Scene;
import {PlayableCaracter} from "./PlayableCaracter";

export class SpeechBubble {
    private bubble: Phaser.GameObjects.Graphics;
    private content: Phaser.GameObjects.Text;

    constructor(scene: Scene, player: PlayableCaracter, text: string) {

        let bubbleHeight = 50;
        let bubblePadding = 10;
        let bubbleWidth = bubblePadding * 2 + text.length * 10;
        let arrowHeight = bubbleHeight / 4;

        this.bubble = scene.add.graphics({ x: player.x + 16, y: player.y - 80 });

        //  Bubble shadow
        this.bubble.fillStyle(0x222222, 0.5);
        this.bubble.fillRoundedRect(6, 6, bubbleWidth, bubbleHeight, 16);

        //  this.bubble color
        this.bubble.fillStyle(0xffffff, 1);

        //  this.bubble outline line style
        this.bubble.lineStyle(4, 0x565656, 1);

        //  this.bubble shape and outline
        this.bubble.strokeRoundedRect(0, 0, bubbleWidth, bubbleHeight, 16);
        this.bubble.fillRoundedRect(0, 0, bubbleWidth, bubbleHeight, 16);

        //  Calculate arrow coordinates
        let point1X = Math.floor(bubbleWidth / 7);
        let point1Y = bubbleHeight;
        let point2X = Math.floor((bubbleWidth / 7) * 2);
        let point2Y = bubbleHeight;
        let point3X = Math.floor(bubbleWidth / 7);
        let point3Y = Math.floor(bubbleHeight + arrowHeight);

        //  bubble arrow shadow
        this.bubble.lineStyle(4, 0x222222, 0.5);
        this.bubble.lineBetween(point2X - 1, point2Y + 6, point3X + 2, point3Y);

        //  bubble arrow fill
        this.bubble.fillTriangle(point1X, point1Y, point2X, point2Y, point3X, point3Y);
        this.bubble.lineStyle(2, 0x565656, 1);
        this.bubble.lineBetween(point2X, point2Y, point3X, point3Y);
        this.bubble.lineBetween(point1X, point1Y, point3X, point3Y);

        this.content = scene.add.text(0, 0, text, { fontFamily: 'Arial', fontSize: 20, color: '#000000', align: 'center', wordWrap: { width: bubbleWidth - (bubblePadding * 2) } });

        let bounds = this.content.getBounds();

        this.content.setPosition(this.bubble.x + (bubbleWidth / 2) - (bounds.width / 2), this.bubble.y + (bubbleHeight / 2) - (bounds.height / 2));
        
    }
    
    destroy(): void {
        this.bubble.setVisible(false) //todo find a better way
        this.content.destroy()
    }

}