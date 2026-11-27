import type { Translation } from "../i18n-types";

export default {
    welcome: {
        title: "Welkom bij {worldName}! 🚀",
        description:
            "Maak je klaar om een virtuele wereld te verkennen waar je kunt bewegen, chatten met anderen en in realtime samenwerken. Laten we een snelle rondleiding maken om je op weg te helpen!",
    },
    movement: {
        title: "Bewegen",
        descriptionDesktop:
            "Gebruik de pijltjestoetsen of WASD om je personage te bewegen. Je kunt ook rechtsklikken om te bewegen. Probeer nu te bewegen!",
        descriptionTouch: "Tik op de kaart om erheen te lopen en sleep om rond te kijken. Probeer nu te bewegen!",
        next: "Volgende",
    },
    communication: {
        title: "Communicatiebellen",
        description:
            "Wanneer je dicht bij andere spelers komt, kom je automatisch in een communicatiebel. Je kunt chatten met anderen in dezelfde bel!",
    },
    lockBubble: {
        title: "Je gesprek vergrendelen",
        description:
            "Klik op de vergrendelknop om te voorkomen dat anderen zich bij je communicatiebel voegen. Dit is handig voor privégesprekken!",
    },
    screenSharing: {
        title: "Je scherm delen",
        description: "Deel je scherm met anderen in je communicatiebel. Perfect voor presentaties en samenwerking!",
    },
    pictureInPicture: {
        title: "Picture in Picture",
        description:
            "Gebruik de Picture in Picture-modus om videogesprekken zichtbaar te houden terwijl je op de kaart navigeert. Geweldig voor multitasking!",
    },
    complete: {
        title: "Je bent klaar! 🎉",
        description:
            "Je hebt de basis van {worldName} geleerd! Voel je vrij om te verkennen, nieuwe mensen te ontmoeten en plezier te hebben. Je kunt altijd hulp openen via het menu als je het nodig hebt.",
    },
    tips: {
        label: "Tip",
        next: "Volgende",
        previous: "Vorige",
        gotIt: "Begrepen",
        close: "Sluiten",
        stopShowing: "Geen tips meer tonen",
        restartTutorial: "Tutorial opnieuw starten",
        showMe: "Laat zien",
        notNow: "Niet nu",
    },
    help: {
        inConversation: "Tijdens een gesprek",
        inMapEditor: "In de kaarteditor",
        notHere: "Hier nu niet beschikbaar",
        remindMe: "Herinner me",
        showTips: "Tips automatisch tonen",
        groups: {
            world: "Deze wereld",
            tutorial: "Eerste bezoek",
            announcement: "Nieuw",
            conversation: "Gesprekken",
            chat: "Chat",
            presence: "Status en expressie",
            mapEditor: "Kaarteditor",
            navigation: "Mensen en plekken vinden",
            worldAdmin: "Hulpmiddelen voor wereldbeheer",
            app: "App en instellingen",
        },
        unseen: "{count} nieuw",
    },
    releaseNotes: {
        title: "Nieuw in WorkAdventure {version}",
    },
    mapEditorTour: {
        title: "Meubels plaatsen met de kaarteditor",
        openMenu: {
            title: "Maak deze plek de jouwe",
            text: "Je kunt deze kaart aanpassen. Open het menu **{menu}** om te beginnen.",
        },
        openEditor: "Klik op **{editor}**.",
        placeObject: {
            title: "Meubels plaatsen",
            text: "Kies een object uit deze lijst en klik dan op de kaart om het te plaatsen.",
        },
    },
} satisfies Translation["onboarding"];
