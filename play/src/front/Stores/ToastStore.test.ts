import { get, writable } from "svelte/store";
import { describe, expect, it, vi } from "vitest";
import type { WorkAdventureComponent } from "../../types/component";
import { createToastStore } from "./ToastStore";
import type { ToastInput } from "./ToastStore";

const FirstToast = (() => undefined) as unknown as WorkAdventureComponent;
const SecondToast = (() => undefined) as unknown as WorkAdventureComponent;

describe("ToastStore", () => {
    it("adds and removes imperative toasts", () => {
        const store = createToastStore();

        store.addToast(FirstToast, { message: "Hello" }, "first-toast");

        expect(get(store).get("first-toast")).toEqual({
            component: FirstToast,
            props: {
                message: "Hello",
                toastUuid: "first-toast",
            },
        });

        store.removeToast("first-toast");

        expect(get(store).has("first-toast")).toBe(false);
    });

    it("registers a source toast with an explicit uuid", () => {
        const store = createToastStore();
        const source = writable<ToastInput | undefined>(undefined);

        const unregister = store.registerToastSource(source, undefined, "source-toast");

        expect(get(store).has("source-toast")).toBe(false);

        source.set({ component: FirstToast, props: { message: "From source" } });

        expect(get(store).get("source-toast")).toEqual({
            component: FirstToast,
            props: {
                message: "From source",
                toastUuid: "source-toast",
            },
        });

        source.set(undefined);

        expect(get(store).has("source-toast")).toBe(false);

        unregister();
    });

    it("registers initial source toasts", () => {
        const source = writable<ToastInput | undefined>({
            component: FirstToast,
            props: { message: "Initial source" },
        });
        const store = createToastStore([{ source, uuid: "initial-source-toast" }]);

        expect(get(store).get("initial-source-toast")).toEqual({
            component: FirstToast,
            props: {
                message: "Initial source",
                toastUuid: "initial-source-toast",
            },
        });

        source.set(undefined);

        expect(get(store).has("initial-source-toast")).toBe(false);
    });

    it("registers a source toast without an explicit uuid", () => {
        const store = createToastStore();
        const source = writable<ToastInput | undefined>({ component: FirstToast });

        const unregister = store.registerToastSource(source);
        const entries = Array.from(get(store).entries());

        expect(entries).toHaveLength(1);
        const [toastUuid, toast] = entries[0];
        expect(toastUuid).not.toBe("");
        expect(toast).toEqual({
            component: FirstToast,
            props: {
                toastUuid,
            },
        });

        unregister();
    });

    it("updates source toasts when the source changes", () => {
        const store = createToastStore();
        const source = writable<ToastInput | undefined>({ component: FirstToast });

        store.registerToastSource(source, undefined, "source-toast");

        source.set({ component: SecondToast, props: { severity: "warning" } });

        expect(get(store).get("source-toast")).toEqual({
            component: SecondToast,
            props: {
                severity: "warning",
                toastUuid: "source-toast",
            },
        });
    });

    it("unregisters source toasts", () => {
        const store = createToastStore();
        const source = writable<ToastInput | undefined>({ component: FirstToast });

        const unregister = store.registerToastSource(source, undefined, "source-toast");

        expect(get(store).has("source-toast")).toBe(true);

        unregister();

        expect(get(store).has("source-toast")).toBe(false);
    });

    it("delegates source toast removal to the source options", () => {
        const store = createToastStore();
        const source = writable<ToastInput | undefined>({ component: FirstToast });
        const onRemove = vi.fn(() => {
            source.set(undefined);
        });

        store.registerToastSource(source, { onRemove }, "source-toast");

        store.removeToast("source-toast");

        expect(onRemove).toHaveBeenCalledOnce();
        expect(get(store).has("source-toast")).toBe(false);
    });
});
