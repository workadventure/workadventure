import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "{name} co z tobu diskutěrowaś",
    message: "{name} sćelo śi powěsć",
    askToMuteMicrophone: "Mógu waš mikrofon němy cyniś?",
    askToMuteCamera: "Mógu wašu kameru němy cyniś?",
    microphoneMuted: "Waš mikrofon jo se wót moderatora němy cynił",
    cameraMuted: "Waša kamera jo se wót moderatora němy cyniła",
    givenTheFloor: "Něnto sy ty na rěźe",
    givenTheFloorEnableMicrophone: "Něnto sy ty na rěźe — zašaltuj swój mikrofon",
    floorRevoked: "Njamaš wěcej słowo",
    floorGivenBack: "Sy słowo slědk dał",
    handLowered: "Moderator jo twoju ruku spušćił",
    removedFromConversation: "Moderator jo śi z rozgrona wótpórał.",
    actionFailed: "Toś ta akcija njejo se raźiła",
    announcement: "Připowěźeńka",
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
            chrome: "/resources/help-setting-notification-permission/en-US-chrome.png",
        },
        screenAlt: "Powěźeńki pśez adresowe pólo w Chrome zwóliś",
    },
    addNewTag: 'nowy tag pśidaś: "{tag}"',
    screenSharingError: "Źělenje wobrazowki njedajo se startowaś",
    recordingStarted: "Jaden wótźělnik w diskusiji jo nagraśe zachopił.",
    urlCopiedToClipboard: "URL do mjazywótkłada kopěrowana",
};

export default notification;
