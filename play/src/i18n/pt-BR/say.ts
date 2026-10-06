import type { BaseTranslation } from "../i18n-types";

const say: BaseTranslation = {
    type: {
        say: "Falar",
        think: "Pensar",
    },
    placeholder: "Digite sua mensagem aqui...",
    button: "Criar bolha",
    tooltip: {
        description: {
            say: "Exibe uma bolha de chat acima do seu personagem. Visível para todos que podem ver seu personagem, permanece exibida por 5 segundos.",
            think: "Exibe uma bolha de pensamento acima do seu personagem. Visível para todos que podem ver seu personagem, permanece exibida enquanto você não se mover.",
        },
    },
};

export default say;
