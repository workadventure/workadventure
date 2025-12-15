import type {
    AreaData,
    AreaDataProperties,
    AreaDataProperty,
    AreaDescriptionPropertyData,
    AtLeast,
} from "@workadventure/map-editor";
import _ from "lodash";
import { GameObjects } from "phaser";
import { get } from "svelte/store";
import { GameScene } from "../../Game/GameScene";
import type { CopyAreaEventData } from "../../Game/GameMap/EntitiesManager";
import { SpeechDomElement } from "../../Entity/SpeechDomElement";
import LL from "../../../../i18n/i18n-svelte";
import { SizeAlteringSquare, SizeAlteringSquareEvent, SizeAlteringSquarePosition as Edge } from "./SizeAlteringSquare";

export enum AreaPreviewEvent {
    Clicked = "AreaPreview:Clicked",
    DragStart = "AreaPreview:DragStart",
    Released = "AreaPreview:Released",
    DoubleClicked = "AreaPreview:DoubleClicked",
    Copied = "AreaPreview:Copied",
    Updated = "AreaPreview:Updated",
    Delete = "AreaPreview:Delete",
    UpdateVisibility = "AreaPreview:UpdateVisibility",
}

const DEFAULT_COLOR = 0x0000ff;
const MAXIMUM_DEPTH = 100000; // we use a high depth to ensure the area preview is on top of other objects
const DEFAULT_AREA_PREVIEW_ALPHA = 0.5;

export class AreaPreview extends Phaser.GameObjects.Rectangle {
    private squares: SizeAlteringSquare[];

    private areaData: AreaData;
    private selected: boolean;
    private moved: boolean;
    private squareSelected: boolean;

    private oldPosition: { x: number; y: number };

    private shiftKey?: Phaser.Input.Keyboard.Key;
    private ctrlKey?: Phaser.Input.Keyboard.Key;
    private propertiesIcon: GameObjects.Image[] = [];

    private speechDomElement: SpeechDomElement | null = null;

    constructor(
        scene: Phaser.Scene,
        areaData: AreaData,
        private overrideDepth = false,
        shiftKey?: Phaser.Input.Keyboard.Key,
        ctrlKey?: Phaser.Input.Keyboard.Key
    ) {
        super(
            scene,
            areaData.x + areaData.width * 0.5,
            areaData.y + areaData.height * 0.5,
            areaData.width,
            areaData.height,
            DEFAULT_COLOR,
            0.5
        );

        this.oldPosition = this.getPosition();

        this.shiftKey = shiftKey;
        this.ctrlKey = ctrlKey;

        this.areaData = areaData;
        this.selected = false;
        this.moved = false;
        this.squareSelected = false;

        this.squares = [
            new SizeAlteringSquare(this.scene, this.getTopLeft(), "nw-resize"),
            new SizeAlteringSquare(this.scene, this.getTopCenter(), "n-resize"),
            new SizeAlteringSquare(this.scene, this.getTopRight(), "ne-resize"),
            new SizeAlteringSquare(this.scene, this.getLeftCenter(), "w-resize"),
            new SizeAlteringSquare(this.scene, this.getRightCenter(), "e-resize"),
            new SizeAlteringSquare(this.scene, this.getBottomLeft(), "sw-resize"),
            new SizeAlteringSquare(this.scene, this.getBottomCenter(), "s-resize"),
            new SizeAlteringSquare(this.scene, this.getBottomRight(), "se-resize"),
        ];

        // Set the depth of the area preview. In the map editor area tool, we want the area previews to be always on top of other objects.
        if (this.overrideDepth) {
            this.setDepth(MAXIMUM_DEPTH);
        }

        this.squares.forEach((square) => square.setDepth(this.depth + 1));

        const bounds = this.getBounds();
        this.setSize(bounds.width, bounds.height);
        this.setInteractive({ cursor: "grab" });
        this.scene.input.setDraggable(this);
        this.drawAreaPreviewFromAreaData(areaData);

        this.showSizeAlteringSquares(false);

        this.bindEventHandlers();

        this.scene.add.existing(this);
    }

    public get description(): string | undefined {
        const descriptionProperty = this.areaData.properties.find(
            (p): p is AreaDescriptionPropertyData => p.type === "areaDescriptionProperties"
        );
        return descriptionProperty?.description;
    }

    public get searchable(): boolean | undefined {
        const descriptionProperty = this.areaData.properties.find(
            (p): p is AreaDescriptionPropertyData => p.type === "areaDescriptionProperties"
        );
        return descriptionProperty?.searchable;
    }

    public update(time: number, dt: number): void {
        if (this.selected) {
            this.squares.forEach((square, index) => {
                if (square.isSelected()) {
                    square.update(time, dt);
                }
            });
        }
    }

    public delete(): void {
        this.emit(AreaPreviewEvent.Delete);
    }

    public select(value: boolean): void {
        if (this.selected === value) {
            return;
        }
        this.selected = value;
        this.showSizeAlteringSquares(value);
    }

    public setVisible(value: boolean): this {
        this.visible = value;
        this.showPropertiesIcon(value);
        if (!value) {
            this.showSizeAlteringSquares(false);
            this.destroyText();
        } else {
            this.playText();
        }
        this.emit(AreaPreviewEvent.UpdateVisibility, value);
        return this;
    }

    public updatePreview(dataToModify: AtLeast<AreaData, "id">): void {
        _.merge(this.areaData, dataToModify);
        this.drawAreaPreviewFromAreaData(dataToModify);
    }

    public getSize(): number {
        return this.displayWidth * this.displayHeight;
    }

    public addProperty(property: AreaDataProperty): void {
        const oldAreaData = structuredClone(this.areaData);
        this.areaData.properties.push(property);
        this.emit(AreaPreviewEvent.Updated, this.areaData, oldAreaData);
    }

    public updateProperty(changes: AtLeast<AreaDataProperty, "id">, removeAreaEntities?: boolean): void {
        const oldAreaData = structuredClone(this.areaData);
        const property = this.areaData.properties.find((property) => property.id === changes.id);
        if (property) {
            _.mergeWith(property, changes, (_, targetProperty) => {
                if (targetProperty instanceof Array) {
                    return targetProperty;
                }
                return;
            });
        }
        this.emit(AreaPreviewEvent.Updated, this.areaData, oldAreaData, removeAreaEntities);
    }

    public deleteProperty(id: string, removeAreaEntities?: boolean): boolean {
        const oldAreaData = structuredClone(this.areaData);
        const index = this.areaData.properties.findIndex((property) => property.id === id);
        if (index !== -1) {
            this.areaData.properties.splice(index, 1);
            this.emit(AreaPreviewEvent.Updated, this.areaData, oldAreaData, removeAreaEntities);
            return true;
        } else {
            return false;
        }
    }

    public getProperties(): AreaDataProperties {
        return this.areaData.properties;
    }

    public destroy(): void {
        super.destroy();
        this.squares.forEach((square) => square.destroy());
        this.destroyText();
    }

    public getPosition(): { x: number; y: number } {
        return { x: this.x, y: this.y };
    }

    public getAreaData(): AreaData {
        return this.areaData;
    }

    public setAreaName(name: string): void {
        const oldAreaData = structuredClone(this.areaData);
        this.areaData.name = name;
        const data = { id: this.areaData.id, name: this.areaData.name };
        this.emit(AreaPreviewEvent.Updated, data, oldAreaData);
    }

    public getId(): string {
        return this.areaData.id;
    }

    public changeColor(color: string | number | Phaser.Types.Display.InputColorObject) {
        this.setFillStyle(Phaser.Display.Color.ValueToColor(color).color, DEFAULT_AREA_PREVIEW_ALPHA);
        this.updateSquaresPositions();
    }

    public resetColor() {
        if (this.areaData != undefined) {
            this.propertiesIcon.forEach((icon: GameObjects.Image) => icon.destroy());
            let counter = 0;
            if (this.areaData.properties.length > 0) {
                let color = "FFFFFF";
                for (const property of this.areaData.properties) {
                    const iconProperties = this.getPropertyIcons(property.type);
                    if (iconProperties.name !== "") {
                        color = iconProperties.color;
                    }
                    const icon = new GameObjects.Image(
                        this.scene,
                        (this.getTopLeft().x ?? 0) + 10 + counter * 15,
                        (this.getTopLeft().y ?? 0) + 10,
                        `icon${iconProperties.name}`
                    );
                    icon.setScale(0.12);
                    icon.setDepth(this.depth + 1);
                    icon.setVisible(true);
                    counter++;
                }
                this.setFillStyle(Phaser.Display.Color.ValueToColor(color).color, DEFAULT_AREA_PREVIEW_ALPHA);
            } else {
                this.setFillStyle(Phaser.Display.Color.ValueToColor(DEFAULT_COLOR).color, DEFAULT_AREA_PREVIEW_ALPHA);
            }
        }
        this.updateSquaresPositions();
    }

    private showPropertiesIcon(value: boolean) {
        this.propertiesIcon.forEach((icon: GameObjects.Image) => icon.setVisible(value));
    }

    private drawAreaPreviewFromAreaData(areaData: AreaData | AtLeast<AreaData, "id">): void {
        if (areaData.properties !== undefined) {
            this.areaData.properties = areaData.properties;

            this.propertiesIcon.forEach((icon: GameObjects.Image) => icon.destroy());
            let color = "FFFFFF";
            let counter = 0;
            for (const property of this.areaData.properties) {
                const iconProperties = this.getPropertyIcons(property.type);
                if (iconProperties.name !== "") {
                    color = iconProperties.color;
                }
                const icon = new GameObjects.Image(
                    this.scene,
                    (this.getTopLeft().x ?? 0) + 10 + counter * 15,
                    (this.getTopLeft().y ?? 0) + 10,
                    `icon${iconProperties.name}`
                );
                icon.setScale(0.12);
                icon.setDepth(this.depth + 1);
                icon.setVisible(true);
                //this.scene.add.existing(icon);
                //this.propertiesIcon.push(icon);
                counter++;
            }
            this.setFillStyle(Phaser.Display.Color.ValueToColor(color).color, DEFAULT_AREA_PREVIEW_ALPHA);
        }
        this.x = Math.floor(this.areaData.x + this.areaData.width * 0.5);
        this.y = Math.floor(this.areaData.y + this.areaData.height * 0.5);
        this.displayWidth = Math.floor(this.areaData.width);
        this.displayHeight = Math.floor(this.areaData.height);
        this.updateSquaresPositions();
    }

    private showSizeAlteringSquares(show = true): void {
        if (show && !this.visible) {
            return;
        }
        this.squares.forEach((square) => square.setVisible(show));
    }

    private bindEventHandlers(): void {
        this.on(
            Phaser.Input.Events.POINTER_DOWN,
            (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => {
                if ((pointer.event.target as Element)?.localName !== "canvas") {
                    return;
                }
                this.emit(AreaPreviewEvent.Clicked);
            }
        );
        this.on(
            Phaser.Input.Events.POINTER_UP,
            (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => {
                if ((pointer.event.target as Element)?.localName !== "canvas") {
                    return;
                }
                this.emit(AreaPreviewEvent.Released);
            }
        );
        this.on(Phaser.Input.Events.DRAG_START, () => {
            this.oldPosition = this.getPosition();
            this.emit(AreaPreviewEvent.DragStart);
        });
        this.on(Phaser.Input.Events.DRAG, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            if (pointer.isDown && this.selected && !this.squareSelected) {
                if (this.shiftKey?.isDown) {
                    const topLeftX = Math.floor((dragX - this.displayWidth * 0.5) / 32) * 32;
                    const topLeftY = Math.floor((dragY - this.displayHeight * 0.5) / 32) * 32;
                    this.x = Math.round(topLeftX + this.displayWidth * 0.5);
                    this.y = Math.round(topLeftY + this.displayHeight * 0.5);
                } else {
                    this.x = Math.round(dragX);
                    this.y = Math.round(dragY);
                }
                this.updateSquaresPositions();
                this.moved = true;
                if (this.scene instanceof GameScene) {
                    this.scene.markDirty();
                } else {
                    throw new Error("Not the Game Scene");
                }
            }
        });
        this.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
            if (this.selected && this.moved) {
                this.moved = false;
                if (this.ctrlKey?.isDown) {
                    this.emit(AreaPreviewEvent.Copied, {
                        position: {
                            x: this.areaData.x,
                            y: this.areaData.y,
                        },
                        width: this.areaData.width,
                        height: this.areaData.height,
                        name: this.areaData.name,
                        properties: structuredClone(this.areaData.properties),
                    } as CopyAreaEventData);
                }
                this.updateAreaDataWithSquaresAdjustments();
                const data: AtLeast<AreaData, "id"> = {
                    id: this.getAreaData().id,
                    x: Math.floor(this.x - this.displayWidth * 0.5),
                    y: Math.floor(this.y - this.displayHeight * 0.5),
                    width: this.displayWidth,
                    height: this.displayHeight,
                };
                this.emit(AreaPreviewEvent.Updated, data);
            }
        });

        this.squares.forEach((square, index) => {
            square.on(SizeAlteringSquareEvent.Selected, () => {
                this.squareSelected = true;
            });

            square.on(Phaser.Input.Events.DRAG, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
                const oldX = square.x;
                const oldY = square.y;

                if (this.shiftKey?.isDown) {
                    square.x = Math.floor(dragX / 32) * 32;
                    square.y = Math.floor(dragY / 32) * 32;
                } else {
                    square.x = dragX;
                    square.y = dragY;
                }

                let newWidth = 0;
                let newHeight = 0;
                let newCenterX = 0;
                let newCenterY = 0;

                if ([Edge.RightCenter, Edge.LeftCenter, Edge.TopCenter, Edge.BottomCenter].includes(index)) {
                    const newWidth = this.squares[Edge.RightCenter].x - this.squares[Edge.LeftCenter].x;
                    const newHeight = this.squares[Edge.BottomCenter].y - this.squares[Edge.TopCenter].y;

                    if (newWidth >= 10) {
                        this.displayWidth = newWidth;
                        this.x = this.squares[Edge.LeftCenter].x + this.displayWidth * 0.5;
                    } else {
                        square.x = oldX;
                    }
                    if (newHeight >= 10) {
                        this.displayHeight = newHeight;
                        this.y = this.squares[Edge.TopCenter].y + this.displayHeight * 0.5;
                    } else {
                        square.y = oldY;
                    }
                } else {
                    switch (index) {
                        case Edge.TopLeft: {
                            newWidth = (this.getRightCenter().x ?? 0) - square.x;
                            newHeight = (this.getBottomCenter().y ?? 0) - square.y;
                            newCenterX = square.x + newWidth * 0.5;
                            newCenterY = square.y + newHeight * 0.5;
                            break;
                        }
                        case Edge.TopRight: {
                            newWidth = square.x - (this.getLeftCenter().x ?? 0);
                            newHeight = (this.getBottomCenter().y ?? 0) - square.y;
                            newCenterX = square.x - newWidth * 0.5;
                            newCenterY = square.y + newHeight * 0.5;
                            break;
                        }
                        case Edge.BottomLeft: {
                            newWidth = (this.getRightCenter().x ?? 0) - square.x;
                            newHeight = square.y - (this.getTopCenter().y ?? 0);
                            newCenterX = square.x + newWidth * 0.5;
                            newCenterY = square.y - newHeight * 0.5;
                            break;
                        }
                        case Edge.BottomRight: {
                            newWidth = square.x - (this.getLeftCenter().x ?? 0);
                            newHeight = square.y - (this.getTopCenter().y ?? 0);
                            newCenterX = square.x - newWidth * 0.5;
                            newCenterY = square.y - newHeight * 0.5;
                            break;
                        }
                    }
                }

                if (newWidth >= 10) {
                    this.displayWidth = newWidth;
                    this.x = newCenterX;
                } else {
                    square.x = oldX;
                }
                if (newHeight >= 10) {
                    this.displayHeight = newHeight;
                    this.y = newCenterY;
                } else {
                    square.y = oldY;
                }
                this.updateSquaresPositions();
                if (this.scene instanceof GameScene) {
                    this.scene.markDirty();
                } else {
                    throw new Error("Not the Game Scene");
                }
            });

            square.on(SizeAlteringSquareEvent.Released, () => {
                this.squareSelected = false;
                this.updateAreaDataWithSquaresAdjustments();
                const data: AtLeast<AreaData, "id"> = {
                    id: this.getAreaData().id,
                    x: this.x - this.displayWidth * 0.5,
                    y: this.y - this.displayHeight * 0.5,
                    width: this.displayWidth,
                    height: this.displayHeight,
                };
                this.emit(AreaPreviewEvent.Updated, data);
            });
        });
    }

    private updateSquaresPositions(): void {
        this.squares[0].setPosition(this.getTopLeft().x, this.getTopLeft().y);
        this.squares[1].setPosition(this.getTopCenter().x, this.getTopCenter().y);
        this.squares[2].setPosition(this.getTopRight().x, this.getTopRight().y);
        this.squares[3].setPosition(this.getLeftCenter().x, this.getLeftCenter().y);
        this.squares[4].setPosition(this.getRightCenter().x, this.getRightCenter().y);
        this.squares[5].setPosition(this.getBottomLeft().x, this.getBottomLeft().y);
        this.squares[6].setPosition(this.getBottomCenter().x, this.getBottomCenter().y);
        this.squares[7].setPosition(this.getBottomRight().x, this.getBottomRight().y);
    }

    private updateAreaDataWithSquaresAdjustments(): void {
        this.areaData = {
            ...this.areaData,
            x: Math.floor(this.x - this.displayWidth * 0.5),
            y: Math.floor(this.y - this.displayHeight * 0.5),
            width: Math.floor(this.displayWidth),
            height: Math.floor(this.displayHeight),
        };
    }

    private getPropertyIcons(name: string) {
        switch (name) {
            case "focusable":
                return {
                    name: "Focus",
                    color: "00F0B5",
                };
            case "speakerMegaphone":
                return {
                    name: "SpeakerMegaphone",
                    color: "ff9f45",
                };
            case "listenerMegaphone":
                return {
                    name: "ListenerMegaphone",
                    color: "EEEBD0",
                };
            case "jitsiRoomProperty":
                return {
                    name: "Meeting",
                    color: "86BBD8",
                };
            case "openWebsite":
                return {
                    name: "Link",
                    color: "758E4F",
                };
            case "playAudio":
                return {
                    name: "Link",
                    color: "31AFD4",
                };
            case "silent":
                return {
                    name: "Silent",
                    color: "FF5A5F",
                };
            case "extensionModule": {
                return {
                    name: "Extension",
                    color: "464EB8",
                };
            }
            case "matrixRoomPropertyData": {
                return {
                    name: "MatrixRoom",
                    color: "0cbd8b",
                };
            }
            case "tooltipPropertyData": {
                return {
                    name: "Tooltip",
                    color: "0b66c2",
                };
            }
            case "livekitRoomProperty": {
                return {
                    name: "Livekit",
                    color: "1E88E5",
                };
            }
            default:
                return {
                    name: "",
                    color: "FFFFFF",
                };
        }
    }

    // Play text on the Image entity
    public playText() {
        if (this.speechDomElement) this.destroyText();
        setTimeout(() => {
            if (this.areaData.name === undefined || this.areaData.name === "") return;
            const x = this.x;
            this.speechDomElement = new SpeechDomElement(
                "name",
                this.areaData.name,
                this.scene,
                x,
                this.y - this.height / 2 - 30,
                () => this.destroyText()
            );
            this.scene.add.existing(this.speechDomElement);
            // Need to put the element at the top because
            // if the SpechDomElement is inside of the area, pointer mouse events will not triggered
            this.speechDomElement.play(x, this.y - this.height / 2 - 15, -1);
        }, 10);
    }

    // Destroy text
    public destroyText() {
        if (this.speechDomElement) {
            this.speechDomElement.destroy();
            this.speechDomElement = null;
        }
    }

    get nameFromProperties(): string {
        if (this.areaData.properties.length === 0) return get(LL).mapEditor.properties.noProperties();
        // Get the first property that has a label (skip areaDescriptionProperties)
        const property = this.areaData.properties.find((p) => p.type !== "areaDescriptionProperties");
        if (!property) return get(LL).mapEditor.properties.noProperties();

        const properties = get(LL).mapEditor.properties;
        let propertyKey = property.type as keyof typeof properties;
        // If the property is an openWebsite and the application is not website, we need to use the application as the property key
        if (property.type === "openWebsite" && "application" in property) {
            const openWebsiteProperty = property as { application: string };
            if (openWebsiteProperty.application != "website") {
                propertyKey = openWebsiteProperty.application as keyof typeof properties;
            }
        }

        const propertyTranslation = properties[propertyKey];
        // Check if propertyTranslation is an object with a label method
        if (
            propertyTranslation != undefined &&
            "label" in propertyTranslation &&
            typeof (propertyTranslation as { label?: unknown }).label === "function"
        ) {
            return (propertyTranslation as { label: () => string }).label();
        }
        return get(LL).mapEditor.properties.noProperties();
    }

    get actionButtonLabel(): string {
        if (this.areaData.properties.length === 0) return get(LL).mapEditor.explorer.details.moveToArea({ name: "" });
        const property = this.areaData.properties.find((p) => p.type !== "areaDescriptionProperties");
        if (!property) return get(LL).mapEditor.explorer.details.moveToArea({ name: "" });

        const properties = get(LL).mapEditor.properties;
        let propertyKey = property.type as keyof typeof properties;

        // If the property is an openWebsite and the application is not website, we need to use the application as the property key
        if (property.type === "openWebsite" && "application" in property) {
            const openWebsiteProperty = property as { application: string };
            if (openWebsiteProperty.application != "website") {
                propertyKey = openWebsiteProperty.application as keyof typeof properties;
            }
        }

        const propertyTranslation = properties[propertyKey];
        if (
            propertyTranslation != undefined &&
            "actionButtonLabel" in propertyTranslation &&
            typeof (propertyTranslation as { actionButtonLabel?: unknown }).actionButtonLabel === "function"
        ) {
            return (propertyTranslation as { actionButtonLabel: () => string }).actionButtonLabel();
        }
        return get(LL).mapEditor.explorer.details.moveToArea({ name: "" });
    }
}
