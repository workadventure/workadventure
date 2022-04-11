import type { GameScene } from "./GameScene";
import type { GameMap } from "./GameMap";
import { scriptUtils } from "../../Api/ScriptUtils";
import { coWebsiteManager } from "../../WebRtc/CoWebsiteManager";
import { layoutManagerActionStore } from "../../Stores/LayoutManagerStore";
import { localUserStore } from "../../Connexion/LocalUserStore";
import { get } from "svelte/store";
import { ON_ACTION_TRIGGER_BUTTON, ON_ICON_TRIGGER_BUTTON } from "../../WebRtc/LayoutManager";
import type { ITiledMapLayer } from "../Map/ITiledMap";
import { GameMapProperties } from "./GameMapProperties";
import type { CoWebsite } from "../../WebRtc/CoWebsite/CoWesbite";
import { SimpleCoWebsite } from "../../WebRtc/CoWebsite/SimpleCoWebsite";
import { jitsiFactory } from "../../WebRtc/JitsiFactory";
import { JITSI_PRIVATE_MODE, JITSI_URL } from "../../Enum/EnvironmentVariable";
import { JitsiCoWebsite } from "../../WebRtc/CoWebsite/JitsiCoWebsite";
import { audioManagerFileStore, audioManagerVisibilityStore } from "../../Stores/AudioManagerStore";
import { iframeListener } from "../../Api/IframeListener";
import { Room } from "../../Connexion/Room";
import LL from "../../i18n/i18n-svelte";

interface OpenCoWebsite {
    actionId: string;
    coWebsite?: CoWebsite;
}

export class GameMapPropertiesListener {
    private coWebsitesOpenByLayer = new Map<ITiledMapLayer, OpenCoWebsite>();
    private coWebsitesActionTriggerByLayer = new Map<ITiledMapLayer, string>();

    constructor(private scene: GameScene, private gameMap: GameMap) {}

    register() {
        // Website on new tab
        this.gameMap.onPropertyChange(GameMapProperties.OPEN_TAB, (newValue, oldValue, allProps) => {
            if (newValue === undefined) {
                layoutManagerActionStore.removeAction("openTab");
            }
            if (typeof newValue == "string" && newValue.length) {
                const openWebsiteTriggerValue = allProps.get(GameMapProperties.OPEN_WEBSITE_TRIGGER);
                const forceTrigger = localUserStore.getForceCowebsiteTrigger();
                if (forceTrigger || openWebsiteTriggerValue === ON_ACTION_TRIGGER_BUTTON) {
                    let message = allProps.get(GameMapProperties.OPEN_WEBSITE_TRIGGER_MESSAGE);
                    if (message === undefined) {
                        message = get(LL).trigger.newTab();
                    }
                    layoutManagerActionStore.addAction({
                        uuid: "openTab",
                        type: "message",
                        message: message,
                        callback: () => scriptUtils.openTab(newValue),
                        userInputManager: this.scene.userInputManager,
                    });
                } else {
                    scriptUtils.openTab(newValue);
                }
            }
        });

        // Jitsi room
        this.gameMap.onPropertyChange(GameMapProperties.JITSI_ROOM, (newValue, oldValue, allProps) => {
            if (newValue === undefined) {
                layoutManagerActionStore.removeAction("jitsi");
                coWebsiteManager.getCoWebsites().forEach((coWebsite) => {
                    if (coWebsite instanceof JitsiCoWebsite) {
                        coWebsiteManager.closeCoWebsite(coWebsite);
                    }
                });
            } else {
                const openJitsiRoomFunction = () => {
                    const roomName = jitsiFactory.getRoomName(newValue.toString(), this.scene.instance);
                    const jitsiUrl = allProps.get(GameMapProperties.JITSI_URL) as string | undefined;

                    if (JITSI_PRIVATE_MODE && !jitsiUrl) {
                        const adminTag = allProps.get(GameMapProperties.JITSI_ADMIN_ROOM_TAG) as string | undefined;

                        this.scene.connection?.emitQueryJitsiJwtMessage(roomName, adminTag);
                    } else {
                        let domain = jitsiUrl || JITSI_URL;
                        if (domain === undefined) {
                            throw new Error("Missing JITSI_URL environment variable or jitsiUrl parameter in the map.");
                        }

                        if (domain.substring(0, 7) !== "http://" && domain.substring(0, 8) !== "https://") {
                            domain = `${location.protocol}//${domain}`;
                        }

                        const coWebsite = new JitsiCoWebsite(new URL(domain), false, undefined, undefined, false);

                        coWebsiteManager.addCoWebsiteToStore(coWebsite, 0);
                        this.scene.initialiseJitsi(coWebsite, roomName, undefined);
                    }
                    layoutManagerActionStore.removeAction("jitsi");
                };

                const jitsiTriggerValue = allProps.get(GameMapProperties.JITSI_TRIGGER);
                const forceTrigger = localUserStore.getForceCowebsiteTrigger();
                if (forceTrigger || jitsiTriggerValue === ON_ACTION_TRIGGER_BUTTON) {
                    let message = allProps.get(GameMapProperties.JITSI_TRIGGER_MESSAGE);
                    if (message === undefined) {
                        message = get(LL).trigger.jitsiRoom();
                    }
                    layoutManagerActionStore.addAction({
                        uuid: "jitsi",
                        type: "message",
                        message: message,
                        callback: () => openJitsiRoomFunction(),
                        userInputManager: this.scene.userInputManager,
                    });
                } else {
                    openJitsiRoomFunction();
                }
            }
        });

        this.gameMap.onPropertyChange(GameMapProperties.EXIT_SCENE_URL, (newValue, oldValue) => {
            if (newValue) {
                this.scene
                    .onMapExit(
                        Room.getRoomPathFromExitSceneUrl(
                            newValue as string,
                            window.location.toString(),
                            this.scene.MapUrlFile
                        )
                    )
                    .catch((e) => console.error(e));
            } else {
                setTimeout(() => {
                    layoutManagerActionStore.removeAction("roomAccessDenied");
                }, 2000);
            }
        });

        this.gameMap.onPropertyChange(GameMapProperties.EXIT_URL, (newValue, oldValue) => {
            if (newValue) {
                this.scene
                    .onMapExit(Room.getRoomPathFromExitUrl(newValue as string, window.location.toString()))
                    .catch((e) => console.error(e));
            } else {
                setTimeout(() => {
                    layoutManagerActionStore.removeAction("roomAccessDenied");
                }, 2000);
            }
        });

        this.gameMap.onPropertyChange(GameMapProperties.SILENT, (newValue, oldValue) => {
            if (newValue === undefined || newValue === false || newValue === "") {
                this.scene.connection?.setSilent(false);
                this.scene.CurrentPlayer.noSilent();
            } else {
                this.scene.connection?.setSilent(true);
                this.scene.CurrentPlayer.isSilent();
            }
        });

        this.gameMap.onPropertyChange(GameMapProperties.PLAY_AUDIO, (newValue, oldValue, allProps) => {
            const volume = allProps.get(GameMapProperties.AUDIO_VOLUME) as number | undefined;
            const loop = allProps.get(GameMapProperties.AUDIO_LOOP) as boolean | undefined;
            newValue === undefined
                ? audioManagerFileStore.unloadAudio()
                : audioManagerFileStore.playAudio(newValue, this.scene.getMapDirUrl(), volume, loop);
            audioManagerVisibilityStore.set(!(newValue === undefined));
        });

        // TODO: This legacy property should be removed at some point
        this.gameMap.onPropertyChange(GameMapProperties.PLAY_AUDIO_LOOP, (newValue, oldValue) => {
            newValue === undefined
                ? audioManagerFileStore.unloadAudio()
                : audioManagerFileStore.playAudio(newValue, this.scene.getMapDirUrl(), undefined, true);
            audioManagerVisibilityStore.set(!(newValue === undefined));
        });

        // TODO: Legacy functionnality replace by layer change
        this.gameMap.onPropertyChange(GameMapProperties.ZONE, (newValue, oldValue) => {
            if (oldValue) {
                iframeListener.sendLeaveEvent(oldValue as string);
            }
            if (newValue) {
                iframeListener.sendEnterEvent(newValue as string);
            }
        });

        // Open a new co-website by the property.
        this.gameMap.onEnterLayer((newLayers) => {
            const handler = () => {
                newLayers.forEach((layer) => {
                    if (!layer.properties) {
                        return;
                    }

                    let openWebsiteProperty: string | undefined;
                    let allowApiProperty: boolean | undefined;
                    let websitePolicyProperty: string | undefined;
                    let websiteWidthProperty: number | undefined;
                    let websitePositionProperty: number | undefined;
                    let websiteTriggerProperty: string | undefined;
                    let websiteTriggerMessageProperty: string | undefined;

                    layer.properties.forEach((property) => {
                        switch (property.name) {
                            case GameMapProperties.OPEN_WEBSITE:
                                openWebsiteProperty = property.value as string | undefined;
                                break;
                            case GameMapProperties.OPEN_WEBSITE_ALLOW_API:
                                allowApiProperty = property.value as boolean | undefined;
                                break;
                            case GameMapProperties.OPEN_WEBSITE_POLICY:
                                websitePolicyProperty = property.value as string | undefined;
                                break;
                            case GameMapProperties.OPEN_WEBSITE_WIDTH:
                                websiteWidthProperty = property.value as number | undefined;
                                break;
                            case GameMapProperties.OPEN_WEBSITE_POSITION:
                                websitePositionProperty = property.value as number | undefined;
                                break;
                            case GameMapProperties.OPEN_WEBSITE_TRIGGER:
                                websiteTriggerProperty = property.value as string | undefined;
                                break;
                            case GameMapProperties.OPEN_WEBSITE_TRIGGER_MESSAGE:
                                websiteTriggerMessageProperty = property.value as string | undefined;
                                break;
                        }
                    });

                    if (!openWebsiteProperty) {
                        return;
                    }

                    const actionId = "openWebsite-" + (Math.random() + 1).toString(36).substring(7);

                    if (this.coWebsitesOpenByLayer.has(layer)) {
                        return;
                    }

                    const coWebsiteOpen: OpenCoWebsite = {
                        actionId: actionId,
                    };

                    this.coWebsitesOpenByLayer.set(layer, coWebsiteOpen);

                    const loadCoWebsiteFunction = (coWebsite: CoWebsite) => {
                        coWebsiteManager.loadCoWebsite(coWebsite).catch(() => {
                            console.error("Error during loading a co-website: " + coWebsite.getUrl());
                        });

                        layoutManagerActionStore.removeAction(actionId);
                    };

                    const openCoWebsiteFunction = () => {
                        const coWebsite = new SimpleCoWebsite(
                            new URL(openWebsiteProperty ?? "", this.scene.MapUrlFile),
                            allowApiProperty,
                            websitePolicyProperty,
                            websiteWidthProperty,
                            false
                        );

                        coWebsiteOpen.coWebsite = coWebsite;

                        coWebsiteManager.addCoWebsiteToStore(coWebsite, websitePositionProperty);

                        loadCoWebsiteFunction(coWebsite);
                    };

                    if (
                        localUserStore.getForceCowebsiteTrigger() ||
                        websiteTriggerProperty === ON_ACTION_TRIGGER_BUTTON
                    ) {
                        if (!websiteTriggerMessageProperty) {
                            websiteTriggerMessageProperty = get(LL).trigger.cowebsite();
                        }

                        this.coWebsitesActionTriggerByLayer.set(layer, actionId);

                        layoutManagerActionStore.addAction({
                            uuid: actionId,
                            type: "message",
                            message: websiteTriggerMessageProperty,
                            callback: () => openCoWebsiteFunction(),
                            userInputManager: this.scene.userInputManager,
                        });
                    } else if (websiteTriggerProperty === ON_ICON_TRIGGER_BUTTON) {
                        const coWebsite = new SimpleCoWebsite(
                            new URL(openWebsiteProperty ?? "", this.scene.MapUrlFile),
                            allowApiProperty,
                            websitePolicyProperty,
                            websiteWidthProperty,
                            false
                        );

                        coWebsiteOpen.coWebsite = coWebsite;

                        coWebsiteManager.addCoWebsiteToStore(coWebsite, websitePositionProperty);
                    }

                    if (!websiteTriggerProperty) {
                        openCoWebsiteFunction();
                    }
                });
            };

            handler();
        });

        // Close opened co-websites on leave the layer who contain the property.
        this.gameMap.onLeaveLayer((oldLayers) => {
            const handler = () => {
                oldLayers.forEach((layer) => {
                    if (!layer.properties) {
                        return;
                    }

                    let openWebsiteProperty: string | undefined;
                    let websiteTriggerProperty: string | undefined;

                    layer.properties.forEach((property) => {
                        switch (property.name) {
                            case GameMapProperties.OPEN_WEBSITE:
                                openWebsiteProperty = property.value as string | undefined;
                                break;
                            case GameMapProperties.OPEN_WEBSITE_TRIGGER:
                                websiteTriggerProperty = property.value as string | undefined;
                                break;
                        }
                    });

                    if (!openWebsiteProperty) {
                        return;
                    }

                    const coWebsiteOpen = this.coWebsitesOpenByLayer.get(layer);

                    if (!coWebsiteOpen) {
                        return;
                    }

                    const coWebsite = coWebsiteOpen.coWebsite;

                    if (coWebsite) {
                        coWebsiteManager.closeCoWebsite(coWebsite);
                    }

                    this.coWebsitesOpenByLayer.delete(layer);

                    if (!websiteTriggerProperty) {
                        return;
                    }

                    const actionStore = get(layoutManagerActionStore);
                    const actionTriggerUuid = this.coWebsitesActionTriggerByLayer.get(layer);

                    if (!actionTriggerUuid) {
                        return;
                    }

                    const action =
                        actionStore && actionStore.length > 0
                            ? actionStore.find((action) => action.uuid === actionTriggerUuid)
                            : undefined;

                    if (action) {
                        layoutManagerActionStore.removeAction(actionTriggerUuid);
                    }

                    this.coWebsitesActionTriggerByLayer.delete(layer);
                });
            };

            handler();
        });
    }
}
