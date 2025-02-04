<script lang="ts">
    import { Readable } from "svelte/store";
    import { ChatMessageContent } from "../../../Connection/ChatConnection";

    export let content: Readable<ChatMessageContent>;
</script>

<a href={$content.url} target="_blank" class="cursor-pointer relative group">
    <div
        class="bg-contrast/50 p-4 rounded-full absolute top-0 bottom-0 left-0 right-0 m-auto h-16 w-16 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            class="block"
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
    <img class="w-full object-contain max-h-52 rounded" src={$content.url} alt={$content.body} />
</a>
