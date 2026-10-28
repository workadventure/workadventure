// Throwaway screenshot harness (not committed).
import "./front/style/index.css";
import { mount } from "svelte";
import { readable, writable } from "svelte/store";
import { setLocale } from "./i18n/i18n-svelte";
import { loadLocaleAsync } from "./i18n/i18n-util.async";

const params = new URLSearchParams(location.search);
const locale = (params.get("lang") ?? "en-US") as "en-US";
await loadLocaleAsync(locale);
setLocale(locale);
const width = Number(params.get("w") ?? 740);
const empty = params.get("state") === "empty";
if (params.get("listw")) localStorage.setItem("chatRoomListWidth", params.get("listw") as string);
else localStorage.removeItem("chatRoomListWidth");
const target = document.getElementById("app") as HTMLElement;
target.style.width = `${width}px`;

function fake<T extends object>(known: T): T {
    return new Proxy(known, {
        get: (obj, prop) => (prop in obj ? obj[prop as keyof T] : prop === "then" ? undefined : readable(false)),
    });
}

const now = Date.now();
const colors = ["#f9c46b", "#b7c4ff", "#f2c4de", "#9be7c4", "#ffb38a", "#c9b3ff"];
let colorIndex = 0;
function room(
    id: string,
    name: string,
    opts: { direct?: boolean; count?: number; mention?: boolean; muted?: boolean; minutesAgo: number; body: string; sender?: string },
) {
    const count = empty ? 0 : (opts.count ?? 0);
    const timestamp = now - opts.minutesAgo * 60_000;
    return fake({
        id,
        name: readable(name),
        type: readable(opts.direct ? "direct" : "multiple"),
        conversationKind: "room",
        hasUnreadMessages: readable(count > 0),
        unreadNotificationCount: readable(count),
        hasUnreadMentions: readable(!empty && !!opts.mention),
        areNotificationsMuted: readable(!!opts.muted),
        isEncrypted: readable(false),
        pictureStore: readable(undefined),
        avatarFallbackColor: readable(colors[colorIndex++ % colors.length]),
        peerWaDisplayNameIfDifferent: undefined,
        activateVisibleProfileSync: undefined,
        lastMessageTimestamp: timestamp,
        lastMessagePreview: readable({ body: opts.body, senderName: opts.sender ?? name, timestamp }),
        members: readable([]),
        isRoomFolder: false,
        hasPermissionTo: () => readable(false),
        muteNotification: () => Promise.resolve(),
        unmuteNotification: () => Promise.resolve(),
    });
}

const directRooms = [
    room("!dm1", "Alex Martin", { direct: true, count: 1, minutesAgo: 12, body: "Can you review my part before tomorrow?" }),
    room("!dm2", "Sam Lee", { direct: true, minutesAgo: 60 * 26, body: "Thanks, see you on Monday!" }),
    room("!dm3", "Jordan Petit", { direct: true, minutesAgo: 60 * 50, body: "Sent you the slides" }),
];
const rooms = [
    room("!general", "general", { count: 3, mention: true, minutesAgo: 25, body: "@Camille can you confirm the meeting room?", sender: "Taylor Morgan" }),
    room("!design", "design-team", { count: 5, minutesAgo: 40, body: "New mockups are in the shared folder", sender: "Robin Garcia" }),
    room("!alpha", "project-alpha", { minutesAgo: 90, body: "Deadline moved to Thursday 6 pm", sender: "Charlie Dubois" }),
    room("!random", "random", { count: 2, muted: true, minutesAgo: 120, body: "Anyone up for lunch?", sender: "Sam Lee" }),
];

const { gameManager } = await import("./front/Phaser/Game/GameManager");
const { userIsConnected } = await import("./front/Stores/MenuStore");
userIsConnected.set(true);
const chat = fake({
    connectionStatus: readable("ONLINE"),
    directRooms: readable(directRooms),
    rooms: readable(rooms),
    invitations: readable([]),
    folders: readable([]),
    shouldRetrySendingEvents: readable(false),
    isEncryptionRequiredAndNotSet: readable(false),
    isGuest: readable(false),
    nbUnreadRoomsMessages: readable(empty ? 0 : 8),
    nbUnreadDirectRoomsMessages: readable(empty ? 0 : 1),
    nbUnreadInvitationsMessages: readable(0),
});
(gameManager as unknown as { _chatConnectionStore: { set(v: unknown): void } })._chatConnectionStore.set(chat);
const scene = fake({
    room: fake({
        isChatEnabled: true,
        isChatOnlineListEnabled: false,
        isChatDisconnectedListEnabled: false,
        isMatrixChatEnabled: true,
    }),
    proximityChatRoomManager: fake({ roomsStore: writable([]), parentZoneRoomsStore: readable([]) }),
    userProviderMerger: new Promise(() => {}),
});
(gameManager as unknown as { getCurrentGameScene: () => unknown }).getCurrentGameScene = () => scene;

const { navChat } = await import("./front/Chat/Stores/ChatStore");
navChat.switchToChat();
const { default: RoomList } = await import("./front/Chat/Components/RoomList.svelte");
mount(RoomList, { target, props: { sideBarWidth: width } });
