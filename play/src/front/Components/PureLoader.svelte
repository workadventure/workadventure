<script lang="ts">
    import { LL } from "../../i18n/i18n-svelte";

    export let size = 6;
    export let color = "brand-blue";
    export let loadingText = $LL.mapEditor.settings.loading();
    export let customClass = "";
</script>

<div aria-label="Loading..." class={`pure-loader flex flex-wrap flex-col items-center justify-center ${customClass}`}>
    <svg class={`h-${size} w-${size} animate-spin mb-3 text-${color}`} viewBox="3 3 18 18">
        <path
            fill="currentColor"
            d="M16.9497 7.05015C14.2161 4.31648 9.78392 4.31648 7.05025 7.05015C6.65973 7.44067 6.02656 7.44067 5.63604 7.05015C5.24551 6.65962 5.24551 6.02646 5.63604 5.63593C9.15076 2.12121 14.8492 2.12121 18.364 5.63593C18.7545 6.02646 18.7545 6.65962 18.364 7.05015C17.9734 7.44067 17.3403 7.44067 16.9497 7.05015Z"
        />
    </svg>
    <p class={`text-${color}`}>{loadingText} ...</p>
</div>
