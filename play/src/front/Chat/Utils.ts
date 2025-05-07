import * as Sentry from "@sentry/svelte";
import { openModal } from "svelte-modals";
import { get } from "svelte/store";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { iframeListener } from "../Api/IframeListener";
import { connectionManager } from "../Connection/ConnectionManager";
import { CoWebsite } from "../WebRtc/CoWebsite/CoWebsite";
import { SimpleCoWebsite } from "../WebRtc/CoWebsite/SimpleCoWebsite";
import { coWebsites } from "../Stores/CoWebsiteStore";
import { scriptUtils } from "../Api/ScriptUtils";
import { gameManager } from "../Phaser/Game/GameManager";
import { userIsConnected } from "../Stores/MenuStore";
import { chatVisibilityStore } from "../Stores/ChatStore";
import { warningMessageStore } from "../Stores/ErrorStore";
import { LL } from "../../i18n/i18n-svelte";
import { navChat } from "./Stores/ChatStore";
import { selectedRoomStore } from "./Stores/SelectRoomStore";
import RequiresLoginForChatModal from "./Components/RequiresLoginForChatModal.svelte";

export type OpenCoWebsiteObject = {
    url: string;
    allowApi?: boolean;
    allowPolicy?: string;
    widthPercent?: number;
    closable?: boolean;
};

//enlever les events lié au chat dans iframelistener
export const openCoWebSite = (
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
    return get(coWebsites).map((coWebsite: CoWebsite) => {
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

export const openDirectChatRoom = async (chatID: string) => {
    try {
        if (!get(userIsConnected)) {
            openModal(RequiresLoginForChatModal);
            return;
        }
        const chatConnection = await gameManager.getChatConnection();
        let room = chatConnection.getDirectRoomFor(chatID);
        if (!room) room = await chatConnection.createDirectRoom(chatID);
        if (!room) throw new Error("Failed to create room");
        analyticsClient.createMatrixRoom();

        if (get(room.myMembership) === "invite") {
            room.joinRoom().catch((error: unknown) => console.error(error));
        }

        selectedRoomStore.set(room);
        navChat.switchToChat();
        chatVisibilityStore.set(true);
    } catch (error) {
        warningMessageStore.addWarningMessage(get(LL).chat.failedToOpenRoom({ roomId: chatID }));
        console.error(error);
        Sentry.captureException(error);
    }
};

export const openChatRoom = async (roomId: string) => {
    try {
        if (!get(userIsConnected)) {
            openModal(RequiresLoginForChatModal);
            return;
        }
        const chatConnection = await gameManager.getChatConnection();
        const room = chatConnection.getRoomByID(roomId);

        if (!room) throw new Error("Failed to retrieve room");

        selectedRoomStore.set(room);
        navChat.switchToChat();
        chatVisibilityStore.set(true);
    } catch (error) {
        warningMessageStore.addWarningMessage(get(LL).chat.failedToOpenRoom({ roomId }));
        console.error(error);
        Sentry.captureException(error);
    }
};

export const openCoWebSiteWithoutSource = ({
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

const openSimpleCowebsite = (coWebsite: SimpleCoWebsite) => {
    coWebsites.add(coWebsite);

    return {
        id: coWebsite.getId(),
    };
};

export const closeCoWebsite = (coWebsiteId: string) => {
    const coWebsite = coWebsites.findById(coWebsiteId);

    if (!coWebsite) {
        console.warn("Unknown co-website, probably already closed", coWebsiteId);
        return;
    }

    coWebsites.remove(coWebsite);
};
