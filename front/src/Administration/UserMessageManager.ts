import { AdminMessageEventTypes, adminMessagesService } from "../Connexion/AdminMessagesService";
import { textMessageStore } from "../Stores/TypeMessageStore/TextMessageStore";
import { soundPlayingStore } from "../Stores/SoundPlayingStore";
import { UPLOADER_URL } from "../Enum/EnvironmentVariable";
import { banMessageStore } from "../Stores/TypeMessageStore/BanMessageStore";

class UserMessageManager {
    receiveBannedMessageListener!: Function;

    constructor() {
        adminMessagesService.messageStream.subscribe((event) => {
            if (event.type === AdminMessageEventTypes.admin) {
                textMessageStore.addMessage(event.text);
            } else if (event.type === AdminMessageEventTypes.audio) {
                soundPlayingStore.playSound(UPLOADER_URL + event.text);
            } else if (event.type === AdminMessageEventTypes.ban) {
                banMessageStore.addMessage(event.text);
            } else if (event.type === AdminMessageEventTypes.banned) {
                banMessageStore.addMessage(event.text);
                this.receiveBannedMessageListener();
            }
        });
    }

    setReceiveBanListener(callback: Function) {
        this.receiveBannedMessageListener = callback;
    }
}
export const userMessageManager = new UserMessageManager();
