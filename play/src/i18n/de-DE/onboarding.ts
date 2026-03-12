import type { Translation } from "../i18n-types.ts";

export default {
    welcome: {
        title: "Willkommen bei {worldName}! 🚀",
        description:
            "Bereiten Sie sich darauf vor, eine virtuelle Welt zu erkunden, in der Sie sich bewegen, mit anderen chatten und in Echtzeit zusammenarbeiten können. Machen wir eine kurze Tour, um Ihnen den Einstieg zu erleichtern!",
        start: "Los geht's!",
        skip: "Tutorial überspringen",
    },
    movement: {
        title: "Bewegen",
        descriptionDesktop:
            "Verwenden Sie die Pfeiltasten oder WASD, um Ihren Charakter zu bewegen. Sie können auch mit Rechtsklick bewegen. Versuchen Sie jetzt, sich zu bewegen!",
        descriptionMobile:
            "Verwenden Sie den Joystick oder tippen Sie auf die Karte, um Ihren Charakter zu bewegen. Versuchen Sie jetzt, sich zu bewegen!",
        next: "Weiter",
    },
    communication: {
        title: "Kommunikationsblasen",
        description:
            "Wenn Sie sich anderen Spielern nähern, treten Sie automatisch in eine Kommunikationsblase ein. Sie können mit anderen in derselben Blase chatten!",
        video: "./static/Videos/Meet.mp4",
        next: "Verstanden!",
    },
    lockBubble: {
        title: "Ihre Unterhaltung sperren",
        description:
            "Klicken Sie auf die Sperrtaste, um zu verhindern, dass andere Ihrer Kommunikationsblase beitreten. Das ist nützlich für private Diskussionen!",
        video: "./static/Videos/LockBubble.mp4",
        hint: "Klicken Sie auf die hervorgehobene Sperrtaste, um es auszuprobieren!",
        next: "Weiter",
    },
    screenSharing: {
        title: "Ihren Bildschirm teilen",
        description:
            "Teilen Sie Ihren Bildschirm mit anderen in Ihrer Kommunikationsblase. Perfekt für Präsentationen und Zusammenarbeit!",
        video: "./static/images/screensharing.mp4",
        hint: "Klicken Sie auf die hervorgehobene Bildschirmfreigabetaste, um mit dem Teilen zu beginnen!",
        next: "Weiter",
    },
    pictureInPicture: {
        title: "Bild-im-Bild",
        description:
            "Verwenden Sie den Bild-im-Bild-Modus, um Videoanrufe sichtbar zu halten, während Sie auf der Karte navigieren. Großartig für Multitasking!",
        video: "./static/Videos/PictureInPicture.mp4",
        hint: "Klicken Sie auf die hervorgehobene PiP-Taste, um sie zu aktivieren!",
        next: "Weiter",
    },
    complete: {
        title: "Sie sind bereit! 🎉",
        description:
            "Sie haben die Grundlagen von {worldName} gelernt! Erkunden Sie gerne, treffen Sie neue Leute und haben Sie Spaß. Sie können jederzeit über das Menü auf Hilfe zugreifen, wenn Sie sie benötigen.",
        finish: "Erkunden beginnen!",
    },
} satisfies Translation["onboarding"];
