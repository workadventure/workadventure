<script lang="ts">
    interface Props {
        height?: string;
        width?: string;
        strokeColor?: string;
        fillColor?: string;
        hover?: string;
        hover2?: string;
        strokeWidth?: string;
        classList?: string;
    }

    let {
        height = "h-6",
        width = "w-6",
        strokeColor = "stroke-white",
        fillColor = "fill-transparent",
        hover = "group-hover/btn-lock:fill-white",
        hover2 = "group-hover/btn-lock:stroke-contrast",
        strokeWidth = "1.5",
        classList = "aspect-ratio transition-all",
    }: Props = $props();
</script>

<svg
    xmlns="http://www.w3.org/2000/svg"
    class="icon {height} {width} {strokeColor} {fillColor} {classList}"
    stroke-width={strokeWidth}
    stroke-linecap="round"
    stroke-linejoin="round"
    viewBox="0 0 24 24"
>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M5 11m0 2a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2z" class={hover} />
    <path d="M12 16m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" class={hover2} />
    <path d="M8 11v-5a4 4 0 0 1 8 0" />
</svg>
