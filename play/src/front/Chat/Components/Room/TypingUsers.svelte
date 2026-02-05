<script lang="ts">
    import Avatar from "../Avatar.svelte";
    import type { PictureStore } from "../../../Stores/PictureStore";

    export let typingMembers: { id: string; name: string | null; pictureStore: PictureStore }[];
    const NUMBER_OF_TYPING_MEMBER_TO_DISPLAY = 3;
</script>

<div class="flex items-end w-full text-gray-300 text-sm m-0 px-2 my-2">
    {#each typingMembers
        .map((typingMember, index) => ({ ...typingMember, index }))
        .slice(0, NUMBER_OF_TYPING_MEMBER_TO_DISPLAY) as typingMember (typingMember.id)}
        {#if typingMember}
            <div id={`typing-user-${typingMember.id}`} class="avatar overflow-hidden mt-5 shrink-0">
                <Avatar
                    isChatAvatar={true}
                    pictureStore={typingMember.pictureStore}
                    fallbackName={typingMember.name ? typingMember.name : "Unknown"}
                />
            </div>
        {/if}
    {/each}

    {#if typingMembers.length > NUMBER_OF_TYPING_MEMBER_TO_DISPLAY}
        <div class="rounded-full h-6 w-6 text-center uppercase text-white bg-gray-400 -ml-1 chatAvatar">
            +{typingMembers.length - NUMBER_OF_TYPING_MEMBER_TO_DISPLAY}
        </div>
    {/if}
    <div
        class="message rounded-2xl px-3 rounded-bl-none bg-contrast gap-1 flex items-center justify-center text-lg ml-1 h-10"
    >
        <div class="animate-bounce-1 h-1 w-1 bg-white/50 rounded-full" />
        <div class="animate-bounce-2 h-1 w-1 bg-white/50 rounded-full" />
        <div class="animate-bounce-3 h-1 w-1 bg-white/50 rounded-full" />
    </div>
</div>

<style>
    @keyframes bounce {
        0%,
        100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-50%);
        }
    }

    .animate-bounce-1 {
        animation: bounce 1s infinite;
    }

    .animate-bounce-2 {
        animation: bounce 1s infinite 0.1s;
    }

    .animate-bounce-3 {
        animation: bounce 1s infinite 0.2s;
    }

    .message {
        min-width: 0;
        overflow-wrap: anywhere;
        position: relative;
    }
</style>
