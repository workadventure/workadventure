<script lang="ts">
    export let width: string | number = "1.2em";
    export let height: string | number = "1.2em";
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
    <path d="M12.5 21H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 1.75 1.03" />
    <path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0-2 0m-3-5V7a4 4 0 1 1 8 0v4" />
    <path d="M17 15.8l-1.3 6.4" />
    <path d="M20.1 15.8l-1.3 6.4" />
    <path d="M15.2 17.8h5.8" />
    <path d="M14.7 20.8h5.8" />
</svg>
