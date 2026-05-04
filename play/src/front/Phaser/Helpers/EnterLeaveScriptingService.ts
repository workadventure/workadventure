import { Subject } from "rxjs";
import { MathUtils } from "@workadventure/math-utils";
import { iframeListener } from "../../Api/IframeListener";
import type { GameMapFrontWrapper } from "../Game/GameMap/GameMapFrontWrapper";
import type { GameScene } from "../Game/GameScene";

/**
 * Class in charge of tracking the sending to the scripting API of enter/leave events in layers / Tiled areas / Map Editor areas
 */
export class EnterLeaveScriptingService {
    private subjects = {
        layer: {
            enter: new Subject<string>(),
            leave: new Subject<string>(),
        },
        tiledArea: {
            enter: new Subject<string>(),
            leave: new Subject<string>(),
        },
        mapEditorArea: {
            enter: new Subject<string>(),
            leave: new Subject<string>(),
        },
    };

    constructor(gameMapFrontWrapper: GameMapFrontWrapper, gameScene: GameScene) {
        gameMapFrontWrapper.onEnterLayer((layers) => {
            for (const layer of layers) {
                this.subjects.layer.enter.next(layer.name);
            }
        });

        gameMapFrontWrapper.onLeaveLayer((layers) => {
            for (const layer of layers) {
                this.subjects.layer.leave.next(layer.name);
            }
        });

        gameMapFrontWrapper.onEnterDynamicArea((areas) => {
            areas.forEach((area) => {
                this.subjects.tiledArea.enter.next(area.name);
            });
        });

        gameMapFrontWrapper.onLeaveDynamicArea((areas) => {
            areas.forEach((area) => {
                this.subjects.tiledArea.leave.next(area.name);
            });
        });

        gameMapFrontWrapper
            .getGameMap()
            .getWamFile()
            ?.getGameMapAreas()
            .onEnterArea((areas) => {
                for (const area of areas) {
                    this.subjects.mapEditorArea.enter.next(area.name);
                }
            });

        gameMapFrontWrapper
            .getGameMap()
            .getWamFile()
            ?.getGameMapAreas()
            .onLeaveArea((areas) => {
                for (const area of areas) {
                    this.subjects.mapEditorArea.leave.next(area.name);
                }
            });

        iframeListener.registerOpenMessagePortAnswerer("enterLeave", (data, port) => {
            const { type, action, zoneName } = data;

            switch (type) {
                case "layer": {
                    const layer = gameMapFrontWrapper.getCurrentLayers().find((layer) => layer.name === zoneName);
                    switch (action) {
                        case "enter": {
                            if (layer) {
                                port.postMessage({
                                    type: "onAction",
                                    data: undefined,
                                });
                            }
                            break;
                        }
                        case "leave": {
                            if (!layer) {
                                port.postMessage({
                                    type: "onAction",
                                    data: undefined,
                                });
                            }
                            break;
                        }
                    }
                    break;
                }
                case "tiledArea": {
                    const area = gameMapFrontWrapper
                        .getDynamicAreasOnPosition({ x: gameScene.CurrentPlayer.x, y: gameScene.CurrentPlayer.y })
                        .find((area) => area.name === zoneName);
                    switch (action) {
                        case "enter": {
                            if (area) {
                                port.postMessage({
                                    type: "onAction",
                                    data: undefined,
                                });
                            }
                            break;
                        }
                        case "leave": {
                            if (!area) {
                                port.postMessage({
                                    type: "onAction",
                                    data: undefined,
                                });
                            }
                            break;
                        }
                    }
                    break;
                }
                case "mapEditorArea": {
                    const areas = gameMapFrontWrapper.areasManager
                        ?.getAreasByName(zoneName)
                        .filter((area) =>
                            MathUtils.isOverlappingWithRectangle(
                                { x: gameScene.CurrentPlayer.x, y: gameScene.CurrentPlayer.y },
                                area.getBounds()
                            )
                        );
                    switch (action) {
                        case "enter": {
                            if (areas?.length !== 0) {
                                port.postMessage({
                                    type: "onAction",
                                    data: undefined,
                                });
                            }
                            break;
                        }
                        case "leave": {
                            if (areas?.length === 0) {
                                port.postMessage({
                                    type: "onAction",
                                    data: undefined,
                                });
                            }
                            break;
                        }
                    }
                    break;
                }
                default: {
                    const _exhaustiveCheck: never = type;
                }
            }

            const subscription = this.subjects[type][action].subscribe((name) => {
                if (name === zoneName) {
                    port.postMessage({
                        type: "onAction",
                        data: undefined,
                    });
                }
            });

            const closeSubscription = port.closeEvent.subscribe(() => {
                subscription.unsubscribe();
                closeSubscription.unsubscribe();
            });
        });
    }

    public destroy() {
        iframeListener.unregisterOpenMessagePortAnswerer("enterLeave");
        this.subjects.layer.enter.complete();
        this.subjects.layer.leave.complete();
        this.subjects.tiledArea.enter.complete();
        this.subjects.tiledArea.leave.complete();
        this.subjects.mapEditorArea.enter.complete();
        this.subjects.mapEditorArea.leave.complete();
    }
}
