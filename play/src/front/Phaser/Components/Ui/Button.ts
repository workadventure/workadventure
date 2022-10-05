export interface ButtonConfig {
    width: number;
    height: number;
    idle: ButtonAppearanceConfig;
    hover: ButtonAppearanceConfig;
    pressed: ButtonAppearanceConfig;
}

export interface ButtonAppearanceConfig {
    textColor: string;
    color: number;
    borderThickness: number;
    borderColor: number;
}

export class Button extends Phaser.GameObjects.Container {
    private background: Phaser.GameObjects.Graphics;
    private text: Phaser.GameObjects.Text;

    private config: ButtonConfig;

    private hovered = false;
    private pressed = false;

    constructor(scene: Phaser.Scene, x: number, y: number, config: ButtonConfig) {
        super(scene, x, y);

        this.config = config;

        this.background = this.scene.add.graphics();
        this.text = this.scene.add
            .text(0, 0, "", {
                color: "0x000000",
                fontFamily: '"Press Start 2P"',
                fontSize: "9px",
            })
            .setOrigin(0.5, 0.45);
        this.drawBackground(this.config.idle);

        this.add([this.background, this.text]);

        this.setSize(this.config.width, this.config.height);
        this.setInteractive({ cursor: "pointer" });

        this.bindEventHandlers();

        this.scene.add.existing(this);
    }

    public setText(text: string): void {
        this.text.setText(text);
    }

    private updateButtonAppearance(): void {
        if (this.pressed) {
            this.drawBackground(this.config.pressed);
            return;
        }
        if (this.hovered) {
            this.drawBackground(this.config.hover);
            return;
        }
        this.drawBackground(this.config.idle);
    }

    private drawBackground(appearance: ButtonAppearanceConfig): void {
        this.background.clear();
        this.background.fillStyle(appearance.color);
        this.background.lineStyle(appearance.borderThickness, appearance.borderColor);

        const w = this.config.width;
        const h = this.config.height;

        this.background.fillRect(-w / 2, -h / 2, w, h);
        this.background.strokeRect(-w / 2, -h / 2, w, h);

        this.text.setColor(appearance.textColor);
    }

    private bindEventHandlers(): void {
        this.on(Phaser.Input.Events.POINTER_OVER, () => {
            this.hovered = true;
            this.updateButtonAppearance();
        });
        this.on(Phaser.Input.Events.POINTER_OUT, () => {
            this.hovered = false;
            this.pressed = false;
            this.updateButtonAppearance();
        });
        this.on(Phaser.Input.Events.POINTER_DOWN, () => {
            this.pressed = true;
            this.updateButtonAppearance();
        });
        this.on(Phaser.Input.Events.POINTER_UP, () => {
            this.pressed = false;
            this.updateButtonAppearance();
        });
    }
}
