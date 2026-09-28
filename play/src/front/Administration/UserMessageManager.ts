import type { SendUserMessage } from "@workadventure/messages";
import { textMessageStore } from "../Stores/TypeMessageStore/TextMessageStore";
import { soundPlayingStore } from "../Stores/SoundPlayingStore";
import { UPLOADER_URL } from "../Enum/EnvironmentVariable";
import { banMessageStore } from "../Stores/TypeMessageStore/BanMessageStore";
import { gameManager } from "../Phaser/Game/GameManager";

/**
 * Displays a message sent by an admin: a text, an audio message or a ban warning.
 * Ejections (kick/ban) do not go through here, the GameScene listens to them on the RoomConnection.
 */
export function showUserMessage(message: SendUserMessage): void {
    const adminMessageId = message.id !== "" ? message.id : undefined;
    if (message.type === "message") {
        textMessageStore.addMessage(message.message, adminMessageId);
        // Play sound in game scene if available
        try {
            gameManager.getCurrentGameScene().playSound("new-message", 0.2);
        } catch {
            // Game scene not ready yet, skip sound
        }
    } else if (message.type === "audio") {
        soundPlayingStore.playSound(UPLOADER_URL + message.message);
    } else if (message.type === "ban") {
        banMessageStore.addMessage(message.message, adminMessageId);
    }
}
