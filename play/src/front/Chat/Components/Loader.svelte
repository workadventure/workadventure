<script lang="ts">
    export let text: string;
    export let height = "h-dvh";
    export let className: string;
</script>

<div class="grid place-items-center {height} loader {className}">
    <div class="flex items-center flex-col">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            xmlns:xlink="http://www.w3.org/1999/xlink"
            width="100"
            height="100"
            viewBox="0 0 50 50"
            preserveAspectRatio="xMidYMid"
        >
            <circle cx="25" cy="25" r="0" fill="none" stroke="#4156f6" stroke-width="1">
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
            </circle><circle cx="25" cy="25" r="0" fill="none" stroke="#ffffff" stroke-width="1">
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
        <div class="animate-pulse text-sm">{text}</div>
    </div>
</div>

<style>
    .loader {
        font-family: "Roboto", sans-serif;
    }
</style>
