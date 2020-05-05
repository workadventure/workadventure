import {PlayerAnimationNames} from "../Player/Animation";
import {SpeechBubble} from "./SpeechBubble";
import BitmapText = Phaser.GameObjects.BitmapText;

export const PLAYER_RESOURCES: Array<any> = [
    {name: "male1", img: "resources/characters/pipoya/Male 01-1.png", x: 32, y: 32},
    {name: "male2", img: "resources/characters/pipoya/Male 02-2.png", x: 64, y: 32},
    {name: "male3", img: "resources/characters/pipoya/Male 03-4.png", x: 96, y: 32},
    {name: "male4", img: "resources/characters/pipoya/Male 09-1.png", x: 128, y: 32},

    {name: "male5", img: "resources/characters/pipoya/Male 10-3.png", x: 32, y: 64},
    {name: "male6", img: "resources/characters/pipoya/Male 17-2.png", x: 64, y: 64},
    {name: "male7", img: "resources/characters/pipoya/Male 18-1.png", x: 96, y: 64},
    {name: "male8", img: "resources/characters/pipoya/Male 16-4.png", x: 128, y: 64},

    {name: "Female1", img: "resources/characters/pipoya/Female 01-1.png", x: 32, y: 96},
    {name: "Female2", img: "resources/characters/pipoya/Female 02-2.png", x: 64, y: 96},
    {name: "Female3", img: "resources/characters/pipoya/Female 03-4.png", x: 96, y: 96},
    {name: "Female4", img: "resources/characters/pipoya/Female 09-1.png", x: 128, y: 96},

    {name: "Female5", img: "resources/characters/pipoya/Female 10-3.png", x: 32, y: 128},
    {name: "Female6", img: "resources/characters/pipoya/Female 17-2.png", x: 64, y: 128},
    {name: "Female7", img: "resources/characters/pipoya/Female 18-1.png", x: 96, y: 128},
    {name: "Female8", img: "resources/characters/pipoya/Female 16-4.png", x: 128, y: 128}
];

export class PlayableCaracter extends Phaser.Physics.Arcade.Sprite {
    private bubble: SpeechBubble;
    private playerName: BitmapText;
    public PlayerValue: string;
    public PlayerTexture: string;


    constructor(scene: Phaser.Scene, x: number, y: number, texture: string, name: string, frame?: string | number) {
        super(scene, x, y, texture, frame);

        this.PlayerValue = name;
        this.PlayerTexture = texture;
        this.playerName = new BitmapText(scene, x, y - 25, 'main_font', name, 8);
        this.playerName.setOrigin(0.5).setCenterAlign();
        scene.add.existing(this.playerName);

        this.scene.sys.updateList.add(this);
        this.scene.sys.displayList.add(this);
        //this.setScale(2);
        this.scene.physics.world.enableBody(this);
        this.setImmovable(true);
        this.setCollideWorldBounds(true);
        this.setSize(16, 16); //edit the hitbox to better match the caracter model
        this.setOffset(8, 16);
    }

    move(x: number, y: number) {

        this.setVelocity(x, y);

        //up or down animationss are prioritized over left and right
        if (this.body.velocity.y < 0) { //moving up
            this.play(`${this.PlayerTexture}-${PlayerAnimationNames.WalkUp}`, true);
        } else if (this.body.velocity.y > 0) { //moving down
            this.play(`${this.PlayerTexture}-${PlayerAnimationNames.WalkDown}`, true);
        } else if (this.body.velocity.x > 0) { //moving right
            this.play(`${this.PlayerTexture}-${PlayerAnimationNames.WalkRight}`, true);
        } else if (this.body.velocity.x < 0) { //moving left
            this.anims.playReverse(`${this.PlayerTexture}-${PlayerAnimationNames.WalkLeft}`, true);
        }

        if (this.bubble) {
            this.bubble.moveBubble(this.x, this.y);
        }
        this.updatePlayerNamePosition(this.x, this.y);
    }

    updatePlayerNamePosition(x: number, y: number){
        this.playerName.setPosition(x, y - 25);
    }

    stop(){
        this.setVelocity(0, 0);
        this.play(PlayerAnimationNames.None, true);
    }

    say(text: string) {
        if (this.bubble) return;
        this.bubble = new SpeechBubble(this.scene, this, text)
        //todo make the bubble destroy on player movement?
        setTimeout(() => {
            this.bubble.destroy();
            this.bubble = null;
        }, 3000)
    }

    destroy(fromScene?: boolean): void {
        super.destroy(fromScene);
        this.playerName.destroy();
    }
}
