import { analyticsClient } from "../Administration/AnalyticsClient";
import { iframeListener } from "../Api/IframeListener";
import { connectionManager } from "../Connection/ConnectionManager";
import { CoWebsite } from "../WebRtc/CoWebsite/CoWebsite";
import { SimpleCoWebsite } from "../WebRtc/CoWebsite/SimpleCoWebsite";
import { scriptUtils } from "../Api/ScriptUtils";
import {coWebsiteManager} from "../Stores/CoWebsiteStore";

export type OpenCoWebsiteObject = {
    url: string;
    allowApi?: boolean;
    allowPolicy?: string;
    widthPercent?: number;
    closable?: boolean;
};

//enlever les events lié au chat dans iframelistener
export const openCoWebSite = async (
    { url, allowApi, allowPolicy, widthPercent, closable }: OpenCoWebsiteObject,
    source: MessageEventSource | null
) => {
    if (!url || !source) {
        throw new Error("Unknown query source");
    }

    const coWebsite: SimpleCoWebsite = new SimpleCoWebsite(
        new URL(url, iframeListener.getBaseUrlFromSource(source)),
        allowApi,
        allowPolicy,
        widthPercent,
        closable
    );

    return openSimpleCowebsite(coWebsite);
};

export const getCoWebSite = () => {
    const coWebsites = coWebsiteManager.getCoWebsites();

    return coWebsites.map((coWebsite: CoWebsite) => {
        return {
            id: coWebsite.getId(),
        };
    });
};

export const sendRedirectPricing = () => {
    if (connectionManager.currentRoom && connectionManager.currentRoom.pricingUrl) {
        window.location.href = connectionManager.currentRoom.pricingUrl;
    }
};

export const sendLogin = () => {
    analyticsClient.login();
    window.location.href = "/login";
};

export const openTab = (url: string) => {
    scriptUtils.openTab(url);
};

export const openCoWebSiteWithoutSource = async ({
    url,
    allowApi,
    allowPolicy,
    widthPercent,
    closable,
}: OpenCoWebsiteObject) => {
    if (!url) {
        throw new Error("Unknown query source");
    }

    const coWebsite: SimpleCoWebsite = new SimpleCoWebsite(new URL(url), allowApi, allowPolicy, widthPercent, closable);

    return openSimpleCowebsite(coWebsite);
};

const openSimpleCowebsite = async (coWebsite: SimpleCoWebsite) => {
    coWebsiteManager.addCoWebsiteToStore(coWebsite);

    return {
        id: coWebsite.getId(),
    };
};

export const closeCoWebsite = (coWebsiteId: string) => {
    const coWebsite = coWebsiteManager.getCoWebsiteById(coWebsiteId);

    if (!coWebsite) {
        throw new Error("Unknown co-website");
    }

    return coWebsiteManager.closeCoWebsite(coWebsite);
};
