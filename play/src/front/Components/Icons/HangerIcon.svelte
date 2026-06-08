<script lang="ts">
    interface Props {
        height?: string;
        width?: string;
        strokeColor?: string;
        // Ignoring fillColor for this icon as it is not used
        // Still putting the prop here for consistency with other icons and to avoid a warning
        fillColor?: string;
        hover?: string;
        classList?: string;
    }

    let {
        height = "h-6",
        width = "w-6",
        strokeColor = "stroke-white",
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        fillColor = "fill-white",
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
    class="{height} {width} {strokeColor} {classList} {hover} icon icon-tabler icons-tabler-outline icon-tabler-hanger"
>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path
        d="M14 6a2 2 0 1 0 -4 0c0 1.667 .67 3 2 4h-.008l7.971 4.428a2 2 0 0 1 1.029 1.749v.823a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-.823a2 2 0 0 1 1.029 -1.749l7.971 -4.428"
    />
</svg>
