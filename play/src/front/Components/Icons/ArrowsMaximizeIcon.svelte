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
        hover = "group-hover/btn-arrows-maximize:fill-white",
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
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M16 4l4 0l0 4" />
    <path d="M14 10l6 -6" />
    <path d="M8 20l-4 0l0 -4" />
    <path d="M4 20l6 -6" />
    <path d="M16 20l4 0l0 -4" />
    <path d="M14 14l6 6" />
    <path d="M8 4l-4 0l0 4" />
    <path d="M4 4l6 6" />
</svg>
