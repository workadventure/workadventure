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

<div class="emojis">
    {#each [...$reactions.keys()] as emojiStr (emojiStr)}
        <span
            class={mucRoom.haveReaction(emojiStr, messageId) ? "active" : ""}
            on:click={() => mucRoom.sendReactionMessage(emojiStr, messageId)}
            title={`${getUsersName(emojiStr)}`}
        >
            {emojiStr}
            {getNumberReactions(emojiStr)}
        </span>
    {/each}
</div>

<style lang="scss">
    .emojis {
        display: flex;
        flex-wrap: wrap;
        margin-top: -8px;
        position: relative;
        flex-direction: row-reverse;
        margin-right: -5px;
        min-height: 8px;
        span {
            font-size: 0.65rem;
            border-radius: 1.5rem;
            line-height: 0.75rem;
            display: block;
            background-color: #c3c3c345;
            border: solid 1px #c3c3c3;
            &.active {
                background-color: #56eaff4f;
                border: none;
                backdrop-filter: blur(10px);
            }
            cursor: pointer;
            padding: 2px 3px;
            margin: 0.5px;
        }
    }
</style>
