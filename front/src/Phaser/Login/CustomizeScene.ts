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
import { WokaBodyPartSlot, WokaBodyPartSlotConfig } from "../Components/CustomizeWoka/WokaBodyPartSlot";

export const CustomizeSceneName = "CustomizeScene";

export class CustomizeScene extends AbstractCharacterScene {
    private customWokaPreviewer!: CustomWokaPreviewer;
    private bodyPartsDraggableGridBackground!: Phaser.GameObjects.Rectangle;
    private bodyPartsDraggableGridForeground!: Phaser.GameObjects.Rectangle;
    private bodyPartsDraggableGrid!: DraggableGrid;
    private bodyPartsSlots!: Record<CustomWokaBodyPart, WokaBodyPartSlot>;

    private selectedLayers: number[] = [0, 1, 2, 3, 4, 5];
    private containersRow: CustomizedCharacter[][] = [];
    private layers: BodyResourceDescriptionInterface[][] = [];

    protected lazyloadingAttempt = true; //permit to update texture loaded after renderer

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
        console.log(this.layers);

        const isVertical = isMediaBreakpointUp("md");

        this.customWokaPreviewer = new CustomWokaPreviewer(this, 0, 0, this.getCustomWokaPreviewerConfig());

        this.bodyPartsDraggableGridBackground = this.add.rectangle(0, 0, 485, 165, 0xf9f9f9);
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
                showDraggableSpace: false,
            },
        });
        this.bodyPartsDraggableGridForeground = this.add.rectangle(0, 0, 485, 165, 0xffffff, 0);

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

        this.setPlayerCurrentOutfit();

        this.onResize();

        this.bindEventHandlers();
    }

    public update(time: number, dt: number): void {
        this.customWokaPreviewer.update();
    }

    public onResize(): void {
        const isVertical = this.cameras.main.width / this.cameras.main.height < 0.75;

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

    private setPlayerCurrentOutfit(): void {
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

    private handleCustomWokaPreviewerOnResize(isVertical: boolean): void {
        const slotDimension =
            Math.min(innerWidth * (isVertical ? 0.2 : 0.15), innerHeight * (isVertical ? 0.2 : 0.15)) /
            waScaleManager.getActualZoom();

        const boxDimension =
            Math.min(innerWidth * (isVertical ? 0.4 : 0.3), innerHeight * (isVertical ? 0.4 : 0.3)) /
            waScaleManager.getActualZoom();

        this.customWokaPreviewer.setDisplaySize(boxDimension, boxDimension);
        this.customWokaPreviewer.x = this.cameras.main.worldView.x + this.cameras.main.width / 2;
        this.customWokaPreviewer.y = isVertical
            ? this.customWokaPreviewer.displayHeight * 0.5 + 20
            : slotDimension * 1.5 + 20;
    }

    private handleBodyPartSlotsOnResize(isVertical: boolean): void {
        const slotDimension =
            Math.min(innerWidth * (isVertical ? 0.2 : 0.15), innerHeight * (isVertical ? 0.2 : 0.15)) /
            waScaleManager.getActualZoom();

        for (const part in this.bodyPartsSlots) {
            this.bodyPartsSlots[part as CustomWokaBodyPart].setDisplaySize(slotDimension, slotDimension);
        }

        const slotSize = this.bodyPartsSlots.Accessory.displayHeight;

        if (isVertical) {
            const middle = this.customWokaPreviewer.x;
            const left = middle - slotSize - 10;
            const right = middle + slotSize + 10;
            const top = this.customWokaPreviewer.y + this.customWokaPreviewer.displayHeight * 0.5 + slotSize * 0.5 + 10;
            const bottom = top + slotSize + 10;

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
        const gridHeight = (innerHeight * (isVertical ? 0.3 : 0.35)) / waScaleManager.getActualZoom();
        const gridWidth = (innerWidth * (isVertical ? 1 : 0.8)) / waScaleManager.getActualZoom();
        const gridPos = {
            x: this.cameras.main.worldView.x + this.cameras.main.width / 2,
            y: this.cameras.main.worldView.y + this.cameras.main.height - gridHeight * 0.5,
        };

        this.bodyPartsDraggableGridBackground.setPosition(gridPos.x, gridPos.y).setDisplaySize(gridWidth, gridHeight);
        this.bodyPartsDraggableGridForeground
            .setPosition(gridPos.x, gridPos.y)
            .setDisplaySize(gridWidth, gridHeight)
            .setStrokeStyle(4, 0xaaaaaa);
        this.bodyPartsDraggableGrid.changeDraggableSpacePosAndSize(gridPos, { x: gridWidth, y: gridHeight }, gridPos);

        const slotDimension = (innerHeight * (isVertical ? 0.125 : 0.15)) / waScaleManager.getActualZoom();
        const slotScale = slotDimension / this.customWokaPreviewer.SIZE;

        // this.bodyPartsDraggableGrid.clearAllItems();
        // for (let i = 0; i < 50; i += 1) {
        //     this.bodyPartsDraggableGrid.addItem(
        //         new WokaBodyPartSlot(this, 0, 0, this.getDefaultWokaBodyPartSlotConfig(isVertical)).setScale(slotScale)
        //     );
        // }
        this.bodyPartsDraggableGrid.moveContentToBeginning();
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

        this.input.keyboard.on("keydown-R", () => {
            this.randomizeOutfit();
            this.setPlayerCurrentOutfit();
        });
    }

    private randomizeOutfit(): void {
        for (let i = 0; i < 6; i += 1) {
            this.selectedLayers[i] = Math.floor(Math.random() * this.layers[i].length);
            this.customWokaPreviewer.updateSprite(
                this.layers[i][Math.floor(Math.random() * this.layers[i].length)].id,
                CustomWokaBodyPart[CustomWokaBodyPartOrder[i] as CustomWokaBodyPart]
            );
        }
    }
}
