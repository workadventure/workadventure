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
import { Button } from "../Components/Ui/Button";
import { wokaList } from "../../Messages/JsonMessages/PlayerTextures";
import { TexturesHelper } from "../Helpers/TexturesHelper";

export const CustomizeSceneName = "CustomizeScene";

export class CustomizeScene extends AbstractCharacterScene {
    private customWokaPreviewer!: CustomWokaPreviewer;
    private bodyPartsDraggableGridLeftShadow!: Phaser.GameObjects.Image;
    private bodyPartsDraggableGridRightShadow!: Phaser.GameObjects.Image;
    private bodyPartsDraggableGrid!: DraggableGrid;
    private bodyPartsSlots!: Record<CustomWokaBodyPart, WokaBodyPartSlot>;

    private randomizeButton!: Button;
    private finishButton!: Button;

    private selectedLayers: number[] = [0, 0, 0, 0, 0, 0];
    private layers: BodyResourceDescriptionInterface[][] = [];
    private selectedBodyPartType?: CustomWokaBodyPart;
    private selectedItemTextureKey?: string;

    protected lazyloadingAttempt = true; //permit to update texture loaded after renderer

    private loader: Loader;

    private readonly SLOT_DIMENSION = 100;

    constructor() {
        super({
            key: CustomizeSceneName,
        });
        this.loader = new Loader(this);
    }

    public preload(): void {
        this.input.dragDistanceThreshold = 10;

        this.load.image("iconClothes", "/resources/icons/icon_clothes.png");
        this.load.image("iconAccessory", "/resources/icons/icon_accessory.png");
        this.load.image("iconHat", "/resources/icons/icon_hat.png");
        this.load.image("iconHair", "/resources/icons/icon_hair.png");
        this.load.image("iconEyes", "/resources/icons/icon_eyes.png");
        this.load.image("iconBody", "/resources/icons/icon_body.png");
        this.load.spritesheet("floorTiles", "/resources/tilesets/floor_tiles.png", { frameWidth: 32, frameHeight: 32 });

        TexturesHelper.createRectangleTexture(this, "gridEdgeShadow", this.cameras.main.width * 0.2, 115, 0x000000);

        const wokaMetadataKey = "woka-list" + gameManager.currentStartedRoom.href;
        this.cache.json.remove(wokaMetadataKey);
        this.superLoad
            .json(
                wokaMetadataKey,
                `${PUSHER_URL}/woka/list?roomUrl=` + encodeURIComponent(gameManager.currentStartedRoom.href),
                undefined,
                {
                    responseType: "text",
                    headers: {
                        Authorization: localUserStore.getAuthToken() ?? "",
                    },
                    withCredentials: true,
                },
                (key, type, data) => {
                    this.playerTextures.loadPlayerTexturesMetadata(wokaList.parse(data));

                    this.layers = loadAllLayers(this.load, this.playerTextures);
                    this.lazyloadingAttempt = false;
                }
            )
            .catch((e) => console.error(e));
        //this function must stay at the end of preload function
        this.loader.addLoader();
    }

    public create(): void {
        TexturesHelper.createFloorRectangleTexture(this, "floorTexture", 50, 50, "floorTiles", 0);
        this.customWokaPreviewer = new CustomWokaPreviewer(
            this,
            0,
            0,
            this.getCustomWokaPreviewerConfig()
        ).setDisplaySize(200, 200);

        this.bodyPartsDraggableGrid = new DraggableGrid(this, {
            position: { x: 0, y: 0 },
            maskPosition: { x: 0, y: 0 },
            dimension: { x: 485, y: 165 },
            horizontal: true,
            repositionToCenter: true,
            itemsInRow: 1,
            margin: {
                left: (innerWidth / waScaleManager.getActualZoom() - this.SLOT_DIMENSION) * 0.5,
                right: (innerWidth / waScaleManager.getActualZoom() - this.SLOT_DIMENSION) * 0.5,
            },
            spacing: 5,
            debug: {
                showDraggableSpace: false,
            },
        });

        this.bodyPartsDraggableGridLeftShadow = this.add
            .image(0, this.cameras.main.worldView.y + this.cameras.main.height, "gridEdgeShadow")
            .setAlpha(1, 0, 1, 0)
            .setOrigin(0, 0.5);

        this.bodyPartsDraggableGridRightShadow = this.add
            .image(
                this.cameras.main.worldView.x + this.cameras.main.width,
                this.cameras.main.worldView.y + this.cameras.main.height,
                "gridEdgeShadow"
            )
            .setAlpha(1, 0, 1, 0)
            .setFlipX(true)
            .setOrigin(1, 0.5);

        this.bodyPartsSlots = {
            [CustomWokaBodyPart.Hair]: new WokaBodyPartSlot(this, 0, 0, {
                ...this.getWokaBodyPartSlotConfig(),
                categoryImageKey: "iconHair",
            }),
            [CustomWokaBodyPart.Body]: new WokaBodyPartSlot(this, 0, 0, {
                ...this.getWokaBodyPartSlotConfig(),
                categoryImageKey: "iconBody",
            }),
            [CustomWokaBodyPart.Accessory]: new WokaBodyPartSlot(this, 0, 0, {
                ...this.getWokaBodyPartSlotConfig(),
                categoryImageKey: "iconAccessory",
            }),
            [CustomWokaBodyPart.Hat]: new WokaBodyPartSlot(this, 0, 0, {
                ...this.getWokaBodyPartSlotConfig(),
                categoryImageKey: "iconHat",
            }),
            [CustomWokaBodyPart.Clothes]: new WokaBodyPartSlot(this, 0, 0, {
                ...this.getWokaBodyPartSlotConfig(),
                categoryImageKey: "iconClothes",
            }),
            [CustomWokaBodyPart.Eyes]: new WokaBodyPartSlot(this, 0, 0, {
                ...this.getWokaBodyPartSlotConfig(),
                categoryImageKey: "iconEyes",
            }),
        };

        this.selectedBodyPartType = CustomWokaBodyPart.Body;
        this.selectedItemTextureKey = this.layers[CustomWokaBodyPartOrder.Body][0].id;
        this.bodyPartsSlots.Body.select();

        this.initializeRandomizeButton();
        this.initializeFinishButton();

        this.refreshPlayerCurrentOutfit();

        this.onResize();

        this.bindEventHandlers();
    }

    public update(time: number, dt: number): void {
        this.customWokaPreviewer.update();
    }

    public onResize(): void {
        this.handleCustomWokaPreviewerOnResize();
        this.handleBodyPartSlotsOnResize();
        this.handleRandomizeButtonOnResize();
        this.handleFinishButtonOnResize();
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

    private initializeRandomizeButton(): void {
        this.randomizeButton = new Button(this, 50, 50, {
            width: 95,
            height: 50,
            idle: {
                color: 0xffffff,
                textColor: "#000000",
                borderThickness: 3,
                borderColor: 0xe7e7e7,
            },
            hover: {
                color: 0xe7e7e7,
                textColor: "#000000",
                borderThickness: 3,
                borderColor: 0xadafbc,
            },
            pressed: {
                color: 0xadafbc,
                textColor: "#000000",
                borderThickness: 3,
                borderColor: 0xadafbc,
            },
        });
        this.randomizeButton.setText("Randomize");
    }

    private initializeFinishButton(): void {
        this.finishButton = new Button(this, 50, 50, {
            width: 95,
            height: 50,
            idle: {
                color: 0x209cee,
                textColor: "#ffffff",
                borderThickness: 3,
                borderColor: 0x006bb3,
            },
            hover: {
                color: 0x0987db,
                textColor: "#ffffff",
                borderThickness: 3,
                borderColor: 0x006bb3,
            },
            pressed: {
                color: 0x006bb3,
                textColor: "#ffffff",
                borderThickness: 3,
                borderColor: 0x006bb3,
            },
        });
        this.finishButton.setText("Finish");
    }

    private refreshPlayerCurrentOutfit(): void {
        let i = 0;
        for (const layerItem of this.selectedLayers) {
            const bodyPart = CustomWokaBodyPart[CustomWokaBodyPartOrder[i] as CustomWokaBodyPart];
            this.customWokaPreviewer.updateSprite(this.layers[i][layerItem].id, bodyPart);
            i += 1;
            this.bodyPartsSlots[bodyPart].setTextures(this.getCurrentlySelectedWokaTexturesRecord());
        }
    }

    private getCurrentlySelectedWokaTexturesRecord(): Record<CustomWokaBodyPart, string> {
        return {
            [CustomWokaBodyPart.Accessory]:
                this.layers[CustomWokaBodyPartOrder.Accessory][this.selectedLayers[CustomWokaBodyPartOrder.Accessory]]
                    .id,
            [CustomWokaBodyPart.Body]:
                this.layers[CustomWokaBodyPartOrder.Body][this.selectedLayers[CustomWokaBodyPartOrder.Body]].id,
            [CustomWokaBodyPart.Clothes]:
                this.layers[CustomWokaBodyPartOrder.Clothes][this.selectedLayers[CustomWokaBodyPartOrder.Clothes]].id,
            [CustomWokaBodyPart.Eyes]:
                this.layers[CustomWokaBodyPartOrder.Eyes][this.selectedLayers[CustomWokaBodyPartOrder.Eyes]].id,
            [CustomWokaBodyPart.Hair]:
                this.layers[CustomWokaBodyPartOrder.Hair][this.selectedLayers[CustomWokaBodyPartOrder.Hair]].id,
            [CustomWokaBodyPart.Hat]:
                this.layers[CustomWokaBodyPartOrder.Hat][this.selectedLayers[CustomWokaBodyPartOrder.Hat]].id,
        };
    }

    private handleCustomWokaPreviewerOnResize(): void {
        this.customWokaPreviewer.x = this.cameras.main.worldView.x + this.cameras.main.width / 2;
        this.customWokaPreviewer.y = this.customWokaPreviewer.displayHeight * 0.5 + 10;
    }

    private handleBodyPartSlotsOnResize(): void {
        const ratio = innerHeight / innerWidth;
        const slotDimension = 100;

        for (const part in this.bodyPartsSlots) {
            this.bodyPartsSlots[part as CustomWokaBodyPart].setDisplaySize(slotDimension, slotDimension);
        }

        const slotSize = this.bodyPartsSlots.Accessory.displayHeight;

        if (ratio > 1.6) {
            const middle = Math.floor(this.customWokaPreviewer.x);
            const left = Math.floor(middle - slotSize - 10);
            const right = Math.floor(middle + slotSize + 10);
            const top = Math.floor(
                this.customWokaPreviewer.y + this.customWokaPreviewer.displayHeight * 0.5 + slotSize * 1.5 + 9
            );
            const bottom = Math.floor(top + slotSize + 10);

            this.bodyPartsSlots.Body.setPosition(left, top);
            this.bodyPartsSlots.Eyes.setPosition(middle, top);
            this.bodyPartsSlots.Hair.setPosition(right, top);
            this.bodyPartsSlots.Clothes.setPosition(left, bottom);
            this.bodyPartsSlots.Hat.setPosition(middle, bottom);
            this.bodyPartsSlots.Accessory.setPosition(right, bottom);

            return;
        }

        const left = Math.floor(
            this.customWokaPreviewer.x - this.customWokaPreviewer.displayWidth * 0.5 - slotSize * 0.5 - 10
        );
        const leftEdge = Math.floor(left - slotSize - 10);
        const right = Math.floor(
            this.customWokaPreviewer.x + this.customWokaPreviewer.displayWidth * 0.5 + slotSize * 0.5 + 10
        );
        const rightEdge = Math.floor(right + slotSize + 10);
        const top = Math.floor(0 + slotSize * 0.5 + 9);
        const middle = Math.floor(top + slotSize + 10);
        const bottom = Math.floor(middle + slotSize + 10);

        this.bodyPartsSlots.Body.setPosition(left, top);
        this.bodyPartsSlots.Eyes.setPosition(left, middle);
        this.bodyPartsSlots.Hair.setPosition(ratio < 0.6 ? leftEdge : left, ratio < 0.6 ? middle : bottom);
        this.bodyPartsSlots.Clothes.setPosition(right, top);
        this.bodyPartsSlots.Hat.setPosition(right, middle);
        this.bodyPartsSlots.Accessory.setPosition(ratio < 0.6 ? rightEdge : right, ratio < 0.6 ? middle : bottom);
    }

    private handleBodyPartsDraggableGridOnResize(): void {
        const gridHeight = 110;
        const gridWidth = innerWidth / waScaleManager.getActualZoom();

        const gridTopMargin = Math.max(
            this.finishButton.y + this.finishButton.displayHeight * 0.5,
            this.bodyPartsSlots.Hair.y + this.bodyPartsSlots.Hair.displayHeight * 0.5
        );
        const gridBottomMargin = this.cameras.main.worldView.y + this.cameras.main.height;

        const yPos = gridTopMargin + (gridBottomMargin - gridTopMargin) * 0.5;

        const gridPos = {
            x: this.cameras.main.worldView.x + this.cameras.main.width / 2,
            y: yPos,
        };

        this.bodyPartsDraggableGridLeftShadow.setPosition(0, yPos);
        this.bodyPartsDraggableGridRightShadow.setPosition(
            this.cameras.main.worldView.x + this.cameras.main.width,
            yPos
        );

        try {
            this.bodyPartsDraggableGrid.changeDraggableSpacePosAndSize(
                gridPos,
                { x: gridWidth, y: gridHeight },
                gridPos
            );
        } catch (error) {
            console.warn(error);
        }

        this.populateGrid();
        const selectedGridItem = this.selectGridItem();
        if (selectedGridItem) {
            this.centerGridOnItem(selectedGridItem);
        }
    }

    private handleRandomizeButtonOnResize(): void {
        const x =
            this.customWokaPreviewer.x +
            (this.customWokaPreviewer.displayWidth - this.randomizeButton.displayWidth) * 0.5;
        const y =
            this.customWokaPreviewer.y +
            (this.customWokaPreviewer.displayHeight + this.randomizeButton.displayHeight) * 0.5 +
            10;
        this.randomizeButton.setPosition(x, y);
    }

    private handleFinishButtonOnResize(): void {
        const x =
            this.customWokaPreviewer.x -
            (this.customWokaPreviewer.displayWidth - this.randomizeButton.displayWidth) * 0.5;
        const y =
            this.customWokaPreviewer.y +
            (this.customWokaPreviewer.displayHeight + this.randomizeButton.displayHeight) * 0.5 +
            10;
        this.finishButton.setPosition(x, y);
    }

    private getCustomWokaPreviewerConfig(): CustomWokaPreviewerConfig {
        return {
            color: 0xffffff,
            borderThickness: 1,
            borderColor: 0xadafbc,
            bodyPartsOffsetX: -1,
        };
    }

    private getWokaBodyPartSlotConfig(bodyPart?: CustomWokaBodyPart, newTextureKey?: string): WokaBodyPartSlotConfig {
        const textures = this.getCurrentlySelectedWokaTexturesRecord();
        if (bodyPart && newTextureKey) {
            textures[bodyPart] = newTextureKey;
        }
        return {
            color: 0xffffff,
            borderThickness: 1,
            borderColor: 0xadafbc,
            borderSelectedColor: 0x209cee,
            textureKeys: textures,
            offsetX: -4,
            offsetY: 2,
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

        this.randomizeButton.on(Phaser.Input.Events.POINTER_UP, () => {
            this.randomizeOutfit();
            this.clearGrid();
            this.deselectAllSlots();
            this.refreshPlayerCurrentOutfit();
        });

        this.finishButton.on(Phaser.Input.Events.POINTER_UP, () => {
            this.nextSceneToCamera();
        });

        for (const bodyPart in CustomWokaBodyPart) {
            const slot = this.bodyPartsSlots[bodyPart as CustomWokaBodyPart];
            slot.on(WokaBodyPartSlotEvent.Clicked, (selected: boolean) => {
                if (!selected) {
                    this.selectedBodyPartType = bodyPart as CustomWokaBodyPart;
                    this.selectedItemTextureKey = slot.getContentData()[this.selectedBodyPartType];
                    this.deselectAllSlots();
                    slot.select(true);
                    this.populateGrid();
                    if (!this.selectedItemTextureKey) {
                        return;
                    }
                    const selectedGridItem = this.selectGridItem();
                    if (!selectedGridItem) {
                        return;
                    }
                    this.bodyPartsDraggableGrid.moveContentToBeginning();
                    this.centerGridOnItem(selectedGridItem);
                } else {
                    this.selectedBodyPartType = undefined;
                    slot.select(false);
                    this.clearGrid();
                }
            });
        }

        this.bodyPartsDraggableGrid.on(DraggableGridEvent.ItemClicked, (item: WokaBodyPartSlot) => {
            void this.bodyPartsDraggableGrid.centerOnItem(this.bodyPartsDraggableGrid.getAllItems().indexOf(item), 500);
            this.bodyPartsDraggableGrid.getAllItems().forEach((slot) => (slot as WokaBodyPartSlot).select(false));
            this.changeOutfitPart(Number(item.getId()));
            this.refreshPlayerCurrentOutfit();
            item.select(true);
        });
    }

    private selectGridItem(): WokaBodyPartSlot | undefined {
        const bodyPartType = this.selectedBodyPartType;
        if (!bodyPartType) {
            return;
        }
        const items = this.bodyPartsDraggableGrid.getAllItems() as WokaBodyPartSlot[];
        const item = items.find((item) => item.getContentData()[bodyPartType] === this.selectedItemTextureKey);
        item?.select();
        return item;
    }

    private centerGridOnItem(item: WokaBodyPartSlot, duration: number = 500): void {
        void this.bodyPartsDraggableGrid.centerOnItem(
            this.bodyPartsDraggableGrid.getAllItems().indexOf(item),
            duration
        );
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

        const bodyPartsLayer = this.layers[CustomWokaBodyPartOrder[this.selectedBodyPartType]];

        this.clearGrid();
        for (let i = 0; i < bodyPartsLayer.length; i += 1) {
            const slot = new WokaBodyPartSlot(
                this,
                0,
                0,
                {
                    ...this.getWokaBodyPartSlotConfig(this.selectedBodyPartType, bodyPartsLayer[i].id),
                    offsetX: 0,
                    offsetY: 0,
                },
                i
            ).setDisplaySize(this.SLOT_DIMENSION, this.SLOT_DIMENSION);
            this.bodyPartsDraggableGrid.addItem(slot);
        }
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
