import { get } from "svelte/store";
import {
    AreaData,
    FocusablePropertyData,
    JitsiRoomPropertyData,
    OpenWebsitePropertyData,
} from "@workadventure/map-editor";
import { Jitsi } from "@workadventure/shared-utils";
import { OpenCoWebsite } from "../GameMapPropertiesListener";
import type { CoWebsite } from "../../../WebRtc/CoWebsite/CoWesbite";
import { coWebsiteManager } from "../../../WebRtc/CoWebsiteManager";
import { layoutManagerActionStore } from "../../../Stores/LayoutManagerStore";
import { SimpleCoWebsite } from "../../../WebRtc/CoWebsite/SimpleCoWebsite";
import { analyticsClient } from "../../../Administration/AnalyticsClient";
import { localUserStore } from "../../../Connexion/LocalUserStore";
import { ON_ACTION_TRIGGER_BUTTON, ON_ICON_TRIGGER_BUTTON } from "../../../WebRtc/LayoutManager";
import { LL } from "../../../../i18n/i18n-svelte";
import { GameScene } from "../GameScene";
import { inJitsiStore, inOpenWebsite, silentStore } from "../../../Stores/MediaStore";
import { JitsiCoWebsite } from "../../../WebRtc/CoWebsite/JitsiCoWebsite";
import { JITSI_PRIVATE_MODE, JITSI_URL } from "../../../Enum/EnvironmentVariable";
import { scriptUtils } from "../../../Api/ScriptUtils";

export class AreasPropertiesListener {
    private scene: GameScene;

    /**
     * Opened by Areas only, per property
     */
    private openedCoWebsites = new Map<string, OpenCoWebsite>();
    private coWebsitesActionTriggers = new Map<string, string>();

    constructor(scene: GameScene) {
        this.scene = scene;
    }

    public onEnterAreasHandler(areas: AreaData[]): void {
        for (const area of areas) {
            if (!area.properties) {
                continue;
            }
            for (const property of area.properties) {
                switch (property.type) {
                    case "openWebsite": {
                        this.handleOpenWebsitePropertyOnEnter(property);
                        break;
                    }
                    case "focusable": {
                        this.handleFocusablePropertysOnEnter(area.x, area.y, area.width, area.height, property);
                        break;
                    }
                    case "jitsiRoomProperty": {
                        this.handleJitsiRoomPropertyOnEnter(property);
                        break;
                    }
                    case "silent": {
                        this.handleSilentPropertyOnEnter(property);
                        break;
                    }
                    default: {
                        break;
                    }
                }
            }
        }
    }

    public onLeaveAreasHandler(areas: AreaData[]): void {
        for (const area of areas) {
            if (!area.properties) {
                continue;
            }
            for (const property of area.properties) {
                switch (property.type) {
                    case "openWebsite": {
                        this.handleOpenWebsitePropertiesOnLeave(property);
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
                        this.handleSilentPropertyOnLeave(property);
                        break;
                    }
                    default: {
                        break;
                    }
                }
            }
        }
    }

    private handleOpenWebsitePropertyOnEnter(property: OpenWebsitePropertyData): void {
        const actionId = "openWebsite-" + (Math.random() + 1).toString(36).substring(7);

        if (property.newTab) {
            const forceTrigger = localUserStore.getForceCowebsiteTrigger();
            if (forceTrigger || property.trigger === ON_ACTION_TRIGGER_BUTTON) {
                this.coWebsitesActionTriggers.set(property.id, actionId);
                let message = property.triggerMessage;
                if (message === undefined) {
                    message = get(LL).trigger.newTab();
                }
                layoutManagerActionStore.addAction({
                    uuid: actionId,
                    type: "message",
                    message: message,
                    callback: () => scriptUtils.openTab(property.link),
                    userInputManager: this.scene.userInputManager,
                });
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
                message = get(LL).trigger.cowebsite();
            }

            this.coWebsitesActionTriggers.set(property.id, actionId);

            layoutManagerActionStore.addAction({
                uuid: actionId,
                type: "message",
                message: message,
                callback: () => this.openCoWebsiteFunction(property, coWebsiteOpen, actionId),
                userInputManager: this.scene.userInputManager,
            });
        } else if (property.trigger === ON_ICON_TRIGGER_BUTTON) {
            const coWebsite = new SimpleCoWebsite(
                new URL(property.link ?? "", this.scene.mapUrlFile),
                property.allowAPI,
                property.policy,
                property.width,
                property.closable
            );

            coWebsiteOpen.coWebsite = coWebsite;

            coWebsiteManager.addCoWebsiteToStore(coWebsite, property.position);

            //user in zone to open cowesite with only icon
            inOpenWebsite.set(true);
        }

        if (!property.trigger) {
            this.openCoWebsiteFunction(property, coWebsiteOpen, actionId);
        }
    }

    private handleFocusablePropertysOnEnter(
        x: number,
        y: number,
        width: number,
        height: number,
        property: FocusablePropertyData
    ): void {
        if (x === undefined || y === undefined || !height || !width) {
            return;
        }
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
                    console.log("Cannot connect to Jitsi. No connection to Pusher server.");
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

            const closable = property.closable;

            const coWebsite = new JitsiCoWebsite(new URL(domain), false, undefined, undefined, closable);

            coWebsiteManager.addCoWebsiteToStore(coWebsite, 0);
            this.scene.initialiseJitsi(coWebsite, roomName, jwt, domainWithoutProtocol);

            layoutManagerActionStore.removeAction("jitsi");
        };

        const jitsiTriggerValue = property.trigger;
        const forceTrigger = localUserStore.getForceCowebsiteTrigger();
        if (forceTrigger || jitsiTriggerValue === ON_ACTION_TRIGGER_BUTTON) {
            let message = property.triggerMessage;
            if (message === undefined) {
                message = get(LL).trigger.jitsiRoom();
            }
            layoutManagerActionStore.addAction({
                uuid: "jitsi",
                type: "message",
                message: message,
                callback: () => {
                    openJitsiRoomFunction().catch((e) => console.error(e));
                },
                userInputManager: this.scene.userInputManager,
            });
        } else {
            openJitsiRoomFunction().catch((e) => console.error(e));
        }
    }

    private handleSilentPropertyOnEnter(): void {
        silentStore.setAreaSilent(true);
    }

    private handleOpenWebsitePropertiesOnLeave(property: OpenWebsitePropertyData): void {
        const openWebsiteProperty: string | undefined = property.link;
        const websiteTriggerProperty: string | undefined = property.trigger;

        if (!openWebsiteProperty) {
            return;
        }

        const coWebsiteOpen = this.openedCoWebsites.get(property.id);

        if (coWebsiteOpen) {
            const coWebsite = coWebsiteOpen.coWebsite;

            if (coWebsite) {
                coWebsiteManager.closeCoWebsite(coWebsite);
            }
        }

        this.openedCoWebsites.delete(property.id);

        inOpenWebsite.set(false);

        if (!websiteTriggerProperty) {
            return;
        }

        const actionStore = get(layoutManagerActionStore);
        const actionTriggerUuid = this.coWebsitesActionTriggers.get(property.id);

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

    private handleJitsiRoomPropertyOnLeave(property: JitsiRoomPropertyData): void {
        layoutManagerActionStore.removeAction("jitsi");
        coWebsiteManager.getCoWebsites().forEach((coWebsite) => {
            if (coWebsite instanceof JitsiCoWebsite) {
                coWebsiteManager.closeCoWebsite(coWebsite);
            }
        });
        inJitsiStore.set(false);
    }

    private openCoWebsiteFunction(
        property: OpenWebsitePropertyData,
        coWebsiteOpen: OpenCoWebsite,
        actionId: string
    ): void {
        const coWebsite = new SimpleCoWebsite(
            new URL(property.link ?? "", this.scene.mapUrlFile),
            property.allowAPI,
            property.policy,
            property.width,
            property.closable
        );

        coWebsiteOpen.coWebsite = coWebsite;

        coWebsiteManager.addCoWebsiteToStore(coWebsite, property.position);

        this.loadCoWebsiteFunction(coWebsite, actionId);

        //user in a zone with cowebsite opened or pressed SPACE to enter is a zone
        inOpenWebsite.set(true);

        // analytics event for open website
        analyticsClient.openedWebsite();
    }

    private loadCoWebsiteFunction(coWebsite: CoWebsite, actionId: string): void {
        coWebsiteManager.loadCoWebsite(coWebsite).catch(() => {
            console.error("Error during loading a co-website: " + coWebsite.getUrl());
        });

        layoutManagerActionStore.removeAction(actionId);
    }
}
