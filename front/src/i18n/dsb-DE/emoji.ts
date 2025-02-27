import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const emoji: DeepPartial<Translation["emoji"]> = {
    search: "Emoje pytaś...",
    categories: {
        recents: "Gano wužyte",
        smileys: "Smileys & emocije",
        people: "Cłowjeki & śěło",
        animals: "Zwěrjeta & natura",
        food: "Jěź & piśe",
        activities: "Aktiwity",
        travel: "Drogowanje & městnosći",
        objects: "Objekty",
        symbols: "Symbole",
        flags: "Fony",
        custom: "Wót wužywarja wustajone",
    },
    notFound: "Žedne emojije njejsu se namakali",
};

export default emoji;
