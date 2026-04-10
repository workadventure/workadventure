import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "Akceptować",
    close: "Začinić",
    confirm: "Wobkrućić",
    goBackToOnlineStatusLabel: "Chceće so wróćić online?",
    allowNotification: "Zdźělenki dowolić?",
    allowNotificationExplanation: "Dóstaće desktopowe zdźělenku, hdyž chce něchtó z wami rěčeć.",
    soundBlockedBackInAMoment: 'Waš wobhladowak tuchwilu zwuk blokuje, tohodla sće w modusu "Wróćo so za moment".',
    turnSoundOn: "Zwuk zmóžnić",
};

export default statusModal;
