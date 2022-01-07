<script lang="typescript">
    import logoTalk from "../images/logo-message-pixel.png";
    import logoWA from "../images/logo-WA-pixel.png";
    import logoUser from "../images/logo-user-pixel.png";
    import logoInvite from "../images/logo-invite-pixel.png";
    import logoRegister from "../images/logo-register-pixel.png";
    import { menuVisiblilityStore } from "../../Stores/MenuStore";
    import { chatVisibilityStore } from "../../Stores/ChatStore";
    import { limitMapStore } from "../../Stores/GameStore";
    import { get } from "svelte/store";
    import { mucRoomsVisibilityStore } from "../../Stores/MucRoomsStore";
    import { ADMIN_URL } from "../../Enum/EnvironmentVariable";
    import { showShareLinkMapModalStore } from "../../Stores/ModalStore";

    function showMenu() {
        menuVisiblilityStore.set(!get(menuVisiblilityStore));
    }
    function showChat() {
        chatVisibilityStore.set(true);
    }
    function register() {
        window.open(`${ADMIN_URL}/second-step-register`, "_self");
    }
    function showInvite() {
        showShareLinkMapModalStore.set(true);
    }
    function showMucRooms() {
        mucRoomsVisibilityStore.set(true);
    }
</script>

<svelte:window />

<main class="menuIcon">
    {#if $limitMapStore}
        <img src={logoInvite} alt="open menu" class="nes-pointer" on:click|preventDefault={showInvite} />
        <img src={logoRegister} alt="register" class="nes-pointer" on:click|preventDefault={register} />
    {:else}
        <img src={logoWA} alt="open menu" class="nes-pointer" on:click|preventDefault={showMenu} />
        <img src={logoTalk} alt="open chat" class="nes-pointer" on:click|preventDefault={showChat} />
        <img
            src={logoUser}
            alt="open user list"
            class="nes-pointer user-list-btn"
            on:click|preventDefault={showMucRooms}
        />
    {/if}
</main>

<style lang="scss">
    .menuIcon {
        display: inline-grid;
        z-index: 90;
        position: relative;
        margin: 25px;
        img {
            pointer-events: auto;
            width: 60px;
            padding-top: 0;
            margin: 3px;
            image-rendering: pixelated;
        }
    }
    .menuIcon img:hover {
        transform: scale(1.2);
    }
    @media only screen and (max-width: 800px), only screen and (max-height: 800px) {
        .menuIcon {
            display: inline-grid;
            z-index: 90;
            position: relative;
            margin: 25px;
            img {
                pointer-events: auto;
                width: 60px;
                padding-top: 0;
                margin: 3px;
                image-rendering: pixelated;
            }
        }
        .menuIcon img:hover {
            transform: scale(1.2);
        }
        @media only screen and (max-width: 800px), only screen and (max-height: 800px) {
            .menuIcon {
                margin: 3px;
                img {
                    width: 48px;
                    image-rendering: pixelated;
                }
            }
        }
    }
</style>
