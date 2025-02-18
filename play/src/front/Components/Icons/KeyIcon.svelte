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
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    stroke-width={strokeWidth}
>
    <g opacity="0.5">
        <path
            d="M16.555 3.84281L20.157 7.44481C20.4242 7.71197 20.6362 8.02914 20.7808 8.37823C20.9254 8.72731 20.9998 9.10146 20.9998 9.47931C20.9998 9.85716 20.9254 10.2313 20.7808 10.5804C20.6362 10.9295 20.4242 11.2466 20.157 11.5138L17.514 14.1568C17.2468 14.424 16.9297 14.636 16.5806 14.7806C16.2315 14.9252 15.8573 14.9996 15.4795 14.9996C15.1017 14.9996 14.7275 14.9252 14.3784 14.7806C14.0293 14.636 13.7122 14.424 13.445 14.1568L13.144 13.8558L6.586 20.4138C6.25372 20.746 5.81507 20.9507 5.347 20.9918L5.172 20.9998H4C3.75507 20.9998 3.51866 20.9099 3.33563 20.7471C3.15259 20.5843 3.03566 20.3601 3.007 20.1168L3 19.9998V18.8278C3.00011 18.3583 3.16543 17.9037 3.467 17.5438L3.586 17.4138L4 16.9998H6V14.9998H8V12.9998L10.144 10.8558L9.843 10.5548C9.5758 10.2876 9.36384 9.97047 9.21923 9.62139C9.07462 9.27231 9.00019 8.89816 9.00019 8.52031C9.00019 8.14246 9.07462 7.76831 9.21923 7.41923C9.36384 7.07014 9.5758 6.75297 9.843 6.48581L12.486 3.84281C12.7532 3.57561 13.0703 3.36365 13.4194 3.21904C13.7685 3.07443 14.1427 3 14.5205 3C14.8983 3 15.2725 3.07443 15.6216 3.21904C15.9707 3.36365 16.2878 3.57561 16.555 3.84281Z"
            stroke="#779CD3"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
        />
        <path d="M15 9H15.01" stroke="#779CD3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    </g>
</svg>
