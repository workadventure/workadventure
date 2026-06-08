<script lang="ts">
    interface Props {
        height?: string;
        width?: string;
        strokeColor?: string;
        strokeWidth?: string;
        hover?: string;
        classList?: string;
    }

    let {
        height = "h-6",
        width = "w-6",
        strokeColor = "stroke-white",
        strokeWidth = "stroke-2",
        hover = "group-hover/btn-emoji:fill-white",
        classList = "aspect-ratio transition-all",
    }: Props = $props();
</script>

<svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="{height} {width} {strokeColor} {strokeWidth} {classList} {hover} icon icon-tabler icons-tabler-outline icon-tabler-share"
>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M6 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
    <path d="M18 6m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
    <path d="M18 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
    <path d="M8.7 10.7l6.6 -3.4" /><path d="M8.7 13.3l6.6 3.4" />
</svg>
