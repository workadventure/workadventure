import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "Akceptować",
    close: "Začinić",
    confirm: "Wobkrućić",
    goBackToOnlineStatusLabel: "Chceće so wróćić online?",
    allowNotification: "Zdźělenki dowolić?",
    allowNotificationExplanation: "Dóstaće desktopowe zdźělenku, hdyž chce něchtó z wami rěčeć.",
};

export default statusModal;
