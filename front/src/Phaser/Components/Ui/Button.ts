export interface ButtonConfig {
    width: number;
    height: number;
    idle: ButtonAppearanceConfig;
    hover: ButtonAppearanceConfig;
    pressed: ButtonAppearanceConfig;
}

export interface ButtonAppearanceConfig {
    color: number;
    borderThickness: number;
    borderColor: number;
}

export class Button extends Phaser.GameObjects.Container {
    private background: Phaser.GameObjects.Graphics;
    private text: Phaser.GameObjects.Text;

    private config: ButtonConfig;

    constructor(scene: Phaser.Scene, x: number, y: number, config: ButtonConfig) {
        super(scene, x, y);

        this.config = config;

        this.background = this.scene.add.graphics();
        this.drawBackground(this.config.idle);
        this.text = this.scene.add.text(0, 0, "", { color: "0x000000" }).setOrigin(0.5);

        this.add([this.background, this.text]);

        this.setSize(this.config.width, this.config.height);
        this.setInteractive({ cursor: "pointer" });

        this.scene.add.existing(this);
    }

    public setText(text: string): void {
        this.text.setText(text);
    }

    private drawBackground(appearance: ButtonAppearanceConfig): void {
        this.background.clear();
        this.background.fillStyle(appearance.color);
        this.background.lineStyle(appearance.borderThickness, appearance.borderColor);

        const w = this.config.width;
        const h = this.config.height;

        this.background.fillRect(-w / 2, -h / 2, w, h);
        this.background.strokeRect(-w / 2, -h / 2, w, h);
    }
}
