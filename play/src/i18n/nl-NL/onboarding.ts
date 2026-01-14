import type { Translation } from "../i18n-types";

export default {
    welcome: {
        title: "Welkom bij WorkAdventure! 🚀",
        description:
            "Maak je klaar om een virtuele wereld te verkennen waar je kunt bewegen, chatten met anderen en in realtime samenwerken. Laten we een snelle rondleiding maken om je op weg te helpen!",
        start: "Laten we gaan!",
        skip: "Tutorial overslaan",
    },
    movement: {
        title: "Bewegen",
        description:
            "Gebruik de pijltjestoetsen van je toetsenbord of WASD om je personage over de kaart te bewegen. Probeer nu te bewegen!",
        next: "Volgende",
    },
    communication: {
        title: "Communicatiebellen",
        description:
            "Wanneer je dicht bij andere spelers komt, kom je automatisch in een communicatiebel. Je kunt chatten met anderen in dezelfde bel!",
        video: "./static/Videos/Meet.mp4",
        next: "Begrepen!",
    },
    lockBubble: {
        title: "Je gesprek vergrendelen",
        description:
            "Klik op de vergrendelknop om te voorkomen dat anderen zich bij je communicatiebel voegen. Dit is handig voor privégesprekken!",
        video: "./static/Videos/LockBubble.mp4",
        hint: "Klik op de gemarkeerde vergrendelknop om het uit te proberen!",
        next: "Volgende",
    },
    screenSharing: {
        title: "Je scherm delen",
        description:
            "Deel je scherm met anderen in je communicatiebel. Perfect voor presentaties en samenwerking!",
        video: "./static/images/screensharing.mp4",
        hint: "Klik op de gemarkeerde schermdelingsknop om te beginnen met delen!",
        next: "Volgende",
    },
    pictureInPicture: {
        title: "Picture in Picture",
        description:
            "Gebruik de Picture in Picture-modus om videogesprekken zichtbaar te houden terwijl je op de kaart navigeert. Geweldig voor multitasking!",
        video: "./static/Videos/PictureInPicture.mp4",
        hint: "Klik op de gemarkeerde PiP-knop om deze te activeren!",
        next: "Volgende",
    },
    complete: {
        title: "Je bent klaar! 🎉",
        description:
            "Je hebt de basis van WorkAdventure geleerd! Voel je vrij om te verkennen, nieuwe mensen te ontmoeten en plezier te hebben. Je kunt altijd hulp openen via het menu als je het nodig hebt.",
        finish: "Begin met verkennen!",
    },
} satisfies Translation["onboarding"];
