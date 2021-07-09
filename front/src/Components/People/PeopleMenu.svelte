<script lang="typescript">
    import { peopleStore } from "../../Stores/PeopleStore";

    let menuOpened = false;
    const menuWidth = 340;
    const menuOffset = 10;
    const transparentImg = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

    function toggleMenu() {
        menuOpened = !menuOpened;
    }
</script>

<div class="people-menu-scale">
    <section class="people-menu" style="--people-menu-width: {menuWidth}px; --people-menu-offset: {menuOffset}px">
        <button on:click={toggleMenu}>
            {#if menuOpened}
                <img src="/resources/logos/close.svg" alt="Close people menu" />
            {:else}
                <img src="/resources/logos/people.svg" alt="Open people menu" />
            {/if}
        </button>
        <ul class="people-list" class:visible={menuOpened}>
            <li>
                There {#if $peopleStore.length === 1}
                    is 1 other person
                {:else}
                    are {$peopleStore.length} other people
                {/if}
                online.
            </li>
            {#each $peopleStore as player}
                <li class="player">
                    <div class="avatar" style="background-image: url('{player.img ?? transparentImg}');" />
                    {player.name}
                </li>
            {/each}
        </ul>
    </section>
</div>

<style lang="scss">
    .people-menu-scale {
        position: absolute;
        width: 100%;
        height: 100%;
        transform-origin: top right;
        max-height: 100vh;
        overflow: hidden;
        transform: scale(1, 1);

        @media screen and (max-height: 700px) {
            transform: scale(0.667, 0.667);
        }
    }
    .people-menu {
        position: absolute;
        top: 0;
        right: 0;
        padding: var(--people-menu-offset);
        max-width: 50vw;
        width: var(--people-menu-width);
        pointer-events: all;
        display: flex;
        flex-direction: column;
        align-items: flex-end;

        & button {
            min-width: 34px;
            background-color: black;
            color: white;
            border-radius: 7px;
            padding: 2px 8px;
        }

        & button img {
            width: 14px;
            padding-top: 0;
        }
    }

    .people-list {
        list-style: none;
        margin: 0;
        padding: 0;
        transition: transform 0.5s cubic-bezier(0.65, 0, 0.35, 1);
        transform: translateX(calc(var(--people-menu-width) + 2 * var(--people-menu-offset)));

        & li {
            background: black;
            color: white;
            padding: 8px;
            border-radius: 8px;
            margin: 6px 0;
            display: flex;
            align-items: center;

            &.player {
                font-size: 18px;
            }
        }
    }

    .avatar {
        width: 32px;
        height: 32px;
        background-position: 64px 0;
        margin-right: 6px;
    }

    .visible {
        transform: translateX(0);
    }
</style>
