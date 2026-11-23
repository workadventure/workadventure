<script lang="ts">
    import Avatar from "../Avatar.svelte";
    import TypingDots from "../TypingDots.svelte";
    import { typingParts } from "../typingIndicator";
    import type { memberTypingInformation } from "../../Connection/ChatConnection";
    import LL, { locale } from "../../../../i18n/i18n-svelte";

    interface Props {
        typingMembers: memberTypingInformation[];
        /** In a direct conversation, the avatar would repeat the header. */
        isDirect: boolean;
    }

    let { typingMembers, isDirect }: Props = $props();

    let parts = $derived(
        typingParts(
            typingMembers.map((member) => member.name ?? $LL.chat.typingIndicator.someone()),
            $locale,
            (count, names) =>
                count === 1 ? $LL.chat.typingIndicator.one({ names }) : $LL.chat.typingIndicator.several({ names }),
            (count) => $LL.chat.typingIndicator.others({ count }),
        ),
    );
</script>

<!-- Always there, even empty: the conversation does not jump when someone starts or stops typing. -->
<div
    class="flex h-[22px] shrink-0 items-center gap-1.5 overflow-hidden whitespace-nowrap px-3 text-xs text-white/60"
    aria-live="polite"
    data-testid="typingIndicator"
>
    {#if parts.length > 0}
        {#if !isDirect}
            <span class="flex shrink-0">
                {#each typingMembers.slice(0, 2) as member, index (member.id)}
                    <span class="rounded-full ring-[1.5px] ring-contrast {index > 0 ? '-ms-1' : ''}">
                        <Avatar
                            tiny
                            isChatAvatar
                            pictureStore={member.pictureStore}
                            fallbackName={member.name ?? "?"}
                        />
                    </span>
                {/each}
            </span>
        {/if}
        <span class="min-w-0 truncate">
            {#each parts as part, index (index)}{#if "name" in part}<span class="font-medium text-white"
                        >{part.name}</span
                    >{:else}{part.text}{/if}{/each}
        </span>
        <TypingDots />
    {/if}
</div>
