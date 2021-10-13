<script lang="ts">
    import type {PlayerInterface} from "../../Phaser/Game/PlayerInterface";
    import {chatSubMenuVisbilityStore} from "../../Stores/ChatStore";
    import {onDestroy, onMount} from "svelte";
    import type {Unsubscriber} from "svelte/store";
    import ChatSubMenu from "./ChatSubMenu.svelte";

    export let player: PlayerInterface;
    export let line: number;

    let isSubMenuOpen: boolean;
    let chatSubMenuVisivilytUnsubcribe: Unsubscriber;

    function openSubMenu() {
        chatSubMenuVisbilityStore.openSubMenu(player.name, line);
    }

    function getInitials(name) {
        // TODO: This could be replaced by the Woka of the player if possible
        let initials = name.split(' ');

        if (initials.length === 1) {
            // John => JOH
            // JOH => JOH
            // Jo => JO
            initials = name.length >= 3 ? name.substring(0, 3) : name;
        } else if (initials.length > 1) {
            // John Doe => JOD
            // John Doe Bar => JOB
            // J Doe => JD
            const firstname = initials.shift()
            const lastname = initials.pop()
            initials = (firstname.length >= 2 ? firstname.substring(0, 2) : firstname) + lastname.charAt(0);
        }

        return initials.toUpperCase();
    }

    onMount(() => {
        chatSubMenuVisivilytUnsubcribe = chatSubMenuVisbilityStore.subscribe((newValue) => {
            isSubMenuOpen = (newValue === player.name + line);
        })
    })

    onDestroy(() => {
        chatSubMenuVisivilytUnsubcribe();
    })

</script>

<div class="avatar" style="background-color: {player.color || 'white'}">
    <p class="name">{getInitials(player.name)}</p>
</div>

<style lang="scss">
  div.avatar {
    cursor: pointer;
    display: inline-block;
    float: left;
    border-radius: 5px;
    width: 40px;
    height: 40px;
    align-items: center;
    justify-content: center;

    .name {
      cursor: pointer;
      overflow: hidden;
      font-weight: bold;
      color: white;
      text-shadow: 2px 2px dimgrey;
      line-height: 40px;
      text-align: center;
    }
  }
</style>