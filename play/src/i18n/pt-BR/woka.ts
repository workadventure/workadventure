import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const woka: DeepPartial<Translation["woka"]> = {
    customWoka: {
        title: "Personalize seu personagem",
        navigation: {
            return: "Retornar",
            back: "Voltar",
            finish: "Terminar",
            next: "Próximo",
        },
    },
    selectWoka: {
        title: "Selecionar seu personagem",
        continue: "Continuar",
        customize: "Customizar seu personagem",
    },
    menu: {
        businessCard: "Cartão de visitas",
    },
};

export default woka;
