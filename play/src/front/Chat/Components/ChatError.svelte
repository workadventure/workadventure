<script lang="ts">
    import LL from "../../../i18n/i18n-svelte";
    export let label = $LL.chat.connectionError();
</script>

<div class="">
    <div class="tw-text-white tw-bg-danger tw-font-bold tw-flex tw-items-center tw-px-3 tw-py-2 tw-space-x-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-message-2-exclamation tw-stroke-white" width="32" height="32" viewBox="0 0 24 24" stroke-width="1.5" stroke="" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
            <path d="M8 9h8" />
            <path d="M8 13h6" />
            <path d="M15 18l-3 3l-3 -3h-3a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v5.5" />
            <path d="M19 16v3" />
            <path d="M19 22v.01" />
        </svg>
        <div>{label}</div>
    </div>
</div>
