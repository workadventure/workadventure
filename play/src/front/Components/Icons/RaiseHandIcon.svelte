<script lang="ts">
    interface Props {
        height?: string;
        width?: string;
        strokeColor?: string;
        fillColor?: string;
        hover?: string;
        strokeWidth?: string;
        classList?: string;
    }

    let {
        height = "h-6",
        width = "w-6",
        strokeColor = "stroke-white",
        fillColor = "fill-transparent",
        hover = "group-hover/btn-raise-hand:fill-white",
        strokeWidth = "1.5",
        classList = "aspect-ratio transition-all",
    }: Props = $props();
</script>

<svg
    xmlns="http://www.w3.org/2000/svg"
    class="icon {height} {width} {strokeColor} {fillColor} {classList} {hover}"
    stroke-width={strokeWidth}
    stroke-linecap="round"
    stroke-linejoin="round"
    viewBox="0 0 24 24"
>
    <!-- tabler "hand-stop": an open raised hand. It is the single visual used everywhere the
         raise-hand feature is represented (action bar, host dock, video badge, Woka name). -->
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M8 13v-7.5a1.5 1.5 0 0 1 3 0v6.5" />
    <path d="M11 5.5v-2a1.5 1.5 0 1 1 3 0v8.5" />
    <path d="M14 5.5a1.5 1.5 0 0 1 3 0v6.5" />
    <path
        d="M17 7.5a1.5 1.5 0 0 1 3 0v8.5a6 6 0 0 1 -6 6h-2h.208a6 6 0 0 1 -5.012 -2.7a69.74 69.74 0 0 1 -.196 -.3c-.312 -.479 -1.407 -2.388 -3.286 -5.728a1.5 1.5 0 0 1 .536 -2.022a1.867 1.867 0 0 1 2.28 .28l1.47 1.47"
    />
</svg>
