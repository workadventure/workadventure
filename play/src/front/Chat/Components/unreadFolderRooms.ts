import { get } from "svelte/store";
import type { ChatRoom, RoomFolder } from "../Connection/ChatConnection";

/**
 * Rooms and invitations below these folders, sub-folders included.
 * A folder that was never opened has not created its rooms yet, while the unread total already counts them:
 * load the ones holding unmuted unread messages, so every counted conversation can be listed. The others stay lazy.
 */
export function collectFolderRooms(folders: readonly RoomFolder[]): ChatRoom[] {
    return folders.flatMap((folder) => {
        const summary = folder.getUnreadSummary();
        if (summary.count > 0 && !summary.muted) {
            folder.ensureChildrenLoaded();
        }
        return [...get(folder.rooms), ...get(folder.invitations), ...collectFolderRooms(get(folder.folders))];
    });
}
