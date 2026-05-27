<script lang="ts">
    interface Props {
        height?: string;
        width?: string;
        strokeColor?: string;
        fillColor?: string;
        hover?: string;
        strokeWidth?: string;
        classList?: string;
        ariaLabel?: string;
    }

    let {
        height = "h-6",
        width = "w-6",
        strokeColor = "stroke-white",
        fillColor = "fill-transparent",
        hover = "group-hover/btn-picture-in-picture:fill-white",
        strokeWidth = "1.5",
        classList = "aspect-ratio transition-all",
        ariaLabel = undefined,
    }: Props = $props();
</script>

<svg
    xmlns="http://www.w3.org/2000/svg"
    class="icon {height} {width} {strokeColor} {fillColor} {classList} "
    stroke-width={strokeWidth}
    stroke-linecap="round"
    stroke-linejoin="round"
    viewBox="0 0 24 24"
    aria-label={ariaLabel}
>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path
        d="M11 19h-6a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v4"
        class="fill-transparent transition-all {hover}"
    />
    <!-- X mark inside the PiP window (bottom-right) -->
    <path d="M16 15 L20 19" />
    <path d="M20 15 L16 19" />
</svg>
