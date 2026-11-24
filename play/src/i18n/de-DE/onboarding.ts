import type { Translation } from "../i18n-types";

export default {
    welcome: {
        title: "Willkommen bei {worldName}! 🚀",
        description:
            "Bereiten Sie sich darauf vor, eine virtuelle Welt zu erkunden, in der Sie sich bewegen, mit anderen chatten und in Echtzeit zusammenarbeiten können. Machen wir eine kurze Tour, um Ihnen den Einstieg zu erleichtern!",
    },
    movement: {
        title: "Bewegen",
        descriptionDesktop:
            "Verwenden Sie die Pfeiltasten oder WASD, um Ihren Charakter zu bewegen. Sie können auch mit Rechtsklick bewegen. Versuchen Sie jetzt, sich zu bewegen!",
        descriptionTouch:
            "Tippen Sie auf die Karte, um dorthin zu gehen, und ziehen Sie, um sich umzusehen. Versuchen Sie jetzt, sich zu bewegen!",
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
        hint: "Klicken Sie auf die hervorgehobene Sperrtaste, um es auszuprobieren!",
    },
    screenSharing: {
        title: "Ihren Bildschirm teilen",
        description:
            "Teilen Sie Ihren Bildschirm mit anderen in Ihrer Kommunikationsblase. Perfekt für Präsentationen und Zusammenarbeit!",
        hint: "Klicken Sie auf die hervorgehobene Bildschirmfreigabetaste, um mit dem Teilen zu beginnen!",
    },
    pictureInPicture: {
        title: "Bild-im-Bild",
        description:
            "Verwenden Sie den Bild-im-Bild-Modus, um Videoanrufe sichtbar zu halten, während Sie auf der Karte navigieren. Großartig für Multitasking!",
        hint: "Klicken Sie auf die hervorgehobene PiP-Taste, um sie zu aktivieren!",
    },
    complete: {
        title: "Sie sind bereit! 🎉",
        description:
            "Sie haben die Grundlagen von {worldName} gelernt! Erkunden Sie gerne, treffen Sie neue Leute und haben Sie Spaß. Sie können jederzeit über das Menü auf Hilfe zugreifen, wenn Sie sie benötigen.",
    },
    tips: {
        label: "Tipp",
        next: "Weiter",
        gotIt: "Verstanden",
        close: "Schließen",
        stopShowing: "Keine Tipps mehr anzeigen",
        restartTutorial: "Tutorial neu starten",
        showMe: "Zeigen Sie es mir",
        notNow: "Nicht jetzt",
    },
    announcements: {
        tours: {
            title: "Tipps und geführte Touren",
            text: "WorkAdventure stellt Ihnen seine Funktionen jetzt in kurzen Tipps vor. Sie finden sie, ebenso wie das Tutorial, unter **{help}** in den Einstellungen.",
        },
    },
    mapEditorTour: {
        title: "Möbel mit dem Karteneditor platzieren",
        openMenu: {
            title: "Gestalten Sie diesen Ort",
            text: "Sie können diese Karte bearbeiten. Öffnen Sie das Menü **{menu}**, um zu beginnen.",
        },
        openEditor: "Klicken Sie auf **{editor}**.",
        placeObject: {
            title: "Möbel platzieren",
            text: "Wählen Sie ein Objekt aus dieser Liste und klicken Sie dann auf die Karte, um es zu platzieren.",
        },
    },
} satisfies Translation["onboarding"];
