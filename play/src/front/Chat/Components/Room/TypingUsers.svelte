<script lang="ts">
    import Avatar from "../Avatar.svelte";

    export let typingMembers: { id: string; name: string | null; avatarUrl: string | null }[];
    const NUMBER_OF_TYPING_MEMBER_TO_DISPLAY = 3;
</script>

<div class="tw-flex tw-row tw-w-full tw-text-gray-300 tw-text-sm  tw-m-0 tw-px-2 tw-mb-2">
    {#each typingMembers
        .map((typingMember, index) => ({ ...typingMember, index }))
        .slice(0, NUMBER_OF_TYPING_MEMBER_TO_DISPLAY) as typingMember (typingMember.id)}
        {#if typingMember.avatarUrl || typingMember.name}
            <div id={`typing-user-${typingMember.id}`} class="-tw-ml-2">
                <Avatar
                    isChatAvatar={true}
                    avatarUrl={typingMember.avatarUrl}
                    fallbackName={typingMember.name ? typingMember.name : "Unknown"}
                />
            </div>
        {/if}
    {/each}

    {#if typingMembers.length > NUMBER_OF_TYPING_MEMBER_TO_DISPLAY}
        <div
            class={`tw-rounded-full tw-h-6 tw-w-6 tw-text-center tw-uppercase tw-text-white tw-bg-gray-400 -tw-ml-1 chatAvatar`}
        >
            +{typingMembers.length - NUMBER_OF_TYPING_MEMBER_TO_DISPLAY}
        </div>
    {/if}
    <div
        class="message tw-rounded-2xl tw-px-3 tw-rounded-bl-none tw-bg-contrast tw-flex tw-text-lg tw-ml-1"
    >
        <div class="animate-bounce-1">.</div>
        <div class="animate-bounce-2">.</div>
        <div class="animate-bounce-3">.</div>
    </div>
</div>



<style>
    @keyframes bounce {
        0%,
        100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-25%);
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

    .chatAvatar {
        border-style: solid;
        border-color: rgb(27 42 65 / 0.95);
        border-width: 1px;
    }
</style>
