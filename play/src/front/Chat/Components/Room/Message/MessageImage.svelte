<script lang="ts">
    import { Readable } from "svelte/store";
    import { ChatMessageContent } from "../../../Connection/ChatConnection";

    export let content: Readable<ChatMessageContent>;
</script>

<a href={$content.url} target="_blank" class="tw-cursor-pointer tw-relative tw-group">
    <div
        class="tw-bg-contrast/50 tw-p-4 tw-rounded-full tw-absolute tw-top-0 tw-bottom-0 tw-left-0 tw-right-0 tw-m-auto tw-h-16 tw-w-16 tw-flex tw-items-center tw-justify-center tw-opacity-0 group-hover:tw-opacity-100 tw-transition-all"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            class="tw-block"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="#ffffff"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6" />
            <path d="M11 13l9 -9" />
            <path d="M15 4h5v5" />
        </svg>
    </div>
    <img class="tw-w-full tw-object-contain tw-max-h-52 tw-rounded-md" src={$content.url} alt={$content.body} />
</a>
