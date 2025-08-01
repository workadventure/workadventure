import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const woka: DeepPartial<Translation["woka"]> = {
    customWoka: {
        title: "Personalize seu personagem",
        navigation: {
            finish: "Terminar",
            backToDefaultWoka: "Voltar ao WOKA padrão",
        },
        randomize: "Losowy",
    },
    selectWoka: {
        title: "Selecionar seu personagem",
        continue: "Continuar",
        customize: "Customizar seu personagem",
        randomize: "Losowy",
    },
    menu: {
        businessCard: "Cartão de visitas",
    },
};

export default woka;
