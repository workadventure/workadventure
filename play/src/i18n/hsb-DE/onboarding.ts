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
        label: "Tip",
        next: "Next",
        previous: "Previous",
        gotIt: "Got it",
        close: "Close",
        stopShowing: "Stop showing tips",
        restartTutorial: "Restart the tutorial",
        showMe: "Show me",
        notNow: "Not now",
    },
    help: {
        inConversation: "During a conversation",
        inMapEditor: "In the map editor",
        notHere: "Not available here right now",
        remindMe: "Remind me",
        showTips: "Show tips automatically",
        groups: {
            world: "This world",
            tutorial: "First visit",
            announcement: "What's new",
            conversation: "Conversations",
            chat: "Chat",
            presence: "Status and expression",
            mapEditor: "Map editor",
            navigation: "Finding people and places",
            worldAdmin: "World admin tools",
            app: "App and settings",
        },
        unseen: "{count} new",
    },
    releaseNotes: {
        title: "What's new in WorkAdventure {version}",
    },
    mapEditorTour: {
        title: "Place furniture with the map editor",
        openMenu: {
            title: "Make this place yours",
            text: "You can change this map. Open the **{menu}** menu to start.",
        },
        openEditor: "Click **{editor}**.",
        placeObject: {
            title: "Place furniture",
            text: "Pick an object in this list, then click on the map to place it.",
        },
    },
} satisfies Translation["onboarding"];
