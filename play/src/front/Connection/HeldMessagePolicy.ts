import type { ServerToClientMessage as ServerToClientMessageTsProto } from "@workadventure/messages";

/**
 * The rules deciding what a held RoomConnection may keep for later and what it must act on now.
 * Pure on purpose: these are the subtle part of holding, and they are worth testing without
 * standing up a WebSocket.
 */

/**
 * Messages whose payload survives in a Deferred. A promise retains its value for whoever awaits it
 * later, so there is nothing to gain by holding these — and holding them stalls the very code
 * waiting to learn that the connection is up and the room joined.
 */
const NEVER_HELD_MESSAGES: ReadonlySet<string> = new Set(["roomConnectedMessage", "roomJoinedMessage"]);

export function isNeverHeld(data: ServerToClientMessageTsProto): boolean {
    return NEVER_HELD_MESSAGES.has(data.message?.$case ?? "");
}

/**
 * Answer every ping this message carries — via `onPing` — and remove it from what will be replayed.
 *
 * Pings ride inside batches and carry the keep-alive contract in both directions: the client arms a
 * watchdog on each one and owes the server a pong. Holding them would have a perfectly healthy
 * connection declared dead after the watchdog delay, and leave the server waiting on a client that
 * has stopped answering.
 *
 * Returns undefined when the message held nothing but pings, so the caller queues nothing.
 */
export function stripPings(
    data: ServerToClientMessageTsProto,
    onPing: () => void,
): ServerToClientMessageTsProto | undefined {
    const message = data.message;
    if (message?.$case !== "batchMessage") {
        return data;
    }

    const kept = message.batchMessage.payload.filter((subMessageWrapper) => {
        if (subMessageWrapper.message?.$case !== "pingMessage") {
            return true;
        }
        onPing();
        return false;
    });

    if (kept.length === 0) {
        return undefined;
    }

    return {
        ...data,
        message: {
            $case: "batchMessage",
            batchMessage: { ...message.batchMessage, payload: kept },
        },
    };
}
