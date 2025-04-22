<script lang="ts">
    import { Readable } from "svelte/store";
    import { ChatMessageContent } from "../../../Connection/ChatConnection";

    export let content: Readable<ChatMessageContent>;
</script>

<a href={$content.url} target="_blank" class="cursor-pointer relative group block p-1 pb-0">
    <div
        class="bg-contrast/50 p-1 rounded absolute top-2 right-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all h-fit w-fit"
    >
        <div class="hover:bg-white/10 rounded-sm p-1">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="block"
                width="18"
                height="18"
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
    </div>
    <img class="w-full object-cover max-h-52 rounded" src={$content.url} alt={$content.body} />
</a>
