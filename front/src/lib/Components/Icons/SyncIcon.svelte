<script lang="ts">
    export let height = "h-6";
    export let width = "w-6";
    export let strokeColor = "stroke-white";
    export let fillColor = "fill-transparent";
    export let hover = "group-hover/btn-fullscreen:fill-white";
    export let strokeWidth = "1.5";
    export let classList = "aspect-ratio transition-all";
</script>

<svg
    class="icon {height} {width} {strokeColor} {fillColor} {classList} {hover}"
    viewBox="0 0 20 21"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    stroke-width={strokeWidth}
>
    <path
        d="M16.6666 9.66658C16.4628 8.2001 15.7825 6.8413 14.7304 5.7995C13.6784 4.75769 12.313 4.09068 10.8446 3.90121C9.37624 3.71174 7.88627 4.01032 6.60425 4.75096C5.32224 5.49159 4.31929 6.6332 3.74992 7.99992M3.33325 4.66658V7.99992H6.66659"
        stroke="white"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
    />
    <path
        d="M3.33325 11.334C3.53705 12.8005 4.21736 14.1593 5.26939 15.2011C6.32141 16.2429 7.68679 16.9099 9.15519 17.0994C10.6236 17.2888 12.1136 16.9902 13.3956 16.2496C14.6776 15.509 15.6805 14.3674 16.2499 13.0007M16.6666 16.334V13.0007H13.3333"
        stroke="white"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
    />
</svg>
