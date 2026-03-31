import { asError } from "catch-unknown";

export type DraftMessage = {
    id?: string;
    roomId: string;
    userId: string | null;
    message: string;
    replyingToMessageId?: string | null;
};

class DraftMessageService {
    private db: IDBDatabase | null = null;

    constructor() {
        this.initDatabase();
    }

    private static readonly DB_NAME = "workadventure-chat";
    private static readonly DB_VERSION = 2;

    private initDatabase() {
        const request = indexedDB.open(DraftMessageService.DB_NAME, DraftMessageService.DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (db.objectStoreNames.contains("drafts")) {
                db.deleteObjectStore("drafts");
            }
            if (!db.objectStoreNames.contains("drafts")) {
                db.createObjectStore("drafts", { keyPath: ["userId", "roomId"] });
            }
            if (!db.objectStoreNames.contains("ignoredSuggestedRooms")) {
                db.createObjectStore("ignoredSuggestedRooms", { keyPath: ["chatId", "folderId"] });
            }
        };

        request.onsuccess = (event) => {
            this.db = (event.target as IDBOpenDBRequest).result;
        };

        request.onerror = (event) => {
            console.error("Error while opening IndexedDB :", event);
        };
    }

    public saveDraft(draft: DraftMessage) {
        if (!this.db) return;
        const transaction = this.db.transaction("drafts", "readwrite");
        const store = transaction.objectStore("drafts");
        const userId = draft.userId ?? "0";
        store.put({
            userId,
            roomId: draft.roomId,
            message: draft.message,
            replyingToMessageId: draft.replyingToMessageId ?? null,
        });
    }

    public async loadDraft(roomId: string, userId: string | null): Promise<DraftMessage | null> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve(null);
                return;
            }

            const transaction = this.db.transaction("drafts", "readonly");
            const store = transaction.objectStore("drafts");
            const keyUserId = userId ?? "0";
            const request = store.get([keyUserId, roomId]);

            request.onsuccess = (event) => {
                const draft = (event.target as IDBRequest).result;
                if (!draft) {
                    resolve(null);
                    return;
                }
                resolve({
                    id: `${roomId}-${keyUserId}`,
                    roomId: draft.roomId,
                    userId: draft.userId === "0" ? null : draft.userId,
                    message: draft.message,
                    replyingToMessageId: draft.replyingToMessageId ?? null,
                });
            };

            request.onerror = (event) => {
                console.error("Error while loading draft:", event);
                reject(asError(event));
            };
        });
    }

    public deleteDraft(roomId: string, userId: string | null) {
        if (!this.db) return;

        const transaction = this.db.transaction("drafts", "readwrite");
        const store = transaction.objectStore("drafts");
        store.delete([userId ?? "0", roomId]);
    }
}

export const draftMessageService = new DraftMessageService();
