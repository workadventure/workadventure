import type { Translation } from "../i18n-types";

export default {
    welcome: {
        title: "Bem-vindo ao {worldName}! 🚀",
        description:
            "Prepare-se para explorar um mundo virtual onde você pode se mover, conversar com outros e colaborar em tempo real. Vamos fazer um tour rápido para ajudá-lo a começar!",
    },
    movement: {
        title: "Mover-se",
        descriptionDesktop:
            "Use as setas do teclado ou WASD para mover seu personagem. Você também pode clicar com o botão direito para se mover. Tente se mover agora!",
        descriptionTouch: "Toque no mapa para ir até lá e arraste para olhar ao redor. Tente se mover agora!",
        next: "Próximo",
    },
    communication: {
        title: "Bolhas de comunicação",
        description:
            "Quando você se aproxima de outros jogadores, entra automaticamente em uma bolha de comunicação. Você pode conversar com outros na mesma bolha!",
        video: "./static/Videos/Meet.mp4",
        next: "Entendi!",
    },
    lockBubble: {
        title: "Bloquear sua conversa",
        description:
            "Clique no botão de bloqueio para impedir que outros se juntem à sua bolha de conversa. Isso é útil para discussões privadas!",
        hint: "Clique no botão de bloqueio destacado para experimentar!",
    },
    screenSharing: {
        title: "Compartilhar sua tela",
        description:
            "Compartilhe sua tela com outros na sua bolha de conversa. Perfeito para apresentações e colaboração!",
        hint: "Clique no botão de compartilhamento de tela destacado para começar a compartilhar!",
    },
    pictureInPicture: {
        title: "Picture in Picture",
        description:
            "Use o modo Picture in Picture para manter as chamadas de vídeo visíveis enquanto navega pelo mapa. Ótimo para multitarefa!",
        hint: "Clique no botão PiP destacado para ativá-lo!",
    },
    complete: {
        title: "Você está pronto! 🎉",
        description:
            "Você aprendeu o básico de {worldName}! Sinta-se à vontade para explorar, conhecer novas pessoas e se divertir. Você sempre pode acessar a ajuda no menu se precisar.",
    },
    tips: {
        label: "Dica",
        next: "Próximo",
        gotIt: "Entendi",
        close: "Fechar",
        stopShowing: "Parar de mostrar dicas",
        restartTutorial: "Reiniciar o tutorial",
        showMe: "Mostrar",
        notNow: "Agora não",
    },
    announcements: {
        tours: {
            title: "Dicas e tours guiados",
            text: "O WorkAdventure agora apresenta seus recursos, uma dica curta de cada vez. Encontre todas elas, e o tutorial, em **{help}** nas configurações.",
        },
    },
    mapEditorTour: {
        title: "Posicione móveis com o editor de mapa",
        openMenu: {
            title: "Deixe este lugar com a sua cara",
            text: "Você pode alterar este mapa. Abra o menu **{menu}** para começar.",
        },
        openEditor: "Clique em **{editor}**.",
        placeObject: {
            title: "Posicione móveis",
            text: "Escolha um objeto nesta lista e clique no mapa para posicioná-lo.",
        },
    },
} satisfies Translation["onboarding"];
