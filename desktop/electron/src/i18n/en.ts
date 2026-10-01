// Native strings (no world behind them): Landing, tab strip, application menu, tray, sign-in /
// sign-out screens, screen-identify overlay. English is the reference: every other locale must
// define exactly these keys (enforced by the NativeStrings type). Placeholders are `{name}`.
const en = {
    "landing.heading": "Your workplace, one URL away.",
    "landing.intro":
        "Open a world you already belong to, or create a new world for your team. Your last world will reopen automatically next time.",
    "landing.recentWorlds": "Recent worlds",
    "landing.joinTitle": "Join a world",
    "landing.joinHint": "Paste the complete URL from your invitation or browser.",
    "landing.urlLabel": "Enter your world URL",
    "landing.openWorld": "Open world",
    "landing.or": "or",
    "landing.createTitle": "Create a world",
    "landing.createHint": "Set up a new virtual office from the WorkAdventure administration console.",
    "landing.createWorld": "Create world",
    "landing.explore": "Explore",
    "landing.opening": "Opening…",
    "landing.pinWorld": "Pin world",
    "landing.unpinWorld": "Unpin world",
    "landing.urlRequired": "Please enter a world URL.",
    "landing.urlInvalid": "This link isn't valid. Copy the full world link from your invitation or browser.",
    "landing.urlProtocol": "Your world link must start with https:// or http://.",
    "landing.urlHost":
        "This link is incomplete or contains a username or password. Copy the world link from your invitation.",
    "landing.urlNotAllowed":
        "This address isn't a WorkAdventure world the app knows. Check the link, or ask your administrator.",
    "landing.trustTitle": "Add this server?",
    "landing.trustBody":
        "{origin} isn't a WorkAdventure world the app knows. Only add a server you trust, such as your company's.",
    "landing.trustConfirm": "Add and open",
    "landing.trustCancel": "Cancel",
    "landing.joinFailed": "Couldn't join this world. Please try again.",
    "landing.signupFailed": "The signup page could not be opened.",
    "landing.desktopOnly": "This action is only available in the desktop app.",
    "landing.worldNotLoaded": "This world could not be loaded. Please check the URL and try again.",
    "landing.loadFailure": "This world could not be loaded. It may be offline, or the URL may be wrong.",
    "landing.loadTimeout": "This world is taking too long to load. It may be offline, or your connection may be down.",

    "tabs.newWorld": "New world",
    "tabs.world": "World",
    "tabs.closeTab": "Close tab",
    "tabs.newWorldTab": "New world tab",

    "menu.world": "World",
    "menu.newTab": "New tab",
    "menu.closeTab": "Close tab",
    "menu.nextTab": "Next tab",
    "menu.previousTab": "Previous tab",
    "menu.showTabBar": "Show tab bar",
    "menu.changeWorld": "Change world…",
    "menu.pinnedWorlds": "Pinned worlds",
    "menu.recentWorlds": "Recent worlds",
    "menu.noPinnedWorlds": "No pinned worlds",
    "menu.noRecentWorlds": "No recent worlds",
    "menu.hideTabBarTitle": "Hide the tab bar?",
    "menu.cancel": "Cancel",
    "menu.closeOneOtherTab": "Close the other tab and hide the bar",
    "menu.closeOtherTabs": "Close {count} other tabs and hide the bar",
    "menu.hideTabBarDetailOne":
        "You have {total} worlds open in tabs. Hiding the tab bar keeps the current world and closes the other one.",
    "menu.hideTabBarDetail":
        "You have {total} worlds open in tabs. Hiding the tab bar keeps the current world and closes the {count} others.",

    "tray.status.meeting": "In a meeting",
    "tray.status.do_not_disturb": "Do not disturb",
    "tray.status.busy": "Busy",
    "tray.status.back_in_a_moment": "Be right back",
    "tray.status.idle": "Idle",
    "tray.status.online": "Available",
    "tray.status.offline": "Offline",
    "tray.statusLocked": "Status can't be changed during a meeting",
    "tray.microphone": "Microphone",
    "tray.camera": "Camera",
    "tray.companionPanel": "Companion panel",
    "tray.showHide": "Show / hide",
    "tray.worlds": "Worlds",
    "tray.help": "Help",
    "tray.checkForUpdates": "Check for updates",
    "tray.openLogs": "Open logs",
    "tray.about": "About",
    "tray.quit": "Quit",

    "auth.pageTitle": "WorkAdventure sign-in",
    "auth.signingInTitle": "Signing in…",
    "auth.signingInMessage": "Finish signing in in your browser. You'll return to the app automatically.",
    "auth.signingOutTitle": "Signing out…",
    "auth.signingOutMessage": "Finish signing out in your browser. You'll return to the app automatically.",
    "auth.reopenBrowser": "Reopen the browser",
    "auth.signedIn": "Signed in. You can go back to WorkAdventure.",
    "auth.signedOut": "Signed out. You can go back to WorkAdventure.",
    "auth.closeWindow": "You can close this window.",

    "screenIdentify.clickToShare": "Click to share this screen · {size}",
    "update.checking": "Checking for updates…",
    "update.title": "WorkAdventure update",
    "update.ready": "Your update is ready. Restart WorkAdventure to install it.",
    "update.installAndRestart": "Install and restart",
    "update.installLater": "Install later",
    "update.availableTitle": "WorkAdventure update available",
    "update.availableBody": "Download and install the latest version from the WorkAdventure website.",
    "update.none": "No update available.",
};

export type NativeStringKey = keyof typeof en;
export type NativeStrings = Record<NativeStringKey, string>;

export default en;
