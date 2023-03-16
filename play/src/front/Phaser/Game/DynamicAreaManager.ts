import type { Subscription } from "rxjs";
import type { CreateDynamicAreaEvent, ModifyDynamicAreaEvent } from "../../Api/Events/CreateDynamicAreaEvent";
import { iframeListener } from "../../Api/IframeListener";
import type { GameMapFrontWrapper } from "./GameMap/GameMapFrontWrapper";

export class DynamicAreaManager {
    private readonly gameMapFrontWrapper: GameMapFrontWrapper;
    private readonly subscription: Subscription;

    constructor(gameMapFrontWrapper: GameMapFrontWrapper) {
        this.gameMapFrontWrapper = gameMapFrontWrapper;

        this.registerIFrameEventAnswerers();

        this.subscription = iframeListener.modifyAreaStream.subscribe((modifyAreaEvent: ModifyDynamicAreaEvent) => {
            const area = this.gameMapFrontWrapper.getDynamicAreaByName(modifyAreaEvent.name);
            if (!area) {
                throw new Error(`Could not find dynamic area with the name "${modifyAreaEvent.name}" in your map`);
            }

            const insideBefore = this.gameMapFrontWrapper.isPlayerInsideDynamicAreaByName(modifyAreaEvent.name);

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

            const insideAfter = this.gameMapFrontWrapper.isPlayerInsideDynamicAreaByName(modifyAreaEvent.name);

            if (insideBefore && !insideAfter) {
                this.gameMapFrontWrapper.triggerSpecificDynamicAreaOnLeave(area);
            } else if (!insideBefore && insideAfter) {
                this.gameMapFrontWrapper.triggerSpecificDynamicAreaOnEnter(area);
            }
        });
    }

    private registerIFrameEventAnswerers(): void {
        iframeListener.registerAnswerer("createArea", (createAreaEvent: CreateDynamicAreaEvent) => {
            if (this.gameMapFrontWrapper.getDynamicAreaByName(createAreaEvent.name)) {
                throw new Error(`An area with the name "${createAreaEvent.name}" already exists in your map`);
            }

            this.gameMapFrontWrapper.addDynamicArea({
                ...createAreaEvent,
                properties: {},
            });
        });

        iframeListener.registerAnswerer("getArea", (name: string) => {
            const area = this.gameMapFrontWrapper.getDynamicAreaByName(name);
            if (area === undefined) {
                throw new Error(`Cannot find dynamic area with name "${name}"`);
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
            this.gameMapFrontWrapper.deleteDynamicAreaByName(name);
        });
    }

    close(): void {
        this.subscription.unsubscribe();
    }
}
