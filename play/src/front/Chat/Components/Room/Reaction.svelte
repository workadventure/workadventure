<script lang="ts">
    import type { ChatMessageReaction } from "../../Connection/ChatConnection";

    interface Props {
        reaction: ChatMessageReaction;
    }

    let { reaction }: Props = $props();

    let { reacted, key, users, component } = $derived(reaction);
    let ReactionComponent = $derived(component.component);
</script>

{#if $users.size > 0}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        onclick={() => reaction.react()}
        class="w-[40px] reaction group flex flex-row space-x-1 py-1 px-1.5 hover:bg-white/20 text-white hover:cursor-pointer rounded-full"
        data-testid={`${key}_reactionButton`}
    >
        <div class="group-hover:scale-[2] group-hover:rotate-3 transition-all text-xs p-0 m-0 hover:cursor-pointer">
            <ReactionComponent {...component.props} />
        </div>
        <div class="text-xs p-0 m-0 hover:cursor-pointer text-white" class:font-extrabold={$reacted}>
            {$users.size}
        </div>
    </div>
{/if}

<style>
    @keyframes fall-in {
        0% {
            opacity: 0;
            transform: translateY(50px) scale(0);
        }
        50% {
            transform: translateY(0px) scale(2);
        }
        100% {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    .reaction {
        animation: fall-in 0.5s cubic-bezier(0.6, 0.02, 0.53, 1.33);
    }
</style>
