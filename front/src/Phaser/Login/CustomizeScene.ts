import { EnableCameraSceneName } from "./EnableCameraScene";
import { loadAllLayers } from "../Entity/PlayerTexturesLoadingManager";
import { gameManager } from "../Game/GameManager";
import { localUserStore } from "../../Connexion/LocalUserStore";
import { Loader } from "../Components/Loader";
import type { BodyResourceDescriptionInterface } from "../Entity/PlayerTextures";
import { AbstractCharacterScene } from "./AbstractCharacterScene";
import { areCharacterLayersValid } from "../../Connexion/LocalUser";
import { SelectCharacterSceneName } from "./SelectCharacterScene";
import { activeRowStore } from "../../Stores/CustomCharacterStore";
import { waScaleManager } from "../Services/WaScaleManager";
import { CustomizedCharacter } from "../Entity/CustomizedCharacter";
import { get } from "svelte/store";
import { analyticsClient } from "../../Administration/AnalyticsClient";
import { isMediaBreakpointUp } from "../../Utils/BreakpointsUtils";
import { PUSHER_URL } from "../../Enum/EnvironmentVariable";
import {
    CustomWokaBodyPart,
    CustomWokaPreviewer,
    CustomWokaPreviewerConfig,
} from "../Components/CustomizeWoka/CustomWokaPreviewer";
import { DraggableGrid } from "@home-based-studio/phaser3-utils";
import { WokaBodyPartSlot, WokaBodyPartSlotConfig } from "../Components/CustomizeWoka/WokaBodyPartSlot";

export const CustomizeSceneName = "CustomizeScene";

export class CustomizeScene extends AbstractCharacterScene {
    private Rectangle!: Phaser.GameObjects.Rectangle;

    private customWokaPreviewer!: CustomWokaPreviewer;
    private bodyPartsDraggableGrid!: DraggableGrid;
    private bodyPartsSlots!: Record<CustomWokaBodyPart, WokaBodyPartSlot>;

    private selectedLayers: number[] = [0];
    private containersRow: CustomizedCharacter[][] = [];
    private layers: BodyResourceDescriptionInterface[][] = [];

    protected lazyloadingAttempt = true; //permit to update texture loaded after renderer

    private moveHorizontally: number = 0;
    private moveVertically: number = 0;

    private loader: Loader;

    constructor() {
        super({
            key: CustomizeSceneName,
        });
        this.loader = new Loader(this);
    }

    public preload(): void {
        const wokaMetadataKey = "woka-list";
        this.cache.json.remove(wokaMetadataKey);
        // FIXME: window.location.href is wrong. We need the URL of the main room (so we need to apply any redirect before!)
        this.load.json(
            wokaMetadataKey,
            `${PUSHER_URL}/woka/list/` + encodeURIComponent(window.location.href),
            undefined,
            {
                responseType: "text",
                headers: {
                    Authorization: localUserStore.getAuthToken() ?? "",
                },
                withCredentials: true,
            }
        );
        this.load.once(`filecomplete-json-${wokaMetadataKey}`, () => {
            this.playerTextures.loadPlayerTexturesMetadata(this.cache.json.get(wokaMetadataKey));
            this.loadCustomSceneSelectCharacters()
                .then((bodyResourceDescriptions) => {
                    bodyResourceDescriptions.forEach((bodyResourceDescription) => {
                        if (
                            bodyResourceDescription.level == undefined ||
                            bodyResourceDescription.level < 0 ||
                            bodyResourceDescription.level > 5
                        ) {
                            throw new Error("Texture level is null");
                        }
                        this.layers[bodyResourceDescription.level].unshift(bodyResourceDescription);
                    });
                    this.lazyloadingAttempt = true;
                })
                .catch((e) => console.error(e));

            this.layers = loadAllLayers(this.load, this.playerTextures);
            this.lazyloadingAttempt = false;

            //this function must stay at the end of preload function
            this.loader.addLoader();
        });
    }

    public create(): void {
        console.log(this.layers);

        const isVertical = isMediaBreakpointUp("md");

        this.Rectangle = this.add.rectangle(
            this.cameras.main.worldView.x + this.cameras.main.width / 2,
            this.cameras.main.worldView.y + this.cameras.main.height / 3,
            32,
            33
        );
        this.Rectangle.setStrokeStyle(2, 0xffffff);

        this.createCustomizeLayer(0, 0, 0);
        this.createCustomizeLayer(0, 0, 1);
        this.createCustomizeLayer(0, 0, 2);
        this.createCustomizeLayer(0, 0, 3);
        this.createCustomizeLayer(0, 0, 4);
        this.createCustomizeLayer(0, 0, 5);

        this.moveLayers();

        const customCursorPosition = localUserStore.getCustomCursorPosition();
        if (customCursorPosition) {
            activeRowStore.set(customCursorPosition.activeRow);
            this.selectedLayers = customCursorPosition.selectedLayers;
            this.moveLayers();
            this.updateSelectedLayer();
        }

        this.customWokaPreviewer = new CustomWokaPreviewer(this, 0, 0, this.getCustomWokaPreviewerConfig());

        this.bodyPartsDraggableGrid = new DraggableGrid(this, {
            position: { x: 0, y: 0 },
            maskPosition: { x: 0, y: 0 },
            dimension: { x: 485, y: 165 },
            horizontal: true,
            repositionToCenter: true,
            itemsInRow: 2,
            margin: {
                left: 5,
                right: 5,
            },
            spacing: 5,
            debug: {
                showDraggableSpace: true,
            },
        });

        for (let i = 0; i < 50; i += 1) {
            this.bodyPartsDraggableGrid.addItem(
                new WokaBodyPartSlot(this, 0, 0, this.getDefaultWokaBodyPartSlotConfig(isVertical))
            );
        }

        this.bodyPartsSlots = {
            [CustomWokaBodyPart.Hair]: new WokaBodyPartSlot(
                this,
                0,
                0,
                this.getDefaultWokaBodyPartSlotConfig(isVertical)
            ),
            [CustomWokaBodyPart.Body]: new WokaBodyPartSlot(
                this,
                0,
                0,
                this.getDefaultWokaBodyPartSlotConfig(isVertical)
            ),
            [CustomWokaBodyPart.Accessory]: new WokaBodyPartSlot(
                this,
                0,
                0,
                this.getDefaultWokaBodyPartSlotConfig(isVertical)
            ),
            [CustomWokaBodyPart.Hat]: new WokaBodyPartSlot(
                this,
                0,
                0,
                this.getDefaultWokaBodyPartSlotConfig(isVertical)
            ),
            [CustomWokaBodyPart.Clothes]: new WokaBodyPartSlot(
                this,
                0,
                0,
                this.getDefaultWokaBodyPartSlotConfig(isVertical)
            ),
            [CustomWokaBodyPart.Eyes]: new WokaBodyPartSlot(
                this,
                0,
                0,
                this.getDefaultWokaBodyPartSlotConfig(isVertical)
            ),
        };

        this.onResize();

        this.bindEventHandlers();
    }

    public update(time: number, dt: number): void {
        this.customWokaPreviewer.update();

        if (this.lazyloadingAttempt) {
            this.moveLayers();
            this.doMoveCursorHorizontally(this.moveHorizontally);
            this.lazyloadingAttempt = false;
        }

        if (this.moveHorizontally !== 0) {
            this.doMoveCursorHorizontally(this.moveHorizontally);
            this.moveHorizontally = 0;
        }
        if (this.moveVertically !== 0) {
            this.doMoveCursorVertically(this.moveVertically);
            this.moveVertically = 0;
        }
    }

    public moveCursorHorizontally(index: number): void {
        this.moveHorizontally = index;
    }

    public moveCursorVertically(index: number): void {
        this.moveVertically = index;
    }

    public onResize(): void {
        const isVertical = this.cameras.main.height > this.cameras.main.width;
        this.moveLayers();

        this.Rectangle.x = this.cameras.main.worldView.x + this.cameras.main.width / 2;
        this.Rectangle.y = this.cameras.main.worldView.y + this.cameras.main.height / 3;

        this.handleCustomWokaPreviewerOnResize(isVertical);
        this.handleBodyPartSlotsOnResize(isVertical);
        this.handleBodyPartsDraggableGridOnResize(isVertical);
    }

    public nextSceneToCamera() {
        const layers: string[] = [];
        let i = 0;
        for (const layerItem of this.selectedLayers) {
            if (layerItem !== undefined) {
                layers.push(this.layers[i][layerItem].id);
            }
            i++;
        }
        if (!areCharacterLayersValid(layers)) {
            return;
        }

        analyticsClient.validationWoka("CustomizeWoka");

        gameManager.setCharacterLayers(layers);
        this.scene.stop(CustomizeSceneName);
        waScaleManager.restoreZoom();
        gameManager.tryResumingGame(EnableCameraSceneName);
    }

    public backToPreviousScene() {
        this.scene.stop(CustomizeSceneName);
        waScaleManager.restoreZoom();
        this.scene.run(SelectCharacterSceneName);
    }

    private handleCustomWokaPreviewerOnResize(isVertical: boolean): void {
        const boxDimension = Math.min(innerWidth * 0.3, innerHeight * 0.3) / waScaleManager.getActualZoom();
        const boxScale = boxDimension / this.customWokaPreviewer.SIZE;

        this.customWokaPreviewer.setScale(boxScale);
        this.customWokaPreviewer.x = this.cameras.main.worldView.x + this.cameras.main.width / 2;
        this.customWokaPreviewer.y = this.customWokaPreviewer.displayHeight * 0.5 + 10;
    }

    private handleBodyPartSlotsOnResize(isVertical: boolean): void {
        const slotDimension = Math.min(innerWidth * 0.15, innerHeight * 0.15) / waScaleManager.getActualZoom();
        const slotScale = slotDimension / this.customWokaPreviewer.SIZE;

        for (const part in this.bodyPartsSlots) {
            this.bodyPartsSlots[part as CustomWokaBodyPart].setScale(slotScale);
        }

        const slotSize = this.bodyPartsSlots.Accessory.displayHeight;

        if (isVertical) {
            const left = this.customWokaPreviewer.x - this.customWokaPreviewer.displayWidth * 0.5;
            const right = this.customWokaPreviewer.x + this.customWokaPreviewer.displayWidth * 0.5;
            const middle = this.customWokaPreviewer.x;
            const top = this.customWokaPreviewer.y + this.customWokaPreviewer.displayHeight * 0.5;
            const bottom = top + slotSize;

            this.bodyPartsSlots.Hair.setPosition(left, top);
            this.bodyPartsSlots.Hat.setPosition(middle, top);
            this.bodyPartsSlots.Eyes.setPosition(right, top);
            this.bodyPartsSlots.Body.setPosition(left, bottom);
            this.bodyPartsSlots.Clothes.setPosition(middle, bottom);
            this.bodyPartsSlots.Accessory.setPosition(right, bottom);

            return;
        }

        const left = this.customWokaPreviewer.x - this.customWokaPreviewer.displayWidth * 0.5 - slotSize;
        const right = this.customWokaPreviewer.x + this.customWokaPreviewer.displayWidth * 0.5 + slotSize;
        const top = 0 + slotSize * 0.5 + 10;
        const middle = top + slotSize + 10;
        const bottom = middle + slotSize + 10;

        this.bodyPartsSlots.Hair.setPosition(left, top);
        this.bodyPartsSlots.Body.setPosition(left, middle);
        this.bodyPartsSlots.Accessory.setPosition(left, bottom);
        this.bodyPartsSlots.Hat.setPosition(right, top);
        this.bodyPartsSlots.Clothes.setPosition(right, middle);
        this.bodyPartsSlots.Eyes.setPosition(right, bottom);
    }

    private handleBodyPartsDraggableGridOnResize(isVertical: boolean): void {
        const gridHeight = (innerHeight * 0.35) / waScaleManager.getActualZoom();
        const gridWidth = (innerWidth * 0.7) / waScaleManager.getActualZoom();
        const gridPos = {
            x: this.cameras.main.worldView.x + this.cameras.main.width / 2,
            y: this.cameras.main.worldView.y + this.cameras.main.height - gridHeight * 0.5 - 10,
        };

        this.bodyPartsDraggableGrid.changeDraggableSpacePosAndSize(gridPos, { x: gridWidth, y: gridHeight }, gridPos);

        const slotDimension = Math.min(innerWidth * 0.15, innerHeight * 0.15) / waScaleManager.getActualZoom();
        const slotScale = slotDimension / this.customWokaPreviewer.SIZE;

        this.bodyPartsDraggableGrid.clearAllItems();
        for (let i = 0; i < 50; i += 1) {
            this.bodyPartsDraggableGrid.addItem(
                new WokaBodyPartSlot(this, 0, 0, this.getDefaultWokaBodyPartSlotConfig(isVertical)).setScale(slotScale)
            );
        }
    }

    private getCustomWokaPreviewerConfig(): CustomWokaPreviewerConfig {
        return {
            color: 0xffffff,
            borderThickness: 2.5,
            borderColor: 0xadafbc,
            bodyPartsOffsetX: -1,
        };
    }

    private getDefaultWokaBodyPartSlotConfig(isVertical: boolean): WokaBodyPartSlotConfig {
        return {
            color: 0xffffff,
            borderThickness: this.countZoom(isVertical ? 4 : 4),
            borderColor: 0xadafbc,
            borderSelectedColor: 0x00ffff,
            offsetX: this.countZoom(isVertical ? -4 : -3),
            offsetY: this.countZoom(isVertical ? -3 : -2),
        };
    }

    private countZoom(value: number): number {
        return Math.floor(value / waScaleManager.getActualZoom());
    }

    private bindEventHandlers(): void {
        this.events.addListener("wake", () => {
            waScaleManager.saveZoom();
            waScaleManager.zoomModifier = isMediaBreakpointUp("md") ? 3 : 1;
        });

        this.input.keyboard.on("keyup-ENTER", () => {
            this.nextSceneToCamera();
        });
        this.input.keyboard.on("keyup-BACKSPACE", () => {
            this.backToPreviousScene();
        });

        // Note: the key bindings are not directly put on the moveCursorVertically or moveCursorHorizontally methods
        // because if 2 such events are fired close to one another, it makes the whole application crawl to a halt (for a reason I cannot
        // explain, the list of sprites managed by the update list become immense
        this.input.keyboard.on("keyup-RIGHT", () => (this.moveHorizontally = 1));
        this.input.keyboard.on("keyup-LEFT", () => (this.moveHorizontally = -1));
        this.input.keyboard.on("keyup-DOWN", () => (this.moveVertically = 1));
        this.input.keyboard.on("keyup-UP", () => (this.moveVertically = -1));

        this.input.keyboard.on("keydown-R", () => {
            this.randomizeOutfit();
        });
    }

    private randomizeOutfit(): void {
        this.customWokaPreviewer.updateSprite(
            this.layers[0][Math.floor(Math.random() * this.layers[0].length)].id,
            CustomWokaBodyPart.Body
        );
        this.customWokaPreviewer.updateSprite(
            this.layers[1][Math.floor(Math.random() * this.layers[1].length)].id,
            CustomWokaBodyPart.Eyes
        );
        this.customWokaPreviewer.updateSprite(
            this.layers[2][Math.floor(Math.random() * this.layers[2].length)].id,
            CustomWokaBodyPart.Hair
        );
        this.customWokaPreviewer.updateSprite(
            this.layers[3][Math.floor(Math.random() * this.layers[3].length)].id,
            CustomWokaBodyPart.Clothes
        );
        this.customWokaPreviewer.updateSprite(
            this.layers[4][Math.floor(Math.random() * this.layers[4].length)].id,
            CustomWokaBodyPart.Hat
        );
        this.customWokaPreviewer.updateSprite(
            this.layers[5][Math.floor(Math.random() * this.layers[5].length)].id,
            CustomWokaBodyPart.Accessory
        );
    }

    private doMoveCursorHorizontally(index: number): void {
        this.selectedLayers[get(activeRowStore)] += index;
        if (this.selectedLayers[get(activeRowStore)] < 0) {
            this.selectedLayers[get(activeRowStore)] = 0;
        } else if (this.selectedLayers[get(activeRowStore)] > this.layers[get(activeRowStore)].length - 1) {
            this.selectedLayers[get(activeRowStore)] = this.layers[get(activeRowStore)].length - 1;
        }
        this.moveLayers();
        this.updateSelectedLayer();
        this.saveInLocalStorage();
    }

    private doMoveCursorVertically(index: number): void {
        activeRowStore.set(get(activeRowStore) + index);
        if (get(activeRowStore) < 0) {
            activeRowStore.set(0);
        } else if (get(activeRowStore) > this.layers.length - 1) {
            activeRowStore.set(this.layers.length - 1);
        }
        this.moveLayers();
        this.saveInLocalStorage();
    }

    private saveInLocalStorage() {
        localUserStore.setCustomCursorPosition(get(activeRowStore), this.selectedLayers);
    }

    /**
     * @param x, the layer's vertical position
     * @param y, the layer's horizontal position
     * @param layerNumber, index of the this.layers array
     * create the layer and display it on the scene
     */
    private createCustomizeLayer(x: number, y: number, layerNumber: number): void {
        this.containersRow[layerNumber] = [];
        this.selectedLayers[layerNumber] = 0;
        let alpha = 0;
        let layerPosX = 0;
        for (let i = 0; i < this.layers[layerNumber].length; i++) {
            const container = this.generateCharacter(300 + x + layerPosX, y, layerNumber, i);

            this.containersRow[layerNumber][i] = container;
            this.add.existing(container);
            layerPosX += 30;
            alpha += 0.1;
        }
    }

    /**
     * Generates a character from the current selected items BUT replaces
     * one layer item with an item we pass in parameter.
     *
     * Current selected items are fetched from this.selectedLayers
     *
     * @param x,
     * @param y,
     * @param layerNumber, The selected layer number (0 for body...)
     * @param selectedItem, The number of the item select (0 for black body...)
     */
    private generateCharacter(x: number, y: number, layerNumber: number, selectedItem: number) {
        return new CustomizedCharacter(this, x, y, this.getContainerChildren(layerNumber, selectedItem));
    }

    private getContainerChildren(layerNumber: number, selectedItem: number): Array<string> {
        const children: Array<string> = new Array<string>();
        for (let j = 0; j <= layerNumber; j++) {
            if (j === layerNumber) {
                children.push(this.layers[j][selectedItem].id);
            } else {
                const layer = this.selectedLayers[j];
                if (layer === undefined) {
                    continue;
                }
                children.push(this.layers[j][layer].id);
            }
        }
        return children;
    }

    /**
     * Move the layer left, right, up and down and update the selected layer
     */
    private moveLayers(): void {
        const screenCenterX = this.cameras.main.worldView.x + this.cameras.main.width / 2;
        const screenCenterY = this.cameras.main.worldView.y + this.cameras.main.height / 3;
        const screenWidth = this.game.renderer.width;
        const screenHeight = this.game.renderer.height;
        for (let i = 0; i < this.containersRow.length; i++) {
            for (let j = 0; j < this.containersRow[i].length; j++) {
                let selectedX = this.selectedLayers[i];
                if (selectedX === undefined) {
                    selectedX = 0;
                }
                this.containersRow[i][j].x = screenCenterX + (j - selectedX) * 40;
                this.containersRow[i][j].y = screenCenterY + (i - get(activeRowStore)) * 40;
                const alpha1 = (Math.abs(selectedX - j) * 47 * 2) / screenWidth;
                const alpha2 = (Math.abs(get(activeRowStore) - i) * 49 * 2) / screenHeight;
                this.containersRow[i][j].setAlpha((1 - alpha1) * (1 - alpha2));
            }
        }
    }

    private updateSelectedLayer() {
        for (let i = 0; i < this.containersRow.length; i++) {
            for (let j = 0; j < this.containersRow[i].length; j++) {
                const children = this.getContainerChildren(i, j);
                this.containersRow[i][j].updateSprites(children);
            }
        }
    }
}
