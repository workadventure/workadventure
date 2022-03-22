import { EnableCameraSceneName } from "./EnableCameraScene";
import { loadAllLayers } from "../Entity/PlayerTexturesLoadingManager";
import { gameManager } from "../Game/GameManager";
import { localUserStore } from "../../Connexion/LocalUserStore";
import { Loader } from "../Components/Loader";
import type { BodyResourceDescriptionInterface } from "../Entity/PlayerTextures";
import { AbstractCharacterScene } from "./AbstractCharacterScene";
import { areCharacterLayersValid } from "../../Connexion/LocalUser";
import { SelectCharacterSceneName } from "./SelectCharacterScene";
import { waScaleManager } from "../Services/WaScaleManager";
import { CustomizedCharacter } from "../Entity/CustomizedCharacter";
import { analyticsClient } from "../../Administration/AnalyticsClient";
import { isMediaBreakpointUp } from "../../Utils/BreakpointsUtils";
import { PUSHER_URL } from "../../Enum/EnvironmentVariable";
import {
    CustomWokaBodyPart,
    CustomWokaBodyPartOrder,
    CustomWokaPreviewer,
    CustomWokaPreviewerConfig,
} from "../Components/CustomizeWoka/CustomWokaPreviewer";
import { DraggableGrid } from "@home-based-studio/phaser3-utils";
import {
    WokaBodyPartSlot,
    WokaBodyPartSlotConfig,
    WokaBodyPartSlotEvent,
} from "../Components/CustomizeWoka/WokaBodyPartSlot";
import { DraggableGridEvent } from "@home-based-studio/phaser3-utils/lib/utils/gui/containers/grids/DraggableGrid";

export const CustomizeSceneName = "CustomizeScene";

export class CustomizeScene extends AbstractCharacterScene {
    private customWokaPreviewer!: CustomWokaPreviewer;
    private bodyPartsDraggableGridBackground!: Phaser.GameObjects.Graphics;
    private bodyPartsDraggableGridForeground!: Phaser.GameObjects.Graphics;
    private bodyPartsDraggableGrid!: DraggableGrid;
    private bodyPartsSlots!: Record<CustomWokaBodyPart, WokaBodyPartSlot>;

    private selectedLayers: number[] = [0, 1, 2, 3, 4, 5];
    private containersRow: CustomizedCharacter[][] = [];
    private layers: BodyResourceDescriptionInterface[][] = [];
    private selectedBodyPartType?: CustomWokaBodyPart;

    protected lazyloadingAttempt = true; //permit to update texture loaded after renderer

    private isVertical: boolean = false;

    private loader: Loader;

    constructor() {
        super({
            key: CustomizeSceneName,
        });
        this.loader = new Loader(this);
    }

    public preload(): void {
        this.input.dragDistanceThreshold = 10;
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
        this.isVertical = innerHeight / innerWidth > 1;

        this.customWokaPreviewer = new CustomWokaPreviewer(this, 0, 0, this.getCustomWokaPreviewerConfig());

        this.bodyPartsDraggableGridBackground = this.add.graphics();

        const gridBackgroundWidth = 500;
        const gridBackgroundHeight = 170;
        this.bodyPartsDraggableGridBackground.fillStyle(0xf9f9f9);
        this.bodyPartsDraggableGridBackground.fillRect(
            -gridBackgroundWidth / 2,
            -gridBackgroundHeight / 2,
            gridBackgroundWidth,
            gridBackgroundHeight
        );

        this.bodyPartsDraggableGrid = new DraggableGrid(this, {
            position: { x: 0, y: 0 },
            maskPosition: { x: 0, y: 0 },
            dimension: { x: 485, y: 165 },
            horizontal: true,
            repositionToCenter: true,
            itemsInRow: 1,
            margin: {
                left: 5,
                right: 5,
            },
            spacing: 5,
            debug: {
                showDraggableSpace: false,
            },
        });
        this.bodyPartsDraggableGridForeground = this.add.graphics();

        this.bodyPartsSlots = {
            [CustomWokaBodyPart.Hair]: new WokaBodyPartSlot(this, 0, 0, this.getDefaultWokaBodyPartSlotConfig()),
            [CustomWokaBodyPart.Body]: new WokaBodyPartSlot(this, 0, 0, this.getDefaultWokaBodyPartSlotConfig()),
            [CustomWokaBodyPart.Accessory]: new WokaBodyPartSlot(this, 0, 0, this.getDefaultWokaBodyPartSlotConfig()),
            [CustomWokaBodyPart.Hat]: new WokaBodyPartSlot(this, 0, 0, this.getDefaultWokaBodyPartSlotConfig()),
            [CustomWokaBodyPart.Clothes]: new WokaBodyPartSlot(this, 0, 0, this.getDefaultWokaBodyPartSlotConfig()),
            [CustomWokaBodyPart.Eyes]: new WokaBodyPartSlot(this, 0, 0, this.getDefaultWokaBodyPartSlotConfig()),
        };

        this.refreshPlayerCurrentOutfit();

        this.onResize();

        this.bindEventHandlers();
    }

    public update(time: number, dt: number): void {
        // this.customWokaPreviewer.update();
    }

    public onResize(): void {
        this.isVertical = innerHeight / innerWidth > 1;

        this.handleCustomWokaPreviewerOnResize();
        this.handleBodyPartSlotsOnResize();
        this.handleBodyPartsDraggableGridOnResize();
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

    private drawGridBackground(gridPosition: { x: number; y: number }): void {
        const gridBackgroundWidth = innerWidth / waScaleManager.getActualZoom();
        const gridBackgroundHeight = 130;
        this.bodyPartsDraggableGridBackground.clear();
        this.bodyPartsDraggableGridBackground.fillStyle(0xf9f9f9);
        this.bodyPartsDraggableGridBackground.fillRect(
            gridPosition.x - gridBackgroundWidth / 2,
            gridPosition.y - gridBackgroundHeight / 2,
            gridBackgroundWidth,
            gridBackgroundHeight
        );
    }

    private drawGridForeground(gridPosition: { x: number; y: number }): void {
        const gridBackgroundWidth = innerWidth / waScaleManager.getActualZoom();
        const gridBackgroundHeight = 130;
        this.bodyPartsDraggableGridForeground.clear();
        this.bodyPartsDraggableGridForeground.lineStyle(2, 0xadafbc);
        this.bodyPartsDraggableGridForeground.strokeRect(
            gridPosition.x - gridBackgroundWidth / 2,
            gridPosition.y - gridBackgroundHeight / 2,
            gridBackgroundWidth,
            gridBackgroundHeight
        );
    }

    private refreshPlayerCurrentOutfit(): void {
        let i = 0;
        for (const layerItem of this.selectedLayers) {
            const bodyPart = CustomWokaBodyPart[CustomWokaBodyPartOrder[i] as CustomWokaBodyPart];
            this.customWokaPreviewer.updateSprite(this.layers[i][layerItem].id, bodyPart);
            this.bodyPartsSlots[bodyPart].setTextures(
                this.layers[CustomWokaBodyPartOrder.Body][this.selectedLayers[CustomWokaBodyPartOrder.Body]].id,
                this.layers[i][layerItem].id
            );
            i += 1;
        }
    }

    private handleCustomWokaPreviewerOnResize(): void {
        const slotDimension = 100;

        const boxDimension = 200;

        this.customWokaPreviewer.setDisplaySize(boxDimension, boxDimension);
        this.customWokaPreviewer.x = this.cameras.main.worldView.x + this.cameras.main.width / 2;
        this.customWokaPreviewer.y = this.isVertical
            ? this.customWokaPreviewer.displayHeight * 0.5 + 20
            : slotDimension * 1.5 + 20;
    }

    private handleBodyPartSlotsOnResize(): void {
        const slotDimension = 100;

        for (const part in this.bodyPartsSlots) {
            this.bodyPartsSlots[part as CustomWokaBodyPart].setDisplaySize(slotDimension, slotDimension);
        }

        const slotSize = this.bodyPartsSlots.Accessory.displayHeight;

        if (this.isVertical) {
            const middle = Math.floor(this.customWokaPreviewer.x);
            const left = Math.floor(middle - slotSize - 10);
            const right = Math.floor(middle + slotSize + 10);
            const top = Math.floor(
                this.customWokaPreviewer.y + this.customWokaPreviewer.displayHeight * 0.5 + slotSize * 0.5 + 10
            );
            const bottom = Math.floor(top + slotSize + 10);

            this.bodyPartsSlots.Hair.setPosition(left, top);
            this.bodyPartsSlots.Hat.setPosition(middle, top);
            this.bodyPartsSlots.Eyes.setPosition(right, top);
            this.bodyPartsSlots.Body.setPosition(left, bottom);
            this.bodyPartsSlots.Clothes.setPosition(middle, bottom);
            this.bodyPartsSlots.Accessory.setPosition(right, bottom);

            return;
        }

        const ratio = innerHeight / innerWidth;

        const left = Math.floor(this.customWokaPreviewer.x - this.customWokaPreviewer.displayWidth * 0.5 - slotSize);
        const leftEdge = Math.floor(left - slotSize - 10);
        const right = Math.floor(this.customWokaPreviewer.x + this.customWokaPreviewer.displayWidth * 0.5 + slotSize);
        const rightEdge = Math.floor(right + slotSize + 10);
        const top = Math.floor(0 + slotSize * 0.5 + 10);
        const middle = Math.floor(top + slotSize + 10);
        const bottom = Math.floor(middle + slotSize + 10);

        this.bodyPartsSlots.Hair.setPosition(left, top);
        this.bodyPartsSlots.Body.setPosition(left, middle);
        this.bodyPartsSlots.Accessory.setPosition(ratio < 0.6 ? leftEdge : left, ratio < 0.6 ? middle : bottom);
        this.bodyPartsSlots.Hat.setPosition(right, top);
        this.bodyPartsSlots.Clothes.setPosition(right, middle);
        this.bodyPartsSlots.Eyes.setPosition(ratio < 0.6 ? rightEdge : right, ratio < 0.6 ? middle : bottom);
    }

    private handleBodyPartsDraggableGridOnResize(): void {
        const gridHeight = 125;
        const gridWidth = innerWidth / waScaleManager.getActualZoom();
        const gridPos = {
            x: this.cameras.main.worldView.x + this.cameras.main.width / 2,
            y: this.cameras.main.worldView.y + this.cameras.main.height - gridHeight * 0.5,
        };

        this.drawGridBackground(gridPos);
        this.drawGridForeground(gridPos);
        this.bodyPartsDraggableGrid.changeDraggableSpacePosAndSize(gridPos, { x: gridWidth, y: gridHeight }, gridPos);

        this.populateGrid();
        this.bodyPartsDraggableGrid.moveContentToBeginning();
    }

    private getCustomWokaPreviewerConfig(): CustomWokaPreviewerConfig {
        return {
            color: 0xffffff,
            borderThickness: 1,
            borderColor: 0xadafbc,
            bodyPartsOffsetX: -1,
        };
    }

    private getDefaultWokaBodyPartSlotConfig(): WokaBodyPartSlotConfig {
        return {
            color: 0xffffff,
            borderThickness: 1,
            borderColor: 0xadafbc,
            borderSelectedColor: 0x00ffff,
            offsetX: -4,
            offsetY: -3,
        };
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

        this.input.keyboard.on("keydown-R", () => {
            this.randomizeOutfit();
            this.clearGrid();
            this.deselectAllSlots();
            this.refreshPlayerCurrentOutfit();
        });

        for (const bodyPart in CustomWokaBodyPart) {
            const slot = this.bodyPartsSlots[bodyPart as CustomWokaBodyPart];
            slot.on(WokaBodyPartSlotEvent.Clicked, (selected: boolean) => {
                if (!selected) {
                    this.selectedBodyPartType = bodyPart as CustomWokaBodyPart;
                    this.deselectAllSlots();
                    slot.select(true);
                    this.populateGrid();
                } else {
                    this.selectedBodyPartType = undefined;
                    slot.select(false);
                    this.clearGrid();
                }
            });
        }

        this.bodyPartsDraggableGrid.on(DraggableGridEvent.ItemClicked, (item: WokaBodyPartSlot) => {
            this.bodyPartsDraggableGrid.getAllItems().forEach((slot) => (slot as WokaBodyPartSlot).select(false));
            this.changeOutfitPart(Number(item.getId()));
            this.refreshPlayerCurrentOutfit();
            item.select(true);
        });
    }

    private randomizeOutfit(): void {
        for (let i = 0; i < 6; i += 1) {
            this.selectedLayers[i] = Math.floor(Math.random() * this.layers[i].length);
        }
    }

    private changeOutfitPart(index: number): void {
        if (this.selectedBodyPartType === undefined) {
            return;
        }
        this.selectedLayers[CustomWokaBodyPartOrder[this.selectedBodyPartType]] = index;
    }

    private populateGrid(): void {
        if (this.selectedBodyPartType === undefined) {
            return;
        }
        const slotDimension = 100;

        const bodyPartsLayer = this.layers[CustomWokaBodyPartOrder[this.selectedBodyPartType]];

        this.bodyPartsDraggableGrid.clearAllItems();
        for (let i = 0; i < bodyPartsLayer.length; i += 1) {
            const slot = new WokaBodyPartSlot(this, 0, 0, this.getDefaultWokaBodyPartSlotConfig(), i).setDisplaySize(
                slotDimension,
                slotDimension
            );
            if (this.selectedBodyPartType === CustomWokaBodyPart.Body) {
                slot.setBodyTexture(bodyPartsLayer[i].id);
                slot.setImageTexture();
            } else {
                slot.setBodyTexture(
                    this.layers[CustomWokaBodyPartOrder.Body][this.selectedLayers[CustomWokaBodyPartOrder.Body]].id
                );
                slot.setImageTexture(bodyPartsLayer[i].id);
            }
            this.bodyPartsDraggableGrid.addItem(slot);
        }
        this.bodyPartsDraggableGrid.moveContentToBeginning();
    }

    private clearGrid(): void {
        this.bodyPartsDraggableGrid.clearAllItems();
    }

    private deselectAllSlots(): void {
        for (const bodyPart in CustomWokaBodyPart) {
            this.bodyPartsSlots[bodyPart as CustomWokaBodyPart].select(false);
        }
    }
}
