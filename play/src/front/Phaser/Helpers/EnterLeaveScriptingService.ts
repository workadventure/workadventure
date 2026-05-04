import { Subject } from "rxjs";
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
            const postAction = (action: "enter" | "leave", reason: "initial" | "move") => {
                port.postMessage({
                    type: "onAction",
                    action,
                    data: {
                        reason,
                    },
                });
            };

            let isInside = false;
            switch (type) {
                case "layer": {
                    isInside = gameMapFrontWrapper.getCurrentLayers().some((layer) => layer.name === zoneName);
                    break;
                }
                case "tiledArea": {
                    isInside = gameMapFrontWrapper
                        .getDynamicAreasOnPosition({ x: gameScene.CurrentPlayer.x, y: gameScene.CurrentPlayer.y })
                        .some((area) => area.name === zoneName);
                    break;
                }
                case "mapEditorArea": {
                    isInside =
                        gameMapFrontWrapper
                            .getGameMap()
                            .getWamFile()
                            ?.getGameMapAreas()
                            .isPlayerInsideAreaByName(zoneName, {
                                x: gameScene.CurrentPlayer.x,
                                y: gameScene.CurrentPlayer.y,
                            }) ?? false;
                    break;
                }
                default: {
                    const _exhaustiveCheck: never = type;
                }
            }

            if (action === "watch" || (action === "enter" && isInside) || (action === "leave" && !isInside)) {
                postAction(isInside ? "enter" : "leave", "initial");
            }

            const subscriptions =
                action === "watch"
                    ? [
                          this.subjects[type].enter.subscribe((name) => {
                              if (name === zoneName) {
                                  postAction("enter", "move");
                              }
                          }),
                          this.subjects[type].leave.subscribe((name) => {
                              if (name === zoneName) {
                                  postAction("leave", "move");
                              }
                          }),
                      ]
                    : [
                          this.subjects[type][action].subscribe((name) => {
                              if (name === zoneName) {
                                  postAction(action, "move");
                              }
                          }),
                      ];

            const closeSubscription = port.closeEvent.subscribe(() => {
                for (const subscription of subscriptions) {
                    subscription.unsubscribe();
                }
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
