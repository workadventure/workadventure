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
        userNotConnected: "You are not synchronized with your Outlook or Google account!",
        connectToYourTeams: "Connect to your Outlook or Google account 🙏",
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
    outlook: {
        signIn: "Sign in with Outlook",
        popupScopeToSync: "Connect my Outlook Account",
        popupScopeToSyncExplainText:
            "We need to connect to your Outlook account to synchronize your calendar and/or tasks. This will allow you to view your meetings and tasks in WorkAdventure and join them directly from the map.",
        popupScopeToSyncCalendar: "Synchronize my calendar",
        popupScopeToSyncTask: "Synchronize my tasks",
        popupCancel: "Cancel",
        isSyncronized: "Synchronized with Outlook",
    },
    google: {
        signIn: "Sign in with Google",
        popupScopeToSync: "Connect my Google Account",
        popupScopeToSyncExplainText:
            "We need to connect to your Google account to synchronize your calendar and/or tasks. This will allow you to view your meetings and tasks in WorkAdventure and join them directly from the map.",
        popupScopeToSyncCalendar: "Synchronize my calendar",
        popupScopeToSyncTask: "Synchronize my tasks",
        popupCancel: "Cancel",
        isSyncronized: "Synchronized with Google",
        popupScopeToSyncMeet: "Create online meetings",
        openingMeet: "Opening Google Meet... 🙏",
        unableJoinMeet: "Unable to join Google Meet 😭",
        googleMeetPopupWaiting: {
            title: "Google Meet 🎉",
            subtitle: "Creating your Google Space… this will only take a moment 💪",
            guestError: "You’re not connected, so you can’t create a Google Meet 😭",
            guestExplain:
                "Please log in to the platform to create a Google Meet, or ask the owner to create one for you 🚀",
            error: "Your Google Workspace settings don’t allow you to create a Meet.",
            errorExplain: "No worries, you can still join meetings when someone else shares a link 🙏",
        },
    },
    calendar: {
        title: "Your meeting today",
        joinMeeting: "Click here to join the meeting",
    },
    todoList: {
        title: "To Do",
        sentence: "Take a break 🙏 maybe have a coffee or tea? ☕",
    },
};

export default externalModule;
