import { gameManager } from "../Game/GameManager";
import { EnableCameraSceneName } from "./EnableCameraScene";
import { CustomizeSceneName } from "./CustomizeScene";
import { localUserStore } from "../../Connexion/LocalUserStore";
import { loadAllDefaultModels } from "../Entity/PlayerTexturesLoadingManager";
import { Loader } from "../Components/Loader";
import { BodyResourceDescriptionInterface, PlayerTextures } from "../Entity/PlayerTextures";
import { AbstractCharacterScene } from "./AbstractCharacterScene";
import { areCharacterLayersValid } from "../../Connexion/LocalUser";
import { touchScreenManager } from "../../Touch/TouchScreenManager";
import { PinchManager } from "../UserInput/PinchManager";
import { selectCharacterSceneVisibleStore } from "../../Stores/SelectCharacterStore";
import { waScaleManager } from "../Services/WaScaleManager";
import { analyticsClient } from "../../Administration/AnalyticsClient";
import { isMediaBreakpointUp } from "../../Utils/BreakpointsUtils";
import { PUSHER_URL } from "../../Enum/EnvironmentVariable";
import { customizeAvailableStore } from "../../Stores/SelectCharacterSceneStore";
import { DraggableGrid } from "@home-based-studio/phaser3-utils";
import { WokaSlot } from "../Components/SelectWoka/WokaSlot";
import { DraggableGridEvent } from "@home-based-studio/phaser3-utils/lib/utils/gui/containers/grids/DraggableGrid";

//todo: put this constants in a dedicated file
export const SelectCharacterSceneName = "SelectCharacterScene";

export class SelectCharacterScene extends AbstractCharacterScene {
    protected selectedWoka!: Phaser.GameObjects.Sprite | null; // null if we are selecting the "customize" option
    protected playerModels!: BodyResourceDescriptionInterface[];

    protected currentSelectUser = 0;
    protected pointerClicked: boolean = false;
    protected pointerTimer: number = 0;

    private charactersDraggableGrid!: DraggableGrid;

    protected lazyloadingAttempt = true; //permit to update texture loaded after renderer
    private loader: Loader;

    constructor() {
        super({
            key: SelectCharacterSceneName,
        });
        this.loader = new Loader(this);
        this.playerTextures = new PlayerTextures();
    }

    preload() {
        super.preload();
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
            this.loadSelectSceneCharacters()
                .then((bodyResourceDescriptions) => {
                    bodyResourceDescriptions.forEach((bodyResourceDescription) => {
                        this.playerModels.push(bodyResourceDescription);
                    });
                    this.lazyloadingAttempt = true;
                })
                .catch((e) => console.error(e));
            this.playerModels = loadAllDefaultModels(this.load, this.playerTextures);
            this.lazyloadingAttempt = false;

            //this function must stay at the end of preload function
            this.loader.addLoader();
        });
    }

    create() {
        this.selectedWoka = null;

        console.log(this.cache.json.get("woka-list"));
        console.log(this.playerModels);

        customizeAvailableStore.set(this.isCustomizationAvailable());
        selectCharacterSceneVisibleStore.set(true);
        this.events.addListener("wake", () => {
            waScaleManager.saveZoom();
            waScaleManager.zoomModifier = isMediaBreakpointUp("md") ? 2 : 1;
            selectCharacterSceneVisibleStore.set(true);
        });

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
        gameManager.tryResumingGame(EnableCameraSceneName);
        selectCharacterSceneVisibleStore.set(false);
        this.events.removeListener("wake");
    }

    public nextSceneToCustomizeScene(): void {
        if (this.selectedWoka !== null && !areCharacterLayersValid([this.selectedWoka.texture.key])) {
            return;
        }
        this.scene.sleep(SelectCharacterSceneName);
        waScaleManager.restoreZoom();
        this.scene.run(CustomizeSceneName);
        selectCharacterSceneVisibleStore.set(false);
    }

    update(time: number, delta: number): void {
        // pointerTimer is set to 250 when pointerdown events is trigger
        // After 250ms, pointerClicked is set to false and the pointerdown events can be trigger again
        this.pointerTimer -= delta;
        if (this.pointerTimer <= 0) {
            this.pointerClicked = false;
        }

        if (this.lazyloadingAttempt) {
            this.lazyloadingAttempt = false;
        }
    }

    public onResize(): void {
        this.handleCharactersGridOnResize();
    }

    private handleCharactersGridOnResize(): void {
        const gridHeight = 220;
        const gridWidth = innerWidth / waScaleManager.getActualZoom();
        const gridPos = {
            x: this.cameras.main.worldView.x + this.cameras.main.width / 2,
            y: this.cameras.main.worldView.y + this.cameras.main.height * 0.5,
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

        this.populateGrid();
        this.charactersDraggableGrid.moveContentToBeginning();
    }

    private populateGrid(): void {
        const wokaDimension = 100;

        this.charactersDraggableGrid.clearAllItems();
        for (let i = 0; i < this.playerModels.length; i += 1) {
            const slot = new WokaSlot(this, this.playerModels[i].id).setDisplaySize(wokaDimension, wokaDimension);
            this.charactersDraggableGrid.addItem(slot);
        }
        this.charactersDraggableGrid.moveContentToBeginning();
    }

    private bindEventHandlers(): void {
        this.input.keyboard.on("keyup-ENTER", () => {
            return this.nextSceneToCameraScene();
        });

        this.charactersDraggableGrid.on(DraggableGridEvent.ItemClicked, (item: WokaSlot) => {
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
