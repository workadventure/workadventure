import * as Sentry from "@sentry/svelte";
import { openModal } from "svelte-modals";
import { get } from "svelte/store";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { iframeListener } from "../Api/IframeListener";
import { connectionManager } from "../Connection/ConnectionManager";
import { CoWebsite } from "../WebRtc/CoWebsite/CoWebsite";
import { SimpleCoWebsite } from "../WebRtc/CoWebsite/SimpleCoWebsite";
import { coWebsiteManager } from "../WebRtc/CoWebsiteManager";
import { scriptUtils } from "../Api/ScriptUtils";
import { gameManager } from "../Phaser/Game/GameManager";
import { userIsConnected } from "../Stores/MenuStore";
import { chatVisibilityStore } from "../Stores/ChatStore";
import { navChat, selectedRoomStore } from "./Stores/ChatStore";
import RequiresLoginForChatModal from "./Components/RequiresLoginForChatModal.svelte";

export type OpenCoWebsiteObject = {
    url: string;
    allowApi?: boolean;
    allowPolicy?: string;
    widthPercent?: number;
    position?: number;
    closable?: boolean;
    lazy?: boolean;
};

//enlever les events lié au chat dans iframelistener
export const openCoWebSite = async (
    { url, allowApi, allowPolicy, widthPercent, position, closable, lazy }: OpenCoWebsiteObject,
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

    return openSimpleCowebsite(coWebsite, position, lazy);
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

export const openChatRoom = async (chatID: string) => {
    try {
        if (!get(userIsConnected)) {
            openModal(RequiresLoginForChatModal);
            return;
        }
        const chatConnection = gameManager.chatConnection;
        let room = chatConnection.getDirectRoomFor(chatID);
        if (!room) room = await chatConnection.createDirectRoom(chatID);
        if (!room) throw new Error("Failed to create room");

        if (room.myMembership === "invite") {
            room.joinRoom().catch((error: unknown) => console.error(error));
        }

        selectedRoomStore.set(room);
        navChat.switchToChat();
        chatVisibilityStore.set(true);
    } catch (error) {
        console.error(error);
        Sentry.captureMessage("Failed to create room");
    }
};

export const openCoWebSiteWithoutSource = async ({
    url,
    allowApi,
    allowPolicy,
    widthPercent,
    position,
    closable,
    lazy,
}: OpenCoWebsiteObject) => {
    if (!url) {
        throw new Error("Unknown query source");
    }

    const coWebsite: SimpleCoWebsite = new SimpleCoWebsite(new URL(url), allowApi, allowPolicy, widthPercent, closable);

    return openSimpleCowebsite(coWebsite, position, lazy);
};

const openSimpleCowebsite = async (coWebsite: SimpleCoWebsite, position?: number, lazy?: boolean) => {
    coWebsiteManager.addCoWebsiteToStore(coWebsite, position);

    if (lazy === undefined || !lazy) {
        await coWebsiteManager.loadCoWebsite(coWebsite);
    }

    return {
        id: coWebsite.getId(),
    };
};

export const closeCoWebsite = (coWebsiteId: string) => {
    const coWebsite = coWebsiteManager.getCoWebsiteById(coWebsiteId);

    if (!coWebsite) {
        console.warn("Unknown co-website, probably already closed", coWebsiteId);
        return;
    }

    return coWebsiteManager.closeCoWebsite(coWebsite);
};
