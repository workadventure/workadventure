<script lang="ts">
    export let height = "h-6";
    export let width = "w-6";
    export let strokeColor = "stroke-white";
    export let fillColor = "fill-transparent";
    export let hover = "group-hover/btn-music-paused:fill-white";
    export let strokeWidth = "1.5";
    export let classList = "aspect-ratio transition-all";
</script>

<svg
    xmlns="http://www.w3.org/2000/svg"
    class="icon {height} {width} {strokeColor} {fillColor} {classList} {hover}"
    stroke-width={strokeWidth}
    stroke-linecap="round"
    stroke-linejoin="round"
    viewBox="0 0 24 24"
>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
        d="M6 5m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z"
    /><path d="M14 5m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" />
</svg>
