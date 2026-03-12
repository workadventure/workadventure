import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "Akceptěrowaś",
    close: "Zacyniś",
    confirm: "Wobkšuśiś",
    goBackToOnlineStatusLabel: "Cośo se wróśiś online?",
    allowNotification: "Powěźeśe dowóliś?",
    allowNotificationExplanation: "Dostańśo powěźeńku na desktopje, gaž něchten z wami powědaś co.",
};

export default statusModal;
