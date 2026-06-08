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
        hover = "group-hover/btn-emoji:fill-white",
        hover2 = "group-hover/btn-emoji:stroke-contrast",
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
    <path d="M12 21a9 9 0 1 1 0 -18a9 9 0 0 1 0 18z" />
    <path d="M9 10h-.01" class="{strokeColor} {hover2} transition-all" />
    <path d="M14.5 15a3.5 3.5 0 0 1 -5 0" class="{strokeColor} {hover2} transition-all" />
    <path d="M15.5 8.5l-1.5 1.5l1.5 1.5" class="{strokeColor} {hover2} transition-all" />
</svg>
