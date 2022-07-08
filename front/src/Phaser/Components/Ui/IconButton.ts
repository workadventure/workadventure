export interface IconButtonConfig {
    width: number;
    height: number;
    iconTextureKey: string;
    idle: IconButtonAppearanceConfig;
    hover: IconButtonAppearanceConfig;
    pressed: IconButtonAppearanceConfig;
    selected: IconButtonAppearanceConfig;
    iconScale?: number;
}

export interface IconButtonAppearanceConfig {
    color: number;
    borderThickness: number;
    borderColor: number;
}

export enum IconButtonEvent {
    Clicked = "IconButton:Clicked",
}

export class IconButton extends Phaser.GameObjects.Container {
    private background: Phaser.GameObjects.Graphics;
    private icon: Phaser.GameObjects.Image;

    private config: IconButtonConfig;

    private hovered = false;
    private pressed = false;
    private selected = false;

    constructor(scene: Phaser.Scene, x: number, y: number, config: IconButtonConfig) {
        super(scene, x, y);

        this.config = config;

        this.background = this.scene.add.graphics();
        this.icon = this.scene.add.image(0, 0, this.config.iconTextureKey).setScale(config.iconScale ?? 1);
        this.drawBackground(this.config.idle);

        this.add([this.background, this.icon]);

        this.setSize(this.config.width, this.config.height);
        this.setInteractive({ cursor: "pointer" });

        this.bindEventHandlers();

        this.scene.add.existing(this);
    }

    public select(select = true): void {
        if (this.selected === select) {
            return;
        }
        this.selected = select;
        this.updateButtonAppearance();
    }

    private updateButtonAppearance(): void {
        if (this.selected) {
            this.drawBackground(this.config.selected);
            return;
        }
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

    private drawBackground(appearance: IconButtonAppearanceConfig): void {
        this.background.clear();
        this.background.fillStyle(appearance.color);
        this.background.lineStyle(appearance.borderThickness, appearance.borderColor);

        const w = this.config.width;
        const h = this.config.height;

        this.background.fillRect(-w / 2, -h / 2, w, h);
        this.background.strokeRect(-w / 2, -h / 2, w, h);
    }

    private bindEventHandlers(): void {
        this.on(Phaser.Input.Events.POINTER_OVER, () => {
            if (this.selected) {
                return;
            }
            this.hovered = true;
            this.updateButtonAppearance();
        });
        this.on(Phaser.Input.Events.POINTER_OUT, () => {
            this.hovered = false;
            this.pressed = false;
            this.updateButtonAppearance();
        });
        this.on(Phaser.Input.Events.POINTER_DOWN, () => {
            if (this.selected) {
                return;
            }
            this.pressed = true;
            this.updateButtonAppearance();
        });
        this.on(Phaser.Input.Events.POINTER_UP, () => {
            if (this.selected) {
                return;
            }
            this.pressed = false;
            this.updateButtonAppearance();
            this.emit(IconButtonEvent.Clicked, this.selected);
        });
    }
}
