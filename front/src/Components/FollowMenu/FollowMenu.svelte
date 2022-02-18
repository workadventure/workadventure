<script lang="ts">
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { followStateStore, followRoleStore, followUsersStore } from "../../Stores/FollowStore";
    import LL from "../../i18n/i18n-svelte";

    const gameScene = gameManager.getCurrentGameScene();

    function name(userId: number): string {
        const user = gameScene.MapPlayersByKey.get(userId);
        return user ? user.playerName : "";
    }

    function acceptFollowRequest() {
        gameScene.CurrentPlayer.startFollowing();
    }

    function abortEnding() {
        followStateStore.set("active");
    }

    function reset() {
        gameScene.connection?.emitFollowAbort();
        followUsersStore.stopFollowing();
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            reset();
        }
    }
</script>

<svelte:window on:keydown={onKeyDown} />

{#if $followStateStore === "requesting" && $followRoleStore === "follower"}
    <div class="interact-menu nes-container is-rounded">
        <section class="interact-menu-title">
            <h2>{$LL.follow.interactMenu.title.follow({ leader: name($followUsersStore[0]) })}</h2>
        </section>
        <section class="interact-menu-action">
            <button type="button" class="nes-btn is-success" on:click|preventDefault={acceptFollowRequest}
                >{$LL.follow.interactMenu.yes()}</button
            >
            <button type="button" class="nes-btn is-error" on:click|preventDefault={reset}
                >{$LL.follow.interactMenu.no()}</button
            >
        </section>
    </div>
{/if}

{#if $followStateStore === "ending"}
    <div class="interact-menu nes-container is-rounded">
        <section class="interact-menu-title">
            <h2>{$LL.follow.interactMenu.title.interact()}</h2>
        </section>
        {#if $followRoleStore === "follower"}
            <section class="interact-menu-question">
                <p>{$LL.follow.interactMenu.stop.follower({ leader: name($followUsersStore[0]) })}</p>
            </section>
        {:else if $followRoleStore === "leader"}
            <section class="interact-menu-question">
                <p>{$LL.follow.interactMenu.stop.leader()}</p>
            </section>
        {/if}
        <section class="interact-menu-action">
            <button type="button" class="nes-btn is-success" on:click|preventDefault={reset}
                >{$LL.follow.interactMenu.yes()}</button
            >
            <button type="button" class="nes-btn is-error" on:click|preventDefault={abortEnding}
                >{$LL.follow.interactMenu.no()}</button
            >
        </section>
    </div>
{/if}

{#if $followStateStore === "active" || $followStateStore === "ending"}
    <div class="interact-status nes-container is-rounded">
        <section>
            {#if $followRoleStore === "follower"}
                <p>{$LL.follow.interactStatus.following({ leader: name($followUsersStore[0]) })}</p>
            {:else if $followUsersStore.length === 0}
                <p>{$LL.follow.interactStatus.waitingFollowers()}</p>
            {:else if $followUsersStore.length === 1}
                <p>{$LL.follow.interactStatus.followed.one({ follower: name($followUsersStore[0]) })}</p>
            {:else if $followUsersStore.length === 2}
                <p>
                    {$LL.follow.interactStatus.followed.two({
                        firstFollower: name($followUsersStore[0]),
                        secondFollower: name($followUsersStore[1]),
                    })}
                </p>
            {:else}
                <p>
                    {$LL.follow.interactStatus.followed.many({
                        followers: $followUsersStore.slice(0, -1).map(name).join(", "),
                        lastFollower: name($followUsersStore[$followUsersStore.length - 1]),
                    })}
                </p>
            {/if}
        </section>
    </div>
{/if}

<style lang="scss">
    @import "../../../style/breakpoints.scss";

    .nes-container {
        padding: 5px;
    }

    .interact-status {
        background-color: #333333;
        color: whitesmoke;

        position: absolute;
        max-height: 2.7em;
        width: 40vw;
        top: 87vh;
        text-align: center;
        left: 0;
        right: 0;
        margin-left: auto;
        margin-right: auto;
        z-index: 400;
    }

    div.interact-menu {
        pointer-events: auto;
        background-color: #333333;
        color: whitesmoke;

        position: absolute;
        width: 60vw;
        top: 60vh;
        left: 0;
        right: 0;
        margin-left: auto;
        margin-right: auto;
        z-index: 150;

        section.interact-menu-title {
            margin-bottom: 20px;
            display: flex;
            justify-content: center;
        }

        section.interact-menu-question {
            margin: 4px;
            margin-bottom: 20px;

            p {
                font-size: 1.05em;
                font-weight: bold;
            }
        }

        section.interact-menu-action {
            display: grid;
            grid-gap: 10%;
            grid-template-columns: 45% 45%;
            margin-bottom: 20px;
            margin-left: 5%;
            margin-right: 5%;
        }
    }

    @include media-breakpoint-up(md) {
        .interact-status {
            width: 90vw;
            top: 78vh;
            font-size: 0.75em;
        }

        div.interact-menu {
            max-height: 21vh;
            width: 90vw;
            font-size: 0.75em;
        }
    }
</style>
