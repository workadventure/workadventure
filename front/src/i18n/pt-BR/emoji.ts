import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const emoji: DeepPartial<Translation["emoji"]> = {
    search: "Pesquisar emojis...",
    categories: {
        recents: "Emojis recentes",
        smileys: "Sorrisos e Emoções",
        people: "Pessoas e Corpo",
        animals: "Animais e Natureza",
        food: "Comida e bebida",
        activities: "Atividades",
        travel: "Viagens e lugares",
        objects: "Objetos",
        symbols: "Símbolos",
        flags: "Bandeiras",
        custom: "Personalizado",
    },
    notFound: "Nenhum emoji encontrado",
};

export default emoji;
