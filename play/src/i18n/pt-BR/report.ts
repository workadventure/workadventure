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
            placeholder: "Opcional. {userName} verá esta mensagem.",
        },
        adminOnly: "Reservado aos administradores",
        cancel: "Cancelar",
        hint: {
            block: "Parar de ver e ouvir essa pessoa. Só para você, e reversível.",
            report: "Avisar os administradores.",
            remove: "Tirar essa pessoa desta conversa. A pessoa continua no mapa.",
            kick: "Desconectar agora. A pessoa pode voltar.",
            ban: "Desconectar definitivamente.",
        },
        remove: {
            title: "Tirar da conversa",
            content:
                "{userName} sai desta conversa imediatamente e, se estiver ao vivo, a transmissão é interrompida. A pessoa continua no mapa.",
            submit: "Tirar da conversa",
            confirmTitle: "Tirar {userName} da conversa",
        },
        kick: {
            title: "Remover",
            content: "{userName} é desconectado imediatamente e pode voltar mais tarde.",
            submit: "Remover",
            confirmTitle: "Remover {userName}",
        },
        ban: {
            title: "Banir do mundo",
            content: "{userName} é desconectado e não poderá mais entrar neste mundo com esta conta.",
            submit: "Banir",
            confirmTitle: "Banir {userName}?",
            confirmContent:
                'Um administrador pode remover o banimento depois pela página "Usuários banidos" do menu, se este mundo tiver uma, ou pelo back-office.',
            scope: {
                account: "Esta conta",
                ip: "Esta conta e o endereço IP dela",
                ipHint: "Também bloqueia novas contas da mesma conexão, e todos que a compartilham (um escritório, uma escola…).",
                ipUnknown: "Indisponível: este usuário não está mais conectado.",
                ipShared: "Indisponível: você compartilha este endereço IP e bloquearia a si mesmo.",
                loading: "Verificando quem compartilha este endereço IP…",
                error: "Indisponível: não foi possível verificar quem compartilha este endereço IP.",
                nobody: "Ninguém mais está conectado a este mundo a partir deste endereço IP agora. Quem voltar mais tarde a partir dele também será bloqueado.",
                others: "Também bloqueados, conectados a este mundo a partir deste endereço IP agora ({count}):",
                submitWithOthers: "Banir estas {count} pessoas",
            },
        },
    },
    kicked: {
        title: "REMOVIDO",
        subtitle: "Um moderador removeu você deste mapa",
    },
    banned: {
        title: "BANIDO",
        subtitle: "Você foi banido do WorkAdventure",
        details: "Para mais informações, entre em contato conosco em: hello@workadventu.re",
    },
    reasonGiven: "Motivo: {reason}",
};

export default report;
