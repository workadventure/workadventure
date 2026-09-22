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
            placeholder: "Opcionalne. Wobchowa se za administratorow togo swěta.",
        },
        adminOnly: "Jano za administratorow",
        cancel: "Pśetergnuś",
        hint: {
            block: "Wužywarja wěcej njewiźeś a njesłyšaś. Jano za tebje, a wótwołajobne.",
            report: "Administratorow togo swěta informěrowaś.",
            kick: "Něnto źěliś. Wužywaŕ móžo se wrośiś.",
            ban: "Na pśecej źěliś.",
        },
        kick: {
            title: "Z kórty wótwónoźeś",
            content: "{userName} se ned źěli a móžo se pózdźej wrośiś.",
            submit: "Wótwónoźeś",
        },
        ban: {
            title: "Ze swěta wuzamknuś",
            content: "{userName} se źěli a njamóžo wěcej do togo swěta stupiś, teke nic z drugim kontom.",
            submit: "Wuzamknuś",
            confirmTitle: "{userName} na pśecej wuzamknuś?",
            confirmContent:
                "To njedajo se w graśu wótwołaś. Jano administrator móžo wuzamknjenje w backoffice zběgnuś.",
        },
    },
    kicked: {
        title: "WÓTWÓNOŹONY",
        subtitle: "Moderator jo śi z teje kórty wótwónoźeł",
        details: "Zacytaj bok znowego, aby zasej pśistupił.",
    },
    banned: {
        title: "WUZAMKNJONY",
        subtitle: "Sy z WorkAdventure wuzamknjony",
        details: "Za dalšne informacije móžoš se na nas wobrośiś: hello@workadventu.re",
    },
    reasonGiven: "Pśicyna: {reason}",
};

export default report;
