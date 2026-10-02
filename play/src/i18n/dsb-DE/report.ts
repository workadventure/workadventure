import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const report: DeepPartial<Translation["report"]> = {
    block: {
        title: "Blokěrowanje",
        content: "Blokěruj kuždu komunikaciju z wužywarjom {userName}. Ta opcija móžo se kuždy cas zasej anulěrowaś.",
        unblock: "Blokěrowanje togo wužywarja zasej anulěrowaś",
        block: "Blokěruj togo wužywarja",
    },
    title: "Mjeldowanje",
    content: "Napiš powěsć administratoram teje śpy. Wóni mógu togo wužywarja blokěrowaś.",
    message: {
        title: "Twója powěsć: ",
        empty: "To pólo njesmějo byś prozne.",
        error: "Dla zmólkow pśi mjeldowanju wobrośćo se na administratora.",
    },
    submit: "Togo wužywarja mjeldowaś",
    moderate: {
        title: "Moderěrowanje wužywarja {userName}",
        block: "Blokěrowanje",
        report: "Mjeldowanje",
        noSelect: "ZMÓLKA: Žedna akcije njejo wuzwólona.",
        action: "Moderěrowaś",
        reason: {
            label: "Pśicyna",
            placeholder: "Opcionalne. {userName} buźo toś tu powěsć wiźeś.",
        },
        adminOnly: "Jano za administratorow",
        cancel: "Pśetergnuś",
        hint: {
            block: "Wužywarja wěcej njewiźeś a njesłyšaś. Jano za tebje, a wótwołajobne.",
            report: "Administratorow informěrowaś.",
            kick: "Něnto źěliś. Wužywaŕ móžo se wrośiś.",
            ban: "Na pśecej źěliś.",
        },
        kick: {
            title: "Wótwónoźeś",
            content: "{userName} se ned źěli a móžo se pózdźej wrośiś.",
            submit: "Wótwónoźeś",
            confirmTitle: "{userName} wótwónoźeś",
        },
        ban: {
            title: "Ze swěta wuzamknuś",
            content: "{userName} se źěli a njamóžo wěcej z toś tym kontom do togo swěta stupiś.",
            submit: "Wuzamknuś",
            confirmTitle: "{userName} na pśecej wuzamknuś?",
            confirmContent:
                "Administrator móžo wuzamknjenje pózdźej na boku „Blokěrowane wužywarje“ w meniju zběgnuś, jolic ten swět jen ma, abo w backoffice.",
            scope: {
                account: "Toś to konto",
                ip: "Toś to konto a jogo IP-adresa",
                ipHint: "Blokěrujo teke nowe konta z teje sameje zwiski a wšych, kótarež ju źěle (běrow, šula…).",
                ipUnknown: "Njestoj k dispoziciji: toś ten wužywaŕ wěcej zwězany njejo.",
                ipShared: "Njestoj k dispoziciji: źěliš toś tu IP-adresu a by se sam wuzamknuł.",
                loading: "Pśeglědujo se, chto toś tu IP-adresu źěli…",
                error: "Njestoj k dispoziciji: njejo było móžno pśeglědaś, chto toś tu IP-adresu źěli.",
                nobody: "Tuchylu nichten drugi njejo z toś teje IP-adrese z toś tym swětom zwězany. Chtož se pózdźej z njeje wrośijo, se teke wuzamknjo.",
                others: "Teke wuzamknjone, tuchylu z toś teje IP-adrese z toś tym swětom zwězane ({count}):",
                submitWithOthers: "Toś tych {count} wósobow wuzamknuś",
            },
        },
    },
    kicked: {
        title: "WÓTWÓNOŹONY",
        subtitle: "Moderator jo śi z teje kórty wótwónoźeł",
    },
    banned: {
        title: "WUZAMKNJONY",
        subtitle: "Sy z WorkAdventure wuzamknjony",
        details: "Za dalšne informacije móžoš se na nas wobrośiś: hello@workadventu.re",
    },
    reasonGiven: "Pśicyna: {reason}",
};

export default report;
