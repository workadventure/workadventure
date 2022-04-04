import { gameManager } from "../Game/GameManager";
import { EnableCameraSceneName } from "./EnableCameraScene";
import { CustomizeSceneName } from "./CustomizeScene";
import { localUserStore } from "../../Connexion/LocalUserStore";
import { loadAllDefaultModels } from "../Entity/PlayerTexturesLoadingManager";
import { Loader } from "../Components/Loader";
import { BodyResourceDescriptionInterface, PlayerTextures, PlayerTexturesKey } from "../Entity/PlayerTextures";
import { AbstractCharacterScene } from "./AbstractCharacterScene";
import { areCharacterLayersValid } from "../../Connexion/LocalUser";
import { touchScreenManager } from "../../Touch/TouchScreenManager";
import { PinchManager } from "../UserInput/PinchManager";
import { selectCharacterSceneVisibleStore } from "../../Stores/SelectCharacterStore";
import { waScaleManager } from "../Services/WaScaleManager";
import { analyticsClient } from "../../Administration/AnalyticsClient";
import { isMediaBreakpointUp } from "../../Utils/BreakpointsUtils";
import { PUSHER_URL } from "../../Enum/EnvironmentVariable";
import { customizeAvailableStore, selectedCollection } from "../../Stores/SelectCharacterSceneStore";
import { DraggableGrid } from "@home-based-studio/phaser3-utils";
import { WokaSlot } from "../Components/SelectWoka/WokaSlot";
import { DraggableGridEvent } from "@home-based-studio/phaser3-utils/lib/utils/gui/containers/grids/DraggableGrid";
import { wokaList } from "../../Messages/JsonMessages/PlayerTextures";

//todo: put this constants in a dedicated file
export const SelectCharacterSceneName = "SelectCharacterScene";

export class SelectCharacterScene extends AbstractCharacterScene {
    protected selectedWoka!: Phaser.GameObjects.Sprite | null; // null if we are selecting the "customize" option
    protected playerModels!: BodyResourceDescriptionInterface[];

    private charactersDraggableGrid!: DraggableGrid;
    private collectionKeys!: string[];
    private selectedCollectionIndex!: number;

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
                    this.playerModels = loadAllDefaultModels(this.load, this.playerTextures);
                    this.lazyloadingAttempt = false;
                }
            )
            .catch((e) => console.error(e));
        this.playerModels = loadAllDefaultModels(this.load, this.playerTextures);
        this.lazyloadingAttempt = false;

        //this function must stay at the end of preload function
        this.loader.addLoader();
    }

    public create() {
        this.selectedWoka = null;
        this.selectedCollectionIndex = 0;
        this.collectionKeys = this.playerTextures.getCollectionsKeys();
        selectedCollection.set(this.getSelectedCollectionName());

        customizeAvailableStore.set(this.isCustomizationAvailable());
        selectCharacterSceneVisibleStore.set(true);

        if (touchScreenManager.supportTouchScreen) {
            new PinchManager(this);
        }

        waScaleManager.saveZoom();
        waScaleManager.zoomModifier = isMediaBreakpointUp("md") ? 2 : 1;

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
    }

    public nextSceneToCameraScene(): void {
        if (this.selectedWoka !== null && !areCharacterLayersValid([this.selectedWoka.texture.key])) {
            return;
        }
        if (!this.selectedWoka) {
            return;
        }

        analyticsClient.validationWoka("SelectWoka");

        this.scene.stop(SelectCharacterSceneName);
        waScaleManager.restoreZoom();
        gameManager.setCharacterLayers([this.selectedWoka.texture.key]);
        this.selectedWoka = null;
        gameManager.tryResumingGame(EnableCameraSceneName);
        selectCharacterSceneVisibleStore.set(false);
        this.events.removeListener("wake");
    }

    public nextSceneToCustomizeScene(): void {
        if (this.selectedWoka !== null && !areCharacterLayersValid([this.selectedWoka.texture.key])) {
            return;
        }
        this.selectedWoka = null;
        this.scene.sleep(SelectCharacterSceneName);
        waScaleManager.restoreZoom();
        this.scene.run(CustomizeSceneName);
        selectCharacterSceneVisibleStore.set(false);
    }

    public update(time: number, delta: number): void {
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

    public getCollectionKeysSize(): number {
        return this.collectionKeys.length;
    }

    public selectPreviousCollection(): void {
        this.selectedCollectionIndex = (this.selectedCollectionIndex + 1) % this.collectionKeys.length;
        selectedCollection.set(this.getSelectedCollectionName());
        this.populateGrid();
    }

    public selectNextCollection(): void {
        this.selectedCollectionIndex =
            this.selectedCollectionIndex - 1 < 0 ? this.collectionKeys.length - 1 : this.selectedCollectionIndex - 1;
        selectedCollection.set(this.getSelectedCollectionName());
        this.populateGrid();
    }

    private handleCharactersGridOnResize(): void {
        const ratio = innerHeight / innerWidth;
        const twoRows = ratio > 1 || innerHeight > 900;
        const gridHeight = twoRows ? 210 : 105;
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
        this.charactersDraggableGrid.setItemsInRow(twoRows ? 2 : 1);
        this.populateGrid();
    }

    private populateGrid(): void {
        const wokaDimension = 100;

        this.selectedWoka = null;
        this.charactersDraggableGrid.clearAllItems();
        const textures = this.playerTextures.getWokaCollectionTextures(this.getSelectedCollectionName());
        for (let i = 0; i < textures.length; i += 1) {
            const slot = new WokaSlot(this, textures[i].id).setDisplaySize(wokaDimension, wokaDimension);
            this.charactersDraggableGrid.addItem(slot);
        }
        this.charactersDraggableGrid.moveContentToBeginning();
        void this.charactersDraggableGrid.moveContentTo(0.5, textures.length * 50);
    }

    private bindEventHandlers(): void {
        this.events.addListener("wake", () => {
            waScaleManager.saveZoom();
            waScaleManager.zoomModifier = isMediaBreakpointUp("md") ? 2 : 1;
            selectCharacterSceneVisibleStore.set(true);
        });

        this.input.keyboard.on("keyup-ENTER", () => {
            return this.nextSceneToCameraScene();
        });

        this.charactersDraggableGrid.on(DraggableGridEvent.ItemClicked, (item: WokaSlot) => {
            if (this.charactersDraggableGrid.getDraggableSpaceWidth() < this.charactersDraggableGrid.getGridSize().x) {
                void this.charactersDraggableGrid.centerOnItem(
                    this.charactersDraggableGrid.getAllItems().indexOf(item),
                    500
                );
            }
            this.charactersDraggableGrid.getAllItems().forEach((slot) => (slot as WokaSlot).select(false));
            this.selectedWoka?.stop()?.setFrame(0);
            this.selectedWoka = item.getSprite();
            const wokaKey = this.selectedWoka.texture.key;
            this.createWokaAnimation(wokaKey);
            this.selectedWoka.play(wokaKey);
            item.select(true);
        });
    }

    private createWokaAnimation(key: string): void {
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
