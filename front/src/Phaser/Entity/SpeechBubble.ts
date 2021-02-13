import Scene = Phaser.Scene;
import {Character} from "./Character";

//todo: improve this WIP
export class SpeechBubble {
    private bubble: Phaser.GameObjects.Graphics;
    private content: Phaser.GameObjects.Text;

    
    constructor(scene: Scene, player: Character, text: string = "") {

        const bubbleHeight = 50;
        const bubblePadding = 10;
        const bubbleWidth = bubblePadding * 2 + text.length * 10;
        const arrowHeight = bubbleHeight / 4;

        this.bubble = scene.add.graphics({ x: 16, y: -80 });
        player.add(this.bubble);

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
        const point1X = Math.floor(bubbleWidth / 7);
        const point1Y = bubbleHeight;
        const point2X = Math.floor((bubbleWidth / 7) * 2);
        const point2Y = bubbleHeight;
        const point3X = Math.floor(bubbleWidth / 7);
        const point3Y = Math.floor(bubbleHeight + arrowHeight);

        //  bubble arrow shadow
        this.bubble.lineStyle(4, 0x222222, 0.5);
        this.bubble.lineBetween(point2X - 1, point2Y + 6, point3X + 2, point3Y);

        //  bubble arrow fill
        this.bubble.fillTriangle(point1X, point1Y, point2X, point2Y, point3X, point3Y);
        this.bubble.lineStyle(2, 0x565656, 1);
        this.bubble.lineBetween(point2X, point2Y, point3X, point3Y);
        this.bubble.lineBetween(point1X, point1Y, point3X, point3Y);

        this.content = scene.add.text(0, 0, text, { fontFamily: 'Arial', fontSize: '20', color: '#000000', align: 'center', wordWrap: { width: bubbleWidth - (bubblePadding * 2) } });
        player.add(this.content);

        const bounds = this.content.getBounds();
        this.content.setPosition(this.bubble.x + (bubbleWidth / 2) - (bounds.width / 2), this.bubble.y + (bubbleHeight / 2) - (bounds.height / 2));
    }

    destroy(): void {
        this.bubble.setVisible(false) //todo find a better way
        this.bubble.destroy();
        this.content.destroy();
    }
}
