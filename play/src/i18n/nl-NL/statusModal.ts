import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "Accepteren",
    allowNotificationExplanation: "Ontvang een desktopmelding wanneer iemand je wil praten.",
    close: "Sluiten",
    confirm: "Bevestigen",
    goBackToOnlineStatusLabel: "Wil je weer online gaan?",
    allowNotification: "Wil je meldingen toestaan?",
    audioPlaybackBlocked: "Je browser heeft het afspelen van audio geblokkeerd.",
    audioPlaybackInterrupted: "Het afspelen van audio is onderbroken door je browser of besturingssysteem.",
    turnSoundOn: "Geluid inschakelen",
};

export default statusModal;
