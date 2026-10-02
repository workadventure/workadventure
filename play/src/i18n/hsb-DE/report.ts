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
            placeholder: "Opcionalne. {userName} budźe tutu powěsć widźeć.",
        },
        adminOnly: "jenož za administratorow",
        cancel: "přetorhnyć",
        hint: {
            block: "wužiwarja wjace njewidźeć a njesłyšeć. Jenož za tebje, a wotwołajomne.",
            report: "administratorow informować.",
            remove: "Z tuteje rozmołwy wotstronić. Wostanje na karće.",
            kick: "nětko dźělić. Wužiwar móže so wróćić.",
            ban: "na přeco dźělić.",
        },
        remove: {
            title: "Z rozmołwy wotstronić",
            content: "{userName} hnydom tutu rozmołwu wopušći, a wusyłanje so skónči, jeli běži. Wostanje w swěće.",
            submit: "Wotstronić",
            confirmTitle: "{userName} z rozmołwy wotstronić",
        },
        kick: {
            title: "wotstronić",
            content: "{userName} so hnydom dźěli a móže so pozdźišo wróćić.",
            submit: "wotstronić",
            confirmTitle: "{userName} wotstronić",
        },
        ban: {
            title: "ze swěta wuzamknyć",
            content: "{userName} so dźěli a njemóže wjace z tutym kontom do tutoho swěta zastupić.",
            submit: "wuzamknyć",
            confirmTitle: "{userName} wuzamknyć?",
            confirmContent:
                "Administrator móže wuzamknjenje pozdźišo na stronje „Zablokowani wužiwarjo“ w meniju zběhnyć, jeli tutón swět ju ma, abo w backoffice.",
            scope: {
                account: "Tute konto",
                ip: "Tute konto a jeho IP-adresa",
                ipHint: "Blokuje tež nowe konta z teje sameje zwiski a wšěch, kotřiž ju dźěla (běrow, šula…).",
                ipUnknown: "Njesteji k dispoziciji: tutón wužiwar hižo zwjazany njeje.",
                ipShared: "Njesteji k dispoziciji: dźěliš tutu IP-adresu a by so sam wuzamknył.",
                loading: "Přepruwuje so, štó tutu IP-adresu dźěli…",
                error: "Njesteji k dispoziciji: njebě móžno přepruwować, štó tutu IP-adresu dźěli.",
                nobody: "Tuchwilu nichtó druhi njeje z tuteje IP-adresy z tutym swětom zwjazany. Štóž so pozdźišo z njeje wróći, so tež wuzamknje.",
                others: "Tež wuzamknjeni, tuchwilu z tuteje IP-adresy z tutym swětom zwjazani ({count}):",
                submitWithOthers: "Tutych {count} wosobow wuzamknyć",
            },
        },
    },
    kicked: {
        title: "WOTSTRONJENY",
        subtitle: "Moderator je će z tuteje karty wotstronił",
    },
    banned: {
        title: "WUZAMKNJENY",
        subtitle: "Sy z WorkAdventure wuzamknjeny",
        details: "za dalše informacije móžeš so na nas wobroćić: hello@workadventu.re",
    },
    reasonGiven: "přičina: {reason}",
};

export default report;
