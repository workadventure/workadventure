import { asError } from "catch-unknown";

export type DraftMessage = {
    id: string;
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

    private initDatabase() {
        const request = indexedDB.open("ChatDraftsDB", 1);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains("drafts")) {
                db.createObjectStore("drafts", { keyPath: "id" });
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

        store.put(draft);
    }

    public async loadDraft(id: string): Promise<DraftMessage | null> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve(null);
                return;
            }

            const transaction = this.db.transaction("drafts", "readonly");
            const store = transaction.objectStore("drafts");

            const request = store.get(id);
            request.onsuccess = (event) => {
                const draft = (event.target as IDBRequest).result;
                if (!draft) {
                    resolve(null);
                    return;
                }
                resolve(draft);
            };

            request.onerror = (event) => {
                console.error("Error while loading draft:", event);
                reject(asError(event));
            };
        });
    }

    public deleteDraft(id: string) {
        if (!this.db) return;

        const transaction = this.db.transaction("drafts", "readwrite");
        const store = transaction.objectStore("drafts");

        store.delete(id);
    }
}

export const draftMessageService = new DraftMessageService();
