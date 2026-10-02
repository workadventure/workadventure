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
            placeholder: "Opcional. {userName} veurà aquest missatge.",
        },
        adminOnly: "Reservat als administradors",
        cancel: "Cancel·lar",
        hint: {
            block: "Deixar de veure'l i sentir-lo. Només per a tu, i reversible.",
            report: "Avisar els administradors.",
            kick: "Desconnectar-lo ara. Podrà tornar.",
            ban: "Desconnectar-lo definitivament.",
        },
        kick: {
            title: "Expulsar",
            content: "{userName} es desconnecta immediatament, i podrà tornar més tard.",
            submit: "Expulsar",
            confirmTitle: "Expulsar {userName}",
        },
        ban: {
            title: "Bandejar del món",
            content: "{userName} es desconnecta i no podrà tornar a entrar en aquest món amb aquest compte.",
            submit: "Bandejar",
            confirmTitle: "Bandejar {userName} definitivament?",
            confirmContent:
                "Un administrador pot aixecar el bandeig més tard des de la pàgina «Usuaris bandejats» del menú, si aquest món en té, o des del back-office.",
            scope: {
                account: "Aquest compte",
                ip: "Aquest compte i la seva adreça IP",
                ipHint: "També bloqueja els comptes nous des de la mateixa connexió, i tothom qui la comparteix (una oficina, una escola…).",
                ipUnknown: "No disponible: aquest usuari ja no està connectat.",
                ipShared: "No disponible: comparteixes aquesta adreça IP i et bloquejaries a tu mateix.",
                loading: "Comprovant qui comparteix aquesta adreça IP…",
                error: "No disponible: no s'ha pogut comprovar qui comparteix aquesta adreça IP.",
                nobody: "Ningú més està connectat a aquest món des d'aquesta adreça IP ara mateix. Qui torni més tard des d'aquesta adreça també quedarà bloquejat.",
                others: "També bloquejats, connectats a aquest món des d'aquesta adreça IP ara mateix ({count}):",
                submitWithOthers: "Bandejar aquestes {count} persones",
            },
        },
    },
    kicked: {
        title: "EXPULSAT",
        subtitle: "Un moderador t'ha expulsat d'aquest mapa",
    },
    banned: {
        title: "BANDEJAT",
        subtitle: "Has estat bandejat de WorkAdventure",
        details: "Si vols més informació, pots contactar-nos a: hello@workadventu.re",
    },
    reasonGiven: "Motiu: {reason}",
};

export default report;
