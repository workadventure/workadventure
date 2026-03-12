import type { Translation } from "../i18n-types.ts";

export default {
    welcome: {
        title: "Bem-vindo ao {worldName}! 🚀",
        description:
            "Prepare-se para explorar um mundo virtual onde você pode se mover, conversar com outros e colaborar em tempo real. Vamos fazer um tour rápido para ajudá-lo a começar!",
        start: "Vamos lá!",
        skip: "Pular tutorial",
    },
    movement: {
        title: "Mover-se",
        descriptionDesktop:
            "Use as setas do teclado ou WASD para mover seu personagem. Você também pode clicar com o botão direito para se mover. Tente se mover agora!",
        descriptionMobile: "Use o joystick ou toque no mapa para mover seu personagem. Tente se mover agora!",
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
        video: "./static/Videos/LockBubble.mp4",
        hint: "Clique no botão de bloqueio destacado para experimentar!",
        next: "Próximo",
    },
    screenSharing: {
        title: "Compartilhar sua tela",
        description:
            "Compartilhe sua tela com outros na sua bolha de conversa. Perfeito para apresentações e colaboração!",
        video: "./static/images/screensharing.mp4",
        hint: "Clique no botão de compartilhamento de tela destacado para começar a compartilhar!",
        next: "Próximo",
    },
    pictureInPicture: {
        title: "Picture in Picture",
        description:
            "Use o modo Picture in Picture para manter as chamadas de vídeo visíveis enquanto navega pelo mapa. Ótimo para multitarefa!",
        video: "./static/Videos/PictureInPicture.mp4",
        hint: "Clique no botão PiP destacado para ativá-lo!",
        next: "Próximo",
    },
    complete: {
        title: "Você está pronto! 🎉",
        description:
            "Você aprendeu o básico de {worldName}! Sinta-se à vontade para explorar, conhecer novas pessoas e se divertir. Você sempre pode acessar a ajuda no menu se precisar.",
        finish: "Começar a explorar!",
    },
} satisfies Translation["onboarding"];
