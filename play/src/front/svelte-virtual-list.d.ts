declare module "@sveltejs/svelte-virtual-list" {
    import type { Component } from "svelte";

    interface VirtualListProps {
        items: unknown[];
        height?: string;
        itemHeight?: number;
        start?: number;
        end?: number;
    }

    const VirtualList: Component<VirtualListProps>;
    export default VirtualList;
}
