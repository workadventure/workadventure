import { AreaData, AtLeast } from "@workadventure/map-editor";
import { merge } from "lodash";
import { get } from "svelte/store";
import { GameScene } from "../Game/GameScene";
import { warningMessageStore } from "../../Stores/ErrorStore";
import LL from "../../../i18n/i18n-svelte";
import { gameManager } from "../Game/GameManager";

export class Area extends Phaser.GameObjects.Rectangle {
    private areaCollider: Phaser.Physics.Arcade.Collider | undefined = undefined;
    private areaOverlap: Phaser.Physics.Arcade.Collider | undefined = undefined;
    private userHasCollideWithArea = false;
    private highlightTimeOut: undefined | NodeJS.Timeout = undefined;
    private collideTimeOut: undefined | NodeJS.Timeout = undefined;

    constructor(
        public readonly scene: GameScene,
        public areaData: AreaData,
        collide?: boolean,
        overlap?: boolean,
        // FIXME: remove this, this is useless
        private connection = gameManager.getCurrentGameScene().connection
    ) {
        super(
            scene,
            areaData.x + areaData.width * 0.5,
            areaData.y + areaData.height * 0.5,
            areaData.width,
            areaData.height,
            collide ? 0xff0000 : overlap ? 0x0000ff : 0x000000,
            collide || overlap ? 0.1 : 0
        );
        this.scene.add.existing(this).setVisible(false);
        this.scene.physics.add.existing(this, true);
        if (collide) {
            this.applyCollider();
        }
    }

    public updateArea(newAreaData: AtLeast<AreaData, "id">, collide?: boolean) {
        merge(this.areaData, newAreaData);
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
        } else if (this.areaOverlap !== undefined) this.areaOverlap.destroy();
        this.areaOverlap = undefined;
    }

    destroy(fromScene?: boolean) {
        super.destroy(fromScene);

        if (this.highlightTimeOut !== undefined) {
            clearTimeout(this.highlightTimeOut);
        }
        if (this.collideTimeOut !== undefined) {
            clearTimeout(this.collideTimeOut);
        }
    }

    private applyCollider() {
        if (this.areaCollider === undefined) {
            this.areaCollider = this.scene.physics.add.collider(this.scene.CurrentPlayer, this, () =>
                this.onCollideAction()
            );
        }
    }

    public highLightArea(permanent = false) {
        this.setVisible(true);
        if (permanent === false) this.highlightTimeOut = setTimeout(() => this.setVisible(false), 1000);
    }

    public unHighLightArea() {
        this.setVisible(false);
        if (this.highlightTimeOut) clearTimeout(this.highlightTimeOut);
    }

    private displayWarningMessageOnCollide() {
        warningMessageStore.addWarningMessage(get(LL).area.noAccess());
    }

    private onCollideAction() {
        if (!this.userHasCollideWithArea) {
            this.userHasCollideWithArea = true;
            this.highLightArea();
            this.displayWarningMessageOnCollide();
            this.collideTimeOut = setTimeout(() => (this.userHasCollideWithArea = false), 3000);
        }
    }
}
