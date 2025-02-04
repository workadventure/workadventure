import { readable } from "svelte/store";

export const screenOrientationStore = readable<"landscape" | "portrait">("landscape", (set) => {
    const update = () => {
        set(window.innerWidth > window.innerHeight ? "landscape" : "portrait");
    };

    window.addEventListener("resize", update);
    update();

    return () => {
        window.removeEventListener("resize", update);
    };
});
