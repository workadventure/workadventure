import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "{name} wil met je praten",
    message: "{name} stuurt een bericht",
    askToMuteMicrophone: "Vraag om je microfoon te dempen 🙏",
    askToMuteCamera: "Vraag om je camera te dempen 🙏",
    help: {
        title: "Toegang tot meldingen geweigerd",
        permissionDenied: "Toegang geweigerd",
        content:
            "Mis geen enkele discussie. Sta meldingen toe om gewaarschuwd te worden wanneer iemand met je wil praten, zelfs als je niet op het WorkAdventure-tabblad bent.",
        firefoxContent:
            'Klik op het vakje "Onthoud deze beslissing" als je niet wilt dat Firefox je telkens om toestemming vraagt.',
        refresh: "Vernieuwen",
        continue: "Doorgaan zonder melding",
        screen: {
            firefox: "/resources/help-setting-notification-permission/en-US-chrome.png",
            chrome: "/resources/help-setting-notification-permission/en-US-chrome.png",
        },
    },
    addNewTag: "voeg een nieuw label toe: '{tag}'",
};

export default notification;
