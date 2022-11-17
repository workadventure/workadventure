import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const trigger: DeepPartial<Translation["trigger"]> = {
    cowebsite: "Appuyez sur ESPACE ou ici pour ouvrir le site Web",
    jitsiRoom: "Appuyez sur ESPACE ou ici pour entrer dans la salle conférence Jitsi",
    newTab: "Appuyez sur ESPACE ou ici pour ouvrir le site Web dans un nouvel onglet",
};

export default trigger;
