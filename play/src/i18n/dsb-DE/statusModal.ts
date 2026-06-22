import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "Akceptěrowaś",
    close: "Zacyniś",
    confirm: "Wobkšuśiś",
    goBackToOnlineStatusLabel: "Cośo se wróśiś online?",
    allowNotification: "Powěźeśe dowóliś?",
    allowNotificationExplanation: "Dostańśo powěźeńku na desktopje, gaž něchten z wami powědaś co.",
    soundBlockedBackInAMoment: 'Waš wobglědowak tuchylu zuk blokěrujo, togodla sćo we modusu "Wrośo se za moment".',
    livekitAudioPlaybackBlocked:
        "Waš wobglědowak jo wótgrawanje awdia zablokěrował. Zmóžniśo zuk, aby rozgrono słyšali.",
    turnSoundOn: "Zuk zmóžniś",
};

export default statusModal;
