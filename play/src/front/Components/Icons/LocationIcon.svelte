<script lang="ts">
    export let height = "h-6";
    export let width = "w-6";
    export let stroke = "#ffffff";
    export let strokeWidth = "1.5";
</script>

<svg
    xmlns="http://www.w3.org/2000/svg"
    class="me-4 opacity-50 {height} {width}"
    viewBox="0 0 24 24"
    stroke-width={strokeWidth}
    {stroke}
    fill="none"
    stroke-linecap="round"
    stroke-linejoin="round"
>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
    <path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0z" />
</svg>
