import { analyticsClient } from "../Administration/AnalyticsClient";
import { iframeListener } from "../Api/IframeListener";
import { connectionManager } from "../Connection/ConnectionManager";
import { CoWebsite } from "../WebRtc/CoWebsite/CoWebsite";
import { SimpleCoWebsite } from "../WebRtc/CoWebsite/SimpleCoWebsite";
import { coWebsiteManager } from "../WebRtc/CoWebsiteManager";
import { scriptUtils } from "../Api/ScriptUtils";

//enlever les events lié au chat dans iframelistener

export const openCoWebSite = async (
    {url,allowApi,allowPolicy,closable,lazy,position,widthPercent}: {
        url: string;
        allowApi?: boolean | undefined;
        allowPolicy?: string | undefined;
        widthPercent?: number | undefined;
        position?: number | undefined;
        closable?: boolean | undefined;
        lazy?: boolean | undefined;
    },
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

    coWebsiteManager.addCoWebsiteToStore(coWebsite, position);

    if (lazy === undefined || !lazy) {
        await coWebsiteManager.loadCoWebsite(coWebsite);
    }

    return {
        id: coWebsite.getId(),
    };
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
