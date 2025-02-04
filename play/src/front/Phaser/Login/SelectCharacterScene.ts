import { DraggableGrid } from "@home-based-studio/phaser3-utils";
import { DraggableGridEvent } from "@home-based-studio/phaser3-utils/lib/utils/gui/containers/grids/DraggableGrid";
import { wokaList } from "@workadventure/messages";
import { get } from "svelte/store";
import { localUserStore } from "../../Connection/LocalUserStore";
import { loadAllDefaultModels } from "../Entity/PlayerTexturesLoadingManager";
import { Loader } from "../Components/Loader";
import type { WokaTextureDescriptionInterface } from "../Entity/PlayerTextures";
import { PlayerTextures } from "../Entity/PlayerTextures";
import { areCharacterTexturesValid } from "../../Connection/LocalUserUtils";
import { touchScreenManager } from "../../Touch/TouchScreenManager";
import { PinchManager } from "../UserInput/PinchManager";
import { selectCharacterSceneVisibleStore } from "../../Stores/SelectCharacterStore";
import { waScaleManager } from "../Services/WaScaleManager";
import { analyticsClient } from "../../Administration/AnalyticsClient";
import {
    collectionsSizeStore,
    customizeAvailableStore,
    selectedCollection,
} from "../../Stores/SelectCharacterSceneStore";
import { WokaSlot } from "../Components/SelectWoka/WokaSlot";
import { myCameraStore, myMicrophoneStore } from "../../Stores/MyMediaStore";
import { gameManager } from "../Game/GameManager";
import { ABSOLUTE_PUSHER_URL } from "../../Enum/ComputedConst";
import { batchGetUserMediaStore } from "../../Stores/MediaStore";
import { connectionManager } from "../../Connection/ConnectionManager";
import { AbstractCharacterScene } from "./AbstractCharacterScene";
import { CustomizeSceneName } from "./CustomizeScene";
import { EnableCameraSceneName } from "./EnableCameraScene";

//todo: put this constants in a dedicated file
export const SelectCharacterSceneName = "SelectCharacterScene";

export class SelectCharacterScene extends AbstractCharacterScene {
    protected selectedWoka: Phaser.GameObjects.Sprite | null = null; // null if we are selecting the "customize" option
    protected playerModels!: WokaTextureDescriptionInterface[];

    private charactersDraggableGrid!: DraggableGrid;
    private collectionKeys!: string[];
    private selectedCollectionIndex!: number;
    private selectedGridItemIndex?: number;
    private gridRowsCount = 1;

    protected lazyloadingAttempt = true; //permit to update texture loaded after renderer
    private loader: Loader;

    constructor() {
        super({
            key: SelectCharacterSceneName,
        });
        this.loader = new Loader(this);
        this.playerTextures = new PlayerTextures();
    }

    public preload() {
        super.preload();
        const wokaMetadataKey = "woka-list" + gameManager.currentStartedRoom.href;
        this.cache.json.remove(wokaMetadataKey);

        this.superLoad
            .json(
                wokaMetadataKey,
                new URL(
                    "woka/list?roomUrl=" + encodeURIComponent(gameManager.currentStartedRoom.href),
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
                    collectionsSizeStore.set(this.playerTextures.getCollectionsKeys().length);
                    this.playerModels = loadAllDefaultModels(this.load, this.playerTextures);
                    this.lazyloadingAttempt = false;
                }
            )
            .catch((e) => console.error(e));
        this.playerModels = loadAllDefaultModels(this.load, this.playerTextures);
        this.lazyloadingAttempt = false;

        //this function must stay at the end of preload function
        this.loader.addLoader();
        /*
        if (gameManager.currentStartedRoom.backgroundColor != undefined) {
            this.cameras.main.setBackgroundColor(gameManager.currentStartedRoom.backgroundColor);
        }
         */
    }

    public create() {
        super.create();

        waScaleManager.zoomModifier = 1;
        this.selectedWoka = null;
        this.selectedCollectionIndex = 0;
        this.collectionKeys = this.playerTextures.getCollectionsKeys();

        selectedCollection.set(this.getSelectedCollectionName());

        customizeAvailableStore.set(this.isCustomizationAvailable());
        selectCharacterSceneVisibleStore.set(true);

        if (touchScreenManager.supportTouchScreen) {
            new PinchManager(this);
        }

        this.charactersDraggableGrid = new DraggableGrid(this, {
            position: { x: 0, y: 0 },
            maskPosition: { x: 0, y: 0 },
            dimension: { x: 485, y: 165 },
            horizontal: true,
            repositionToCenter: true,
            itemsInRow: 1,
            margin: {
                left: ((innerWidth - 200) / waScaleManager.getActualZoom()) * 0.5,
                right: ((innerWidth - 200) / waScaleManager.getActualZoom()) * 0.5,
            },
            spacing: 5,
            debug: {
                showDraggableSpace: false,
            },
        });

        this.bindEventHandlers();

        this.onResize();

        if (get(collectionsSizeStore) < 1) {
            this.nextSceneToCustomizeScene();
        }

        const characterTextures = gameManager.getCharacterTextureIds();
        if (characterTextures) {
            this.playerTextures.wokaCollections.forEach((collection, index) => {
                collection.forEach((woka) => {
                    const wokaCurrentId = characterTextures.find((textureId) => textureId === woka.id);
                    if (wokaCurrentId) {
                        // Select collection
                        this.selectedCollectionIndex = this.collectionKeys.indexOf(index);

                        // Select WOKA
                        const selectedGridItemIndex = this.playerTextures
                            .getWokaCollectionTextures(this.getSelectedCollectionName())
                            .findIndex((texture) => texture.id === wokaCurrentId);
                        if (selectedGridItemIndex !== -1) {
                            this.selectedGridItemIndex = selectedGridItemIndex;
                            const selectedWokaSlot = this.charactersDraggableGrid.getAllItems()[
                                this.selectedGridItemIndex
                            ] as WokaSlot;
                            if (selectedWokaSlot != undefined) this.selectGridItem(selectedWokaSlot);
                        }
                    }
                });
            });
        }
    }

    public async nextSceneToCameraScene(): Promise<void> {
        if (this.selectedWoka !== null && !areCharacterTexturesValid([this.selectedWoka.texture.key])) {
            return;
        }
        if (!this.selectedWoka) {
            return;
        }

        analyticsClient.validationWoka("SelectWoka");

        gameManager.setCharacterTextureIds([this.selectedWoka.texture.key]);
        await connectionManager.saveTextures([this.selectedWoka.texture.key]);
        this.selectedWoka = null;
        this.scene.stop(SelectCharacterSceneName);
        gameManager.tryResumingGame(EnableCameraSceneName);
        selectCharacterSceneVisibleStore.set(false);
        this.events.removeListener("wake");
    }

    public nextSceneToCustomizeScene(): void {
        if (this.selectedWoka !== null && !areCharacterTexturesValid([this.selectedWoka.texture.key])) {
            return;
        }
        batchGetUserMediaStore.startBatch();
        myCameraStore.set(false);
        myMicrophoneStore.set(false);
        batchGetUserMediaStore.commitChanges();
        this.scene.sleep(SelectCharacterSceneName);
        this.scene.run(CustomizeSceneName);
        selectCharacterSceneVisibleStore.set(false);
    }

    public update(): void {
        if (this.lazyloadingAttempt) {
            this.lazyloadingAttempt = false;
        }
    }

    public onResize(): void {
        this.handleCharactersGridOnResize();
    }

    public getSelectedCollectionName(): string {
        return this.collectionKeys[this.selectedCollectionIndex] ?? "";
    }

    public selectPreviousCollection(): void {
        this.selectedCollectionIndex = (this.selectedCollectionIndex + 1) % this.collectionKeys.length;
        selectedCollection.set(this.getSelectedCollectionName());
        this.populateGrid();
    }

    public selectNextCollection(): void {
        if (this.collectionKeys.length === 1) {
            return;
        }
        this.selectedCollectionIndex =
            this.selectedCollectionIndex - 1 < 0 ? this.collectionKeys.length - 1 : this.selectedCollectionIndex - 1;
        selectedCollection.set(this.getSelectedCollectionName());
        this.populateGrid();
    }

    private handleCharactersGridOnResize(): void {
        const ratio = innerHeight / innerWidth;
        this.gridRowsCount = ratio > 1 || innerHeight > 900 ? 2 : 1;
        const gridHeight = this.gridRowsCount === 2 ? 210 : 105;
        const gridWidth = innerWidth / waScaleManager.getActualZoom();
        const gridPos = {
            x: this.cameras.main.worldView.x + this.cameras.main.width / 2,
            y: this.cameras.main.worldView.y + this.cameras.main.height * (ratio > 1 ? 0.5 : 0.575),
        };

        try {
            this.charactersDraggableGrid.changeDraggableSpacePosAndSize(
                gridPos,
                { x: gridWidth, y: gridHeight },
                gridPos
            );
        } catch (error) {
            console.warn(error);
        }
        this.charactersDraggableGrid.setItemsInRow(this.gridRowsCount);
        this.populateGrid();
    }

    private populateGrid(): void {
        const wokaDimension = 100;

        this.selectedWoka = null;
        this.charactersDraggableGrid.clearAllItems();
        const textures = this.playerTextures.getWokaCollectionTextures(this.getSelectedCollectionName());

        let currentSelectedItem = null;

        for (let i = 0; i < textures.length; i += 1) {
            const slot = new WokaSlot(this, textures[i].id).setDisplaySize(wokaDimension, wokaDimension);

            //ini current Select Item to the first
            if (i === 0) currentSelectedItem = slot;

            const characterTextures = localUserStore.getCharacterTextures();

            if (characterTextures && characterTextures[0] === textures[i].id) currentSelectedItem = slot;
            this.charactersDraggableGrid.addItem(slot);
        }
        this.charactersDraggableGrid.moveContentToBeginning();

        //Select the first Woka
        if (currentSelectedItem) this.selectGridItem(currentSelectedItem);
    }

    private bindEventHandlers(): void {
        this.bindKeyboardEventHandlers();
        this.events.addListener("wake", () => {
            selectCharacterSceneVisibleStore.set(true);
        });

        this.input.keyboard?.on("keyup-ENTER", () => {
            return this.nextSceneToCameraScene();
        });

        this.charactersDraggableGrid.on(DraggableGridEvent.ItemClicked, (item: WokaSlot) => {
            this.selectGridItem(item);
        });
    }

    private selectGridItem(item: WokaSlot): void {
        this.selectedGridItemIndex = this.charactersDraggableGrid.getAllItems().indexOf(item);
        if (this.charactersDraggableGrid.getDraggableSpaceWidth() < this.charactersDraggableGrid.getGridSize().x) {
            void this.charactersDraggableGrid.centerOnItem(this.selectedGridItemIndex, 500);
        }
        this.charactersDraggableGrid.getAllItems().forEach((slot) => (slot as WokaSlot).select(false));
        this.selectedWoka?.stop()?.setFrame(0);
        this.selectedWoka = item.getSprite();
        const wokaKey = this.selectedWoka.texture.key;
        if (wokaKey !== "__MISSING") {
            this.createWokaAnimation(wokaKey);
        }
        if (this.anims.exists(wokaKey)) {
            this.selectedWoka.play(wokaKey);
        }
        item.select(true);
    }

    private bindKeyboardEventHandlers(): void {
        this.input.keyboard?.on("keyup-SPACE", () => {
            this.selectNextCollection();
        });
        this.input.keyboard?.on("keydown-LEFT", () => {
            this.selectNextGridItem(true, true);
        });
        this.input.keyboard?.on("keydown-RIGHT", () => {
            this.selectNextGridItem(false, true);
        });
        this.input.keyboard?.on("keydown-UP", () => {
            this.selectNextGridItem(true, false);
        });
        this.input.keyboard?.on("keydown-DOWN", () => {
            this.selectNextGridItem(false, false);
        });
        this.input.keyboard?.on("keydown-W", () => {
            this.selectNextGridItem(true, false);
        });
        this.input.keyboard?.on("keydown-S", () => {
            this.selectNextGridItem(false, false);
        });
        this.input.keyboard?.on("keydown-A", () => {
            this.selectNextGridItem(true, true);
        });
        this.input.keyboard?.on("keydown-D", () => {
            this.selectNextGridItem(false, true);
        });
    }

    private selectNextGridItem(previous = false, horizontally: boolean): void {
        if (this.selectedGridItemIndex === undefined) {
            this.selectedGridItemIndex = 0;
        }
        if (
            previous
                ? this.selectedGridItemIndex > 0
                : this.selectedGridItemIndex < this.charactersDraggableGrid.getAllItems().length - 1
        ) {
            // NOTE: getItemsInRowCount() not working properly. Fix on lib side needed
            const jump = horizontally ? this.gridRowsCount : 1;
            const item = this.charactersDraggableGrid.getAllItems()[
                this.selectedGridItemIndex + (previous ? -jump : jump)
            ] as WokaSlot;
            if (!item) {
                return;
            }
            this.selectedGridItemIndex += previous ? -1 : 1;
            this.selectGridItem(item);
        }
    }

    private createWokaAnimation(key: string): void {
        if (this.anims.exists(key)) {
            return;
        }
        this.anims.create({
            key,
            frames: this.anims.generateFrameNumbers(key, { start: 0, end: 11 }),
            frameRate: 8,
            repeat: -1,
        });
    }

    private isCustomizationAvailable(): boolean {
        for (const layer of this.playerTextures.getLayers()) {
            if (Object.keys(layer).length > 0) {
                return true;
            }
        }
        return false;
    }
}
