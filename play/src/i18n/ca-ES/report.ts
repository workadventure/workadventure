import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const report: DeepPartial<Translation["report"]> = {
    block: {
        title: "Bloquejar",
        content: "Bloquejar qualsevol comunicació des de i cap a {userName}. Aquest cambi es pot desfer.",
        unblock: "Desbloquejar aquest usuari",
        block: "Bloquejar aquest usuari",
    },
    title: "Denunciar",
    content:
        "Enviar un missatge de denúncia als administradors d'aquesta habitació. Pot ser que després suspenguin a aquest usuari.",
    message: {
        title: "El vostre missatge: ",
        empty: "El missatge de denúncia no pot estar buit.",
        error: "Informa d'un error del missatge, pots contactar amb l'administrador.",
    },
    submit: "Denunciar aquest usuari",
    moderate: {
        title: "Moderar a {userName}",
        block: "Bloquejar",
        report: "Denunciar",
        noSelect: "ERROR : No s'ha seleccionat una acció.",
        action: "Moderar",
        reason: {
            label: "Motiu",
            placeholder: "Opcional. Es conserva per als administradors d'aquest món.",
        },
        adminOnly: "Reservat als administradors",
        cancel: "Cancel·lar",
        hint: {
            block: "Deixar de veure'l i sentir-lo. Només per a tu, i reversible.",
            report: "Avisar els administradors d'aquest món.",
            kick: "Desconnectar-lo ara. Podrà tornar.",
            ban: "Desconnectar-lo definitivament.",
        },
        kick: {
            title: "Expulsar del mapa",
            content: "{userName} es desconnecta immediatament, i podrà tornar més tard.",
            submit: "Expulsar",
        },
        ban: {
            title: "Bandejar del món",
            content:
                "{userName} es desconnecta i no podrà tornar a entrar en aquest món, ni tan sols amb un altre compte.",
            submit: "Bandejar",
            confirmTitle: "Bandejar {userName} definitivament?",
            confirmContent:
                "No es pot desfer des del joc. Només un administrador pot aixecar el bandeig des del back-office.",
        },
    },
    kicked: {
        title: "EXPULSAT",
        subtitle: "Un moderador t'ha expulsat d'aquest mapa",
        details: "Recarrega la pàgina per tornar a entrar.",
    },
    banned: {
        title: "BANDEJAT",
        subtitle: "Has estat bandejat de WorkAdventure",
        details: "Si vols més informació, pots contactar-nos a: hello@workadventu.re",
    },
    reasonGiven: "Motiu: {reason}",
};

export default report;
