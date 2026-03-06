<script lang="ts">
    export let height = "h-6";
    export let width = "w-6";
    export let strokeColor = "stroke-white";
    export let fillColor = "fill-transparent";
    export let hover = "group-hover/btn-settings:fill-white";
    export let strokeWidth = "1.7";
    export let classList = "aspect-ratio transition-all";
</script>

<svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    stroke-width={strokeWidth}
    stroke-linecap="round"
    stroke-linejoin="round"
    class="icon icon-tabler icons-tabler-outline icon-tabler-subtitles {height} {width} {strokeColor} {fillColor} {classList} {hover}"
>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M4 5m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" />
    <path d="M7 10h4" />
    <path d="M13 10h4" />
    <path d="M7 14h10" />
</svg>
