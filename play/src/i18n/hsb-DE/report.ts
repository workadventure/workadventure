import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const report: DeepPartial<Translation["report"]> = {
    block: {
        title: "blokować",
        content: "blokuj kóždužkuli komunikaciju z {userName}. Móže so kóždy čas cofnyć. ",
        unblock: "blokowanje za tutoho wužiwarja zběhnyć",
        block: "blokuj tutoho wužiwarja",
    },
    title: "přizjewić",
    content: "Napisaj pohóršk na administratorow tutoho ruma. Tući móža wužiwarja po tym wuzamknyć. ",
    message: {
        error: "Report message error, you can contact the administrator.",
        title: "Twoja powěsć:",
        empty: "prošu tekst zapodać.",
    },
    submit: "tutoho wužiwarja přizjewić",
    moderate: {
        title: "{userName} moderěrować",
        block: "blokować",
        report: "přizjewić",
        noSelect: "ZMYLK: Njeje žane jednanje wuzwolene.",
        action: "moderěrować",
        reason: {
            label: "přičina",
            placeholder: "opcionalne. Wobchowa so za administratorow tutoho swěta.",
        },
        adminOnly: "jenož za administratorow",
        cancel: "přetorhnyć",
        hint: {
            block: "wužiwarja wjace njewidźeć a njesłyšeć. Jenož za tebje, a wotwołajomne.",
            report: "administratorow tutoho swěta informować.",
            kick: "nětko dźělić. Wužiwar móže so wróćić.",
            ban: "na přeco dźělić.",
        },
        kick: {
            title: "z karty wotstronić",
            content: "{userName} so hnydom dźěli a móže so pozdźišo wróćić.",
            submit: "wotstronić",
        },
        ban: {
            title: "ze swěta wuzamknyć",
            content: "{userName} so dźěli a njemóže wjace do tutoho swěta zastupić, tež nic z druhim kontom.",
            submit: "wuzamknyć",
            confirmTitle: "{userName} na přeco wuzamknyć?",
            confirmContent: "To njeda so w hrě wotwołać. Jenož administrator móže wuzamknjenje w backoffice zběhnyć.",
        },
    },
    kicked: {
        title: "WOTSTRONJENY",
        subtitle: "Moderator je će z tuteje karty wotstronił",
        details: "začituj stronu znowa, zo by zaso přistupił.",
    },
    banned: {
        title: "WUZAMKNJENY",
        subtitle: "Sy z WorkAdventure wuzamknjeny",
        details: "za dalše informacije móžeš so na nas wobroćić: hello@workadventu.re",
    },
    reasonGiven: "přičina: {reason}",
};

export default report;
