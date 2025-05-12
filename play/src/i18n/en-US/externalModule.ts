import type { BaseTranslation } from "../i18n-types";

const externalModule: BaseTranslation = {
    status: {
        onLine: "Status is ok ✅",
        offLine: "Status is offline ❌",
        warning: "Status is warning ⚠️",
        sync: "Status is syncing 🔄",
    },
    teams: {
        openingMeeting: "Opening Teams Meeting...",
        unableJoinMeeting: "Unable to join Teams Meeting!",
        userNotConnected: "You are not connected to Teams!",
        connectToYourTeams: "Connect to your Teams account 🙏",
        temasAppInfo:
            "Teams is a Microsoft 365 app that helps your team stay connected and organized. You can chat, meet, call, and collaborate all in one place 😍",
        buttonSync: "Sync my Teams 🚀",
        buttonConnect: "Connect my teams 🚀",
    },
    discord: {
        integration: "INTEGRATION",
        explainText:
            "By connecting your discord account here, you will be able to receive your messages directly in the workadventure chat. After synchronizing a server, we will create the rooms it contains, you will only have to join them in the Workadventure chat.",
        login: "Connect to Discord",
        fetchingServer: "Get your Discord servers... 👀",
        qrCodeTitle: "Scan the QR code with your Discord app to login.",
        qrCodeExplainText:
            "Scan the QR code with your Discord app to login. QR codes are time limited, sometimes you need to regenerate one",
        qrCodeRegenerate: "Get a new QR code",
        tokenInputLabel: "Discord token",
        loginToken: "Login with token",
        loginTokenExplainText: "You need to enter your Discord token. In order to perform Discord integration see",
        sendDiscordToken: "send",
        tokenNeeded: "You need to enter your Discord token. In order to perform Discord integration see",
        howToGetTokenButton: "How to get my discord login token",
        loggedIn: "Connected with:",
        saveSync: "Save and synchronize",
        logout: "Logout",
        guilds: "Discord servers",
        guildExplain: "Select channels you want to add to Workadventure chat interface.\n",
    },
};

export default externalModule;
