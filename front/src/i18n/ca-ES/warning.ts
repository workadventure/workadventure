import type { Translation } from "../i18n-types";
import { ADMIN_URL } from "../../Enum/EnvironmentVariable";

const upgradeLink = ADMIN_URL + "/pricing";

const warning: NonNullable<Translation["warning"]> = {
    title: "Atenció!",
    content: `Aquest món està apropant-se al seu límit! Podeu actualitzar la seva capacitat <a href="${upgradeLink}" target="_blank">aquí</a>`,
    limit: "Aquest món està apropant-se al seu límit!",
    accessDenied: {
        camera: "Accés a la càmera denegat. Feu clic aquí i reviseu els permissos del vostre navegador.",
        screenSharing: "Compartir pantalla denegat. Feu clic aquí i reviseu els permissos del vostre navegador.",
        teleport: "Não está autorizado a teletransportar-se para este utilizador.",
        room: "Room access denied. You are not allowed to enter this room.", // TODO: translate
    },
    importantMessage: "Missatge important",
    connectionLost: "Conexió perduda. Reconectant...",
    connectionLostTitle: "Conexió perduda",
    connectionLostSubtitle: "Reconectant",
};

export default warning;
