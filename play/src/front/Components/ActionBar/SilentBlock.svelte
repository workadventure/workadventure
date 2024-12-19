<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
</script>

<div
    class="flex flex-col items-center justify-center rounded-lg bg-danger-900/50 text-white mt-12 px-6 py-4 backdrop-blur"
>
    <picture class="h-8">
        <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f910/512.webp" type="image/webp" />
        <img
            src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f910/512.gif"
            alt="🤐"
            width="96"
            height="96"
            class="absolute left-0 right-0 m-auto -top-12"
        />
    </picture>
    <div class="text-lg font-bold">{$LL.actionbar.silentTitle()}</div>
    <p class="text-xs italic m-0 text-center opacity-80 leading-3">
        {$LL.actionbar.silentDesc()}
    </p>
</div>
