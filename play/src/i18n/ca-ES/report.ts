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
    },
};

export default report;
