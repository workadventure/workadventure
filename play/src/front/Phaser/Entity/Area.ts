import { AreaData, AtLeast } from "@workadventure/map-editor";
import { GameScene } from "../Game/GameScene";
import { merge } from "lodash";

export class Area extends Phaser.GameObjects.Rectangle {
    private areaCollider: Phaser.Physics.Arcade.Collider | undefined = undefined;

    constructor(public readonly scene: GameScene, public areaData: AreaData, collide?: boolean) {
        super(
            scene,
            areaData.x + areaData.width * 0.5,
            areaData.y + areaData.height * 0.5,
            areaData.width,
            areaData.height,
            0xff0000,
            0.1
        );
        this.scene.add.existing(this).setVisible(true);
        this.scene.physics.add.existing(this, true);
        if (collide) {
            this.applyCollider();
        }
    }

    public updateArea(newAreaData: AtLeast<AreaData, "id">, collide?: boolean) {
        this.areaData = merge(this.areaData, newAreaData);
        this.setPosition(this.areaData.x + this.areaData.width * 0.5, this.areaData.y + this.areaData.height * 0.5);
        this.setSize(this.areaData.width, this.areaData.height);
        this.updateDisplayOrigin();
        this.update();
        const areaStaticBody = this.body as Phaser.Physics.Arcade.StaticBody;
        areaStaticBody.updateFromGameObject();

        if (collide) {
            this.applyCollider();
        } else if (this.areaCollider !== undefined) {
            this.areaCollider.destroy();
            this.areaCollider = undefined;
        }
    }

    public highLightArea(): void {
        this.setVisible(true);
        setTimeout(() => this.setVisible(false), 1000);
    }

    private applyCollider() {
        if (this.areaCollider === undefined) {
            this.areaCollider = this.scene.physics.add.collider(this.scene.CurrentPlayer, this, () => {
                this.highLightArea();
            });
        }
    }
}
