import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "{name} chce z tobu diskutować",
    message: "{name} sćele Wam powěsć",
    chatRoom: "w forumje",
    askToMuteMicrophone: "Móžu waš mikrofon němy činić?",
    askToMuteCamera: "Móžu wašu kameru němy činić?",
    microphoneMuted: "Waš mikrofon je so wot moderatora němy činił",
    cameraMuted: "Waša kamera je so wot moderatora němy činiła",
    notificationSentToMuteMicrophone: "Powěźeńka je so na {name} pósłała, zo by jeho mikrofon němy činiła",
    notificationSentToMuteCamera: "Powěźeńka je so na {name} pósłała, zo by jeho kameru němy činiła",
    announcement: "Připowěźeńka",
    open: "Wočinić",
    help: {
        title: "Přistup k powěźeńkam wotpokazany",
        permissionDenied: "Přistup wotpokazany",
        content:
            "Njepřepušćujće diskusiju. Aktiwěrujće powěźeńki, zo byšće informowany był, hdyž něchtó z wami rěčeć chce, samo hdyž njejsće na rajtarku WorkAdventure.",
        firefoxContent:
            'Prošu klikńće na kašćik "Tutu rozsudźenje se spomnić", jeli njechćeće, zo Firefox dale rěka za awtorizaciju.',
        refresh: "Aktualizować",
        continue: "Bjez powěźeńkow pokročować",
        screen: {
            firefox: "/resources/help-setting-notification-permission/en-US-chrome.png",
            chrome: "/resources/help-setting-notification-permission/en-US-chrome.png",
        },
    },
    addNewTag: 'nowy tag přidać: "{tag}"',
    screenSharingError: "Dźělenje wobrazowki njedaje so startować",
    urlCopiedToClipboard: "URL do mjezywótkłada kopěrowana",
};

export default notification;
