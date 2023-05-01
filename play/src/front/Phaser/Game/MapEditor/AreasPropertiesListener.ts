import { get } from "svelte/store";
import { AreaData, FocusablePropertyData, OpenWebsitePropertyData } from "@workadventure/map-editor";
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
import { inOpenWebsite } from "../../../Stores/MediaStore";

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
                        this.handleOpenWebsitePropertiesOnEnter(property);
                        break;
                    }
                    case "focusable": {
                        this.handleFocusablePropertiesOnEnter(area.x, area.y, area.width, area.height, property);
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
                    default: {
                        break;
                    }
                }
            }
        }
    }

    private handleOpenWebsitePropertiesOnEnter(property: OpenWebsitePropertyData): void {
        const openWebsiteProperty: string | undefined = property.link;
        // TODO:
        let allowApiProperty: boolean | undefined;
        let websitePolicyProperty: string | undefined;
        let websiteWidthProperty: number | undefined;
        let websitePositionProperty: number | undefined;
        let websiteTriggerProperty: string | undefined;
        let websiteTriggerMessageProperty: string | undefined;
        let websiteClosableProperty: boolean | undefined;

        const actionId = "openWebsite-" + (Math.random() + 1).toString(36).substring(7);

        if (this.openedCoWebsites.has(property.id)) {
            return;
        }

        const coWebsiteOpen: OpenCoWebsite = {
            actionId: actionId,
        };

        this.openedCoWebsites.set(property.id, coWebsiteOpen);

        const loadCoWebsiteFunction = (coWebsite: CoWebsite) => {
            coWebsiteManager.loadCoWebsite(coWebsite).catch(() => {
                console.error("Error during loading a co-website: " + coWebsite.getUrl());
            });

            layoutManagerActionStore.removeAction(actionId);
        };

        const openCoWebsiteFunction = () => {
            const coWebsite = new SimpleCoWebsite(
                new URL(openWebsiteProperty ?? "", this.scene.mapUrlFile),
                allowApiProperty,
                websitePolicyProperty,
                websiteWidthProperty,
                websiteClosableProperty
            );

            coWebsiteOpen.coWebsite = coWebsite;

            coWebsiteManager.addCoWebsiteToStore(coWebsite, websitePositionProperty);

            loadCoWebsiteFunction(coWebsite);

            //user in a zone with cowebsite opened or pressed SPACE to enter is a zone
            inOpenWebsite.set(true);

            // analytics event for open website
            analyticsClient.openedWebsite();
        };

        if (localUserStore.getForceCowebsiteTrigger() || websiteTriggerProperty === ON_ACTION_TRIGGER_BUTTON) {
            if (!websiteTriggerMessageProperty) {
                websiteTriggerMessageProperty = get(LL).trigger.cowebsite();
            }

            this.coWebsitesActionTriggers.set(property.id, actionId);

            layoutManagerActionStore.addAction({
                uuid: actionId,
                type: "message",
                message: websiteTriggerMessageProperty,
                callback: () => openCoWebsiteFunction(),
                userInputManager: this.scene.userInputManager,
            });
        } else if (websiteTriggerProperty === ON_ICON_TRIGGER_BUTTON) {
            const coWebsite = new SimpleCoWebsite(
                new URL(openWebsiteProperty ?? "", this.scene.mapUrlFile),
                allowApiProperty,
                websitePolicyProperty,
                websiteWidthProperty,
                websiteClosableProperty
            );

            coWebsiteOpen.coWebsite = coWebsite;

            coWebsiteManager.addCoWebsiteToStore(coWebsite, websitePositionProperty);

            //user in zone to open cowesite with only icone
            inOpenWebsite.set(true);
        }

        if (!websiteTriggerProperty) {
            openCoWebsiteFunction();
        }
    }

    private handleFocusablePropertiesOnEnter(
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

    private handleOpenWebsitePropertiesOnLeave(property: OpenWebsitePropertyData): void {
        const openWebsiteProperty: string | undefined = property.link;
        // TODO:
        let websiteTriggerProperty: string | undefined;

        if (!openWebsiteProperty) {
            return;
        }

        const coWebsiteOpen = this.openedCoWebsites.get(property.id);

        if (!coWebsiteOpen) {
            return;
        }

        const coWebsite = coWebsiteOpen.coWebsite;

        if (coWebsite) {
            coWebsiteManager.closeCoWebsite(coWebsite);
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
}
