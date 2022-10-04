import { AreaType } from "@workadventure/map-editor";
import { Subscription } from "rxjs";
import { CreateAreaEvent, ModifyAreaEvent } from "../../Api/Events/CreateAreaEvent";
import { iframeListener } from "../../Api/IframeListener";
import { GameMapFrontWrapper } from "./GameMap/GameMapFrontWrapper";

export class DynamicAreaManager {
    private readonly gameMapFrontWrapper: GameMapFrontWrapper;
    private readonly subscription: Subscription;

    constructor(gameMapFrontWrapper: GameMapFrontWrapper) {
        this.gameMapFrontWrapper = gameMapFrontWrapper;

        this.registerIFrameEventAnswerers();

        this.subscription = iframeListener.modifyAreaStream.subscribe((modifyAreaEvent: ModifyAreaEvent) => {
            const area = this.gameMapFrontWrapper.getAreaByName(modifyAreaEvent.name, AreaType.Dynamic);
            if (!area) {
                throw new Error(`Could not find dynamic area with the name "${modifyAreaEvent.name}" in your map`);
            }

            const insideBefore = this.gameMapFrontWrapper.isPlayerInsideAreaByName(
                modifyAreaEvent.name,
                AreaType.Dynamic
            );

            if (modifyAreaEvent.x !== undefined) {
                area.x = modifyAreaEvent.x;
            }
            if (modifyAreaEvent.y !== undefined) {
                area.y = modifyAreaEvent.y;
            }
            if (modifyAreaEvent.width !== undefined) {
                area.width = modifyAreaEvent.width;
            }
            if (modifyAreaEvent.height !== undefined) {
                area.height = modifyAreaEvent.height;
            }

            const insideAfter = this.gameMapFrontWrapper.isPlayerInsideAreaByName(
                modifyAreaEvent.name,
                AreaType.Dynamic
            );

            if (insideBefore && !insideAfter) {
                this.gameMapFrontWrapper.triggerSpecificAreaOnLeave(area);
            } else if (!insideBefore && insideAfter) {
                this.gameMapFrontWrapper.triggerSpecificAreaOnEnter(area);
            }
        });
    }

    private registerIFrameEventAnswerers(): void {
        iframeListener.registerAnswerer("createArea", (createAreaEvent: CreateAreaEvent) => {
            if (this.gameMapFrontWrapper.getAreaByName(createAreaEvent.name, AreaType.Dynamic)) {
                throw new Error(`An area with the name "${createAreaEvent.name}" already exists in your map`);
            }

            this.gameMapFrontWrapper.addArea(
                {
                    ...createAreaEvent,
                    id: -1,
                    visible: true,
                    properties: {},
                },
                AreaType.Dynamic
            );
        });

        iframeListener.registerAnswerer("getArea", (name: string) => {
            const area = this.gameMapFrontWrapper.getAreaByName(name, AreaType.Dynamic);
            if (area === undefined) {
                throw new Error(`Cannot find area with name "${name}"`);
            }
            return {
                name: area.name,
                width: area.width,
                height: area.height,
                x: area.x,
                y: area.y,
            };
        });

        iframeListener.registerAnswerer("deleteArea", (name: string) => {
            this.gameMapFrontWrapper.deleteAreaByName(name, AreaType.Dynamic);
        });
    }

    close(): void {
        this.subscription.unsubscribe();
    }
}
