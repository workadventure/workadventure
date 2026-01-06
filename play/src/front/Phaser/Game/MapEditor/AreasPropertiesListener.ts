import { v4 as uuidv4 } from "uuid";
import type {
    AreaData,
    AreaDataProperties,
    AreaDataProperty,
    FocusablePropertyData,
    TooltipPropertyData,
    JitsiRoomPropertyData,
    ListenerMegaphonePropertyData,
    MatrixRoomPropertyData,
    OpenFilePropertyData,
    OpenWebsitePropertyData,
    PersonalAreaPropertyData,
    PlayAudioPropertyData,
    SpeakerMegaphonePropertyData,
    LivekitRoomPropertyData,
    HighlightPropertyData,
} from "@workadventure/map-editor";
import { PersonalAreaAccessClaimMode } from "@workadventure/map-editor";
import * as Sentry from "@sentry/svelte";
import { getSpeakerMegaphoneAreaName } from "@workadventure/map-editor/src/Utils";
import { Jitsi } from "@workadventure/shared-utils";
import type { Unsubscriber } from "svelte/store";
import { get } from "svelte/store";
import type { Member } from "@workadventure/messages";
import { FilterType } from "@workadventure/messages";
import { LL } from "../../../../i18n/i18n-svelte";
import { analyticsClient } from "../../../Administration/AnalyticsClient";
import { iframeListener } from "../../../Api/IframeListener";
import { scriptUtils } from "../../../Api/ScriptUtils";
import { localUserStore } from "../../../Connection/LocalUserStore";
import { Room } from "../../../Connection/Room";
import { ADMIN_URL, JITSI_PRIVATE_MODE, JITSI_URL } from "../../../Enum/EnvironmentVariable";
import {
    audioManagerFileStore,
    audioManagerVisibilityStore,
    audioManagerVolumeStore,
} from "../../../Stores/AudioManagerStore";
import { chatVisibilityStore, chatZoneLiveStore } from "../../../Stores/ChatStore";
/**
 * @DEPRECATED - This is the old way to show trigger message
 import { layoutManagerActionStore } from "../../../Stores/LayoutManagerStore";
 */
import {
    inJitsiStore,
    inLivekitStore,
    inOpenWebsite,
    isListenerStore,
    isSpeakerStore,
    listenerWaitingMediaStore,
    requestedCameraState,
    requestedMicrophoneState,
    silentStore,
} from "../../../Stores/MediaStore";
import { currentLiveStreamingSpaceStore } from "../../../Stores/MegaphoneStore";
import { notificationPlayingStore } from "../../../Stores/NotificationStore";
import type { CoWebsite } from "../../../WebRtc/CoWebsite/CoWebsite";
import { JitsiCoWebsite } from "../../../WebRtc/CoWebsite/JitsiCoWebsite";
import { SimpleCoWebsite } from "../../../WebRtc/CoWebsite/SimpleCoWebsite";
import { coWebsites } from "../../../Stores/CoWebsiteStore";
import {
    ON_ACTION_TRIGGER_BUTTON,
    ON_ACTION_TRIGGER_ENTER,
    ON_ICON_TRIGGER_BUTTON,
} from "../../../WebRtc/LayoutManager";
import { gameManager } from "../GameManager";
import type { OpenCoWebsite } from "../GameMapPropertiesListener";
import type { GameScene } from "../GameScene";
import { mapEditorAskToClaimPersonalAreaStore } from "../../../Stores/MapEditorStore";
import {
    canRequestVisitCardsStore,
    requestVisitCardsStore,
    selectedChatIDRemotePlayerStore,
} from "../../../Stores/GameStore";
import { isMediaBreakpointUp } from "../../../Utils/BreakpointsUtils";
import type { MessageUserJoined } from "../../../Connection/ConnexionModels";
import { navChat } from "../../../Chat/Stores/ChatStore";
import type { Area } from "../../Entity/Area";
import { extensionModuleStore } from "../../../Stores/GameSceneStore";
import type { ChatRoom } from "../../../Chat/Connection/ChatConnection";
import { userIsConnected } from "../../../Stores/MenuStore";
import { popupStore } from "../../../Stores/PopupStore";
import PopupCowebsite from "../../../Components/PopUp/PopupCowebsite.svelte";
import JitsiPopup from "../../../Components/PopUp/PopUpJitsi.svelte";
import PopUpTab from "../../../Components/PopUp/PopUpTab.svelte";
import { selectedRoomStore } from "../../../Chat/Stores/SelectRoomStore";
import FilePopup from "../../../Components/PopUp/FilePopup.svelte";
import type { SpaceInterface } from "../../../Space/SpaceInterface";

export class AreasPropertiesListener {
    private scene: GameScene;

    /**
     * Opened by Areas only, per property
     */
    private openedCoWebsites = new Map<string, OpenCoWebsite>();
    private coWebsitesActionTriggers = new Map<string, string>();
    private _isMicrophoneActiveBeforeLivekitRoom: boolean = false;
    private _isVideoActiveBeforeLivekitRoom: boolean = false;
    private _requestedMicrophoneStateSubscription: Unsubscriber | undefined;
    private _requestedCameraStateSubscription: Unsubscriber | undefined;

    private actionTriggerCallback: Map<string, () => void> = new Map<string, () => void>();

    constructor(scene: GameScene) {
        this.scene = scene;
    }

    public onEnterAreasHandler(areasData: AreaData[], areas?: Area[]): void {
        for (const areaData of areasData) {
            // analytics event for area
            analyticsClient.enterAreaMapEditor(areaData.id, areaData.name);

            // TODO: fix me to use listener event through GameScene
            // Send event to enter in the area
            iframeListener.sendEnterMapEditorAreaEvent(areaData.name);

            if (!areaData.properties) {
                continue;
            }

            // Add new notification to show at the user that he entered a new area
            if (areaData.name && areaData.name !== "") {
                notificationPlayingStore.playNotification(areaData.name, "icon-tool-area.png", areaData.id);
            }

            // get area from area data
            const area = areas?.find((area) => area.areaData.id === areaData.id);

            for (const property of areaData.properties) {
                this.addPropertyFilter(property, areaData, area);
            }
        }
    }

    public onUpdateAreasHandler(
        area: AreaData,
        oldProperties: AreaDataProperties | undefined,
        newProperties: AreaDataProperties | undefined
    ): void {
        const propertiesTreated = new Set<string>();

        if (newProperties === undefined) {
            return;
        }

        if (oldProperties !== undefined) {
            for (const oldProperty of oldProperties) {
                const newProperty = newProperties.find((searchedProperty) => searchedProperty.id === oldProperty.id);

                if (JSON.stringify(oldProperty) === JSON.stringify(newProperty)) {
                    propertiesTreated.add(oldProperty.id);
                    continue;
                }

                if (newProperty === undefined) {
                    this.removePropertyFilter(oldProperty);
                } else {
                    this.updatePropertyFilter(oldProperty, newProperty, area);
                }

                propertiesTreated.add(oldProperty.id);
            }
        }

        for (const newProperty of newProperties) {
            if (propertiesTreated.has(newProperty.id)) {
                continue;
            }
            this.addPropertyFilter(newProperty, area);
        }
    }

    public onLeaveAreasHandler(areasData: AreaData[], areas?: Area[]): void {
        for (const areaData of areasData) {
            // analytics event for area
            analyticsClient.leaveAreaMapEditor(areaData.id, areaData.name);

            // TODO: fix me to use listener event through GameScene
            // Send event to leave the area
            iframeListener.sendLeaveMapEditorAreaEvent(areaData.name);

            if (!areaData.properties) {
                continue;
            }
            // Remove notification for area
            notificationPlayingStore.removeNotificationById(areaData.id);

            // get area from area data
            const area = areas?.find((area) => area.areaData.id === areaData.id);

            for (const property of areaData.properties) {
                this.removePropertyFilter(property, area, areaData);
            }

            this.scene.landingAreas = this.scene.landingAreas.filter((landingArea) => landingArea.id !== areaData.id);
        }
    }

    // A map of abortControllers indexed by area property ID that will be triggered when the area if left.
    private abortControllers: Map<string, AbortController> = new Map();

    private addPropertyFilter(property: AreaDataProperty, areaData: AreaData, area?: Area) {
        const abortController = new AbortController();
        this.abortControllers.set(property.id, abortController);
        switch (property.type) {
            case "openWebsite": {
                this.handleOpenWebsitePropertyOnEnter(property);
                break;
            }
            case "playAudio": {
                this.handlePlayAudioPropertyOnEnter(property);
                break;
            }
            case "focusable": {
                this.handleFocusablePropertiesOnEnter(
                    areaData.x,
                    areaData.y,
                    areaData.width,
                    areaData.height,
                    property
                );
                break;
            }
            case "highlight": {
                this.handleHighlightPropertyOnEnter(areaData, property);
                break;
            }
            case "jitsiRoomProperty": {
                this.handleJitsiRoomPropertyOnEnter(property);
                break;
            }
            case "livekitRoomProperty": {
                this.handleLivekitRoomPropertyOnEnter(property, abortController.signal).catch((e) => {
                    console.error(e);
                    Sentry.captureException(e);
                });
                break;
            }
            case "silent": {
                this.handleSilentPropertyOnEnter();
                break;
            }
            case "speakerMegaphone": {
                this.handleSpeakerMegaphonePropertyOnEnter(property, abortController.signal).catch((e) => {
                    console.error(e);
                    Sentry.captureException(e);
                });
                break;
            }
            case "listenerMegaphone": {
                this.handleListenerMegaphonePropertyOnEnter(property, abortController.signal).catch((e) => {
                    console.error(e);
                    Sentry.captureException(e);
                });
                break;
            }
            case "exit": {
                let url = `${property.url}`;
                if (property.areaName && property.areaName !== "") {
                    url = `${property.url}#${property.areaName}`;
                }

                if (this.scene.landingAreas.every((area) => areaData.id !== area.id)) {
                    this.handleExitPropertyOnEnter(url);
                }

                break;
            }
            case "personalAreaPropertyData": {
                this.handlePersonalAreaPropertyOnEnter(property, areaData, area);
                break;
            }
            case "extensionModule": {
                this.handleExtensionModuleAreaPropertyOnEnter(areaData, property.subtype, abortController.signal);
                break;
            }
            case "matrixRoomPropertyData": {
                this.handleMatrixRoomAreaOnEnter(property);
                break;
            }
            case "tooltipPropertyData": {
                this.handleTooltipPropertyOnEnter(property);
                break;
            }
            case "openFile": {
                this.handleOpenFileOnEnter(property, abortController.signal).catch((error) =>
                    console.error("Error opening File:", error)
                );
                break;
            }

            default: {
                break;
            }
        }
    }

    private updatePropertyFilter(oldProperty: AreaDataProperty, newProperty: AreaDataProperty, area: AreaData) {
        if (oldProperty.type !== newProperty.type) {
            throw new Error("Cannot update a property with a different type");
        }

        const oldAbortController = this.abortControllers.get(oldProperty.id);
        if (oldAbortController) {
            oldAbortController.abort();
            this.abortControllers.delete(oldProperty.id);
        }
        const newAbortController = new AbortController();
        this.abortControllers.set(newProperty.id, newAbortController);

        switch (oldProperty.type) {
            case "openWebsite": {
                newProperty = newProperty as typeof oldProperty;
                this.handleOpenWebsitePropertiesOnLeave(oldProperty);
                this.handleOpenWebsitePropertyOnEnter(newProperty);
                break;
            }
            case "playAudio": {
                newProperty = newProperty as typeof oldProperty;
                this.handlePlayAudioPropertyOnUpdate(newProperty);
                break;
            }
            case "focusable": {
                newProperty = newProperty as typeof oldProperty;
                this.handleFocusablePropertiesOnEnter(area.x, area.y, area.width, area.height, newProperty);
                break;
            }
            case "highlight": {
                this.handleHighlightPropertyOnEnter(area, newProperty as HighlightPropertyData);
                break;
            }
            case "jitsiRoomProperty": {
                newProperty = newProperty as typeof oldProperty;
                this.handleJitsiRoomPropertyOnLeave(oldProperty);
                this.handleJitsiRoomPropertyOnEnter(newProperty);
                break;
            }
            case "livekitRoomProperty": {
                this.handleLivekitRoomPropertyOnLeave(oldProperty)
                    .then(() => {
                        newProperty = newProperty as typeof oldProperty;
                        return this.handleLivekitRoomPropertyOnEnter(newProperty, newAbortController.signal);
                    })
                    .catch((e) => {
                        console.error(e);
                        Sentry.captureException(e);
                    });
                break;
            }
            case "speakerMegaphone": {
                newProperty = newProperty as typeof oldProperty;
                this.handleSpeakerMegaphonePropertyOnLeave(oldProperty).catch((e) => {
                    console.error("Error while leaving space");
                    Sentry.captureException(new Error("Error while leaving space"));
                });
                this.handleSpeakerMegaphonePropertyOnEnter(newProperty, newAbortController.signal).catch((e) => {
                    console.error(e);
                    Sentry.captureException(e);
                });
                break;
            }
            case "listenerMegaphone": {
                newProperty = newProperty as typeof oldProperty;
                this.handleListenerMegaphonePropertyOnLeave(oldProperty).catch((e) => {
                    console.error(e);
                    Sentry.captureException(e);
                });
                this.handleListenerMegaphonePropertyOnEnter(newProperty, newAbortController.signal).catch((e) => {
                    console.error(e);
                    Sentry.captureException(e);
                });

                this.recalculateHighlightProperty(area);

                break;
            }
            case "exit": {
                newProperty = newProperty as typeof oldProperty;
                let url = `${newProperty.url}`;
                if (newProperty.areaName && newProperty.areaName !== "") {
                    url = `${newProperty.url}#${newProperty.areaName}`;
                }
                this.handleExitPropertyOnEnter(url);
                break;
            }
            case "personalAreaPropertyData": {
                newProperty = newProperty as typeof oldProperty;
                this.handlePersonalAreaPropertyOnLeave();
                this.handlePersonalAreaPropertyOnEnter(newProperty, area);
                break;
            }
            case "matrixRoomPropertyData": {
                newProperty = newProperty as typeof oldProperty;
                this.handleMatrixRoomAreaOnLeave(oldProperty);
                this.handleMatrixRoomAreaOnEnter(newProperty);
                break;
            }
            case "tooltipPropertyData": {
                newProperty = newProperty as typeof oldProperty;
                this.handleTooltipPropertyOnLeave(oldProperty);
                this.handleTooltipPropertyOnEnter(newProperty);
                break;
            }
            case "openFile": {
                newProperty = newProperty as typeof oldProperty;
                this.handleOpenFileOnLeave(oldProperty);
                this.handleOpenFileOnEnter(newProperty, newAbortController.signal).catch((error) =>
                    console.error("Error opening file:", error)
                );
                break;
            }
            case "silent":
            default: {
                break;
            }
        }
    }

    private removePropertyFilter(property: AreaDataProperty, area?: Area, areaData?: AreaData) {
        const abortController = this.abortControllers.get(property.id);
        if (abortController) {
            abortController.abort();
            this.abortControllers.delete(property.id);
        }

        switch (property.type) {
            case "openWebsite": {
                this.handleOpenWebsitePropertiesOnLeave(property);
                break;
            }
            case "playAudio": {
                this.handlePlayAudioPropertyOnLeave();
                break;
            }
            case "focusable": {
                this.handleFocusablePropertiesOnLeave(property);
                break;
            }
            case "highlight": {
                this.handleHighlightPropertiesOnLeave(property);
                break;
            }
            case "jitsiRoomProperty": {
                this.handleJitsiRoomPropertyOnLeave(property);
                break;
            }
            case "livekitRoomProperty": {
                this.handleLivekitRoomPropertyOnLeave(property).catch((e) => {
                    console.error(e);
                    Sentry.captureException(e);
                });
                break;
            }
            case "silent": {
                this.handleSilentPropertyOnLeave();
                break;
            }
            case "speakerMegaphone": {
                this.handleSpeakerMegaphonePropertyOnLeave(property).catch((e) => {
                    console.error("Error while leaving space");
                    Sentry.captureException(new Error("Error while leaving space"));
                });
                break;
            }
            case "listenerMegaphone": {
                this.handleListenerMegaphonePropertyOnLeave(property).catch((e) => {
                    console.error(e);
                    Sentry.captureException(e);
                });
                break;
            }
            case "personalAreaPropertyData": {
                this.handlePersonalAreaPropertyOnLeave(area);
                break;
            }
            case "extensionModule": {
                this.handleExtensionModuleAreaPropertyOnLeave(property.subtype, areaData);
                break;
            }
            case "matrixRoomPropertyData": {
                this.handleMatrixRoomAreaOnLeave(property);
                break;
            }
            case "tooltipPropertyData": {
                this.handleTooltipPropertyOnLeave(property);
                break;
            }
            case "openFile": {
                this.handleOpenFileOnLeave(property);
                break;
            }
            default: {
                break;
            }
        }
    }

    private recalculateHighlightProperty(area: AreaData): void {
        const highlightProperty = area.properties?.find((property) => property.type === "highlight");
        if (highlightProperty) {
            this.handleHighlightPropertyOnEnter(area, highlightProperty);
        }
    }

    private handlePlayAudioPropertyOnEnter(property: PlayAudioPropertyData): void {
        // playAudioLoop is supposedly deprecated. Should we ignore it?
        audioManagerFileStore.playAudio(property.audioLink, this.scene.getMapUrl(), property.volume);
        audioManagerVisibilityStore.set("visible");
    }

    private handleOpenWebsitePropertyOnEnter(property: OpenWebsitePropertyData): void {
        if (!property.link) {
            return;
        }

        const actionId = "openWebsite-" + uuidv4();

        if (property.newTab) {
            const forceTrigger = localUserStore.getForceCowebsiteTrigger();
            if (forceTrigger || property.trigger === ON_ACTION_TRIGGER_BUTTON) {
                this.coWebsitesActionTriggers.set(property.id, actionId);
                let message = property.triggerMessage;
                if (message === undefined) {
                    message = isMediaBreakpointUp("md") ? get(LL).trigger.mobile.newTab() : get(LL).trigger.newTab();
                }

                popupStore.addPopup(
                    PopUpTab,
                    {
                        message: message,
                        click: () => {
                            popupStore.removePopup(actionId);
                            scriptUtils.openTab(property.link as string);
                        },
                        userInputManager: this.scene.userInputManager,
                    },
                    actionId
                );

                // Create callback and play text message
                // NEW CODE BEFORE REDESIGN. TODO: choose if we keep it
                /*const callback = () => {
                    scriptUtils.openTab(property.link as string), this.scene.CurrentPlayer.destroyText(actionId);
                    this.scene.userInputManager.removeSpaceEventListener(callback);
                    this.actionTriggerCallback.delete(actionId);
                };
                this.scene.CurrentPlayer.playText(actionId, `${message}`, -1, callback);
                this.scene.userInputManager?.addSpaceEventListener(callback);
                this.actionTriggerCallback.set(actionId, callback);*/

                /**
                 * @DEPRECATED - This is the old way to show trigger message
                 layoutManagerActionStore.addAction({
                 uuid: actionId,
                 type: "message",
                 message: message,
                 click: () => {
                 popupStore.removePopup(actionId);
                 scriptUtils.openTab(property.link as string);
                 },
                 userInputManager: this.scene.userInputManager,
                 });
                 */
            } else {
                scriptUtils.openTab(property.link);
            }
            return;
        }

        if (this.openedCoWebsites.has(property.id)) {
            return;
        }

        const coWebsiteOpen: OpenCoWebsite = {
            actionId: actionId,
        };

        this.openedCoWebsites.set(property.id, coWebsiteOpen);

        if (localUserStore.getForceCowebsiteTrigger() || property.trigger === ON_ACTION_TRIGGER_BUTTON) {
            let message = property.triggerMessage;
            if (!message) {
                message = isMediaBreakpointUp("md") ? get(LL).trigger.mobile.cowebsite() : get(LL).trigger.cowebsite();
            }

            this.coWebsitesActionTriggers.set(property.id, actionId);

            popupStore.addPopup(
                PopupCowebsite,
                {
                    message: message,
                    click: () => {
                        this.openCoWebsiteFunction(property, coWebsiteOpen, actionId);
                    },
                    userInputManager: this.scene.userInputManager,
                },
                actionId
            );

            // Create callback and play text message
            // TODO: This is the new popups before the new design. Choose if we keep it or not.
            /*const callback = () => {
                this.openCoWebsiteFunction(property, coWebsiteOpen, actionId);
                this.scene.CurrentPlayer.destroyText(actionId);
                this.scene.userInputManager.removeSpaceEventListener(callback);
                this.actionTriggerCallback.delete(actionId);
            };
            this.scene.CurrentPlayer.playText(actionId, `${message}`, -1, callback);
            this.scene.userInputManager?.addSpaceEventListener(callback);
            this.actionTriggerCallback.set(actionId, callback);*/

            /**
             * @DEPRECATED - This is the old way to show trigger message
             layoutManagerActionStore.addAction({
             uuid: actionId,
             type: "message",
             message: message,
             click: () => {
             this.openCoWebsiteFunction(property, coWebsiteOpen, actionId);
             },
             userInputManager: this.scene.userInputManager,
             },
             actionId
             );*/
        } else if (property.trigger === ON_ICON_TRIGGER_BUTTON) {
            let url = property.link ?? "";
            try {
                url = scriptUtils.getWebsiteUrl(property.link ?? "");
            } catch (e) {
                console.error("Error on getWebsiteUrl: ", e);
            }
            const coWebsite = new SimpleCoWebsite(
                new URL(url, this.scene.mapUrlFile),
                property.allowAPI,
                property.policy,
                property.width,
                property.closable,
                property.hideUrl
            );

            coWebsiteOpen.coWebsite = coWebsite;

            coWebsites.add(coWebsite);

            //user in zone to open cowesite with only icon
            inOpenWebsite.set(true);
        }
        if (property.trigger == undefined || property.trigger === ON_ACTION_TRIGGER_ENTER) {
            this.openCoWebsiteFunction(property, coWebsiteOpen, actionId);
        }
    }

    private handleFocusablePropertiesOnEnter(
        x: number,
        y: number,
        width: number,
        height: number,
        property: FocusablePropertyData
    ): void {
        const zoomMargin = property.zoom_margin ? Math.max(0, property.zoom_margin) : undefined;
        this.scene.getCameraManager().enterFocusMode(
            {
                x: x + width * 0.5,
                y: y + height * 0.5,
                width,
                height,
            },
            zoomMargin
        );
    }

    private mergeZones(zones: AreaData[]) {
        if (!zones || zones.length === 0) return null;

        let left = Number.POSITIVE_INFINITY;
        let top = Number.POSITIVE_INFINITY;
        let right = Number.NEGATIVE_INFINITY;
        let bottom = Number.NEGATIVE_INFINITY;

        for (const z of zones) {
            // assuming origin 0,0 !!
            left = Math.min(left, z.x);
            top = Math.min(top, z.y);
            right = Math.max(right, z.x + z.width);
            bottom = Math.max(bottom, z.y + z.height);
        }

        return new Phaser.Geom.Rectangle(left, top, right - left, bottom - top);
    }

    private handleHighlightPropertyOnEnter(areaData: AreaData, property: HighlightPropertyData): void {
        if (!this.scene.focusFx) {
            // Maybe not supported (Canvas renderer)
            return;
        }
        this.scene.focusFx.attachToArea(areaData);
        this.scene.focusFx.setFeather(property.gradientWidth);
        this.scene.focusFx.setColor(Phaser.Display.Color.HexStringToColor(property.color));
        this.scene.focusFx.setTargetDarkness(property.opacity);
        this.scene.focusFx.setTransitionDuration(property.duration);
        this.scene.focusFx.show();

        // Rules, if there is a listener zone property attached with another Speaker zone, We could imagine highlight two zone, with the speakers and attendees
        // Check if there is "listenerMegaphone"
        const speakerZone = areaData.properties.find(
            (property) => property.type === "listenerMegaphone" || property.type === "speakerMegaphone"
        );
        if (speakerZone == undefined) return;

        // Check if there is "speakerZone" or "listenerMegaphone"
        const speakerZoneAreas: AreaData[] = [];
        if (speakerZone.type === "listenerMegaphone") {
            // If "listenerMegaphone", get the speaker zone attached
            const speakerZoneArea = gameManager
                .getCurrentGameScene()
                .getGameMap()
                .getGameMapAreas()
                ?.getAreas()
                .get(speakerZone.speakerZoneName);
            if (speakerZoneArea != undefined) speakerZoneAreas.push(speakerZoneArea);
        }
        if (speakerZone.type === "speakerMegaphone") {
            // If "speakerZone", get all listners zone attached
            gameManager
                .getCurrentGameScene()
                .getGameMap()
                .getGameMapAreas()
                ?.getAreas()
                .forEach((area) => {
                    if (
                        area.properties.find(
                            (c) => c.type === "listenerMegaphone" && c.speakerZoneName == areaData.id
                        ) == undefined
                    )
                        return;
                    speakerZoneAreas.push(area);
                });
        }

        if (speakerZoneAreas.length == 0) return;

        // Merge all zone and create new one will be highlighted
        const unionRect = this.mergeZones([...speakerZoneAreas, areaData]);
        if (unionRect == undefined) return;

        this.scene.focusFx.attachToArea(unionRect);
        this.scene.focusFx.setFeather(property.gradientWidth);
        this.scene.focusFx.setColor(Phaser.Display.Color.HexStringToColor(property.color));
        this.scene.focusFx.setTargetDarkness(property.opacity);
        this.scene.focusFx.setTransitionDuration(property.duration);
        this.scene.focusFx.show();
    }

    private handleJitsiRoomPropertyOnEnter(property: JitsiRoomPropertyData): void {
        const openJitsiRoomFunction = async () => {
            const roomName = Jitsi.slugifyJitsiRoomName(property.roomName, this.scene.roomUrl, property.noPrefix);
            let jitsiUrl = property.jitsiUrl;

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

            jitsiUrl = jitsiUrl || JITSI_URL;
            if (jitsiUrl === undefined) {
                throw new Error("Missing JITSI_URL environment variable or jitsiUrl parameter in the map.");
            }

            if (!jitsiUrl.startsWith("http://") && !jitsiUrl.startsWith("https://")) {
                jitsiUrl = `https://${jitsiUrl}`;
            }

            let parsedUrl: URL;
            try {
                parsedUrl = new URL(jitsiUrl);
            } catch (error) {
                console.error("Invalid Jitsi URL:", jitsiUrl, error);
                throw new Error(`Invalid Jitsi URL: ${jitsiUrl}`, { cause: error });
            }

            inJitsiStore.set(true);

            const coWebsite = new JitsiCoWebsite(
                parsedUrl,
                property.width,
                property.closable,
                roomName,
                gameManager.getPlayerName() ?? "unknown",
                jwt,
                property.jitsiRoomConfig,
                undefined,
                property.jitsiRoomAdminTag ?? null
            );

            coWebsites.add(coWebsite);

            analyticsClient.enteredJitsi(roomName, this.scene.roomUrl);

            popupStore.removePopup("jitsi");
            // TODO: this is the code to remove the new design popup before the "new design"
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

        const forceTrigger = localUserStore.getForceCowebsiteTrigger();
        if (forceTrigger || property.trigger === ON_ACTION_TRIGGER_BUTTON) {
            let message = property.triggerMessage;
            if (message === undefined) {
                message = isMediaBreakpointUp("md") ? get(LL).trigger.mobile.jitsiRoom() : get(LL).trigger.jitsiRoom();
            }

            popupStore.addPopup(
                JitsiPopup,
                {
                    message: message,
                    click: () => {
                        openJitsiRoomFunction().catch((e) => console.error(e));
                    },
                    userInputManager: this.scene.userInputManager,
                },
                "jitsi"
            );
            //TODO: bode below is old "new design" popups before the new design. Choose i we keep it.
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
             callback: () => {
             openJitsiRoomFunction().catch((e) => console.error(e));
             },
             userInputManager: this.scene.userInputManager,
             },
             "jitsi"
             );*/
        } else {
            openJitsiRoomFunction().catch((e) => console.error(e));
        }
    }

    private async handleLivekitRoomPropertyOnEnter(
        property: LivekitRoomPropertyData,
        abortSignal: AbortSignal
    ): Promise<void> {
        inLivekitStore.set(true);

        const roomID = property.roomName.trim().length === 0 ? property.id : property.roomName;

        const roomName = Jitsi.slugifyJitsiRoomName(roomID, this.scene.roomUrl).trim();

        const livekitRoomConfig = property.livekitRoomConfig ?? {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
        };

        if (livekitRoomConfig.startWithAudioMuted && get(requestedMicrophoneState)) {
            this._isMicrophoneActiveBeforeLivekitRoom = true;
            requestedMicrophoneState.disableMicrophone();
            let numberOfCalls = 0;
            this._requestedMicrophoneStateSubscription = requestedMicrophoneState.subscribe(() => {
                numberOfCalls++;
                if (numberOfCalls <= 1) return;
                // we change the values so that if the microphone or camera state changes, we retain those values when leaving the area
                this._isMicrophoneActiveBeforeLivekitRoom = false;
                this._isVideoActiveBeforeLivekitRoom = false;
                this._requestedMicrophoneStateSubscription?.();
            });
        }

        if (livekitRoomConfig.startWithVideoMuted && get(requestedCameraState)) {
            this._isVideoActiveBeforeLivekitRoom = true;
            requestedCameraState.disableWebcam();
            let numberOfCalls = 0;
            this._requestedCameraStateSubscription = requestedCameraState.subscribe(() => {
                numberOfCalls++;
                if (numberOfCalls <= 1) return;
                // we change the values so that if the microphone or camera state changes, we retain those values when leaving the area
                this._isVideoActiveBeforeLivekitRoom = false;
                this._isMicrophoneActiveBeforeLivekitRoom = false;
                this._requestedCameraStateSubscription?.();
            });
        }

        //TODO : I18N the displayName
        if (!property.livekitRoomConfig?.disableChat) {
            const proximityRoom = this.scene.proximityChatRoom;
            proximityRoom.setDisplayName(get(LL).mapEditor.properties.livekitRoomProperty.label());
            await proximityRoom.joinSpace(
                roomName,
                ["cameraState", "microphoneState", "screenShareState"],
                true,
                FilterType.ALL_USERS
            );
        } else {
            const spaceRegistry = this.scene.spaceRegistry;
            await spaceRegistry.joinSpace(
                roomName,
                FilterType.ALL_USERS,
                ["cameraState", "microphoneState", "screenShareState"],
                abortSignal
            );
        }

        analyticsClient.enteredMeetingRoom(roomName, this.scene.roomUrl);
    }

    private handleMatrixRoomAreaOnEnter(property: MatrixRoomPropertyData) {
        const isConnected = get(userIsConnected);
        if (this.scene.connection && property.serverData?.matrixRoomId && isConnected) {
            this.scene.connection
                .queryEnterChatRoomArea(property.serverData.matrixRoomId)
                .then(() => {
                    if (!property.serverData?.matrixRoomId) {
                        throw new Error("Failed to join room : roomId is undefined");
                    }
                    return gameManager.chatConnection.joinRoom(property.serverData.matrixRoomId);
                })
                .then((room: ChatRoom | undefined) => {
                    if (!room) return;
                    selectedRoomStore.set(room);
                    navChat.switchToChat();
                    chatZoneLiveStore.set(true);
                    if (property.shouldOpenAutomatically) chatVisibilityStore.set(true);
                })
                .catch((error) => {
                    console.error("Failed to confirm emojis validation", error);
                });
            return;
        }

        if (!isConnected && property.shouldOpenAutomatically) {
            chatVisibilityStore.set(true);
        }
    }

    private handlePersonalAreaPropertyOnEnter(
        property: PersonalAreaPropertyData,
        areaData: AreaData,
        area?: Area
    ): void {
        if (property.ownerId !== null) {
            canRequestVisitCardsStore.set(true);
            this.displayPersonalAreaOwnerVisitCard(property.ownerId, areaData, area);
        } else if (property.accessClaimMode === PersonalAreaAccessClaimMode.enum.dynamic) {
            this.displayPersonalAreaClaimDialogBox(property, areaData, area);
        }
    }

    private displayPersonalAreaOwnerVisitCard(ownerId: string, areaData: AreaData, area?: Area) {
        const connectedUserUUID = localUserStore.getLocalUser()?.uuid;
        if (connectedUserUUID != ownerId) {
            const connection = this.scene.connection;
            if (connection && this.isPersonalAreaOwnerAway(ownerId, areaData)) {
                if (ADMIN_URL) {
                    connection
                        .queryMember(ownerId)
                        .then((member: Member) => {
                            if (get(canRequestVisitCardsStore) === false) return;
                            if (member?.visitCardUrl) {
                                requestVisitCardsStore.set(member.visitCardUrl);
                            }
                            if (member?.chatID) {
                                selectedChatIDRemotePlayerStore.set(member?.chatID);
                            }
                        })
                        .catch((error) => console.error(error));
                }

                area?.highLightArea(true);
            }
        }
    }

    private isPersonalAreaOwnerAway(areaOwnerId: string, areaData: AreaData) {
        const playerMap = this.scene.getRemotePlayersRepository().getPlayers();
        let ownerOnMap: MessageUserJoined | undefined = undefined;
        for (const player of playerMap.values()) {
            if (player.userUuid === areaOwnerId) {
                ownerOnMap = player;
            }
        }
        if (ownerOnMap === undefined) {
            return true;
        }
        const { position: userPosition } = ownerOnMap;

        const isOwnerInsidePersonalArea = this.scene.getGameMapFrontWrapper().isInsideAreaByCoordinates(
            {
                x: areaData.x,
                y: areaData.y,
                width: areaData.width,
                height: areaData.height,
            },
            { x: userPosition.x, y: userPosition.y }
        );

        return !isOwnerInsidePersonalArea;
    }

    private displayPersonalAreaClaimDialogBox(property: PersonalAreaPropertyData, areaData: AreaData, area?: Area) {
        const userHasAllowedTagToClaimTheArea =
            localUserStore.isLogged() &&
            (property.allowedTags.length === 0 ||
                property.allowedTags.some((tag) => this.scene.connection?.hasTag(tag)));
        if (userHasAllowedTagToClaimTheArea) {
            area?.highLightArea(true);
            mapEditorAskToClaimPersonalAreaStore.set(areaData);
        }
    }

    private handleSilentPropertyOnEnter(): void {
        silentStore.setAreaSilent(true);
    }

    private handleOpenWebsitePropertiesOnLeave(property: OpenWebsitePropertyData): void {
        const openWebsiteProperty: string | null = property.link;

        if (!openWebsiteProperty) {
            return;
        }

        const coWebsiteOpen = this.openedCoWebsites.get(property.id);

        if (coWebsiteOpen) {
            const coWebsite = coWebsiteOpen.coWebsite;

            if (coWebsite) {
                coWebsites.remove(coWebsite);
            }
        }

        this.openedCoWebsites.delete(property.id);

        inOpenWebsite.set(false);

        if (property.trigger == undefined || property.trigger === ON_ACTION_TRIGGER_ENTER) {
            return;
        }

        const actionStore = get(popupStore);
        const actionTriggerUuid = this.coWebsitesActionTriggers.get(property.id);
        if (!actionTriggerUuid) {
            return;
        }

        const action =
            actionStore && actionStore.length > 0
                ? actionStore.find((action) => action.uuid === actionTriggerUuid)
                : undefined;

        if (action) {
            popupStore.removePopup(actionTriggerUuid);
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
         */

        this.coWebsitesActionTriggers.delete(property.id);
    }

    private handleFocusablePropertiesOnLeave(property: FocusablePropertyData): void {
        if (!property) {
            return;
        }
        this.scene.getCameraManager().leaveFocusMode(this.scene.CurrentPlayer, 1000);
    }

    private handleHighlightPropertiesOnLeave(property: HighlightPropertyData): void {
        if (!property) {
            return;
        }
        this.scene.focusFx?.hide();
    }

    private handleSilentPropertyOnLeave(): void {
        silentStore.setAreaSilent(false);
    }

    private handlePlayAudioPropertyOnLeave(): void {
        if (get(audioManagerFileStore) != "") audioManagerVolumeStore.stopSound(true);
        if (get(audioManagerFileStore) != "") audioManagerFileStore.unloadAudio();
        audioManagerVisibilityStore.set("hidden");
    }

    private handlePlayAudioPropertyOnUpdate(newProperty: PlayAudioPropertyData): void {
        audioManagerFileStore.unloadAudio();
        audioManagerFileStore.playAudio(newProperty.audioLink, this.scene.getMapUrl(), newProperty.volume);
    }

    private handleJitsiRoomPropertyOnLeave(property: JitsiRoomPropertyData): void {
        popupStore.removePopup("jitsi");
        // TODO: this is the code of the new old popups replaced by the new design. TODO: choose if we keep those.
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
    }

    private handlePersonalAreaPropertyOnLeave(area?: Area): void {
        // Reset this store to indicate that the user is no longer in the personal area and cannot request or display their business card.
        canRequestVisitCardsStore.set(false);

        mapEditorAskToClaimPersonalAreaStore.set(undefined);
        if (get(requestVisitCardsStore)) {
            requestVisitCardsStore.set(null);
        }
        area?.unHighLightArea();
    }

    private async handleLivekitRoomPropertyOnLeave(property: LivekitRoomPropertyData): Promise<void> {
        const proximityRoom = this.scene.proximityChatRoom;
        const roomID = property.roomName.trim().length === 0 ? property.id : property.roomName;
        const roomName = Jitsi.slugifyJitsiRoomName(roomID, this.scene.roomUrl, false);

        if (!property.livekitRoomConfig?.disableChat) {
            proximityRoom.setDisplayName(get(LL).chat.proximity());
            await proximityRoom.leaveSpace(roomName, true);
        } else {
            const spaceRegistry = this.scene.spaceRegistry;
            const space = spaceRegistry.get(roomName);
            if (space) {
                await spaceRegistry.leaveSpace(space);
            }
        }

        this._requestedMicrophoneStateSubscription?.();
        this._requestedCameraStateSubscription?.();

        if (this._isMicrophoneActiveBeforeLivekitRoom) {
            requestedMicrophoneState.enableMicrophone();
        }
        if (this._isVideoActiveBeforeLivekitRoom) {
            requestedCameraState.enableWebcam();
        }

        this._isVideoActiveBeforeLivekitRoom = false;
        this._isMicrophoneActiveBeforeLivekitRoom = false;
        inLivekitStore.set(false);
    }

    private handleExtensionModuleAreaPropertyOnLeave(subtype: string, area?: AreaData): void {
        const extensionModule = get(extensionModuleStore);
        for (const module of extensionModule) {
            if (!module.areaMapEditor) continue;

            const areaMapEditor = module.areaMapEditor();
            if (
                areaMapEditor == undefined ||
                areaMapEditor[subtype] == undefined ||
                areaMapEditor[subtype].handleAreaPropertyOnLeave == undefined
            )
                continue;

            areaMapEditor[subtype].handleAreaPropertyOnLeave(area);
            inJitsiStore.set(false);
        }
    }

    private handleExtensionModuleAreaPropertyOnEnter(area: AreaData, subtype: string, signal: AbortSignal): void {
        const extensionModule = get(extensionModuleStore);
        for (const module of extensionModule) {
            if (!module.areaMapEditor) continue;

            const areaMapEditor = module.areaMapEditor();
            if (!areaMapEditor || !areaMapEditor[subtype] || !areaMapEditor[subtype].handleAreaPropertyOnEnter) {
                continue;
            }
            areaMapEditor[subtype].handleAreaPropertyOnEnter(area, signal);
            inJitsiStore.set(true);
        }
    }

    private handleMatrixRoomAreaOnLeave(property: MatrixRoomPropertyData) {
        if (!get(userIsConnected)) {
            chatVisibilityStore.set(false);
            return;
        }

        const actualRoom = get(selectedRoomStore);
        const chatVisibility = get(chatVisibilityStore);

        if (actualRoom?.id === property.serverData?.matrixRoomId && chatVisibility) {
            chatVisibilityStore.set(false);
            selectedRoomStore.set(undefined);
        }
        chatZoneLiveStore.set(false);

        get(gameManager.chatConnection.rooms)
            .find((room) => room.id === property.serverData?.matrixRoomId)
            ?.leaveRoom()
            .catch((error) => console.error(error));

        if (this.scene.connection && property.serverData?.matrixRoomId) {
            this.scene.connection.emitLeaveChatRoomArea(property.serverData.matrixRoomId);
        }
    }

    private openCoWebsiteFunction(
        property: OpenWebsitePropertyData | OpenFilePropertyData,
        coWebsiteOpen: OpenCoWebsite,
        actionId: string
    ): void {
        // Check URl and get the correct one
        let urlStr = property.link ?? "";
        try {
            urlStr = scriptUtils.getWebsiteUrl(property.link ?? "");
        } catch (e) {
            console.error("Error on getWebsiteUrl: ", e);
        }

        let allowAPI = false;
        if (property.type === "openWebsite") {
            allowAPI = property.allowAPI ?? false;
        }

        // Create the co-website to be opened
        const url = new URL(urlStr, this.scene.mapUrlFile);
        const coWebsite = new SimpleCoWebsite(
            url,
            allowAPI ?? false,
            property.policy,
            property.width,
            property.closable,
            property.hideUrl
        );

        coWebsiteOpen.coWebsite = coWebsite;

        coWebsites.add(coWebsite);

        this.loadCoWebsiteFunction(coWebsite, actionId);

        //user in a zone with cowebsite opened or pressed SPACE to enter is a zone
        inOpenWebsite.set(true);

        // analytics event for open website
        analyticsClient.openedWebsite(url);
    }

    private loadCoWebsiteFunction(coWebsite: CoWebsite, actionId: string): void {
        // TODO: this is the code of the old new popups
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
        // try {
        //     coWebsiteManager.loadCoWebsite(coWebsite)
        // }
        // catch (e) {
        //     console.error("Error during loading a co-website: " + coWebsite.getUrl(), e);
        // };
        popupStore.removePopup(actionId);
    }

    private async handleSpeakerMegaphonePropertyOnEnter(
        property: SpeakerMegaphonePropertyData,
        abortSignal: AbortSignal
    ): Promise<void> {
        if (property.name !== undefined && property.id !== undefined) {
            const uniqRoomName = Jitsi.slugifyJitsiRoomName(property.name, this.scene.roomUrl).trim();

            let space: SpaceInterface | undefined;
            const spaceRegistry = this.scene.spaceRegistry;

            if (property.chatEnabled) {
                const proximityRoom = this.scene.proximityChatRoom;
                proximityRoom.setDisplayName(property.name);
                await proximityRoom.joinSpace(
                    uniqRoomName,
                    ["cameraState", "microphoneState", "screenShareState"],
                    true,
                    FilterType.LIVE_STREAMING_USERS
                );
                space = spaceRegistry.get(uniqRoomName);
            } else {
                space = await spaceRegistry.joinSpace(
                    uniqRoomName,
                    FilterType.LIVE_STREAMING_USERS,
                    ["cameraState", "microphoneState", "screenShareState"],
                    abortSignal
                );
            }

            if (space) {
                space.startStreaming();
            }

            currentLiveStreamingSpaceStore.set(space);
            isSpeakerStore.set(true);
        }
    }

    private async handleSpeakerMegaphonePropertyOnLeave(property: SpeakerMegaphonePropertyData): Promise<void> {
        if (property.name !== undefined && property.id !== undefined) {
            isSpeakerStore.set(false);
            const uniqRoomName = Jitsi.slugifyJitsiRoomName(property.name, this.scene.roomUrl, false);
            currentLiveStreamingSpaceStore.set(undefined);

            const spaceRegistry = this.scene.spaceRegistry;
            let space: SpaceInterface | undefined;
            if (property.chatEnabled) {
                const proximityRoom = this.scene.proximityChatRoom;
                proximityRoom.setDisplayName(get(LL).chat.proximity());
                await proximityRoom.leaveSpace(uniqRoomName, true);
            } else {
                space = spaceRegistry.get(uniqRoomName);
                if (space) {
                    await spaceRegistry.leaveSpace(space);
                }
            }
        }
    }

    private async handleListenerMegaphonePropertyOnEnter(
        property: ListenerMegaphonePropertyData,
        abortSignal: AbortSignal
    ): Promise<void> {
        // TODO: change the user's availability status to prevent them from creating a bubble
        if (property.speakerZoneName !== undefined) {
            const speakerZoneName = getSpeakerMegaphoneAreaName(
                this.scene.getGameMap().getGameMapAreas()?.getAreas(),
                property.speakerZoneName
            );
            if (speakerZoneName) {
                const uniqRoomName = Jitsi.slugifyJitsiRoomName(speakerZoneName.trim(), this.scene.roomUrl).trim();
                const spaceRegistry = this.scene.spaceRegistry;
                let space: SpaceInterface | undefined;
                if (property.chatEnabled) {
                    const proximityRoom = this.scene.proximityChatRoom;
                    proximityRoom.setDisplayName(speakerZoneName);
                    await proximityRoom.joinSpace(
                        uniqRoomName,
                        ["cameraState", "microphoneState", "screenShareState"],
                        true,
                        FilterType.LIVE_STREAMING_USERS
                    );
                    space = spaceRegistry.get(uniqRoomName);
                } else {
                    space = await spaceRegistry.joinSpace(
                        uniqRoomName,
                        FilterType.LIVE_STREAMING_USERS,
                        ["cameraState", "microphoneState", "screenShareState"],
                        abortSignal
                    );
                }

                currentLiveStreamingSpaceStore.set(space);
                isListenerStore.set(true);
                listenerWaitingMediaStore.set(property.waitingLink);
            }
        }
    }

    private async handleListenerMegaphonePropertyOnLeave(property: ListenerMegaphonePropertyData): Promise<void> {
        if (property.speakerZoneName !== undefined) {
            const speakerZoneName = getSpeakerMegaphoneAreaName(
                this.scene.getGameMap().getGameMapAreas()?.getAreas(),
                property.speakerZoneName
            );
            if (speakerZoneName) {
                const uniqRoomName = Jitsi.slugifyJitsiRoomName(speakerZoneName, this.scene.roomUrl);
                if (property.chatEnabled) {
                    const proximityRoom = this.scene.proximityChatRoom;
                    proximityRoom.setDisplayName(get(LL).chat.proximity());
                    await proximityRoom.leaveSpace(uniqRoomName, true);
                } else {
                    const spaceRegistry = this.scene.spaceRegistry;
                    const space = spaceRegistry.get(uniqRoomName);
                    if (space) {
                        await spaceRegistry.leaveSpace(space);
                    }
                }
                currentLiveStreamingSpaceStore.set(undefined);
                isListenerStore.set(false);
                listenerWaitingMediaStore.set(undefined);
            }
        }
    }

    private handleExitPropertyOnEnter(url: string): void {
        this.scene
            .onMapExit(Room.getRoomPathFromExitUrl(url, window.location.toString()))
            .catch((e) => console.error(e));
    }

    private handleTooltipPropertyOnEnter(property: TooltipPropertyData): void {
        // Calculate the duration. If the value is 0 or -1, the duration is infinite and we set it to -1
        // If the duration is more than 0, we convert second (value used in the map editor) to milliseconds
        const duration = property.duration < 1 ? -1 : property.duration * 1000;

        // Implement the logic to show the info bulle
        this.scene.CurrentPlayer.playText(property.id, property.content, duration);
    }

    private handleTooltipPropertyOnLeave(property: TooltipPropertyData): void {
        // Implement the logic to hide the info bulle
        this.scene.CurrentPlayer.destroyText(property.id);
    }

    private async handleOpenFileOnEnter(
        initialProperty: OpenFilePropertyData,
        abortSignal: AbortSignal
    ): Promise<void> {
        if (!initialProperty.link) {
            return;
        }

        if (!this.scene.connection) {
            console.info("Cannot open file. No connection to Pusher server.");
            return;
        }

        const property = {
            ...initialProperty,
        };

        const answer = await this.scene.connection?.queryMapStorageJwtToken(abortSignal);

        const url = new URL(initialProperty.link);
        url.searchParams.set("token", answer.jwt);

        property.link = url.toString();

        const actionId = "openWebsite-" + uuidv4();

        if (property.newTab) {
            const forceTrigger = localUserStore.getForceCowebsiteTrigger();
            if (forceTrigger || property.trigger === ON_ACTION_TRIGGER_BUTTON) {
                this.coWebsitesActionTriggers.set(property.id, actionId);
                let message = property.triggerMessage;
                if (message === undefined) {
                    message = isMediaBreakpointUp("md") ? get(LL).trigger.mobile.newTab() : get(LL).trigger.newTab();
                }

                popupStore.addPopup(
                    PopUpTab,
                    {
                        message: message,
                        click: () => {
                            popupStore.removePopup(actionId);
                            scriptUtils.openTab(url.toString());
                        },
                        userInputManager: this.scene.userInputManager,
                    },
                    actionId
                );
            } else {
                scriptUtils.openTab(url.toString());
            }
            return;
        }

        if (this.openedCoWebsites.has(property.id)) {
            return;
        }

        const coWebsiteOpen: OpenCoWebsite = {
            actionId: actionId,
        };

        this.openedCoWebsites.set(property.id, coWebsiteOpen);

        if (localUserStore.getForceCowebsiteTrigger() || property.trigger === ON_ACTION_TRIGGER_BUTTON) {
            let message = property.triggerMessage;
            if (!message) {
                message = isMediaBreakpointUp("md") ? get(LL).trigger.mobile.cowebsite() : get(LL).trigger.cowebsite();
            }

            this.coWebsitesActionTriggers.set(property.id, actionId);

            popupStore.addPopup(
                FilePopup,
                {
                    message: message,
                    click: () => {
                        this.openCoWebsiteFunction(property, coWebsiteOpen, actionId);
                    },
                    userInputManager: this.scene.userInputManager,
                },
                actionId
            );
        } else if (property.trigger === ON_ICON_TRIGGER_BUTTON) {
            let cowebsiteUrl = url.toString() ?? "";
            try {
                cowebsiteUrl = scriptUtils.getWebsiteUrl(url.toString() ?? "");
            } catch (e) {
                console.error("Error on getWebsiteUrl: ", e);
            }
            const coWebsite = new SimpleCoWebsite(
                new URL(cowebsiteUrl, this.scene.mapUrlFile),
                false,
                property.policy,
                property.width,
                property.closable,
                property.hideUrl
            );

            coWebsiteOpen.coWebsite = coWebsite;

            coWebsites.add(coWebsite);

            //user in zone to open cowesite with only icon
            inOpenWebsite.set(true);
        }
        if (property.trigger == undefined || property.trigger === ON_ACTION_TRIGGER_ENTER) {
            this.openCoWebsiteFunction(property, coWebsiteOpen, actionId);
        }
    }

    private handleOpenFileOnLeave(property: OpenFilePropertyData): void {
        const openWebsiteProperty: string | null = property.link;

        if (!openWebsiteProperty) {
            return;
        }

        const coWebsiteOpen = this.openedCoWebsites.get(property.id);

        if (coWebsiteOpen) {
            const coWebsite = coWebsiteOpen.coWebsite;

            if (coWebsite) {
                coWebsites.remove(coWebsite);
            }
        }

        this.openedCoWebsites.delete(property.id);

        inOpenWebsite.set(false);

        if (property.trigger == undefined || property.trigger === ON_ACTION_TRIGGER_ENTER) {
            return;
        }

        const actionStore = get(popupStore);
        const actionTriggerUuid = this.coWebsitesActionTriggers.get(property.id);
        if (!actionTriggerUuid) {
            return;
        }

        const action =
            actionStore && actionStore.length > 0
                ? actionStore.find((action) => action.uuid === actionTriggerUuid)
                : undefined;

        if (action) {
            popupStore.removePopup(actionTriggerUuid);
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
         */

        this.coWebsitesActionTriggers.delete(property.id);
    }
}
