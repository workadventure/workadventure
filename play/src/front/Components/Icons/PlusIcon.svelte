<script lang="ts">
    export let classList = "h-6 w-6 aspect-ratio transition-all";
    export let color = "stroke-white fill-transparent group-hover/btn-chat:fill-white";
    export let strokeWidth = "1.5";
</script>

<svg xmlns="http://www.w3.org/2000/svg" class="icon {classList} {color}" stroke-width="{strokeWidth}" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <path d="M12 5l0 14" />
    <path d="M5 12l14 0" />
</svg>