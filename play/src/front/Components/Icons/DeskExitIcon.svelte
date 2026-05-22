<script lang="ts">
    export let width: string | number = "1em";
    export let height: string | number = "1em";
</script>

<svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    {width}
    {height}
    {...$$restProps}
>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M3 6h18" />
    <path d="M4 6v13" />
    <path d="M20 19v-13" />
    <path d="M4 10h16" />
    <path d="M15 6v8a2 2 0 0 0 2 2h3" />
    <path d="M4 4l16 16" />
</svg>
