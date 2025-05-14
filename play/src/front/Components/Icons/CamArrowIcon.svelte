<script lang="ts">
    export let height = "h-6";
    export let width = "w-6";
    export let stroke = "#ffffff";
    export let strokeWidth = "1.5";
</script>

<svg
    xmlns="http://www.w3.org/2000/svg"
    class="me-4 opacity-50 {height} {width} "
    {stroke}
    viewBox="0 0 24 24"
    stroke-width={strokeWidth}
    fill="none"
    stroke-linecap="round"
    stroke-linejoin="round"
>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path
        d="M12 20h-7a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2h1a2 2 0 0 0 2 -2a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v3.5"
    />
    <path d="M12 16a3 3 0 1 0 0 -6a3 3 0 0 0 0 6z" />
    <path d="M19 22v-6" />
    <path d="M22 19l-3 -3l-3 3" />
</svg>
