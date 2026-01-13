import type { Translation } from "../i18n-types";

export default {
    welcome: {
        title: "Welcome to WorkAdventure! 🎮",
        description:
            "Get ready to explore a virtual world where you can move around, chat with others, and collaborate in real-time. Let's take a quick tour to help you get started!",
        start: "Let's go!",
    },
    movement: {
        title: "Move around",
        description:
            "Use your keyboard arrow keys or WASD to move your character around the map. Try moving now!",
    },
    communication: {
        title: "Communication bubbles",
        description:
            "When you get close to other players, you'll automatically enter a communication bubble. You can chat with others in the same bubble!",
        image: "./static/images/communication-bubble.png",
        next: "Got it!",
    },
    lockBubble: {
        title: "Lock your conversation",
        description:
            "Click the lock button to prevent others from joining your conversation bubble. This is useful for private discussions!",
        video: "./static/Videos/LockBubble.mp4",
        hint: "Click the highlighted lock button to try it out!",
    },
    screenSharing: {
        title: "Share your screen",
        description:
            "Share your screen with others in your conversation bubble. Perfect for presentations and collaboration!",
        video: "./static/images/screensharing.mp4",
        hint: "Click the highlighted screen share button to start sharing!",
    },
    pictureInPicture: {
        title: "Picture in Picture",
        description:
            "Use Picture in Picture mode to keep video calls visible while you navigate the map. Great for multitasking!",
        video: "./static/Videos/PictureInPicture.mp4",
        hint: "Click the highlighted PiP button to activate it!",
    },
    complete: {
        title: "You're all set! 🎉",
        description:
            "You've learned the basics of WorkAdventure! Feel free to explore, meet new people, and have fun. You can always access help from the menu if you need it.",
        finish: "Start exploring!",
    },
} satisfies Translation["onboarding"];
