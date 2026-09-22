import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const report: DeepPartial<Translation["report"]> = {
    block: {
        title: "Bloquear",
        content: "Bloqueie qualquer comunicação de e para {userName}. Isso pode ser revertido.",
        unblock: "Desbloquear este usuário",
        block: "Bloqueie esse usuário",
    },
    title: "Relatório",
    content:
        "Envie uma mensagem de relatório aos administradores desta sala. Eles podem banir este usuário mais tarde.",
    message: {
        title: "Sua mensagem: ",
        empty: "A mensagem de relatório não pode ficar vazia.",
        error: "Relatar erro de mensagem, você pode entrar em contato com o administrador.",
    },
    submit: "Denunciar este usuário",
    moderate: {
        title: "Moderar {userName}",
        block: "Bloquear",
        report: "Relatório",
        noSelect: "ERRO: Não há nenhuma ação selecionada.",
        action: "Moderar",
        reason: {
            label: "Motivo",
            placeholder: "Opcional. Guardado para os administradores deste mundo.",
        },
        adminOnly: "Reservado aos administradores",
        cancel: "Cancelar",
        hint: {
            block: "Parar de ver e ouvir essa pessoa. Só para você, e reversível.",
            report: "Avisar os administradores deste mundo.",
            kick: "Desconectar agora. A pessoa pode voltar.",
            ban: "Desconectar definitivamente.",
        },
        kick: {
            title: "Remover do mapa",
            content: "{userName} é desconectado imediatamente e pode voltar mais tarde.",
            submit: "Remover",
        },
        ban: {
            title: "Banir do mundo",
            content: "{userName} é desconectado e não poderá mais entrar neste mundo, nem mesmo com outra conta.",
            submit: "Banir",
            confirmTitle: "Banir {userName} definitivamente?",
            confirmContent:
                "Isso não pode ser desfeito pelo jogo. Só um administrador pode remover o banimento pelo back-office.",
        },
    },
    kicked: {
        title: "REMOVIDO",
        subtitle: "Um moderador removeu você deste mapa",
        details: "Recarregue a página para entrar novamente.",
    },
    banned: {
        title: "BANIDO",
        subtitle: "Você foi banido do WorkAdventure",
        details: "Para mais informações, entre em contato conosco em: hello@workadventu.re",
    },
    reasonGiven: "Motivo: {reason}",
};

export default report;
