<script lang="ts">
    interface Props {
        height?: string;
        width?: string;
        strokeColor?: string;
        fillColor?: string;
        classList?: string;
    }

    let {
        height = "h-6",
        width = "w-6",
        strokeColor = "stroke-white",
        fillColor = "fill-transparent",
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
    class="icon icon-tabler icons-tabler-outline icon-tabler-arrow-bar-right {height} {width} {strokeColor} {fillColor} {classList}"
>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M20 12l-10 0" />
    <path d="M20 12l-4 4" />
    <path d="M20 12l-4 -4" />
    <path d="M4 4l0 16" />
</svg>
