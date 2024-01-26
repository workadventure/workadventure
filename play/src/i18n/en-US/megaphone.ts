import type { BaseTranslation } from "../i18n-types";

const megaphone: BaseTranslation = {
    modal: {
        selectCamera: "Select a camera 📹",
        selectMicrophone: "Select a microphone 🎙️",
        liveMessage: {
            startMegaphone: "Start megaphone",
            goingToStream: "You are going to stream",
            yourMicrophone: "your microphone",
            yourCamera: "your camera",
            yourScreen: "your screen",
            title: "Live message",
            button: "Send a live message",
            and: "and",
            toAll: "to all participants",
            confirm: "Confirm",
            cancel: "Cancel",
        },
        textMessage: {
            title: "Text message",
            notice: `
            The text message allows you to send a message to all the people connected in the room or the world.

            This message will be displayed as a popup at the top of the page and will be accompanied by a sound to identify that information is to be read.

            An example of a message: "The conference in room 3 starts in 2 minutes 🎉. You can go to conference area 3 and open the video app 🚀"
        `,
            button: "Send a text message",
        },
        audioMessage: {
            title: "Audio message",
            notice: `
            The audio message is a message of type "MP3, OGG..." sent to all users connected in the room or in the world.

            This audio message will be downloaded and launched to all people receiving this notification.

            An example of an audio message can be an audio recording to indicate that a conference will start in a few minutes.
        `,
            button: "Send an audio message",
        },
    },
};

export default megaphone;
