<script lang="ts">
    import LL from "../../i18n/i18n-svelte";
    import type { PlayerInterface } from "../../Phaser/Game/PlayerInterface";
    import { requestVisitCardsStore } from "../../Stores/GameStore";

    export let player: PlayerInterface;

    function openVisitCard() {
        if (player.visitCardUrl) {
            requestVisitCardsStore.set(player.visitCardUrl);
        }
    }
</script>

<ul class="selectMenu" style="border-top: {player.color || 'whitesmoke'} 5px solid">
    <li>
        <button class="text-btn" disabled={!player.visitCardUrl} on:click={openVisitCard}
            >{$LL.chat.menu.visitCard()}</button
        >
    </li>
    <li><button class="text-btn" disabled>{$LL.chat.menu.addFriend}</button></li>
</ul>

<style lang="scss">
    ul.selectMenu {
        background-color: whitesmoke;
        position: absolute;
        padding: 5px;
        border-radius: 4px;
        list-style-type: none;

        li {
            text-align: center;
        }
    }
</style>
