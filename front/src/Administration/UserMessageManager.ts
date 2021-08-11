import { AdminMessageEventTypes, adminMessagesService } from "../Connexion/AdminMessagesService";
import { textMessageContentStore, textMessageVisibleStore } from "../Stores/TypeMessageStore/TextMessageStore";
import { soundPlayingStore } from "../Stores/SoundPlayingStore";
import { UPLOADER_URL } from "../Enum/EnvironmentVariable";
import { banMessageContentStore, banMessageVisibleStore } from "../Stores/TypeMessageStore/BanMessageStore";

class UserMessageManager {
    receiveBannedMessageListener!: Function;

    constructor() {
        adminMessagesService.messageStream.subscribe((event) => {
            textMessageVisibleStore.set(false);
            banMessageVisibleStore.set(false);
            if (event.type === AdminMessageEventTypes.admin) {
                textMessageContentStore.set(event.text);
                textMessageVisibleStore.set(true);
            } else if (event.type === AdminMessageEventTypes.audio) {
                soundPlayingStore.playSound(UPLOADER_URL + event.text);
            } else if (event.type === AdminMessageEventTypes.ban) {
                banMessageContentStore.set(event.text);
                banMessageVisibleStore.set(true);
            } else if (event.type === AdminMessageEventTypes.banned) {
                banMessageContentStore.set(event.text);
                banMessageVisibleStore.set(true);
                this.receiveBannedMessageListener();
            }
        });
    }

    setReceiveBanListener(callback: Function) {
        this.receiveBannedMessageListener = callback;
    }
}
export const userMessageManager = new UserMessageManager();
