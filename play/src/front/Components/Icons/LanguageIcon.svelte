<script lang="ts">
    interface Props {
        height?: string;
        width?: string;
        stroke: string;
        strokeWidth?: string;
    }

    let { height = "h-6", width = "w-6", stroke = "#ffffff", strokeWidth = "1.5" }: Props = $props();
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
    <path d="M4 5h7" />
    <path d="M9 3v2c0 4.418 -2.239 8 -5 8" />
    <path d="M5 9c0 2.144 2.952 3.908 6.7 4" />
    <path d="M12 20l4 -9l4 9" />
    <path d="M19.1 18h-6.2" />
</svg>
