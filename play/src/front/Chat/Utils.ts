import * as Sentry from "@sentry/svelte";
import { get } from "svelte/store";
import type { MatrixClient } from "matrix-js-sdk";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { iframeListener } from "../Api/IframeListener";
import { connectionManager } from "../Connection/ConnectionManager";
import type { CoWebsite } from "../WebRtc/CoWebsite/CoWebsite";
import { SimpleCoWebsite } from "../WebRtc/CoWebsite/SimpleCoWebsite";
import { coWebsites } from "../Stores/CoWebsiteStore";
import { scriptUtils } from "../Api/ScriptUtils";
import { getEmbedLink } from "../Utils/EmbedLink";
import { gameManager } from "../Phaser/Game/GameManager";
import { userIsConnected } from "../Stores/MenuStore";
import { chatVisibilityStore } from "../Stores/ChatStore";
import { warningMessageStore } from "../Stores/ErrorStore";
import { LL } from "../../i18n/i18n-svelte";
import { hasMatrixChatCapabilities } from "./Connection/ChatConnection";
import { navChat } from "./Stores/ChatStore";
import { selectedRoomStore } from "./Stores/SelectRoomStore";
import RequiresLoginForChatModal from "./Components/RequiresLoginForChatModal.svelte";
import { modals } from "@wa-modals";

export type OpenCoWebsiteObject = {
    url: string;
    allowApi?: boolean;
    allowPolicy?: string;
    widthPercent?: number;
    closable?: boolean;
    hideUrl?: boolean;
};

//enlever les events lié au chat dans iframelistener
export const openCoWebSite = (
    { url, allowApi, allowPolicy, widthPercent, closable }: OpenCoWebsiteObject,
    source: MessageEventSource | null,
) => {
    if (!url || !source) {
        throw new Error("Unknown query source");
    }

    const coWebsite: SimpleCoWebsite = new SimpleCoWebsite(
        new URL(url, iframeListener.getBaseUrlFromSource(source)),
        allowApi,
        allowPolicy,
        widthPercent,
        closable,
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
            modals.open(RequiresLoginForChatModal);
            return;
        }
        const chatConnection = await gameManager.getChatConnection();
        let room = await chatConnection.getDirectRoomFor(chatID);
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
            modals.open(RequiresLoginForChatModal);
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
    hideUrl,
}: OpenCoWebsiteObject) => {
    if (!url) {
        throw new Error("Unknown query source");
    }

    const coWebsite: SimpleCoWebsite = new SimpleCoWebsite(
        new URL(url),
        allowApi,
        allowPolicy,
        widthPercent,
        closable,
        hideUrl,
    );

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

/** Matrix client for chat tint resolution; undefined if Matrix chat is not active. */
export function getMatrixClientForChatTint(): MatrixClient | undefined {
    try {
        const c = gameManager.chatConnection;
        if (hasMatrixChatCapabilities(c)) {
            return c.getMatrixClient();
        }
    } catch {
        /* game scene not ready */
    }
    return undefined;
}

/**
 * Opens a chat link as a co-website, falling back to a new tab whenever embedding would leave
 * the user staring at a blank iframe.
 *
 * The message keeps showing the link as it was posted. Only at click time do we resolve the embed
 * form known apps require (YouTube's /embed/, Google's /preview, Klaxoon's from=embedded...):
 * that is what we probe and what we embed, since the posted form is often not frameable.
 */
export const openChatLinkAsCoWebsite = async (rawUrl: string): Promise<void> => {
    let url = rawUrl;
    try {
        url = await getEmbedLink(rawUrl);
    } catch (error) {
        console.info("Could not resolve an embed link for the chat link, using it as posted", error);
    }

    let embeddable: boolean;
    try {
        const answer = await gameManager.getCurrentGameScene().connection?.queryEmbeddableWebsite(url);
        // state=false means the URL is unreachable, embeddable=false means it refuses to be
        // framed. Both end up as a blank iframe, so both belong in a new tab.
        embeddable = answer?.state === true && answer.embeddable;
    } catch (error) {
        console.info("Could not check whether chat link is embeddable, opening it in a new tab instead", error);
        embeddable = false;
    }

    if (!embeddable) {
        // openTab() runs the link back through getWebsiteUrl(), which strips embed-only
        // parameters, so a new tab always lands on the page a human would expect.
        scriptUtils.openTab(rawUrl);
        return;
    }

    openCoWebSiteWithoutSource({ url, closable: true });
    analyticsClient.openedWebsite(new URL(url));
};
