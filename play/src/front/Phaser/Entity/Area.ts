import type { AreaData, AtLeast, LockableAreaPropertyData } from "@workadventure/map-editor";
import { merge } from "lodash";
import { get } from "svelte/store";
import type { GameScene } from "../Game/GameScene";

import LL from "../../../i18n/i18n-svelte";
import { gameManager } from "../Game/GameManager";
import type { AreasManager } from "../Game/GameMap/AreasManager";
import { setAreaPropertyVariable } from "../../Stores/AreaPropertyVariablesStore";
import { touchScreenManager } from "../../Touch/TouchScreenManager";

export class Area extends Phaser.GameObjects.Rectangle {
    private areaCollider: Phaser.Physics.Arcade.Collider | undefined = undefined;
    private userHasCollideWithArea = false;
    private highlightTimeOut: undefined | NodeJS.Timeout = undefined;
    private collideTimeOut: undefined | NodeJS.Timeout = undefined;

    constructor(
        public readonly scene: GameScene,
        public areaData: AreaData,
        overlap?: boolean,
        // FIXME: remove this, this is useless
        private connection = gameManager.getCurrentGameScene().connection,
        private areasManager?: AreasManager
    ) {
        const collide = areasManager?.shouldAreaCollide(areaData.id) ?? false;
        super(
            scene,
            areaData.x + areaData.width * 0.5,
            // Because of a limit bug, we add one pixel at the top of the area to be sure the Woka feet don't get into the zone.
            areaData.y + areaData.height * 0.5 - 1,
            areaData.width,
            areaData.height + 1,
            collide ? 0xff0000 : overlap ? 0x0000ff : 0x000000,
            collide || overlap ? 0.1 : 0
        );
        this.scene.add.existing(this).setVisible(false);
        this.scene.physics.add.existing(this, true);
        if (collide) {
            this.applyCollider();
        }
    }

    public updateArea(newAreaData: AtLeast<AreaData, "id">) {
        merge(this.areaData, newAreaData);
        // Because of a limit bug, we add one pixel at the top of the area to be sure the Woka feet don't get into the zone.
        this.setPosition(this.areaData.x + this.areaData.width * 0.5, this.areaData.y + this.areaData.height * 0.5 - 1);
        this.setSize(this.areaData.width, this.areaData.height + 1);
        this.updateDisplayOrigin();
        this.update();
        const areaStaticBody = this.body as Phaser.Physics.Arcade.StaticBody;
        areaStaticBody.updateFromGameObject();
    }

    /**
     * Updates the collision state of the area. If collide is true, it ensures the collider is applied. If collide is false, it removes any existing collider.
     * Returns true if a change was made to the collision state (collider added or removed), false if no change was necessary.
     */
    public updateCollision(collide: boolean): boolean {
        if (collide) {
            if (!this.areaCollider) {
                this.applyCollider();
                return true;
            } else {
                return false;
            }
        } else {
            if (this.areaCollider !== undefined) {
                this.areaCollider.destroy();
                this.areaCollider = undefined;
                return true;
            } else {
                return false;
            }
        }
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

    /**
     * Flashes the area with a light red highlight to indicate it's blocked/locked.
     * A single smooth fade-out effect.
     * @param duration - Duration of the fade-out in milliseconds (default: 800ms)
     */
    public flashBlockedArea(duration = 800): void {
        // Store original values
        const originalFillColor = this.fillColor;
        const originalFillAlpha = this.fillAlpha;
        const wasVisible = this.visible;

        // Clear any existing highlight timeout
        if (this.highlightTimeOut !== undefined) {
            clearTimeout(this.highlightTimeOut);
        }

        // Light red color with soft opacity
        this.setFillStyle(0xff6b6b, 0.25);
        this.setVisible(true);

        // Single smooth fade-out with a delay before starting to fade
        this.scene.tweens.add({
            targets: this,
            fillAlpha: 0,
            delay: 400,
            duration: duration,
            ease: "Quad.easeOut",
            onComplete: () => {
                // Restore original values
                this.setFillStyle(originalFillColor, originalFillAlpha);
                this.setVisible(wasVisible);
            },
        });
    }

    private displayWarningMessageOnCollide() {
        // Get the reason why the area is blocked
        let message: string = get(LL).area.noAccess(); // Default message
        const messageId = `area-blocked-${this.areaData.id}`;
        let callback = () => {
            this.scene.CurrentPlayer.destroyText(messageId);
        };
        if (this.areasManager) {
            const blockReason = this.areasManager.getAreaBlockReason(this.areaData.id);
            if (blockReason) {
                switch (blockReason) {
                    case "locked":
                        if (this.connection?.hasTag("admin")) {
                            const lockableProperty = this.areaData.properties.find(
                                (property): property is LockableAreaPropertyData =>
                                    property.type === "lockableAreaPropertyData"
                            );

                            if (lockableProperty) {
                                message = get(LL).area.blocked.unlockWithTrigger({
                                    trigger: touchScreenManager.detectPrimaryTouchDevice()
                                        ? "👆"
                                        : get(LL).trigger.spaceKeyboard(),
                                });

                                //message = message.replace("[SPACE]", svg.outerHTML);
                                callback = () => {
                                    setAreaPropertyVariable(this.areaData.id, lockableProperty.id, "lock", false);
                                    this.scene.CurrentPlayer.destroyText(messageId);
                                };
                                break;
                            }
                        }
                        message = get(LL).area.blocked.locked();
                        break;
                    case "maxUsers":
                        message = get(LL).area.blocked.maxUsers();
                        break;
                    case "noAccess":
                        message = get(LL).area.blocked.noAccess();
                        break;
                }
            }
        }

        // Display message above the player's woka using playText
        this.scene.CurrentPlayer.destroyText(messageId);
        this.scene.CurrentPlayer.playText(
            messageId,
            message,
            5000, // Display for 5 seconds
            callback,
            true, // Create stack animation
            "warning" // Use warning type for styling
        );
    }

    private onCollideAction() {
        // First, recalculate collision to check if area is still blocked
        // This prevents showing error message if area became available
        if (this.areasManager) {
            this.areasManager.updateAreaCollision(this.areaData.id);

            // Check if area should still collide after recalculation
            // If area no longer collides, player can enter without seeing error message
            const shouldStillCollide = this.areasManager.shouldAreaCollide(this.areaData.id);

            // Only show message and highlight if area should still collide
            if (shouldStillCollide && !this.userHasCollideWithArea) {
                this.userHasCollideWithArea = true;

                // Use red flash for locked or full areas, regular highlight for other blocked reasons
                const blockReason = this.areasManager.getAreaBlockReason(this.areaData.id);
                if (blockReason === "locked" || blockReason === "maxUsers") {
                    this.flashBlockedArea();
                } else {
                    this.highLightArea();
                }

                this.displayWarningMessageOnCollide();
                this.collideTimeOut = setTimeout(() => (this.userHasCollideWithArea = false), 3000);
            }
        } else if (!this.userHasCollideWithArea) {
            // Fallback if areasManager is not available
            this.userHasCollideWithArea = true;
            this.highLightArea();
            this.displayWarningMessageOnCollide();
            this.collideTimeOut = setTimeout(() => (this.userHasCollideWithArea = false), 3000);
        }
    }
}
