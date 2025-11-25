import { AvailabilityStatus } from "@workadventure/messages";
import { get } from "svelte/store";
import { ABSOLUTE_PUSHER_URL } from "../../Enum/ComputedConst";
import { localUserStore } from "../../Connection/LocalUserStore";
import { gameManager } from "../../Phaser/Game/GameManager";
import { availabilityStatusStore, requestedStatusStore } from "../../Stores/MediaStore";
import { resetAllStatusStoreExcept } from "./statusChangerFunctions";
import type { RequestedStatus } from "./statusRules";

const EXTENSION_STORAGE_KEY = "starhunter.status";
const POLLING_INTERVAL_MS = 5_000;
const HTTP_POLLING_ENABLED = true; // Enable HTTP polling to server

const STATUS_LOOKUP: Record<string, RequestedStatus> = {
    BUSY: AvailabilityStatus.BUSY,
    DO_NOT_DISTURB: AvailabilityStatus.DO_NOT_DISTURB,
    BACK_IN_A_MOMENT: AvailabilityStatus.BACK_IN_A_MOMENT,
};

let pollingHandle: number | null = null;
let lastAppliedStatus: RequestedStatus | null | undefined;
let lastSentStatus: string | null = null; // Track the last status sent to server

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
    console.log(
        `[ExtensionStatusPoller] applyStatusIfChanged called - nextStatus:`,
        nextStatus,
        `lastAppliedStatus:`,
        lastAppliedStatus
    );
    if (nextStatus === lastAppliedStatus) {
        console.log(`[ExtensionStatusPoller] Status unchanged, skipping apply`);
        return;
    }
    console.log(`[ExtensionStatusPoller] Applying status change from "${lastAppliedStatus}" to "${nextStatus}"`);
    lastAppliedStatus = nextStatus;
    resetAllStatusStoreExcept(nextStatus);
    console.log(`[ExtensionStatusPoller] Status applied successfully. New lastAppliedStatus:`, lastAppliedStatus);
};

const pollExtensionStorage = () => {
    try {
        const rawValue = window.localStorage.getItem(EXTENSION_STORAGE_KEY);
        const normalizedValue = rawValue ? rawValue.trim().toUpperCase() : null;
        const parsedStatus = normalizeStatus(rawValue);
        const statusWillBeApplied = parsedStatus !== undefined;
        const statusChanged = parsedStatus !== lastAppliedStatus;
        const willSendToServer = HTTP_POLLING_ENABLED && normalizedValue !== null && lastSentStatus !== normalizedValue;

        // Get current WorkAdventure status from stores
        const currentRequestedStatus = get(requestedStatusStore);
        const currentAvailabilityStatus = get(availabilityStatusStore);
        const availabilityStatusName =
            AvailabilityStatus[currentAvailabilityStatus] || `UNKNOWN(${currentAvailabilityStatus})`;

        // Comprehensive status log every 5 seconds
        console.log(`[ExtensionStatusPoller] ===== STATUS POLL (every ${POLLING_INTERVAL_MS}ms) =====`);
        console.log(`[ExtensionStatusPoller] 📦 Extension localStorage:`);
        console.log(`  - rawValue:`, rawValue);
        console.log(`  - normalizedValue:`, normalizedValue);
        console.log(`  - parsedStatus (from normalizeStatus):`, parsedStatus);
        console.log(`[ExtensionStatusPoller] 🎮 WorkAdventure Current Status:`);
        console.log(
            `  - requestedStatusStore:`,
            currentRequestedStatus,
            `(${currentRequestedStatus !== null ? AvailabilityStatus[currentRequestedStatus] : "null"})`
        );
        console.log(`  - availabilityStatusStore:`, currentAvailabilityStatus, `(${availabilityStatusName})`);
        console.log(`[ExtensionStatusPoller] 🔄 Internal State:`);
        console.log(
            `  - lastAppliedStatus:`,
            lastAppliedStatus,
            `(${
                lastAppliedStatus !== null && lastAppliedStatus !== undefined
                    ? AvailabilityStatus[lastAppliedStatus]
                    : lastAppliedStatus
            })`
        );
        console.log(`  - lastSentStatus (to server):`, lastSentStatus);
        console.log(`[ExtensionStatusPoller] ⚙️ Actions:`);
        console.log(`  - statusWillBeApplied:`, statusWillBeApplied);
        console.log(`  - statusChanged:`, statusChanged);
        console.log(`  - willSendToServer:`, willSendToServer);
        console.log(`[ExtensionStatusPoller] ===========================================`);

        // If rawValue is null, it means the key doesn't exist, so we skip
        if (rawValue === null) {
            console.log(`[ExtensionStatusPoller] No status found in localStorage (rawValue is null), skipping`);
            return;
        }

        // Only apply status if it's not undefined (undefined means the key doesn't exist)
        if (statusWillBeApplied) {
            applyStatusIfChanged(parsedStatus);
        }

        // Send status to server via HTTP polling if enabled
        // Always send the rawValue (which can be "ONLINE" or other statuses) to the server
        // Only send if the status has changed from what we last sent
        if (HTTP_POLLING_ENABLED) {
            if (willSendToServer) {
                console.log(
                    `[ExtensionStatusPoller] Status changed from "${lastSentStatus}" to "${normalizedValue}", sending to server`
                );
                lastSentStatus = normalizedValue;
                sendStatusToServer(normalizedValue).catch((error) => {
                    console.warn("[ExtensionStatusPoller] Failed to send status to server", error);
                    // Reset lastSentStatus on error so we retry next time
                    lastSentStatus = null;
                });
            } else {
                console.log(`[ExtensionStatusPoller] Status unchanged ("${normalizedValue}"), skipping server send`);
            }
        } else {
            console.log(`[ExtensionStatusPoller] HTTP polling disabled, skipping server send`);
        }
    } catch (error) {
        console.warn("[ExtensionStatusPoller] Unable to read extension status from localStorage", error);
    }
};

const sendStatusToServer = async (status: string): Promise<void> => {
    try {
        const currentRoom = gameManager.currentStartedRoom;
        const userUuid = localUserStore.getLocalUser()?.uuid;

        console.log(`[ExtensionStatusPoller] sendStatusToServer - currentRoom:`, !!currentRoom, `userUuid:`, userUuid);

        if (!currentRoom || !userUuid) {
            console.log(
                `[ExtensionStatusPoller] Cannot send status - missing currentRoom (${!currentRoom}) or userUuid (${!userUuid})`
            );
            return;
        }

        // Use window.location to get the current room URL since roomUrl is private
        const roomId = window.location.origin + window.location.pathname + window.location.search;

        const url = new URL("/api/extension/status", ABSOLUTE_PUSHER_URL);
        const requestBody = {
            status: status,
            userId: userUuid,
            roomId: roomId,
        };

        console.log(`[ExtensionStatusPoller] Sending POST request to:`, url.toString(), `with body:`, requestBody);

        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        });

        console.log(`[ExtensionStatusPoller] Response status:`, response.status, response.statusText);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        console.log(`[ExtensionStatusPoller] Successfully sent status to server, response:`, responseData);
    } catch (error) {
        console.error("[ExtensionStatusPoller] Could not send status to server", error);
    }
};

export const startExtensionStatusPolling = () => {
    if (pollingHandle !== null) {
        console.log(`[ExtensionStatusPoller] Polling already started, skipping`);
        return;
    }
    console.log(`[ExtensionStatusPoller] Starting extension status polling (interval: ${POLLING_INTERVAL_MS}ms)`);
    pollExtensionStorage();
    pollingHandle = window.setInterval(pollExtensionStorage, POLLING_INTERVAL_MS);
};

export const stopExtensionStatusPolling = () => {
    if (pollingHandle !== null) {
        window.clearInterval(pollingHandle);
        pollingHandle = null;
    }
};
