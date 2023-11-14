<script lang="ts">
    export let classList = "h-6 w-6 aspect-ratio transition-all";
    export let color = "stroke-white fill-transparent group-hover/btn-chat:fill-white";
    export let strokeWidth = "1.5";
</script>

<svg xmlns="http://www.w3.org/2000/svg" class="icon {classList} {color}" stroke-width="{strokeWidth}" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <path d="M8 8m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z" />
    <path d="M16 8v-2a2 2 0 0 0 -2 -2h-8a2 2 0 0 0 -2 2v8a2 2 0 0 0 2 2h2" />
</svg>
