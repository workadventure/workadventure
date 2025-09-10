import { get } from "svelte/store";
import * as Sentry from "@sentry/svelte";
import type { ITiledMapLayer, ITiledMapObject } from "@workadventure/tiled-map-type-guard";
import { AreaData, AreaDataProperties, GameMapProperties } from "@workadventure/map-editor";
import { Jitsi } from "@workadventure/shared-utils";
import { getSpeakerMegaphoneAreaName } from "@workadventure/map-editor/src/Utils";
import { z } from "zod";
import { scriptUtils } from "../../Api/ScriptUtils";
import { coWebsites } from "../../Stores/CoWebsiteStore";
import { localUserStore } from "../../Connection/LocalUserStore";
import { ON_ACTION_TRIGGER_BUTTON, ON_ACTION_TRIGGER_ENTER, ON_ICON_TRIGGER_BUTTON } from "../../WebRtc/LayoutManager";
import type { CoWebsite } from "../../WebRtc/CoWebsite/CoWebsite";
import { SimpleCoWebsite } from "../../WebRtc/CoWebsite/SimpleCoWebsite";
import { bbbFactory } from "../../WebRtc/BBBFactory";
import { JITSI_PRIVATE_MODE, JITSI_URL } from "../../Enum/EnvironmentVariable";
import { JitsiCoWebsite } from "../../WebRtc/CoWebsite/JitsiCoWebsite";
import { audioManagerFileStore, audioManagerVisibilityStore } from "../../Stores/AudioManagerStore";
import { iframeListener } from "../../Api/IframeListener";
import { Room } from "../../Connection/Room";
import { LL } from "../../../i18n/i18n-svelte";
import { inBbbStore, inJitsiStore, inOpenWebsite, isSpeakerStore, silentStore } from "../../Stores/MediaStore";
import { chatZoneLiveStore } from "../../Stores/ChatStore";
import { currentLiveStreamingSpaceStore } from "../../Stores/MegaphoneStore";
import { isMediaBreakpointUp } from "../../Utils/BreakpointsUtils";
import { Area } from "../Entity/Area";
import { popupStore } from "../../Stores/PopupStore";
import PopUpJitsi from "../../Components/PopUp/PopUpJitsi.svelte";
import PopUpTab from "../../Components/PopUp/PopUpTab.svelte";
import PopUpCowebsite from "../../Components/PopUp/PopupCowebsite.svelte";
import { analyticsClient } from "./../../Administration/AnalyticsClient";
import type { GameMapFrontWrapper } from "./GameMap/GameMapFrontWrapper";
import type { GameScene } from "./GameScene";
import { AreasPropertiesListener } from "./MapEditor/AreasPropertiesListener";
import { gameManager } from "./GameManager";

export interface OpenCoWebsite {
    actionId: string;
    coWebsite?: CoWebsite;
}

// NOTE: We need to change id type to fit both ITiledMapObjects and UUID's from MapEditor
export type ITiledPlace = Omit<ITiledMapLayer | ITiledMapObject, "id"> & { id?: string | number };

export class GameMapPropertiesListener {
    private areasPropertiesListener: AreasPropertiesListener;

    private coWebsitesOpenByPlace = new Map<string, OpenCoWebsite>();
    private coWebsitesActionTriggerByPlace = new Map<string, string>();

    private actionTriggerCallback = new Map<string, () => void>();

    constructor(private scene: GameScene, private gameMapFrontWrapper: GameMapFrontWrapper) {
        this.areasPropertiesListener = new AreasPropertiesListener(scene);
    }

    register() {
        // Website on new tab
        this.gameMapFrontWrapper.onPropertyChange(GameMapProperties.OPEN_TAB, (newValue, oldValue, allProps) => {
            if (newValue === undefined) {
                popupStore.removePopup("openTab");
                // TODO: this is the old new way of doing popups.
                /*this.scene.CurrentPlayer.destroyText("openTab");
                const callback = this.actionTriggerCallback.get("openTab");
                if (callback) {
                    this.scene.userInputManager.removeSpaceEventListener(callback);
                    this.actionTriggerCallback.delete("openTab");
                }*/
                /**
                 * @DEPRECATED - This is the old way to show trigger message
                layoutManagerActionStore.removeAction("openTab");
                */
            }
            if (typeof newValue == "string" && newValue.length) {
                const openWebsiteTriggerValue = allProps.get(GameMapProperties.OPEN_WEBSITE_TRIGGER);
                const forceTrigger = localUserStore.getForceCowebsiteTrigger();
                if (forceTrigger || openWebsiteTriggerValue === ON_ACTION_TRIGGER_BUTTON) {
                    let message = allProps.get(GameMapProperties.OPEN_WEBSITE_TRIGGER_MESSAGE);
                    if (message === undefined) {
                        message = isMediaBreakpointUp("md")
                            ? get(LL).trigger.mobile.newTab()
                            : get(LL).trigger.newTab();
                    }

                    popupStore.addPopup(
                        PopUpTab,
                        {
                            message: message,
                            click: () => {
                                popupStore.removePopup("openTab");
                                scriptUtils.openTab(newValue);
                            },
                            userInputManager: this.scene.userInputManager,
                        },
                        "openTab"
                    );
                    // TODO: this is the old new way of doing popups
                    // Create callback and play text message
                    /*const callback = () => {
                        scriptUtils.openTab(newValue);
                        this.scene.CurrentPlayer.destroyText("openTab");
                        this.scene.userInputManager.removeSpaceEventListener(callback);
                        this.actionTriggerCallback.delete("openTab");
                    };
                    this.scene.CurrentPlayer.playText("openTab", `${message}`, -1, callback);
                    this.scene.userInputManager?.addSpaceEventListener(callback);
                    this.actionTriggerCallback.set("openTab", callback);*/

                    /**
                     * @DEPRECATED - This is the old way to show trigger message
                    layoutManagerActionStore.addAction({
                        uuid: "openTab",
                        type: "message",
                            message: message,
                            click: () => {
                                popupStore.removePopup("openTab");
                                scriptUtils.openTab(newValue);
                            },
                            userInputManager: this.scene.userInputManager,
                        },
                        "openTab"
                    );
                    */
                } else {
                    scriptUtils.openTab(newValue);
                }
            }
        });

        // Jitsi room
        this.gameMapFrontWrapper.onPropertyChange(GameMapProperties.JITSI_ROOM, (newValue, oldValue, allProps) => {
            if (newValue === undefined || newValue !== oldValue) {
                popupStore.removePopup("jitsi");
                // TODO: this is the old new way of doing popups
                /*this.scene.CurrentPlayer.destroyText("jitsi");
                const callback = this.actionTriggerCallback.get("jitsi");
                if (callback) {
                    this.scene.userInputManager.removeSpaceEventListener(callback);
                    this.actionTriggerCallback.delete("jitsi");
                }*/
                /**
                 * @DEPRECATED - This is the old way to show trigger message
                layoutManagerActionStore.removeAction("jitsi");
                */
                coWebsites.keepOnly((coWebsite) => !(coWebsite instanceof JitsiCoWebsite));
                inJitsiStore.set(false);
                if (newValue === undefined) {
                    return;
                }
            }
            const openJitsiRoomFunction = async () => {
                const roomName = Jitsi.slugifyJitsiRoomName(
                    newValue.toString(),
                    this.scene.roomUrl,
                    allProps.has(GameMapProperties.JITSI_NO_PREFIX)
                );
                const isJitsiUrl = z.string().optional().safeParse(allProps.get(GameMapProperties.JITSI_URL));
                let jitsiUrl = isJitsiUrl.success ? isJitsiUrl.data : undefined;

                const isJitsiWidth = z
                    .number()
                    .min(1)
                    .max(100)
                    .default(50)
                    .optional()
                    .safeParse(allProps.get(GameMapProperties.JITSI_WIDTH));
                const jitsiWidth = isJitsiWidth.success ? isJitsiWidth.data : 50;

                let jwt: string | undefined;
                if (JITSI_PRIVATE_MODE && !jitsiUrl) {
                    if (!this.scene.connection) {
                        console.info("Cannot connect to Jitsi. No connection to Pusher server.");
                        return;
                    }
                    const answer = await this.scene.connection.queryJitsiJwtToken(roomName);
                    jwt = answer.jwt;
                    jitsiUrl = answer.url;
                }

                let domain = jitsiUrl || JITSI_URL;
                if (domain === undefined) {
                    throw new Error("Missing JITSI_URL environment variable or jitsiUrl parameter in the map.");
                }
                if (!domain.startsWith("http")) {
                    domain = "https://" + domain;
                }

                inJitsiStore.set(true);

                const isJitsiConfig = z.string().optional().safeParse(allProps.get(GameMapProperties.JITSI_CONFIG));
                const isJitsiInterfaceConfig = z
                    .string()
                    .optional()
                    .safeParse(allProps.get(GameMapProperties.JITSI_INTERFACE_CONFIG));

                const jitsiConfig = this.safeParseJSONstring(
                    isJitsiConfig.success ? isJitsiConfig.data : undefined,
                    GameMapProperties.JITSI_CONFIG
                );

                const jitsiInterfaceConfig = this.safeParseJSONstring(
                    isJitsiInterfaceConfig.success ? isJitsiInterfaceConfig.data : undefined,
                    GameMapProperties.JITSI_INTERFACE_CONFIG
                );

                const isJitsiClosable = z
                    .boolean()
                    .optional()
                    .safeParse(allProps.get(GameMapProperties.JITSI_CLOSABLE));
                const jitsiClosable = isJitsiClosable.success ? isJitsiClosable.data : true;

                const isJitsiRoomAdminTag = z.string().safeParse(allProps.get(GameMapProperties.JITSI_ADMIN_ROOM_TAG));

                const jitsiRoomAdminTag = isJitsiRoomAdminTag.success ? isJitsiRoomAdminTag.data : null;

                const coWebsite = new JitsiCoWebsite(
                    new URL(domain),
                    jitsiWidth,
                    jitsiClosable,
                    roomName,
                    gameManager.getPlayerName() ?? "unknown",
                    jwt,
                    jitsiConfig,
                    jitsiInterfaceConfig,
                    jitsiRoomAdminTag
                );

                coWebsites.add(coWebsite);

                // coWebsiteManager.loadCoWebsite(coWebsite);

                // .catch((err) => {
                //     console.error(err);
                // });

                analyticsClient.enteredJitsi(roomName, this.scene.roomUrl);

                popupStore.removePopup("jitsi");
                // TODO: this is the old new way of doing popups
                /*this.scene.CurrentPlayer.destroyText("jitsi");
                const callback = this.actionTriggerCallback.get("jitsi");
                if (callback) {
                    this.scene.userInputManager.removeSpaceEventListener(callback);
                    this.actionTriggerCallback.delete("jitsi");
                }*/
                /**
                 * @DEPRECATED - This is the old way to show trigger message
                layoutManagerActionStore.removeAction("jitsi");
                */
            };

            const jitsiTriggerValue = allProps.get(GameMapProperties.JITSI_TRIGGER);
            const forceTrigger = localUserStore.getForceCowebsiteTrigger();
            if (forceTrigger || jitsiTriggerValue === ON_ACTION_TRIGGER_BUTTON) {
                let message = allProps.get(GameMapProperties.JITSI_TRIGGER_MESSAGE);
                if (message === undefined) {
                    message = isMediaBreakpointUp("md")
                        ? get(LL).trigger.mobile.jitsiRoom()
                        : get(LL).trigger.jitsiRoom();
                }

                popupStore.addPopup(
                    PopUpJitsi,
                    {
                        message: message,
                        click: () => {
                            openJitsiRoomFunction().catch((e) => console.error(e));
                        },
                        userInputManager: this.scene.userInputManager,
                    },
                    "jitsi"
                );
                // TODO: this is the old new way of doing popups
                // Create callback and play text message
                /*const callback = () => {
                    openJitsiRoomFunction().catch((e) => console.error(e));
                    this.scene.CurrentPlayer.destroyText("jitsi");
                    this.scene.userInputManager.removeSpaceEventListener(callback);
                    this.actionTriggerCallback.delete("jitsi");
                };
                this.scene.CurrentPlayer.playText("jitsi", `${message}`, -1, callback);
                this.scene.userInputManager?.addSpaceEventListener(callback);
                this.actionTriggerCallback.set("jitsi", callback);*/

                /**
                 * @DEPRECATED - This is the old way to show trigger message
                layoutManagerActionStore.addAction({
                    uuid: "jitsi",
                    type: "message",
                        message: message,
                        click: () => {
                            openJitsiRoomFunction().catch((e) => console.error(e));
                        },
                        userInputManager: this.scene.userInputManager,
                    },
                    "jitsi"
                );
                 */
            } else {
                openJitsiRoomFunction().catch((e) => console.error(e));
            }
        });

        this.gameMapFrontWrapper.onPropertyChange(GameMapProperties.BBB_MEETING, (newValue, oldValue, allProps) => {
            if (newValue === undefined || newValue !== oldValue) {
                // TODO: this is the old new way of doing popups
                // NOTE: the new design does not have the matching popup yet it seems
                this.scene.CurrentPlayer.destroyText("bbbMeeting");
                const callback = this.actionTriggerCallback.get("bbbMeeting");
                if (callback) {
                    this.scene.userInputManager.removeSpaceEventListener(callback);
                    this.actionTriggerCallback.delete("bbbMeeting");
                }
                /**
                 * @DEPRECATED - This is the old way to show trigger message
                layoutManagerActionStore.removeAction("bbbMeeting");
                */
                inBbbStore.set(false);
                bbbFactory.setStopped(true);
                bbbFactory.stop();
                if (newValue === undefined) {
                    return;
                }
            }
            inBbbStore.set(true);
            bbbFactory.setStopped(false);
            bbbFactory
                .parametrizeMeetingId(newValue as string)
                .then((hashedMeetingId) => {
                    if (this.scene.connection === undefined) {
                        throw new Error("No more connection to open BBB");
                    }
                    return this.scene.connection.queryBBBMeetingUrl(hashedMeetingId, allProps);
                })

                .then((bbbAnswer) => {
                    bbbFactory.start(bbbAnswer.clientURL);
                })
                .catch((e) => console.error(e));
        });

        this.gameMapFrontWrapper.onPropertyChange(GameMapProperties.EXIT_SCENE_URL, (newValue) => {
            if (newValue) {
                this.scene
                    .onMapExit(
                        Room.getRoomPathFromExitSceneUrl(
                            newValue as string,
                            window.location.toString(),
                            this.scene.mapUrlFile
                        )
                    )
                    .catch((e) => console.error(e));
            } else {
                setTimeout(() => {
                    popupStore.removePopup("roomAccessDenied");
                }, 2000);
            }
        });

        this.gameMapFrontWrapper.onPropertyChange(GameMapProperties.EXIT_URL, (newValue) => {
            if (newValue) {
                this.scene
                    .onMapExit(Room.getRoomPathFromExitUrl(newValue as string, window.location.toString()))
                    .catch((e) => console.error(e));
            } else {
                setTimeout(() => {
                    popupStore.removePopup("roomAccessDenied");
                }, 2000);
            }
        });

        this.gameMapFrontWrapper.onPropertyChange(GameMapProperties.SILENT, (newValue) => {
            if (newValue === undefined || newValue === false || newValue === "") {
                silentStore.setOthersSilent(false);
            } else {
                silentStore.setOthersSilent(true);
            }
        });

        this.gameMapFrontWrapper.onPropertyChange(GameMapProperties.PLAY_AUDIO, (newValue, oldValue, allProps) => {
            if (localUserStore.getBlockAudio()) {
                if (newValue !== undefined) {
                    audioManagerVisibilityStore.set("disabledBySettings");
                } else {
                    audioManagerVisibilityStore.set("hidden");
                }
                return;
            }
            const volume = allProps.get(GameMapProperties.AUDIO_VOLUME) as number | undefined;
            const loop = allProps.get(GameMapProperties.AUDIO_LOOP) as boolean | undefined;

            if (newValue !== undefined) {
                audioManagerFileStore.playAudio(newValue, this.scene.getMapUrl(), volume, loop);
                // FIXME: maybe we can switch to "visible" only when the sound actually starts playing?
                audioManagerVisibilityStore.set("visible");
            } else {
                audioManagerFileStore.unloadAudio();
                audioManagerVisibilityStore.set("hidden");
            }
        });

        // TODO: This legacy property should be removed at some point
        this.gameMapFrontWrapper.onPropertyChange(GameMapProperties.PLAY_AUDIO_LOOP, (newValue) => {
            if (newValue !== undefined) {
                audioManagerFileStore.playAudio(newValue, this.scene.getMapUrl(), undefined, true);
                // FIXME: maybe we can switch to "visible" only when the sound actually starts playing?
                audioManagerVisibilityStore.set("visible");
            } else {
                audioManagerFileStore.unloadAudio();
                audioManagerVisibilityStore.set("hidden");
            }
        });

        // TODO: Legacy functionnality replace by layer change
        this.gameMapFrontWrapper.onPropertyChange(GameMapProperties.ZONE, (newValue, oldValue) => {
            if (oldValue) {
                iframeListener.sendLeaveEvent(oldValue as string);
            }
            if (newValue) {
                iframeListener.sendEnterEvent(newValue as string);
            }
        });

        // Muc zone
        this.gameMapFrontWrapper.onPropertyChange(GameMapProperties.CHAT_NAME, (newValue, oldValue, allProps) => {
            if (!this.scene.room.isChatEnabled) {
                return;
            }

            const playUri = this.scene.roomUrl + "/";

            if (oldValue !== undefined) {
                iframeListener.sendLeaveMucEventToChatIframe(playUri + oldValue).catch((error) => console.error(error));
                chatZoneLiveStore.set(false);
            }
            if (newValue !== undefined) {
                iframeListener
                    .sendJoinMucEventToChatIframe(playUri + newValue, newValue.toString(), "live", false)
                    .catch((error) => console.error(error));
                chatZoneLiveStore.set(true);
            }
        });

        this.gameMapFrontWrapper.onEnterLayer((newLayers) => {
            this.onEnterPlaceHandler(newLayers);
        });

        this.gameMapFrontWrapper.onLeaveLayer((oldLayers) => {
            this.onLeavePlaceHandler(oldLayers);
        });

        this.gameMapFrontWrapper.onEnterTiledArea((newTiledAreas) => {
            this.onEnterPlaceHandler(newTiledAreas);
        });

        this.gameMapFrontWrapper.onLeaveTiledArea((oldTiledAreas) => {
            this.onLeavePlaceHandler(oldTiledAreas);
        });

        this.gameMapFrontWrapper.onEnterArea((newAreas) => {
            if (this.gameMapFrontWrapper.areasManager === undefined) {
                return;
            }
            // Hide the area if the user has no access
            const areas: Area[] = [];
            for (const area of newAreas) {
                const areaObject = this.gameMapFrontWrapper.areasManager.getAreaById(area.id);
                if (areaObject) areas.push(areaObject);
            }
            this.onEnterAreasHandler(newAreas, areas);
        });

        this.gameMapFrontWrapper.onLeaveArea((oldAreas) => {
            if (
                this.gameMapFrontWrapper.areasManager == undefined ||
                this.gameMapFrontWrapper.areasManager.getAreaById == undefined
            )
                return;
            const areas: Area[] = [];
            for (const area of oldAreas) {
                const areaObject = this.gameMapFrontWrapper.areasManager.getAreaById(area.id);
                if (areaObject) areas.push(areaObject);
            }
            this.onLeaveAreasHandler(oldAreas, areas);
        });

        this.gameMapFrontWrapper.onUpdateArea((area, oldProperties, newProperties) => {
            this.onUpdateAreasHandler(area, oldProperties, newProperties);
        });

        this.gameMapFrontWrapper.onEnterDynamicArea((newAreas) => {
            this.onEnterPlaceHandler(
                newAreas.map((area) => this.gameMapFrontWrapper.mapDynamicAreaToTiledObject(area))
            );
        });

        this.gameMapFrontWrapper.onLeaveDynamicArea((oldAreas) => {
            this.onLeavePlaceHandler(
                oldAreas.map((area) => this.gameMapFrontWrapper.mapDynamicAreaToTiledObject(area))
            );
        });
    }

    private onEnterPlaceHandler(places: ITiledPlace[]): void {
        places.forEach((place) => {
            this.handleOpenWebsitePropertiesOnEnter(place);
            this.handleFocusablePropertiesOnEnter(place);
            this.handleSpeakerMegaphonePropertiesOnEnter(place).catch((e) => {
                console.error(e);
                Sentry.captureException(e);
            });
            this.handleListenerMegaphonePropertiesOnEnter(place).catch((e) => {
                console.error(e);
                Sentry.captureException(e);
            });
        });
    }

    private onLeavePlaceHandler(places: ITiledPlace[]): void {
        places.forEach((place) => {
            if (!place.properties) {
                return;
            }

            this.handleOpenWebsitePropertiesOnLeave(place);
            this.handleFocusablePropertiesOnLeave(place);
            this.handleSpeakerMegaphonePropertiesOnLeave(place);
            this.handleListenerMegaphonePropertiesOnLeave(place);
        });
    }

    private onEnterAreasHandler(areasData: AreaData[], areas?: Area[]): void {
        this.areasPropertiesListener.onEnterAreasHandler(areasData, areas);
    }

    private onUpdateAreasHandler(
        area: AreaData,
        oldProperties: AreaDataProperties | undefined,
        newProperties: AreaDataProperties | undefined
    ): void {
        this.areasPropertiesListener.onUpdateAreasHandler(area, oldProperties, newProperties);
    }

    private onLeaveAreasHandler(areasData: AreaData[], areas?: Area[]): void {
        this.areasPropertiesListener.onLeaveAreasHandler(areasData, areas);
    }

    private handleOpenWebsitePropertiesOnEnter(place: ITiledPlace): void {
        if (!place.properties) {
            return;
        }
        let openWebsiteProperty: string | undefined;
        let allowApiProperty: boolean | undefined;
        let websitePolicyProperty: string | undefined;
        let websiteWidthProperty: number | undefined;
        // let websitePositionProperty: number | undefined;
        let websiteTriggerProperty: string | undefined;
        let websiteTriggerMessageProperty: string | undefined;
        let websiteClosableProperty: boolean | undefined;

        place.properties.forEach((property) => {
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
                case GameMapProperties.OPEN_WEBSITE_TRIGGER:
                    websiteTriggerProperty = property.value as string | undefined;
                    break;
                case GameMapProperties.OPEN_WEBSITE_TRIGGER_MESSAGE:
                    websiteTriggerMessageProperty = property.value as string | undefined;
                    break;
                case GameMapProperties.OPEN_WEBSITE_CLOSABLE:
                    websiteClosableProperty = property.value as boolean | undefined;
                    break;
            }
        });

        if (!openWebsiteProperty) {
            return;
        }

        const actionId = "openWebsite-" + (Math.random() + 1).toString(36).substring(7);

        if (this.coWebsitesOpenByPlace.has(this.getIdFromPlace(place))) {
            return;
        }

        const coWebsiteOpen: OpenCoWebsite = {
            actionId: actionId,
        };

        this.coWebsitesOpenByPlace.set(this.getIdFromPlace(place), coWebsiteOpen);

        const loadCoWebsiteFunction = (/*coWebsite: CoWebsite*/) => {
            popupStore.removePopup(actionId);
            // FIXME: the fact that the loadCoWebsiteFunction does not load the cowebsite but only removes the popup is weird.

            // TODO: this is the old new way of doing popups
            /*coWebsiteManager.loadCoWebsite(coWebsite).catch(() => {
                console.error("Error during loading a co-website: " + coWebsite.getUrl());
            });

            this.scene.CurrentPlayer.destroyText(actionId);
            const callback = this.actionTriggerCallback.get(actionId);
            if (callback) {
                this.scene.userInputManager.removeSpaceEventListener(callback);
                this.actionTriggerCallback.delete(actionId);
            }*/
            /**
             * @DEPRECATED - This is the old way to show trigger message
            layoutManagerActionStore.removeAction(actionId);
            */
        };

        const openCoWebsiteFunction = () => {
            // Check URl and get the correct one
            let urlStr = openWebsiteProperty ?? "";
            try {
                urlStr = scriptUtils.getWebsiteUrl(openWebsiteProperty ?? "");
            } catch (e) {
                console.error("Error on getWebsiteUrl: ", e);
            }
            const url = new URL(urlStr, this.scene.mapUrlFile);
            const coWebsite = new SimpleCoWebsite(
                url,
                allowApiProperty,
                websitePolicyProperty,
                websiteWidthProperty,
                websiteClosableProperty
            );

            coWebsiteOpen.coWebsite = coWebsite;

            coWebsites.add(coWebsite);

            loadCoWebsiteFunction();

            //user in a zone with cowebsite opened or pressed SPACE to enter is a zone
            inOpenWebsite.set(true);

            // analytics event for open website
            analyticsClient.openedWebsite(url);
        };

        if (localUserStore.getForceCowebsiteTrigger() || websiteTriggerProperty === ON_ACTION_TRIGGER_BUTTON) {
            if (!websiteTriggerMessageProperty) {
                websiteTriggerMessageProperty = isMediaBreakpointUp("md")
                    ? get(LL).trigger.mobile.cowebsite()
                    : get(LL).trigger.cowebsite();
            }

            this.coWebsitesActionTriggerByPlace.set(this.getIdFromPlace(place), actionId);

            popupStore.addPopup(
                PopUpCowebsite,
                {
                    message: websiteTriggerMessageProperty,
                    click: () => {
                        openCoWebsiteFunction();
                    },
                    userInputManager: this.scene.userInputManager,
                },
                actionId
            );
            // TODO: this is the old new way of doing popups
            // Create callback and play text message
            /*const callback = () => {
                openCoWebsiteFunction();
                this.scene.CurrentPlayer.destroyText(actionId);
                this.scene.userInputManager.removeSpaceEventListener(callback);
                this.actionTriggerCallback.delete(actionId);
            };
            this.scene.CurrentPlayer.playText(actionId, `${websiteTriggerMessageProperty}`, -1, callback);
            this.scene.userInputManager?.addSpaceEventListener(callback);
            this.actionTriggerCallback.set(actionId, callback);*/
            /**
             * @DEPRECATED - This is the old way to show trigger message
            layoutManagerActionStore.addAction({
                uuid: actionId,
                type: "message",
                    message: websiteTriggerMessageProperty,
                    click: () => {
                        openCoWebsiteFunction();
                    },
                    userInputManager: this.scene.userInputManager,
                },
                actionId
            );
            */
        } else if (websiteTriggerProperty === ON_ICON_TRIGGER_BUTTON) {
            // Check URl and get the correct one
            let urlStr = openWebsiteProperty ?? "";
            try {
                urlStr = scriptUtils.getWebsiteUrl(openWebsiteProperty ?? "");
            } catch (e) {
                console.error("Error on getWebsiteUrl: ", e);
            }
            const coWebsite = new SimpleCoWebsite(
                new URL(urlStr, this.scene.mapUrlFile),
                allowApiProperty,
                websitePolicyProperty,
                websiteWidthProperty,
                websiteClosableProperty
            );

            coWebsiteOpen.coWebsite = coWebsite;

            coWebsites.add(coWebsite);

            //user in zone to open cowesite with only icone
            inOpenWebsite.set(true);
        }

        if (!websiteTriggerProperty || websiteTriggerProperty === ON_ACTION_TRIGGER_ENTER) {
            openCoWebsiteFunction();
        }
    }

    private async handleSpeakerMegaphonePropertiesOnEnter(place: ITiledPlace): Promise<void> {
        if (!place.properties) {
            return;
        }
        const speakerZone = place.properties.find((property) => property.name === GameMapProperties.SPEAKER_MEGAPHONE);
        if (speakerZone && speakerZone.type === "string" && speakerZone.value !== undefined) {
            isSpeakerStore.set(true);
            // TODO remove this log after testing
            console.info(
                "handleSpeakerMegaphonePropertiesOnEnter => joinSpace => speakerZone.value : ",
                speakerZone.value
            );
            const space = await this.scene.broadcastService.joinSpace(speakerZone.value);
            currentLiveStreamingSpaceStore.set(space);
            /*if (get(requestedCameraState) || get(requestedMicrophoneState)) {
                requestedMegaphoneStore.set(true);
            }*/
        }
    }

    private handleSpeakerMegaphonePropertiesOnLeave(place: ITiledPlace): void {
        if (!place.properties) {
            return;
        }
        const speakerZone = place.properties.find((property) => property.name === GameMapProperties.SPEAKER_MEGAPHONE);
        if (speakerZone && speakerZone.type === "string" && speakerZone.value !== undefined) {
            isSpeakerStore.set(false);
            currentLiveStreamingSpaceStore.set(undefined);
            this.scene.broadcastService.leaveSpace(speakerZone.value).catch((e) => {
                console.error("Error while leaving space", e);
                Sentry.captureException(e);
            });
        }
    }

    private async handleListenerMegaphonePropertiesOnEnter(place: ITiledPlace): Promise<void> {
        if (!place.properties) {
            return;
        }
        const listenerZone = place.properties.find(
            (property) => property.name === GameMapProperties.LISTENER_MEGAPHONE
        );
        if (listenerZone && listenerZone.type === "string" && listenerZone.value !== undefined) {
            const speakerZoneName = getSpeakerMegaphoneAreaName(
                gameManager.getCurrentGameScene().getGameMap().getGameMapAreas()?.getAreas(),
                listenerZone.value
            );
            if (speakerZoneName) {
                // TODO remove this log after testing
                console.info(
                    "handleListenerMegaphonePropertiesOnEnter => joinSpace => speakerZoneName : ",
                    speakerZoneName
                );
                const space = await this.scene.broadcastService.joinSpace(speakerZoneName);
                currentLiveStreamingSpaceStore.set(space);
            }
        }
    }

    private handleListenerMegaphonePropertiesOnLeave(place: ITiledPlace): void {
        if (!place.properties) {
            return;
        }
        const listenerZone = place.properties.find(
            (property) => property.name === GameMapProperties.LISTENER_MEGAPHONE
        );
        if (listenerZone && listenerZone.type === "string" && listenerZone.value !== undefined) {
            const speakerZoneName = getSpeakerMegaphoneAreaName(
                gameManager.getCurrentGameScene().getGameMap().getGameMapAreas()?.getAreas(),
                listenerZone.value
            );
            if (speakerZoneName) {
                currentLiveStreamingSpaceStore.set(undefined);
                this.scene.broadcastService.leaveSpace(speakerZoneName).catch((e) => {
                    console.error("Error while leaving space", e);
                    Sentry.captureException(e);
                });
            }
        }
    }

    private handleFocusablePropertiesOnEnter(place: ITiledPlace): void {
        if (!place.properties) {
            return;
        }
        if (place.x === undefined || place.y === undefined || !place.height || !place.width) {
            return;
        }
        const focusable = place.properties.find((property) => property.name === GameMapProperties.FOCUSABLE);
        if (focusable && focusable.value === true) {
            const zoomMargin = place.properties.find((property) =>
                [GameMapProperties.ZOOM_MARGIN, "zoom_margin"].includes(property.name)
            );
            this.scene.getCameraManager().enterFocusMode(
                {
                    x: place.x + place.width * 0.5,
                    y: place.y + place.height * 0.5,
                    width: place.width,
                    height: place.height,
                },
                zoomMargin ? Math.max(0, Number(zoomMargin.value)) : undefined
            );
        }
    }

    private handleOpenWebsitePropertiesOnLeave(place: ITiledPlace): void {
        if (!place.properties) {
            return;
        }

        let openWebsiteProperty: string | undefined;
        let websiteTriggerProperty: string | undefined;

        place.properties.forEach((property) => {
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

        const coWebsiteOpen = this.coWebsitesOpenByPlace.get(this.getIdFromPlace(place));

        if (!coWebsiteOpen) {
            return;
        }

        const coWebsite = coWebsiteOpen.coWebsite;

        if (coWebsite) {
            coWebsites.remove(coWebsite);
        }

        this.coWebsitesOpenByPlace.delete(this.getIdFromPlace(place));

        inOpenWebsite.set(false);

        if (!websiteTriggerProperty) {
            return;
        }

        const actionTriggerUuid = this.coWebsitesActionTriggerByPlace.get(this.getIdFromPlace(place));

        if (!actionTriggerUuid) {
            return;
        }

        this.scene.CurrentPlayer.destroyText(actionTriggerUuid);
        const callback = this.actionTriggerCallback.get(actionTriggerUuid);
        if (callback) {
            this.scene.userInputManager.removeSpaceEventListener(callback);
            this.actionTriggerCallback.delete(actionTriggerUuid);
        }

        /**
         * @DEPRECATED - This is the old way to show trigger message
        const actionStore = get(layoutManagerActionStore);
        const action =
            actionStore && actionStore.length > 0
                ? actionStore.find((action) => action.uuid === actionTriggerUuid)
                : undefined;

        if (action) {
            popupStore.removePopup(actionTriggerUuid);
        }

        // TODO: this is the old new way of doing popups
        /*this.scene.CurrentPlayer.destroyText(actionTriggerUuid);
        const callback = this.actionTriggerCallback.get(actionTriggerUuid);
        if (callback) {
            this.scene.userInputManager.removeSpaceEventListener(callback);
            this.actionTriggerCallback.delete(actionTriggerUuid);
        }*/

        /**
         * @DEPRECATED - This is the old way to show trigger message
        const actionStore = get(layoutManagerActionStore);
        const action =
            actionStore && actionStore.length > 0
                ? actionStore.find((action) => action.uuid === actionTriggerUuid)
                : undefined;

        if (action) {
            popupStore.removePopup(actionTriggerUuid);
        }
        */

        popupStore.removePopup(actionTriggerUuid);
        this.coWebsitesActionTriggerByPlace.delete(this.getIdFromPlace(place));
    }

    private handleFocusablePropertiesOnLeave(place: ITiledPlace): void {
        if (!place.properties) {
            return;
        }
        const focusable = place.properties.find((property) => property.name === GameMapProperties.FOCUSABLE);
        if (focusable && focusable.value === true) {
            this.scene.getCameraManager().leaveFocusMode(this.scene.CurrentPlayer, 1000);
        }
    }

    private getIdFromPlace(place: ITiledPlace): string {
        return `${place.name}:${place.type ?? ""}:${place.id ?? 0}`;
    }

    private safeParseJSONstring(jsonString: string | undefined, propertyName: string) {
        try {
            return jsonString ? JSON.parse(jsonString) : {};
        } catch (e) {
            console.warn('Invalid JSON found in property "' + propertyName + '" of the map:' + jsonString, e);
            return {};
        }
    }
}
