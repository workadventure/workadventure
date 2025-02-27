import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const emoji: DeepPartial<Translation["emoji"]> = {
    search: "Buscar emojis...",
    categories: {
        recents: "Emojis recientes",
        smileys: "Smileys & emociones",
        people: "Gente & cuerpo",
        animals: "Animales & naturaleza",
        food: "Comida & bebidas",
        activities: "Actividades",
        travel: "Viajes & Lugares",
        objects: "Objetos",
        symbols: "Símbolos",
        flags: "Banderas",
        custom: "Personalizado",
    },
    notFound: "No se encontraron emojis",
};

export default emoji;
