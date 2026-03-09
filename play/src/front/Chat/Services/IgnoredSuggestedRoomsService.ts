import { writable, type Readable } from "svelte/store";
import { asError } from "catch-unknown";

const DB_NAME = "workadventure-chat";
const DB_VERSION = 2;
const STORE_NAME = "ignoredSuggestedRooms";

export type IgnoredByFolderEntry = {
    chatId: string;
    folderId: string;
    roomIds: string[];
};

class IgnoredSuggestedRoomsService {
    private db: IDBDatabase | null = null;

    private readonly data = writable<Map<string, Set<string>>>(new Map());

    constructor() {
        this.initDatabase();
    }

    private initDatabase(): void {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (db.objectStoreNames.contains("drafts")) {
                db.deleteObjectStore("drafts");
            }
            if (!db.objectStoreNames.contains("drafts")) {
                db.createObjectStore("drafts", { keyPath: ["userId", "roomId"] });
            }
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: ["chatId", "folderId"] });
            }
        };

        request.onsuccess = (event: Event) => {
            this.db = (event.target as IDBOpenDBRequest).result;
            this.loadAllIntoStore();
        };

        request.onerror = () => {
            console.error("Error while opening IndexedDB for ignored suggested rooms");
        };
    }

    private loadAllIntoStore(): void {
        if (!this.db) return;
        const transaction = this.db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            const entries = (request.result as IgnoredByFolderEntry[]) ?? [];
            const map = new Map<string, Set<string>>();
            for (const { chatId, folderId, roomIds } of entries) {
                map.set(`${chatId}:${folderId}`, new Set(roomIds));
            }
            this.data.set(map);
        };

        request.onerror = () => {
            console.error("Error while loading ignored suggested rooms from IndexedDB");
        };
    }

    getIgnoredStore(): Readable<Map<string, Set<string>>> {
        return this.data;
    }

    async addIgnoredRoom(chatId: string, folderId: string, roomId: string): Promise<void> {
        const compositeKey = `${chatId}:${folderId}`;

        this.data.update((map) => {
            const next = new Map(map);
            const existingSet = next.get(compositeKey) ?? new Set<string>();
            if (existingSet.has(roomId)) return map;
            next.set(compositeKey, new Set([...existingSet, roomId]));
            return next;
        });

        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve();
                return;
            }

            const transaction = this.db.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const getRequest = store.get([chatId, folderId]);

            getRequest.onsuccess = () => {
                const existing = (getRequest.result as IgnoredByFolderEntry | undefined) ?? {
                    chatId,
                    folderId,
                    roomIds: [],
                };
                if (existing.roomIds.includes(roomId)) {
                    resolve();
                    return;
                }
                const roomIds = [...existing.roomIds, roomId];
                const putRequest = store.put({ chatId, folderId, roomIds });

                putRequest.onsuccess = () => resolve();

                putRequest.onerror = () => {
                    console.error("Error while saving ignored suggested room");
                    reject(asError(putRequest.error));
                };
            };

            getRequest.onerror = () => {
                console.error("Error while reading ignored suggested rooms");
                reject(asError(getRequest.error));
            };
        });
    }
}

export const ignoredSuggestedRoomsService = new IgnoredSuggestedRoomsService();
