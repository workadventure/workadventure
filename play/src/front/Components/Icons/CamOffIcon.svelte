<script lang="ts">
    export let height = "h-6";
    export let width = "w-6";
    export let strokeColor = "stroke-white";
    export let fillColor = "fill-transparent";
    export let hover = "group-hover/btn-cam:fill-white";
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
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M3 3l18 18" />
    <path d="M15 11v-1l4.553 -2.276a1 1 0 0 1 1.447 .894v6.764a1 1 0 0 1 -.675 .946" />
    <path d="M10 6h3a2 2 0 0 1 2 2v3m0 4v1a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2v-8a2 2 0 0 1 2 -2h1" />
</svg>
