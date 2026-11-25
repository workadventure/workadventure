import type { Translation } from "../i18n-types";

export default {
    welcome: {
        title: "Welcome to {worldName}! 🚀",
        description:
            "Get ready to explore a virtual world where you can move around, chat with others, and collaborate in real-time. Let's take a quick tour to help you get started!",
    },
    movement: {
        title: "Move around",
        descriptionDesktop:
            "Use your keyboard arrow keys or WASD to move your character. You can also right-click to move. Try moving now!",
        descriptionTouch: "Tap on the map to walk there, and drag to look around. Try moving now!",
        next: "Next",
    },
    communication: {
        title: "Communication bubbles",
        description:
            "When you get close to other players, you'll automatically enter a communication bubble. You can chat with others in the same bubble!",
    },
    lockBubble: {
        title: "Lock your conversation",
        description:
            "Click the lock button to prevent others from joining your conversation bubble. This is useful for private discussions!",
    },
    screenSharing: {
        title: "Share your screen",
        description:
            "Share your screen with others in your conversation bubble. Perfect for presentations and collaboration!",
    },
    pictureInPicture: {
        title: "Picture in Picture",
        description:
            "Use Picture in Picture mode to keep video calls visible while you navigate the map. Great for multitasking!",
    },
    complete: {
        title: "You're all set! 🎉",
        description:
            "You've learned the basics of {worldName}! Feel free to explore, meet new people, and have fun. You can always access help from the menu if you need it.",
    },
    tips: {
        label: "Consell",
        next: "Següent",
        gotIt: "Entesos",
        close: "Tanca",
        stopShowing: "No mostris més consells",
        restartTutorial: "Reinicia el tutorial",
        showMe: "Mostra-m'ho",
        notNow: "Ara no",
    },
    releaseNotes: {
        title: "Novetats de WorkAdventure {version}",
    },
    mapEditorTour: {
        title: "Col·loca mobles amb l'editor de mapes",
        openMenu: {
            title: "Fes teu aquest lloc",
            text: "Pots modificar aquest mapa. Obre el menú **{menu}** per començar.",
        },
        openEditor: "Fes clic a **{editor}**.",
        placeObject: {
            title: "Col·loca mobles",
            text: "Tria un objecte d'aquesta llista i fes clic al mapa per col·locar-lo.",
        },
    },
} satisfies Translation["onboarding"];
