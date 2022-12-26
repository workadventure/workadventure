import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const camera: DeepPartial<Translation["camera"]> = {
    enable: {
        title: "Prošu zaswěć swoju kameru a swój mikrofon.",
        start: "Start!",
    },
    help: {
        title: "přistup ke kamerje/mikrofonje trěbny",
        permissionDenied: "přistup zapowědźeny",
        content: "Přistup na kameru a mikrofon dyrbi so w browseru dopušćić dać.",
        firefoxContent:
            'Prošu zaklik na "Diese Entscheidungen speichern" šaltowanskej přestrjeni, zo by so wospjetnym naprašowanjam za dowolnosću w Firefox zadźěwało.',
        refresh: "aktualizować",
        continue: "bjez kamery pokročować",
        screen: {
            firefox: "/resources/help-setting-camera-permission/de-DE-chrome.png",
            chrome: "/resources/help-setting-camera-permission/de-DE-chrome.png",
        },
    },
    my: {
        silentZone: "ćichi wobłuk",
        nameTag: "Wy",
    },
    disable: "hasńće swoju kameru",
};

export default camera;
