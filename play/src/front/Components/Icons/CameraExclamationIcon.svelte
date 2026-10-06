<script lang="ts">
    interface Props {
        height?: string;
        width?: string;
        strokeColor?: string;
        fillColor?: string;
        hover?: string;
        strokeWidth?: string;
        classList?: string;
    }

    let {
        height = "h-6",
        width = "w-6",
        strokeColor = "stroke-white",
        fillColor = "fill-transparent",
        hover = "group-hover/btn-camera-exclamation:fill-white",
        strokeWidth = "1.5",
        classList = "aspect-ratio transition-all",
    }: Props = $props();
</script>

<svg
    xmlns="http://www.w3.org/2000/svg"
    class="icon {height} {width} {strokeColor} {fillColor} {classList} {hover}"
    viewBox="0 0 24 24"
    stroke-width={strokeWidth}
    stroke="#ffffff"
    stroke-linecap="round"
    stroke-linejoin="round"
>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path
        d="M15 20h-10a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2h1a2 2 0 0 0 2 -2a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v3.5"
    />
    <path d="M9 13a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
    <path d="M19 16v3" />
    <path d="M19 22v.01" />
</svg>
