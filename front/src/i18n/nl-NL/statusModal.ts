import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "Accepteren",
    close: "Sluiten",
    confirm: "Bevestigen",
    goBackToOnlineStatusLabel: "Wil je weer online gaan?",
    allowNotification: "Wil je meldingen toestaan?",
};

export default statusModal;
