<script lang="ts">
    import { get } from "svelte/store";
    import type { ChatReadReceipts, ChatRoomMember } from "../../../Connection/ChatConnection";
    import { getReadState } from "../../../Connection/ReadReceipts";
    import LL, { locale } from "../../../../../i18n/i18n-svelte";
    import Avatar from "../../Avatar.svelte";
    import { formatLastActivity } from "../../unreadCount";
    import { IconCheck, IconChecks } from "@wa-icons";

    interface Props {
        messageId: string;
        receipts: ChatReadReceipts;
        /** "Seen by" and the readers' faces, instead of the tick (my last message in a group). */
        showReaders: boolean;
        members: readonly ChatRoomMember[] | undefined;
    }

    let { messageId, receipts, showReaders, members }: Props = $props();

    const MAX_FACES = 3;

    let readState = $derived(getReadState(receipts, messageId));
    let readers = $derived(receipts.readersOf(messageId));
    let notReadYet = $derived.by(() => {
        const read = new Set(readers.map((reader) => reader.userId));
        return (receipts.otherMemberIds ?? []).filter((userId) => !read.has(userId));
    });
    let readStateLabel = $derived(readState === "read" ? $LL.chat.readReceipts.read() : $LL.chat.readReceipts.sent());

    function person(userId: string) {
        const member = members?.find((m) => m.id === userId);
        // Lazy-loaded members may be unknown: the Matrix ID's localpart still tells who it is.
        const name = member ? get(member.name) : userId.replace(/^@/, "").split(":")[0];
        return {
            name,
            pictureStore: member?.pictureStore,
            color: member?.avatarFallbackColor ? get(member.avatarFallbackColor) : null,
        };
    }
</script>

<!-- The details open on hover, and on focus so that a tap or the keyboard opens them too. -->
<div
    class="group/receipt relative flex justify-end px-1 pt-0.5 text-xxs text-white/60"
    data-testid="messageReadReceipt"
>
    <button
        type="button"
        class="flex items-center gap-1 m-0 p-0 bg-transparent border-none text-inherit cursor-pointer rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        aria-label={showReaders && readers.length > 0
            ? $LL.chat.readReceipts.seenByCount({ count: readers.length })
            : readStateLabel}
        data-read-state={readState}
    >
        {#if showReaders && readers.length > 0}
            <span>{$LL.chat.readReceipts.seenBy()}</span>
            <span class="flex">
                {#each readers.slice(0, MAX_FACES) as reader (reader.userId)}
                    {@const who = person(reader.userId)}
                    <span class="-ms-1 first:ms-0 rounded-full ring-1 ring-contrast">
                        <Avatar tiny pictureStore={who.pictureStore} fallbackName={who.name} color={who.color} />
                    </span>
                {/each}
            </span>
            {#if readers.length > MAX_FACES}
                <span>+{readers.length - MAX_FACES}</span>
            {/if}
        {:else if readState === "read"}
            <IconChecks font-size="14" class="text-light-blue" />
        {:else}
            <IconCheck font-size="14" />
        {/if}
    </button>

    {#if readers.length > 0 || notReadYet.length > 0}
        <div
            class="hidden group-hover/receipt:block group-focus-within/receipt:block absolute bottom-full end-0 z-[60] mb-1 w-56 max-h-64 overflow-y-auto rounded-md bg-contrast border border-solid border-white/10 p-2 text-xs text-white text-start shadow-lg"
            data-testid="messageReadReceiptDetails"
        >
            {#if readers.length > 0}
                <p class="m-0 mb-1 text-xxs font-bold uppercase tracking-wider text-white/60">
                    {$LL.chat.readReceipts.seenByCount({ count: readers.length })}
                </p>
                <ul class="list-none m-0 p-0">
                    {#each readers as reader (reader.userId)}
                        {@const who = person(reader.userId)}
                        <li class="flex items-center gap-2 py-0.5">
                            <Avatar tiny pictureStore={who.pictureStore} fallbackName={who.name} color={who.color} />
                            <span class="truncate">{who.name}</span>
                            {#if reader.readAt}
                                <span class="ms-auto shrink-0 text-white/50 tabular-nums"
                                    >{formatLastActivity(reader.readAt, new Date(), $locale)}</span
                                >
                            {/if}
                        </li>
                    {/each}
                </ul>
            {/if}
            {#if notReadYet.length > 0}
                <p
                    class="m-0 mb-1 {readers.length > 0
                        ? 'mt-2'
                        : ''} text-xxs font-bold uppercase tracking-wider text-white/60"
                >
                    {$LL.chat.readReceipts.notReadYet({ count: notReadYet.length })}
                </p>
                <ul class="list-none m-0 p-0">
                    {#each notReadYet as userId (userId)}
                        {@const who = person(userId)}
                        <li class="flex items-center gap-2 py-0.5 text-white/75">
                            <Avatar tiny pictureStore={who.pictureStore} fallbackName={who.name} color={who.color} />
                            <span class="truncate">{who.name}</span>
                        </li>
                    {/each}
                </ul>
            {/if}
        </div>
    {/if}
</div>
