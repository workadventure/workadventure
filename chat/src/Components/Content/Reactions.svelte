<script lang="ts">
    import {MucRoom} from "../../Xmpp/MucRoom";
    import {MapStore} from "../../Stores/Utils/MapStore";
    import {Readable} from "svelte/store";
    import {JID} from "stanza";

    export let mucRoom: MucRoom;
    export let messageId: string;
    export let reactions: MapStore<string, Readable<string[]>>;

    $: console.log([...reactions.keys()]);
</script>
<div class="emojis">
    {#each [...reactions] as [emojiStr, usersJid] (emojiStr)}
        <span
                class={mucRoom.haveReaction(emojiStr, messageId) ? "active" : ""}
                on:click={() => mucRoom.sendReactionMessage(emojiStr, messageId)}
                title={`${usersJid
                .map((userJid) => JID.parse(userJid).resource)
                .join("\r\n")}`}
        >
            {emojiStr}
            {usersJid.length}
        </span>
    {/each}
</div>