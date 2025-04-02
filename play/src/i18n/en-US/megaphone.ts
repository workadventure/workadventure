import type { BaseTranslation } from "../i18n-types";

const megaphone: BaseTranslation = {
    modal: {
        selectCamera: "Select a camera 📹",
        selectMicrophone: "Select a microphone 🎙️",
        liveMessage: {
            startMegaphone: "Start megaphone",
            stopMegaphone: "Stop megaphone",
            goingToStream: "You are going to stream",
            yourMicrophone: "your microphone",
            yourCamera: "your camera",
            yourScreen: "your screen",
            title: "Live message",
            button: "Start live message",
            and: "and",
            toAll: "to all participants",
            confirm: "Confirm",
            cancel: "Cancel",
            notice: `
            The live message or "Megaphone" allows you to send a live message with your camera and microphone to all the people connected in the room or the world.

            This message will be displayer at the bottom corner of the screen, like a video call or bubble discussion.

            An example of a live message use case: "Hello everyone, shall we start the conference? 🎉 Follow my avatar to the conference area and open the video app 🚀"
            `,
            settings: "Settings",
        },
        textMessage: {
            title: "Text message",
            notice: `
            The text message allows you to send a message to all the people connected in the room or the world.

            This message will be displayed as a popup at the top of the page and will be accompanied by a sound to identify that the information is readable.

            An example of a message: "The conference in room 3 starts in 2 minutes 🎉. You can go to conference area 3 and open the video app 🚀"
            `,
            button: "Send a text message",
            noAccess: "You don't have access to this feature 😱 Please contact the administrator 🙏",
        },
        audioMessage: {
            title: "Audio message",
            notice: `
            The audio message is a message of type "MP3, OGG..." sent to all users connected in the room or in the world.

            This audio message will be downloaded and launched to all people receiving this notification.

            An audio message can consist of an audio recording that indicates a conference will begin in a few minutes.
            `,
            button: "Send an audio message",
            noAccess: "You don't have access to this feature 😱 Please contact the administrator 🙏",
        },
    },
};

export default megaphone;
