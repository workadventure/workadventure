import { DraggableGrid } from "@home-based-studio/phaser3-utils";
import { DraggableGridEvent } from "@home-based-studio/phaser3-utils/lib/utils/gui/containers/grids/DraggableGrid";
import { wokaList } from "@workadventure/messages";
import { waScaleManager } from "../Services/WaScaleManager";
import { analyticsClient } from "../../Administration/AnalyticsClient";
import type { CustomWokaPreviewerConfig } from "../Components/CustomizeWoka/CustomWokaPreviewer";
import { WokaBodyPartOrder, CustomWokaPreviewer, WokaBodyPart } from "../Components/CustomizeWoka/CustomWokaPreviewer";
import type { WokaBodyPartSlotConfig } from "../Components/CustomizeWoka/WokaBodyPartSlot";
import { WokaBodyPartSlot } from "../Components/CustomizeWoka/WokaBodyPartSlot";
import { Button } from "../Components/Ui/Button";
import type { WokaTextureDescriptionInterface } from "../Entity/PlayerTextures";
import { Loader } from "../Components/Loader";
import { localUserStore } from "../../Connection/LocalUserStore";
import { gameManager } from "../Game/GameManager";
import { loadAllLayers } from "../Entity/PlayerTexturesLoadingManager";
import { TexturesHelper } from "../Helpers/TexturesHelper";
import type { IconButtonConfig } from "../Components/Ui/IconButton";
import { IconButton, IconButtonEvent } from "../Components/Ui/IconButton";
import { selectCharacterCustomizeSceneVisibleStore } from "../../Stores/SelectCharacterStore";
import { ABSOLUTE_PUSHER_URL } from "../../Enum/ComputedConst";
import { connectionManager } from "../../Connection/ConnectionManager";
import { areCharacterTexturesValid } from "../../Connection/LocalUserUtils";
import { SelectCharacterSceneName } from "./SelectCharacterScene";
import { AbstractCharacterScene } from "./AbstractCharacterScene";
import { EnableCameraSceneName } from "./EnableCameraScene";

export const CustomizeSceneName = "CustomizeScene";

export class CustomizeScene extends AbstractCharacterScene {
    private customWokaPreviewer!: CustomWokaPreviewer;
    private bodyPartsDraggableGridLeftShadow!: Phaser.GameObjects.Image;
    private bodyPartsDraggableGridRightShadow!: Phaser.GameObjects.Image;
    private bodyPartsDraggableGrid!: DraggableGrid;
    private bodyPartsButtons!: Record<WokaBodyPart, IconButton>;
    private backButton!: Button;

    private randomizeButton!: Button;
    private finishButton!: Button;

    private selectedTextures: number[] = [0, 0, 0, 0, 0, 0];
    private layers: WokaTextureDescriptionInterface[][] = [];
    private selectedBodyPartType?: WokaBodyPart;

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
        super.preload();

        const iconClothes = gameManager.currentStartedRoom.iconClothes ?? "/resources/icons/icon_clothes.png";
        const iconAccessory = gameManager.currentStartedRoom.iconAccessory ?? "/resources/icons/icon_accessory.png";
        const iconHat = gameManager.currentStartedRoom.iconHat ?? "/resources/icons/icon_hat.png";
        const iconHair = gameManager.currentStartedRoom.iconHair ?? "/resources/icons/icon_hair.png";
        const iconEyes = gameManager.currentStartedRoom.iconEyes ?? "/resources/icons/icon_eyes.png";
        const iconBody = gameManager.currentStartedRoom.iconBody ?? "/resources/icons/icon_body.png";
        const iconTurn = gameManager.currentStartedRoom.iconTurn ?? "/resources/icons/icon_turn.png";

        this.load.image("iconClothes", iconClothes);
        this.load.image("iconAccessory", iconAccessory);
        this.load.image("iconHat", iconHat);
        this.load.image("iconHair", iconHair);
        this.load.image("iconEyes", iconEyes);
        this.load.image("iconBody", iconBody);
        this.load.image("iconTurn", iconTurn);
        this.load.spritesheet("floorTiles", "/resources/tilesets/floor_tiles.png", { frameWidth: 32, frameHeight: 32 });

        TexturesHelper.createRectangleTexture(this, "gridEdgeShadow", this.cameras.main.width * 0.2, 115, 0x000000);

        const wokaMetadataKey = "woka-list" + gameManager.currentStartedRoom.href;
        this.cache.json.remove(wokaMetadataKey);
        this.superLoad
            .json(
                wokaMetadataKey,
                new URL(
                    "/woka/list?roomUrl=" + encodeURIComponent(gameManager.currentStartedRoom.href),
                    ABSOLUTE_PUSHER_URL
                ).toString(),
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
        super.create();

        this.selectedTextures = [0, 0, 0, 0, 0, 0];
        this.tryLoadLastUsedWokaLayers();
        waScaleManager.zoomModifier = 1;
        this.createSlotBackgroundTextures();
        this.initializeCustomWokaPreviewer();
        this.initializeBodyPartsDraggableGrid();
        this.initializeEdgeShadows();
        this.initializeBodyPartsButtons();
        this.initializeRandomizeButton();
        this.initializeFinishButton();
        this.initializeBackButton();

        this.selectedBodyPartType = WokaBodyPart.Body;
        this.bodyPartsButtons.Body.select();

        this.bindEventHandlers();

        selectCharacterCustomizeSceneVisibleStore.set(true);

        this.refreshPlayerCurrentOutfit();
        this.onResize();
    }

    public update(time: number, dt: number): void {
        this.customWokaPreviewer.update();
    }

    public onResize(): void {
        this.handleCustomWokaPreviewerOnResize();
        this.handleBodyPartButtonsOnResize();
        this.handleRandomizeButtonOnResize();
        this.handleFinishButtonOnResize();
        this.handleBodyPartsDraggableGridOnResize();
    }

    public nextSceneToCamera() {
        selectCharacterCustomizeSceneVisibleStore.set(false);

        const layers: string[] = [];
        let i = 0;
        for (const layerItem of this.selectedTextures) {
            if (layerItem !== undefined) {
                if (this.layers[i][layerItem] === undefined) {
                    continue;
                }
                layers.push(this.layers[i][layerItem].id);
            }
            i++;
        }
        if (!areCharacterTexturesValid(layers)) {
            return;
        }

        analyticsClient.validationWoka("CustomizeWoka");

        gameManager.setCharacterTextureIds(layers);
        connectionManager.saveTextures(layers).catch((e) => console.error(e));
        this.scene.stop(CustomizeSceneName);
        gameManager.tryResumingGame(EnableCameraSceneName);
    }

    public backToPreviousScene(): void {
        selectCharacterCustomizeSceneVisibleStore.set(false);

        this.scene.stop(CustomizeSceneName);
        this.scene.run(SelectCharacterSceneName);
    }

    private tryLoadLastUsedWokaLayers(): void {
        try {
            const savedWokaTextureIds = gameManager.getCharacterTextureIds();
            if (savedWokaTextureIds) {
                for (let i = 0; i < savedWokaTextureIds.length; i += 1) {
                    const index = this.layers[i].findIndex((item) => item.id === savedWokaTextureIds[i]);
                    // set first item as default if not found
                    this.selectedTextures[i] = index !== -1 ? index : 0;
                }
            }
        } catch {
            console.warn("Cannot load previous WOKA");
        }
    }

    private createSlotBackgroundTextures(): void {
        for (let i = 0; i < 4; i += 1) {
            if (this.textures.getTextureKeys().includes(`floorTexture${i}`)) {
                continue;
            }
            TexturesHelper.createFloorRectangleTexture(
                this,
                `floorTexture${i}`,
                WokaBodyPartSlot.SIZE,
                WokaBodyPartSlot.SIZE,
                "floorTiles",
                i
            );
        }
    }

    private initializeBackButton(): void {
        this.backButton = new Button(this, 50, 30, {
            width: 80,
            height: 40,
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
        this.backButton.setText("Back");
        this.backButton.on(Phaser.Input.Events.POINTER_UP, () => {
            this.backToPreviousScene();
        });
    }

    private initializeCustomWokaPreviewer(): void {
        this.customWokaPreviewer = new CustomWokaPreviewer(
            this,
            0,
            0,
            this.getCustomWokaPreviewerConfig()
        ).setDisplaySize(200, 200);
    }

    private initializeBodyPartsDraggableGrid(): void {
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
    }

    private initializeEdgeShadows(): void {
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
    }

    private initializeBodyPartsButtons(): void {
        const tempBodyPartsObject: Record<string, IconButton> = {};
        for (const value of Object.values(WokaBodyPart)) {
            if (this.layers[WokaBodyPartOrder[value]][this.selectedTextures[WokaBodyPartOrder[value]]] === undefined) {
                continue;
            }
            tempBodyPartsObject[value] = new IconButton(this, 0, 0, this.getDefaultIconButtonConfig(`icon${value}`));
        }
        this.bodyPartsButtons = tempBodyPartsObject;
    }

    private getDefaultIconButtonConfig(iconTextureKey: string, iconScale?: number): IconButtonConfig {
        return {
            iconTextureKey,
            iconScale,
            width: 25,
            height: 25,
            idle: {
                color: 0xffffff,
                borderThickness: 3,
                borderColor: 0xe7e7e7,
            },
            hover: {
                color: 0xe7e7e7,
                borderThickness: 3,
                borderColor: 0xadafbc,
            },
            pressed: {
                color: 0xadafbc,
                borderThickness: 3,
                borderColor: 0xadafbc,
            },
            selected: {
                color: 0xadafbc,
                borderThickness: 3,
                borderColor: 0x209cee,
            },
        };
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
        for (const layerItem of this.selectedTextures) {
            const bodyPart = WokaBodyPart[WokaBodyPartOrder[i] as WokaBodyPart];
            if (this.layers[i][layerItem] === undefined) {
                continue;
            }
            this.customWokaPreviewer.updateSprite(this.layers[i][layerItem].id, bodyPart);
            i += 1;
        }
    }

    private getCurrentlySelectedWokaTexturesRecord(): Record<WokaBodyPart, string> {
        const currentlySelectedWokaTexturesRecordObject: Record<string, string> = {};

        for (const value of Object.values(WokaBodyPart)) {
            if (this.layers[WokaBodyPartOrder[value]][this.selectedTextures[WokaBodyPartOrder[value]]] === undefined) {
                continue;
            }
            currentlySelectedWokaTexturesRecordObject[value] =
                this.layers[WokaBodyPartOrder[value]][this.selectedTextures[WokaBodyPartOrder[value]]].id;
        }
        return currentlySelectedWokaTexturesRecordObject;
    }

    private handleCustomWokaPreviewerOnResize(): void {
        const ratio = innerHeight / innerWidth;
        this.customWokaPreviewer.x = this.cameras.main.worldView.x + this.cameras.main.width / 2;
        this.customWokaPreviewer.y = this.customWokaPreviewer.displayHeight * 0.5 + (ratio > 1.6 ? 40 : 10);
    }

    private handleBodyPartButtonsOnResize(): void {
        const ratio = innerHeight / innerWidth;
        const slotDimension = WokaBodyPartSlot.SIZE;

        for (const part in this.bodyPartsButtons) {
            this.bodyPartsButtons[part as WokaBodyPart].setDisplaySize(slotDimension, slotDimension);
        }

        const slotSize = this.bodyPartsButtons.Body.displayHeight;

        if (ratio > 1.6) {
            const middle = Math.floor(this.customWokaPreviewer.x);
            const left = Math.floor(middle - slotSize - 23);
            const right = Math.floor(middle + slotSize + 23);
            const top = Math.floor(
                this.customWokaPreviewer.y + this.customWokaPreviewer.displayHeight * 0.5 + slotSize * 1.5 + 30
            );
            const bottom = Math.floor(top + slotSize + 23);

            if (this.bodyPartsButtons.Body !== undefined) {
                this.bodyPartsButtons.Body.setPosition(left, top);
            }

            if (this.bodyPartsButtons.Eyes !== undefined) {
                this.bodyPartsButtons.Eyes.setPosition(middle, top);
            }
            if (this.bodyPartsButtons.Hair !== undefined) {
                this.bodyPartsButtons.Hair.setPosition(right, top);
            }
            if (this.bodyPartsButtons.Clothes !== undefined) {
                this.bodyPartsButtons.Clothes.setPosition(left, bottom);
            }
            if (this.bodyPartsButtons.Hat !== undefined) {
                this.bodyPartsButtons.Hat.setPosition(middle, bottom);
            }
            if (this.bodyPartsButtons.Accessory !== undefined) {
                this.bodyPartsButtons.Accessory.setPosition(right, bottom);
            }

            return;
        }

        const left = Math.floor(
            this.customWokaPreviewer.x - this.customWokaPreviewer.displayWidth * 0.5 - slotSize * 0.5 - 24
        );
        const right = Math.floor(
            this.customWokaPreviewer.x + this.customWokaPreviewer.displayWidth * 0.5 + slotSize * 0.5 + 24
        );
        const top = Math.floor(0 + slotSize * 0.5 + 11);
        const middle = Math.floor(top + slotSize + 24);
        const bottom = Math.floor(middle + slotSize + 24);

        if (this.bodyPartsButtons.Body !== undefined) {
            this.bodyPartsButtons.Body.setPosition(left, top);
        }
        if (this.bodyPartsButtons.Eyes !== undefined) {
            this.bodyPartsButtons.Eyes.setPosition(left, middle);
        }
        if (this.bodyPartsButtons.Hair !== undefined) {
            this.bodyPartsButtons.Hair.setPosition(left, bottom);
        }
        if (this.bodyPartsButtons.Clothes !== undefined) {
            this.bodyPartsButtons.Clothes.setPosition(right, top);
        }
        if (this.bodyPartsButtons.Hat !== undefined) {
            this.bodyPartsButtons.Hat.setPosition(right, middle);
        }
        if (this.bodyPartsButtons.Accessory !== undefined) {
            this.bodyPartsButtons.Accessory.setPosition(right, bottom);
        }
    }

    private handleBodyPartsDraggableGridOnResize(): void {
        const gridHeight = 110;
        const gridWidth = innerWidth / waScaleManager.getActualZoom();

        const gridTopMargin = Math.max(
            this.finishButton.y + this.finishButton.displayHeight * 0.5,
            this.bodyPartsButtons.Hair.y + this.bodyPartsButtons.Hair.displayHeight * 0.5
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
            this.customWokaPreviewer.x -
            (this.customWokaPreviewer.displayWidth - this.randomizeButton.displayWidth) * 0.5;
        const y =
            this.customWokaPreviewer.y +
            (this.customWokaPreviewer.displayHeight + this.randomizeButton.displayHeight) * 0.5 +
            10;
        this.randomizeButton.setPosition(x, y);
    }

    private handleFinishButtonOnResize(): void {
        const x =
            this.customWokaPreviewer.x +
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

    private getWokaBodyPartSlotConfig(bodyPart?: WokaBodyPart, newTextureKey?: string): WokaBodyPartSlotConfig {
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
        this.bindKeyboardEventHandlers();

        this.randomizeButton.on(Phaser.Input.Events.POINTER_UP, () => {
            this.randomizeOutfit();
            this.clearGrid();
            this.deselectAllButtons();
            this.refreshPlayerCurrentOutfit();
        });

        this.finishButton.on(Phaser.Input.Events.POINTER_UP, () => {
            this.nextSceneToCamera();
        });

        for (const bodyPart of Object.values(WokaBodyPart)) {
            const button = this.bodyPartsButtons[bodyPart as WokaBodyPart];
            if (button === undefined) {
                continue;
            }
            button.on(IconButtonEvent.Clicked, (selected: boolean) => {
                if (!selected) {
                    this.selectBodyPartType(bodyPart as WokaBodyPart);
                }
            });
        }

        this.bodyPartsDraggableGrid.on(DraggableGridEvent.ItemClicked, (item: WokaBodyPartSlot) => {
            void this.bodyPartsDraggableGrid.centerOnItem(this.bodyPartsDraggableGrid.getAllItems().indexOf(item), 500);
            this.deselectAllSlots();
            item.select(true);
            this.setNewBodyPart(Number(item.getId()));
        });
    }

    private bindKeyboardEventHandlers(): void {
        this.input.keyboard?.on("keyup-ENTER", () => {
            this.nextSceneToCamera();
        });
        this.input.keyboard?.on("keyup-BACKSPACE", () => {
            this.backToPreviousScene();
        });
        this.input.keyboard?.on("keyup-DELETE", () => {
            this.backToPreviousScene();
        });
        this.input.keyboard?.on("keydown-LEFT", () => {
            this.selectNextGridItem(true);
        });
        this.input.keyboard?.on("keydown-RIGHT", () => {
            this.selectNextGridItem();
        });
        this.input.keyboard?.on("keydown-UP", () => {
            this.selectNextCategory(true);
        });
        this.input.keyboard?.on("keydown-DOWN", () => {
            this.selectNextCategory();
        });
        this.input.keyboard?.on("keydown-W", () => {
            this.selectNextCategory(true);
        });
        this.input.keyboard?.on("keydown-S", () => {
            this.selectNextCategory();
        });
        this.input.keyboard?.on("keydown-A", () => {
            this.selectNextGridItem(true);
        });
        this.input.keyboard?.on("keydown-D", () => {
            this.selectNextGridItem();
        });
    }

    private selectBodyPartType(bodyPart: WokaBodyPart): void {
        this.selectedBodyPartType = bodyPart;
        this.deselectAllButtons();
        const button = this.bodyPartsButtons[bodyPart];
        button.select(true);
        this.populateGrid();
        const selectedGridItem = this.selectGridItem();
        if (!selectedGridItem) {
            return;
        }
        this.bodyPartsDraggableGrid.moveContentToBeginning();
        this.centerGridOnItem(selectedGridItem);
    }

    private setNewBodyPart(bodyPartIndex: number) {
        this.changeOutfitPart(bodyPartIndex);
        this.refreshPlayerCurrentOutfit();
    }

    private selectGridItem(): WokaBodyPartSlot | undefined {
        const bodyPartType = this.selectedBodyPartType;
        if (!bodyPartType) {
            return;
        }
        const items = this.bodyPartsDraggableGrid.getAllItems() as WokaBodyPartSlot[];
        const item = items.find(
            (item) => item.getContentData()[bodyPartType] === this.getBodyPartSelectedItemId(bodyPartType)
        );
        item?.select();
        return item;
    }

    private getBodyPartSelectedItemId(bodyPartType: WokaBodyPart): string {
        const categoryIndex = WokaBodyPartOrder[bodyPartType];
        return this.layers[categoryIndex][this.selectedTextures[categoryIndex]].id;
    }

    private selectNextGridItem(previous = false): void {
        if (!this.selectedBodyPartType) {
            return;
        }
        const currentIndex = this.getCurrentlySelectedItemIndex();
        if (previous ? currentIndex > 0 : currentIndex < this.bodyPartsDraggableGrid.getAllItems().length - 1) {
            this.deselectAllSlots();
            const item = this.bodyPartsDraggableGrid.getAllItems()[
                currentIndex + (previous ? -1 : 1)
            ] as WokaBodyPartSlot;
            if (item) {
                item.select();
                this.setNewBodyPart(Number(item.getId()));
                this.centerGridOnItem(item);
            }
        }
    }

    private selectNextCategory(previous = false): void {
        if (!this.selectedBodyPartType) {
            this.selectBodyPartType(WokaBodyPart.Body);
            return;
        }
        if (previous && this.selectedBodyPartType === WokaBodyPart.Body) {
            return;
        }
        if (!previous && this.selectedBodyPartType === WokaBodyPart.Accessory) {
            return;
        }
        const index = WokaBodyPartOrder[this.selectedBodyPartType] + (previous ? -1 : 1);
        this.selectBodyPartType(WokaBodyPart[WokaBodyPartOrder[index] as WokaBodyPart]);
    }

    private getCurrentlySelectedItemIndex(): number {
        const bodyPartType = this.selectedBodyPartType;
        if (!bodyPartType) {
            return -1;
        }
        const items = this.bodyPartsDraggableGrid.getAllItems() as WokaBodyPartSlot[];
        return items.findIndex(
            (item) => item.getContentData()[bodyPartType] === this.getBodyPartSelectedItemId(bodyPartType)
        );
    }

    private centerGridOnItem(item: WokaBodyPartSlot, duration = 500): void {
        void this.bodyPartsDraggableGrid.centerOnItem(
            this.bodyPartsDraggableGrid.getAllItems().indexOf(item),
            duration
        );
    }

    private randomizeOutfit(): void {
        for (let i = 0; i < this.selectedTextures.length; i += 1) {
            this.selectedTextures[i] = Math.floor(Math.random() * this.layers[i].length);
        }
    }

    private changeOutfitPart(index: number): void {
        if (this.selectedBodyPartType === undefined) {
            return;
        }
        this.selectedTextures[WokaBodyPartOrder[this.selectedBodyPartType]] = index;
    }

    private populateGrid(): void {
        if (this.selectedBodyPartType === undefined) {
            return;
        }

        const bodyPartsLayer = this.layers[WokaBodyPartOrder[this.selectedBodyPartType]];

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

    private deselectAllButtons(): void {
        for (const bodyPart of Object.values(WokaBodyPart)) {
            if (this.bodyPartsButtons[bodyPart as WokaBodyPart] === undefined) {
                continue;
            }
            this.bodyPartsButtons[bodyPart as WokaBodyPart].select(false);
        }
    }

    private deselectAllSlots(): void {
        this.bodyPartsDraggableGrid.getAllItems().forEach((slot) => (slot as WokaBodyPartSlot).select(false));
    }
}
