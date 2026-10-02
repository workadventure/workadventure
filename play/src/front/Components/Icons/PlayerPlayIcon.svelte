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
        hover = "group-hover/btn-music-paused:fill-white",
        strokeWidth = "1.5",
        classList = "aspect-ratio transition-all",
    }: Props = $props();
</script>

<svg
    xmlns="http://www.w3.org/2000/svg"
    class="icon {height} {width} {strokeColor} {fillColor} {classList} {hover}"
    stroke-width={strokeWidth}
    stroke-linecap="round"
    stroke-linejoin="round"
    viewBox="0 0 24 24"
>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M7 4v16l13 -8z" />
</svg>
