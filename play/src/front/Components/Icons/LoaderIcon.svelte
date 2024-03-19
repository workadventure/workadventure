<script lang="ts">
    export let size = "100";
    export let color1 = "stroke-secondary";
    export let color2 = "stroke-white";
    export let strokeWidth = "1";
</script>

<svg
    xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    width={size}
    height={size}
    viewBox="0 0 50 50"
    preserveAspectRatio="xMidYMid"
>
    <circle cx="25" cy="25" r="0" fill="none" class={color1} stroke-width={strokeWidth}>
        <animate
            attributeName="r"
            repeatCount="indefinite"
            dur="1s"
            values="0;13"
            keyTimes="0;1"
            keySplines="0 0.2 0.8 1"
            calcMode="spline"
            begin="0s"
        />
        <animate
            attributeName="opacity"
            repeatCount="indefinite"
            dur="1s"
            values="1;0"
            keyTimes="0;1"
            keySplines="0.2 0 0.8 1"
            calcMode="spline"
            begin="0s"
        />
    </circle>
    <circle cx="25" cy="25" r="0" fill="none" class={color2} stroke-width={strokeWidth}>
        <animate
            attributeName="r"
            repeatCount="indefinite"
            dur="1s"
            values="0;13"
            keyTimes="0;1"
            keySplines="0 0.2 0.8 1"
            calcMode="spline"
            begin="-0.5s"
        />
        <animate
            attributeName="opacity"
            repeatCount="indefinite"
            dur="1s"
            values="1;0"
            keyTimes="0;1"
            keySplines="0.2 0 0.8 1"
            calcMode="spline"
            begin="-0.5s"
        />
    </circle>
</svg>
