import { afterEach, describe, expect, it, vi } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import type { NewsData } from "@workadventure/messages";
import NewsModal from "../../../src/front/Components/News/NewsModal.svelte";

const { news } = vi.hoisted(() => ({ news: { set: (_value: NewsData[]) => {} } }));
vi.mock("../../../src/front/Stores/NewsStore", async () => {
    const { writable } = await import("svelte/store");
    const store = writable<NewsData[]>([]);
    news.set = store.set;
    return { newsStore: { subscribe: store.subscribe, markAsRead: () => Promise.resolve() } };
});
vi.mock("../../../src/i18n/i18n-svelte", async () => {
    const { readable } = await import("svelte/store");
    const label = () => "label";
    return {
        LL: readable({
            news: { label, title: label, skip: label, previous: () => "Previous", next: () => "Next", finish: label },
        }),
    };
});

const items = (...urls: string[]): NewsData[] => urls.map((iframeUrl, id) => ({ id, iframeUrl }));

describe("NewsModal", () => {
    const target = document.createElement("div");
    let component: ReturnType<typeof mount> | undefined;

    const iframeSrc = () => target.querySelector("iframe")?.getAttribute("src");
    const click = (name: string) =>
        [...target.querySelectorAll("button")].find((button) => button.textContent?.trim() === name)?.click();

    afterEach(async () => {
        const mountedComponent = component;
        component = undefined;
        if (mountedComponent) await unmount(mountedComponent, { outro: false });
        target.replaceChildren();
        news.set([]);
    });

    it("walks through the news", () => {
        news.set(items("https://a.test/", "https://b.test/"));
        component = mount(NewsModal, { target, intro: false });

        expect(iframeSrc()).toBe("https://a.test/");
        click("Next");
        flushSync();
        expect(iframeSrc()).toBe("https://b.test/");
        expect(target.textContent).toContain("2 / 2");
        click("Previous");
        flushSync();
        expect(iframeSrc()).toBe("https://a.test/");
    });

    it("falls back to the first news when the list shrinks under the selection", () => {
        news.set(items("https://a.test/", "https://b.test/"));
        component = mount(NewsModal, { target, intro: false });
        click("Next");
        flushSync();

        news.set(items("https://c.test/"));
        flushSync();

        expect(iframeSrc()).toBe("https://c.test/");
    });

    it("refuses a non-http iframe url", () => {
        news.set(items("javascript:alert(1)"));
        component = mount(NewsModal, { target, intro: false });

        expect(target.querySelector("[role='dialog']")).not.toBeNull();
        expect(target.querySelector("iframe")).toBeNull();
    });
});
