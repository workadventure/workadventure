import { AvailabilityStatus } from "@workadventure/messages";
import { ABSOLUTE_PUSHER_URL } from "../../Enum/ComputedConst";
import { localUserStore } from "../../Connection/LocalUserStore";
import { gameManager } from "../../Phaser/Game/GameManager";
import { resetAllStatusStoreExcept } from "./statusChangerFunctions";
import type { RequestedStatus } from "./statusRules";

const EXTENSION_STORAGE_KEY = "starhunter.status";
const POLLING_INTERVAL_MS = 5_000;
const HTTP_POLLING_ENABLED = false; // Disable HTTP polling to server

const STATUS_LOOKUP: Record<string, RequestedStatus> = {
    BUSY: AvailabilityStatus.BUSY,
    DO_NOT_DISTURB: AvailabilityStatus.DO_NOT_DISTURB,
    BACK_IN_A_MOMENT: AvailabilityStatus.BACK_IN_A_MOMENT,
};

let pollingHandle: number | null = null;
let lastAppliedStatus: RequestedStatus | null | undefined;
let lastSentStatus: string | null = null;

const normalizeStatus = (rawValue: string | null): RequestedStatus | null | undefined => {
    if (rawValue === null) {
        return undefined;
    }

    const normalized = rawValue.trim().toUpperCase();
    if (normalized === "" || normalized === "ONLINE") {
        return null;
    }

    return STATUS_LOOKUP[normalized];
};

const applyStatusIfChanged = (nextStatus: RequestedStatus | null) => {
    if (nextStatus === lastAppliedStatus) {
        return;
    }
    lastAppliedStatus = nextStatus;
    resetAllStatusStoreExcept(nextStatus);
};

const pollExtensionStorage = () => {
    try {
        const rawValue = window.localStorage.getItem(EXTENSION_STORAGE_KEY);

        // If rawValue is null, it means ONLINE (extension removes the key for ONLINE)
        if (rawValue === null) {
            // ONLINE is represented as null in RequestedStatus
            const onlineStatus: RequestedStatus | null = null;
            if (onlineStatus !== lastAppliedStatus) {
                applyStatusIfChanged(onlineStatus);
            }

            // Send ONLINE to server if enabled
            if (HTTP_POLLING_ENABLED && lastSentStatus !== "ONLINE") {
                lastSentStatus = "ONLINE";
                sendStatusToServer("ONLINE").catch((error) => {
                    console.warn("[ExtensionStatusPoller] Failed to send ONLINE status to server", error);
                    lastSentStatus = null;
                });
            }
            return;
        }

        const parsedStatus = normalizeStatus(rawValue);
        if (parsedStatus === undefined) {
            return;
        }

        applyStatusIfChanged(parsedStatus);

        // Send status to server via HTTP polling if enabled
        if (HTTP_POLLING_ENABLED && rawValue !== null) {
            const normalizedValue = rawValue.trim().toUpperCase();
            if (lastSentStatus !== normalizedValue) {
                lastSentStatus = normalizedValue;
                sendStatusToServer(normalizedValue).catch((error) => {
                    console.warn("[ExtensionStatusPoller] Failed to send status to server", error);
                    lastSentStatus = null;
                });
            }
        }
    } catch (error) {
        console.warn("[ExtensionStatusPoller] Unable to read extension status from localStorage", error);
    }
};

const sendStatusToServer = async (status: string): Promise<void> => {
    try {
        const currentRoom = gameManager.currentStartedRoom;
        const userUuid = localUserStore.getLocalUser()?.uuid;

        if (!currentRoom || !userUuid) {
            return;
        }

        const roomId = window.location.origin + window.location.pathname + window.location.search;

        const url = new URL("/api/extension/status", ABSOLUTE_PUSHER_URL);
        const requestBody = {
            status: status,
            userId: userUuid,
            roomId: roomId,
        };

        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        // Silently fail - this is optional functionality
        console.debug("[ExtensionStatusPoller] Could not send status to server", error);
    }
};

export const startExtensionStatusPolling = () => {
    if (pollingHandle !== null) {
        return;
    }
    pollExtensionStorage();
    pollingHandle = window.setInterval(pollExtensionStorage, POLLING_INTERVAL_MS);
};

export const stopExtensionStatusPolling = () => {
    if (pollingHandle !== null) {
        window.clearInterval(pollingHandle);
        pollingHandle = null;
    }
};
