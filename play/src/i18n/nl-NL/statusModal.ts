import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "Accepteren",
    allowNotificationExplanation: "Ontvang een desktopmelding wanneer iemand je wil praten.",
    close: "Sluiten",
    confirm: "Bevestigen",
    goBackToOnlineStatusLabel: "Wil je weer online gaan?",
    allowNotification: "Wil je meldingen toestaan?",
};

export default statusModal;
