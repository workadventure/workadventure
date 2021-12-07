<script lang="typescript">
    import logoTalk from "../images/logo-message-pixel.png";
    import logoWA from "../images/logo-WA-pixel.png";
    import { menuVisiblilityStore } from "../../Stores/MenuStore";
    import { chatVisibilityStore } from "../../Stores/ChatStore";
    import { get } from "svelte/store";
    import Woka from "../Woka/Woka.svelte";

    function showMenu() {
        menuVisiblilityStore.set(!get(menuVisiblilityStore));
    }
    function showChat() {
        chatVisibilityStore.set(true);
    }
</script>

<svelte:window />

<main class="menuIcon">
    <div class="nes-pointer woka" on:click|preventDefault={showMenu}>
        <Woka userId={-1} placeholderSrc={logoWA} />
    </div>
    <img src={logoTalk} alt="open menu" class="nes-pointer" on:click|preventDefault={showChat} />
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
        .woka {
            pointer-events: auto;
            width: 60px;
            padding-top: 0;
            margin: 3px;
        }
    }
    .menuIcon img:hover {
        transform: scale(1.2);
    }

    .menuIcon .woka:hover {
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
            }
        }
        .menuIcon img:hover {
            transform: scale(1.2);
        }
        @media only screen and (max-width: 800px), only screen and (max-height: 800px) {
            .menuIcon {
                margin: 3px;
                img {
                    width: 50px;
                }
            }
        }
    }
</style>
