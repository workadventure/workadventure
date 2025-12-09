<script lang="ts">
    export let height = "h-6";
    export let width = "w-6";
    export let strokeColor = "stroke-white";
    export let fillColor = "fill-transparent";
    export let hover = "group-hover/btn-picture-in-picture:fill-white";
    export let strokeWidth = "1.5";
    export let classList = "aspect-ratio transition-all";
    export let ariaLabel: string | undefined = undefined;
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
