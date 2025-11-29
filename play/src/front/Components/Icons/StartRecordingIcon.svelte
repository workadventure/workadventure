<script lang="ts">
    export let height = "h-6";
    export let width = "w-6";
    export let strokeColor = "stroke-white";
    export let fillColor = "fill-transparent";
    export let hover = "group-hover/btn-settings:fill-white";
    export let strokeWidth = "1.5";
    export let classList = "aspect-ratio transition-all";
</script>

<svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    stroke-width={strokeWidth}
    stroke-linecap="round"
    stroke-linejoin="round"
    class="icon icon-tabler icons-tabler-outline icon-tabler-player-record {height} {width} {strokeColor} {fillColor} {classList} {hover}"
>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M12 12m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
</svg>
