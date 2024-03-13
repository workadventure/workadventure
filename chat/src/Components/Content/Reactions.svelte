<script lang="ts">
    import { MapStore } from "@workadventure/store-utils";
    import { get, Readable } from "svelte/store";
    import { JID } from "stanza";
    import { MucRoom } from "../../Xmpp/MucRoom";

    export let mucRoom: MucRoom;
    export let messageId: string;
    export let reactions: MapStore<string, Readable<string[]>>;

    function getUsersName(emoji: string): string {
        const emojiStore = reactions.get(emoji);
        if (emojiStore) {
            return (
                get(emojiStore)
                    .map((userJid) => JID.parse(userJid).resource)
                    .join("\r\n") ?? ""
            );
        }
        return "";
    }

    function getNumberReactions(emoji: string): number {
        const emojiStore = reactions.get(emoji);
        if (emojiStore) {
            return get(emojiStore).length;
        }
        return 0;
    }
</script>

<div
    class="emojis flex flex-wrap absolute -bottom-[10px] overflow-hidden rounded-lg items-center px-1 group-[.left]:bg-contrast/80 group-[.right]:bg-secondary/80 backdrop-blur justify-center z-20 group-[.right]:right-3 group-[.left]:left-3"
>
    {#each [...$reactions.keys()] as emojiStr (emojiStr)}
        <div
            class="h-6 hover:bg-white/20 rounded-none px-0.5 cursor-pointer {mucRoom.haveReaction(emojiStr, messageId)
                ? 'active'
                : ''}"
            on:click={() => mucRoom.sendReactionMessage(emojiStr, messageId)}
            title={`${getUsersName(emojiStr)}`}
        >
            {emojiStr}
            {getNumberReactions(emojiStr)}
        </div>
    {/each}
</div>

<style lang="scss">
    .emojis {
        div {
            font-size: 0.65rem;
            line-height: 1.25rem;
        }
    }
</style>
