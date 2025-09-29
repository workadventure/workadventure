import type { BaseTranslation } from "../i18n-types";

const area: BaseTranslation = {
    noAccess: "Desculpe, você não tem acesso a esta área.",
    personalArea: {
        claimDescription: "Esta é uma área pessoal. Você quer torná-la sua?",
        buttons: {
            yes: "Sim",
            no: "Não",
        },
        personalSpaceWithNames: "Espaço pessoal de {name}",
        alreadyHavePersonalArea: "Você já possui uma área pessoal. Ela será excluída se você reivindicar esta.",
    },
};

export default area;
