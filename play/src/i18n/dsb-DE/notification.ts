import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "{name} co z tobu diskutěrowaś",
    message: "{name} sćelo śi powěsć",
    chatRoom: "we forumje",
    askToMuteMicrophone: "Mógu waš mikrofon němy cyniś?",
    askToMuteCamera: "Mógu wašu kameru němy cyniś?",
    microphoneMuted: "Waš mikrofon jo se wót moderatora němy cynił",
    cameraMuted: "Waša kamera jo se wót moderatora němy cyniła",
    notificationSentToMuteMicrophone: "Powěźeńka jo se na {name} pósłała, aby jogo mikrofon němy cynił",
    notificationSentToMuteCamera: "Powěźeńka jo se na {name} pósłała, aby jogo kameru němy cyniła",
    announcement: "Připowěźeńka",
    open: "Wócyniś",
    help: {
        title: "Pśistup k powěźeńkam wótpokazany",
        permissionDenied: "Pśistup wótpokazany",
        content:
            "Njepśepušćejśo diskusiju. Aktiwěrujśo powěźeńki, aby informěrowany był, gaž něchten z wami powědaś co, samo gaž njejsćo na rejtariku WorkAdventure.",
        firefoxContent:
            'Pšosym klikniśo na kašćik "Toś tu rozeznanje se spomniś", jolic njocośo, až Firefox dalej pšaša za awtorizaciju.',
        refresh: "Aktualizěrowaś",
        continue: "Bźez powěźeńkow pókšacowaś",
        screen: {
            firefox: "/resources/help-setting-notification-permission/en-US-chrome.png",
            chrome: "/resources/help-setting-notification-permission/en-US-chrome.png",
        },
    },
    addNewTag: 'nowy tag pśidaś: "{tag}"',
    screenSharingError: "Źělenje wobrazowki njedajo se startowaś",
    recordingStarted: "Jaden wótźělnik w diskusiji jo nagraśe zachopił.",
    urlCopiedToClipboard: "URL do mjazywótkłada kopěrowana",
};

export default notification;
