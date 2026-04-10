import type { BaseTranslation } from "../i18n-types";

const warning: BaseTranslation = {
    title: "Warning!",
    content: `This world is close to its limit!. You can upgrade its capacity <a href="{upgradeLink}" target="_blank">here</a>`,
    limit: "This world is close to its limit!",
    accessDenied: {
        camera: "Camera access denied. Click here and check your browser permissions.",
        screenSharing: "Screen sharing denied. Click here and check your browser permissions.",
        teleport: "You have no right to teleport to this user.",
        room: "Room access denied. You are not allowed to enter this room.",
    },
    importantMessage: "Important message",
    connectionLost: "Connection lost. Reconnecting...",
    connectionLostTitle: "Connection lost",
    connectionLostSubtitle: "Reconnecting",
    waitingConnectionTitle: "Waiting for connection",
    waitingConnectionSubtitle: "Connecting",
    megaphoneNeeds: "To use the megaphone, you must activate your camera or your microphone or share your screen.",
    mapEditorShortCut: "There was an error while trying to open the map editor.",
    mapEditorNotEnabled: "The map editor is not enabled on this world.",
    popupBlocked: {
        title: "Popup blocked",
        content: "Please allow popups for this website in your browser settings.",
        done: "Ok",
    },
    backgroundProcessing: {
        failedToApply: "Failed to apply background effects",
    },
    duplicateUserConnected: {
        title: "Already connected",
        message:
            "You are already connected to this room from another tab or device. To avoid conflicts, please close the other tab or window.",
        confirmContinue: "I understand, continue",
        dontRemindAgain: "Don't show this message again",
    },
    browserNotSupported: {
        title: "😢 Browser Not Supported",
        message: "Your browser ({browserName}) is no longer supported by WorkAdventure.",
        description: "Your browser is too old to run WorkAdventure. Please update to the latest version to continue.",
        whatToDo: "What can you do?",
        option1: "Update {browserName} to the latest version",
        option2: "Leave WorkAdventure and use a different browser",
        updateBrowser: "Update Browser",
        leave: "Leave",
    },
    pwaInstall: {
        title: "Install WorkAdventure",
        description:
            "Install the app for a better experience: quick access, load on startup and an app-like experience.",
        descriptionIos: "Add WorkAdventure to your Home Screen for a better experience and quick access.",
        feature1Title: "Quick access",
        feature1Description: "Launch WorkAdventure from your Start menu, Dock, or desktop.",
        feature2Title: "Dedicated app window",
        feature2Description:
            "Keep WorkAdventure separate from your browser tabs and find WorkAdventure at a glance in your taskbar.",
        feature3Title: "Start with your computer",
        feature3Description: "Launch WorkAdventure when your device starts.",
        iosStepsTitle: "How to install",
        iosStep1: "Tap the Share button (square with arrow) at the bottom of Safari.",
        iosStep2: 'Scroll down and tap "Add to Home Screen".',
        iosStep3: 'Tap "Add" to confirm.',
        install: "Install WorkAdventure App",
        installing: "Installing…",
        skip: "Continuing in browser",
        continue: "Continue in browser",
        neverShowPage: "Don't ask again",
    },
};

export default warning;
