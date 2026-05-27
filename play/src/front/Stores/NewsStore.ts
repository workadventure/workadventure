import { get, writable } from "svelte/store";
import type { NewsData } from "@workadventure/messages";
import { axiosToPusher } from "../Connection/AxiosUtils";
import { localUserStore } from "../Connection/LocalUserStore";

function createNewsStore() {
    const { subscribe, set } = writable<NewsData[]>([]);
    let playUri: string | undefined;

    return {
        subscribe,
        setNews(news: NewsData[] | undefined, roomUrl?: string): void {
            playUri = roomUrl;
            set(news ?? []);
        },
        clear(): void {
            playUri = undefined;
            set([]);
        },
        async markAsRead(): Promise<void> {
            const news = get({ subscribe });
            if (news.length === 0) {
                return;
            }

            const token = localUserStore.getAuthToken();
            if (!token) {
                set([]);
                return;
            }

            try {
                await axiosToPusher.post("/news/bulk-read", {
                    token,
                    playUri: playUri ?? window.location.href,
                });
            } catch (err) {
                console.error("Unable to mark news as read", err);
            } finally {
                set([]);
            }
        },
    };
}

export const newsStore = createNewsStore();
