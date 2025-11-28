declare module "*.svg" {
    import type { ComponentType, SvelteComponent } from "svelte";
    const content: ComponentType<SvelteComponent>;
    export default content;
}
