import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const menu: DeepPartial<Translation["menu"]> = {
    title: "meni",
    icon: {
        open: {
            menu: "meni wočinić",
            invite: "přeprošenje wozjewić",
            register: "registrować",
            chat: "chat wočinić",
            userlist: "wužiwarska lisćina",
            openEmoji: "wuzwoleny emojijowy popup wočinić",
            closeEmoji: "emoji-meni zawrěć",
        },
    },
    visitCard: {
        close: "zawrěć",
    },
    profile: {
        edit: {
            name: "twoje mjeno změnić",
            woka: "twoje WOKA změnić",
            companion: "twojeho přewodźerja změnić",
            camera: "nastajenja kamery změnić",
        },
        login: "přizjewić",
        logout: "wotzjewić",
    },
    settings: {
        videoQuality: {
            title: "widejowa kwalita",
            short: {
                high: "wysoka (30 BpS)",
                medium: "srjedźna (20 BpS)",
                small: "snadna (10 BpS)",
                minimum: "minimalna (5 BpS)",
            },
            long: {
                high: "wysoka widejowa kwalita (30 BpS)",
                medium: "srjedźna widejowa kwalita (20 BpS, doporučene)",
                small: "snadna widejowa kwalita (10 BpS)",
                minimum: "minimalna widejowa kwalita (5BpS)",
            },
        },
        language: {
            title: "rěč",
        },
        privacySettings: {
            title: "modus njepřitomnosće",
            explanation: "Jeli Work Adventure Tab aktiwny njeje, so do „modusa njepřitomnosće“ přešaltuje.",
            cameraToggle: "Kameru w„ modusu njepřitomnosće “ aktiwěrowanu wostajić.",
            microphoneToggle: "Mikrofon w„ modusu njepřitomnosće “aktiwěrowany wostajić.",
        },
        save: {
            warning: "(hra so po składowanju znowa startuje)",
            button: "składować",
        },
        fullscreen: "połny wobraz",
        notifications: "powěsće",
        cowebsiteTrigger: "Kóždy raz so naprašować, prjedy hač so webstrony abo Jitsi Meet rumy wotewru",
        ignoreFollowRequest: "ignoruj sćěhi naprašowanja druhich wužiwarjow",
    },
    invite: {
        description: "Link do tuteho ruma dźělić!",
        copy: "kopěrować",
        share: "dźělić",
        walkAutomaticallyToPosition: "awtomatisce k mojej poziciji hić",
    },
    globalMessage: {
        text: "tekst",
        audio: "audijo",
        warning: "na wšitke rumy tuteho swěta pósłać",
        enter: "Zapisaj tu swoju powěsć...",
        send: "wotposłać",
    },
    globalAudio: {
        uploadInfo: "dataju nakładować",
        error: "Žanu dataju wuzwolili. Dyrbiš před rozpósłanjom dataju nakładować. ",
        errorUpload:
        "Zmylki při nakładowanju dataje. Prošu přepruwujće Wašu dataju a spytajće to znowa. Jeli problem dale wobsteji, wobroćće so na administratora. ",
    },
    contact: {
        gettingStarted: {
            title: "prěnje kročele",
            description:
            "Z Work Adventure móžeš onlinowy swět stworić w kotrymž móžeš so spontanje z druhimi zetkać a rozmołwjeć. Zestajej jako prěnje swójsku kartu. Steji ći wulki wuběr na hotowych kartach wot našeho teama na wuběr. ",
        },
        createMap: {
            title: "swójsku kartu zestajeć",
            description:
            "Móžeš tež swoju swójsku kartu zestajeć. Sćěhuj k tomu naš kročel-za kročel nawod. ",
        },
    },
    about: {
        mapInfo: "informacije wo tutej karće",
        mapLink: "link ke karće",
        copyrights: {
            map: {
                title: "awtorske prawo karty",
                empty: "Zestajer karty njeje žane informacije k awtorskemu prawu zapołožił.",
            },
            tileset: {
                title: "awtorske prawo Tilesetow",
                empty: "Zestajer karty njeje žane informacije k awtorskemu prawu Tilesetow zapołožił. To njewoznamjenja, zo Tilesety žanej licency njepodleža. ",
            },
            audio: {
                title: "awtorske prawo awdijodatajow",
                empty: "Zestajer karty njeje žane informacije k awtorskemu prawu awdijodatajow zapołožił. Tole njewoznamjenja, zo awdiodataje žanej licency njepodleža. ",
            },
        },
    },
    sub: {
        profile: "profil",
        settings: "nastajenja",
        invite: "přeprošenje",
        credit: "přez kartu",
        globalMessages: "globalne powěsće",
        contact: "kontakt",
    },
};

export default menu;
