import type { Translation } from "../i18n-types";
import { ADMIN_URL } from "../../Enum/EnvironmentVariable";
import { DeepPartial } from "../../Utils/DeepPartial";

const upgradeLink = ADMIN_URL + "/pricing";

const warning: DeepPartial<Translation["warning"]> = {
    title: "Aviso!",
    content: `Este mundo está perto do seu limite!. Você pode atualizar sua capacidade <a href="${upgradeLink}" target="_blank">aqui</a>`,
    limit: "Este mundo está perto do seu limite!",
    accessDenied: {
        camera: "Acesso à câmera negado. Clique aqui e verifique as permissões do seu navegador.",
        screenSharing: "Compartilhamento de tela negado. Clique aqui e verifique as permissões do seu navegador.",
        teleport: "Você não tem direito de teleportar este usuário.",
        room: "Acesso a sala negado. Você não tem permissão para entrar nesta sala.",
    },
    importantMessage: "Mensagem importante",
    connectionLost: "Conexão perdida. Reconectando...",
    connectionLostTitle: "Conexão perdida",
    connectionLostSubtitle: "Reconectando",
    waitingConnectionTitle: "Aguardando a conexão",
    waitingConnectionSubtitle: "Conectando",
};

export default warning;
