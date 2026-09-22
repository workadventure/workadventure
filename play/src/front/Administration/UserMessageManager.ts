import { get } from "svelte/store";
import { AdminMessageEventTypes, adminMessagesService } from "../Connection/AdminMessagesService";
import { textMessageStore } from "../Stores/TypeMessageStore/TextMessageStore";
import { soundPlayingStore } from "../Stores/SoundPlayingStore";
import { UPLOADER_URL } from "../Enum/EnvironmentVariable";
import { banMessageStore } from "../Stores/TypeMessageStore/BanMessageStore";
import { gameManager } from "../Phaser/Game/GameManager";
import { LL } from "../../i18n/i18n-svelte";

class UserMessageManager {
    receiveBannedMessageListener!: (reason: string) => void;
    receiveKickedMessageListener!: (reason: string) => void;

    constructor() {
        // Not unsubscribing is ok, this is a singleton.
        //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
        adminMessagesService.messageStream.subscribe((event) => {
            if (event.type === AdminMessageEventTypes.admin) {
                textMessageStore.addMessage(event.text, event.adminMessageId);
                // Play sound in game scene if available
                try {
                    gameManager.getCurrentGameScene().playSound("new-message", 0.2);
                } catch {
                    // Game scene not ready yet, skip sound
                }
            } else if (event.type === AdminMessageEventTypes.audio) {
                soundPlayingStore.playSound(UPLOADER_URL + event.text);
            } else if (event.type === AdminMessageEventTypes.ban) {
                banMessageStore.addMessage(event.text, event.adminMessageId);
            } else if (event.type === AdminMessageEventTypes.banned) {
                // A ban issued from the game may come without a reason.
                banMessageStore.addMessage(event.text || get(LL).report.banned.subtitle(), event.adminMessageId);
                this.receiveBannedMessageListener(event.text);
            } else if (event.type === AdminMessageEventTypes.kicked) {
                // A kick is not permanent: the error screen alone is enough, no message to acknowledge.
                this.receiveKickedMessageListener(event.text);
            }
        });
    }

    setReceiveBanListener(callback: (reason: string) => void) {
        this.receiveBannedMessageListener = callback;
    }

    setReceiveKickListener(callback: (reason: string) => void) {
        this.receiveKickedMessageListener = callback;
    }
}
export const userMessageManager = new UserMessageManager();
