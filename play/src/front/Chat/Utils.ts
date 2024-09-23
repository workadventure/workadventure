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
import { navChat, selectedRoom } from "./Stores/ChatStore";
import { ChatRoom } from "./Connection/ChatConnection";
import RequiresLoginForChatModal from "./Components/RequiresLoginForChatModal.svelte";

export const openCoWebSite = async (
    {
        url,
        allowApi,
        allowPolicy,
        closable,
        lazy,
        position,
        widthPercent,
    }: {
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

export const openChatRoom = async (chatID: string) => {
    try {
        if (!get(userIsConnected)) {
            openModal(RequiresLoginForChatModal);
            return;
        }
        const chatConnection = gameManager.chatConnection;
        let room: ChatRoom | undefined = chatConnection.getDirectRoomFor(chatID);
        if (!room) room = await chatConnection.createDirectRoom(chatID);
        if (!room) throw new Error("Failed to create room");

        if (room.myMembership === "invite") {
            room.joinRoom().catch((error: unknown) => console.error(error));
        }

        selectedRoom.set(room);
        navChat.set("chat");
        chatVisibilityStore.set(true);
    } catch (error) {
        console.error(error);
        Sentry.captureMessage("Failed to create room");
    }
};
