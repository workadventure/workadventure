<script lang="ts">
    import type { PlayerInterface } from "../../Phaser/Game/PlayerInterface";
    import { requestVisitCardsStore } from "../../Stores/GameStore";
    import { _ } from "../../Translator/Translator";

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
            >{_("chat.menu.visit-card")}</button
        >
    </li>
    <li><button class="text-btn" disabled>{_("chat.menu.add-friend")}</button></li>
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
