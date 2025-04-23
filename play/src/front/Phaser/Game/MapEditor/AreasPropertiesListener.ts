import {
    AreaData,
    AreaDataProperties,
    AreaDataProperty,
    FocusablePropertyData,
    TooltipPropertyData,
    JitsiRoomPropertyData,
    ListenerMegaphonePropertyData,
    MatrixRoomPropertyData,
    OpenPdfPropertyData,
    OpenWebsitePropertyData,
    PersonalAreaAccessClaimMode,
    PersonalAreaPropertyData,
    PlayAudioPropertyData,
    SpeakerMegaphonePropertyData,
} from "@workadventure/map-editor";
import * as Sentry from "@sentry/svelte";
import { getSpeakerMegaphoneAreaName } from "@workadventure/map-editor/src/Utils";
import { Jitsi } from "@workadventure/shared-utils";
import { slugify } from "@workadventure/shared-utils/src/Jitsi/slugify";
import { get } from "svelte/store";
import { Member } from "@workadventure/messages";
import { LL } from "../../../../i18n/i18n-svelte";
import { analyticsClient } from "../../../Administration/AnalyticsClient";
import { iframeListener } from "../../../Api/IframeListener";
import { scriptUtils } from "../../../Api/ScriptUtils";
import { localUserStore } from "../../../Connection/LocalUserStore";
import { Room } from "../../../Connection/Room";
import { JITSI_PRIVATE_MODE, JITSI_URL } from "../../../Enum/EnvironmentVariable";
import { audioManagerFileStore, audioManagerVisibilityStore } from "../../../Stores/AudioManagerStore";
import { chatVisibilityStore, chatZoneLiveStore } from "../../../Stores/ChatStore";
/**
 * @DEPRECATED - This is the old way to show trigger message
 import { layoutManagerActionStore } from "../../../Stores/LayoutManagerStore";
 */
import { inJitsiStore, inOpenWebsite, isSpeakerStore, silentStore } from "../../../Stores/MediaStore";
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
import { OpenCoWebsite } from "../GameMapPropertiesListener";
import { GameScene } from "../GameScene";
import { mapEditorAskToClaimPersonalAreaStore } from "../../../Stores/MapEditorStore";
import {
    canRequestVisitCardsStore,
    requestVisitCardsStore,
    selectedChatIDRemotePlayerStore,
} from "../../../Stores/GameStore";
import { isMediaBreakpointUp } from "../../../Utils/BreakpointsUtils";
import { MessageUserJoined } from "../../../Connection/ConnexionModels";
import { navChat } from "../../../Chat/Stores/ChatStore";
import { Area } from "../../Entity/Area";
import { extensionModuleStore } from "../../../Stores/GameSceneStore";
import { ChatRoom } from "../../../Chat/Connection/ChatConnection";
import { userIsConnected } from "../../../Stores/MenuStore";
import { popupStore } from "../../../Stores/PopupStore";
import PopupCowebsite from "../../../Components/PopUp/PopupCowebsite.svelte";
import JitsiPopup from "../../../Components/PopUp/PopUpJitsi.svelte";
import PopUpTab from "../../../Components/PopUp/PopUpTab.svelte";
import { selectedRoomStore } from "../../../Chat/Stores/SelectRoomStore"; // Replace 'path/to/PopUpTab' with the actual path to the PopUpTab class

export class AreasPropertiesListener {
    private scene: GameScene;

    /**
     * Opened by Areas only, per property
     */
    private openedCoWebsites = new Map<string, OpenCoWebsite>();
    private coWebsitesActionTriggers = new Map<string, string>();

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
            console.log("Leave area: ", areaData);
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

    private addPropertyFilter(property: AreaDataProperty, areaData: AreaData, area?: Area) {
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
            case "jitsiRoomProperty": {
                this.handleJitsiRoomPropertyOnEnter(property);
                break;
            }
            case "silent": {
                this.handleSilentPropertyOnEnter();
                break;
            }
            case "speakerMegaphone": {
                this.handleSpeakerMegaphonePropertyOnEnter(property);
                break;
            }
            case "listenerMegaphone": {
                this.handleListenerMegaphonePropertyOnEnter(property);
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
                this.handleExtensionModuleAreaPropertyOnEnter(areaData, property.subtype);
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
            case "openPdf": {
                this.handleOpenPdfOnEnter(property);
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
            case "jitsiRoomProperty": {
                newProperty = newProperty as typeof oldProperty;
                this.handleJitsiRoomPropertyOnLeave(oldProperty);
                this.handleJitsiRoomPropertyOnEnter(newProperty);
                break;
            }
            case "speakerMegaphone": {
                newProperty = newProperty as typeof oldProperty;
                this.handleSpeakerMegaphonePropertyOnLeave(oldProperty);
                this.handleSpeakerMegaphonePropertyOnEnter(newProperty);
                break;
            }
            case "listenerMegaphone": {
                newProperty = newProperty as typeof oldProperty;
                this.handleListenerMegaphonePropertyOnLeave(oldProperty);
                this.handleListenerMegaphonePropertyOnEnter(newProperty);
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
            case "openPdf": {
                newProperty = newProperty as typeof oldProperty;
                this.handleOpenPdfOnLeave(oldProperty);
                this.handleOpenPdfOnEnter(newProperty);
                break;
            }
            case "silent":
            default: {
                break;
            }
        }
    }

    private removePropertyFilter(property: AreaDataProperty, area?: Area, areaData?: AreaData) {
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
            case "jitsiRoomProperty": {
                this.handleJitsiRoomPropertyOnLeave(property);
                break;
            }
            case "silent": {
                this.handleSilentPropertyOnLeave();
                break;
            }
            case "speakerMegaphone": {
                this.handleSpeakerMegaphonePropertyOnLeave(property);
                break;
            }
            case "listenerMegaphone": {
                this.handleListenerMegaphonePropertyOnLeave(property);
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
            case "openPdf": {
                this.handleOpenPdfOnLeave(property);
                break;
            }
            default: {
                break;
            }
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

        const actionId = "openWebsite-" + (Math.random() + 1).toString(36).substring(7);

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
                property.closable
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

            let domain = jitsiUrl || JITSI_URL;
            if (domain === undefined) {
                throw new Error("Missing JITSI_URL environment variable or jitsiUrl parameter in the map.");
            }

            let domainWithoutProtocol = domain;
            if (domain.substring(0, 7) !== "http://" && domain.substring(0, 8) !== "https://") {
                domainWithoutProtocol = domain;
                domain = `${location.protocol}//${domain}`;
            } else {
                if (domain.startsWith("http://")) {
                    domainWithoutProtocol = domain.substring(7);
                } else {
                    domainWithoutProtocol = domain.substring(8);
                }
            }

            inJitsiStore.set(true);

            const coWebsite = new JitsiCoWebsite(
                new URL(domain),
                property.width,
                property.closable,
                roomName,
                gameManager.getPlayerName() ?? "unknown",
                jwt,
                property.jitsiRoomConfig,
                undefined,
                domainWithoutProtocol,
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
                    Sentry.captureMessage(`Failed to join room area : ${error}`);
                    console.error(error);
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

    private handleSilentPropertyOnLeave(): void {
        silentStore.setAreaSilent(false);
    }

    private handlePlayAudioPropertyOnLeave(): void {
        audioManagerFileStore.unloadAudio();
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

    private handleExtensionModuleAreaPropertyOnLeave(subtype: string, area?: AreaData): void {
        const extensionModule = get(extensionModuleStore);
        for (const module of extensionModule) {
            if (!module.areaMapEditor) continue;

            const areaMapEditor = module.areaMapEditor();
            if (areaMapEditor == undefined) continue;

            areaMapEditor[subtype].handleAreaPropertyOnLeave(area);
            inJitsiStore.set(false);
        }
    }

    private handleExtensionModuleAreaPropertyOnEnter(area: AreaData, subtype: string): void {
        const extensionModule = get(extensionModuleStore);
        for (const module of extensionModule) {
            if (!module.areaMapEditor) continue;

            const areaMapEditor = module.areaMapEditor();
            if (areaMapEditor == undefined) continue;
            areaMapEditor[subtype].handleAreaPropertyOnEnter(area);
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
        property: OpenWebsitePropertyData | OpenPdfPropertyData,
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

        // Create the co-website to be opened
        const url = new URL(urlStr, this.scene.mapUrlFile);
        const coWebsite = new SimpleCoWebsite(
            url,
            property.allowAPI,
            property.policy,
            property.width,
            property.closable
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

    private handleSpeakerMegaphonePropertyOnEnter(property: SpeakerMegaphonePropertyData): void {
        if (property.name !== undefined && property.id !== undefined) {
            const uniqRoomName = Jitsi.slugifyJitsiRoomName(property.name, this.scene.roomUrl);
            const broadcastSpace = this.scene.broadcastService.joinSpace(uniqRoomName, false);
            currentLiveStreamingSpaceStore.set(broadcastSpace.space);
            isSpeakerStore.set(true);
            //requestedMegaphoneStore.set(true);
            if (property.chatEnabled) {
                this.handleJoinMucRoom(uniqRoomName, "live");
            }
        }
    }

    private handleSpeakerMegaphonePropertyOnLeave(property: SpeakerMegaphonePropertyData): void {
        if (property.name !== undefined && property.id !== undefined) {
            isSpeakerStore.set(false);
            const uniqRoomName = Jitsi.slugifyJitsiRoomName(property.name, this.scene.roomUrl);
            currentLiveStreamingSpaceStore.set(undefined);
            this.scene.broadcastService.leaveSpace(uniqRoomName);
            if (property.chatEnabled) {
                this.handleLeaveMucRoom(uniqRoomName);
            }
        }
    }

    private handleListenerMegaphonePropertyOnEnter(property: ListenerMegaphonePropertyData): void {
        if (property.speakerZoneName !== undefined) {
            const speakerZoneName = getSpeakerMegaphoneAreaName(
                this.scene.getGameMap().getGameMapAreas()?.getAreas(),
                property.speakerZoneName
            );
            if (speakerZoneName) {
                const uniqRoomName = Jitsi.slugifyJitsiRoomName(speakerZoneName, this.scene.roomUrl);
                const broadcastSpace = this.scene.broadcastService.joinSpace(uniqRoomName, false);
                currentLiveStreamingSpaceStore.set(broadcastSpace.space);
                if (property.chatEnabled) {
                    this.handleJoinMucRoom(uniqRoomName, "live");
                }
            }
        }
    }

    private handleListenerMegaphonePropertyOnLeave(property: ListenerMegaphonePropertyData): void {
        if (property.speakerZoneName !== undefined) {
            const speakerZoneName = getSpeakerMegaphoneAreaName(
                this.scene.getGameMap().getGameMapAreas()?.getAreas(),
                property.speakerZoneName
            );
            if (speakerZoneName) {
                const uniqRoomName = Jitsi.slugifyJitsiRoomName(speakerZoneName, this.scene.roomUrl);
                currentLiveStreamingSpaceStore.set(undefined);
                this.scene.broadcastService.leaveSpace(uniqRoomName);
                if (property.chatEnabled) {
                    this.handleLeaveMucRoom(uniqRoomName);
                }
            }
        }
    }

    private handleJoinMucRoom(name: string, type: string) {
        iframeListener
            .sendJoinMucEventToChatIframe(`${this.scene.roomUrl}/${slugify(name)}`, name, type, false)
            .catch((error) => console.error(error));
        chatZoneLiveStore.set(true);
    }

    private handleLeaveMucRoom(name: string) {
        iframeListener
            .sendLeaveMucEventToChatIframe(`${this.scene.roomUrl}/${slugify(name)}`)
            .catch((error) => console.error(error));
        chatZoneLiveStore.set(false);
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

    private handleOpenPdfOnEnter(property: OpenPdfPropertyData): void {
        console.log("handleOpenPdfOnEnter");
    }

    private handleOpenPdfOnLeave(property: OpenPdfPropertyData): void {
        console.log("handleOpenPdfOnLeave");
    }
}
