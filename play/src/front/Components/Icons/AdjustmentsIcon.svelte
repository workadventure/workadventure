<script lang="ts">
    export let classList = "h-6 w-6 aspect-ratio transition-all";
    export let color = "stroke-white fill-transparent group-hover/btn-chat:fill-white";
    export let strokeWidth = "1.5";
</script>

<svg xmlns="http://www.w3.org/2000/svg" class="icon {classList} {color}" stroke-width="{strokeWidth}" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <path d="M4 10a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
    <path d="M6 4v4" />
    <path d="M6 12v8" />
    <path d="M10 16a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
    <path d="M12 4v10" />
    <path d="M12 18v2" />
    <path d="M16 7a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
    <path d="M18 4v1" />
    <path d="M18 9v11" />
</svg>
