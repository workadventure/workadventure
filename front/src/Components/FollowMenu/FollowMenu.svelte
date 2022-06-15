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
    <div
        class="interact-menu blue-dialog-box outline-light
    tw-text-center tw-w-72 tw-absolute tw-bottom-36 tw-left-0 tw-right-0"
    >
        <p class="tw-mt-2">{$LL.follow.interactMenu.title.follow({ leader: name($followUsersStore[0]) })}</p>
        <div class="tw-flex tw-flex-row tw-justify-evenly">
            <button type="button" class="btn light" on:click|preventDefault={acceptFollowRequest}
                >{$LL.follow.interactMenu.yes()}</button
            >
            <button type="button" class="btn outline" on:click|preventDefault={reset}
                >{$LL.follow.interactMenu.no()}</button
            >
        </div>
    </div>
{/if}

{#if $followStateStore === "ending"}
    <div class="interact-menu nes-container is-rounded">
        <section>
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
    <div
        class="interact-status blue-dialog-box outline-light
    tw-w-56 tw-min-h-10 tw-absolute tw-bottom-36"
    >
        {#if $followRoleStore === "follower"}
            <p class="tw-m-1">{$LL.follow.interactStatus.following({ leader: name($followUsersStore[0]) })}</p>
        {:else if $followUsersStore.length === 0}
            <p class="tw-m-1">{$LL.follow.interactStatus.waitingFollowers()}</p>
        {:else if $followUsersStore.length === 1}
            <p class="tw-m-1">{$LL.follow.interactStatus.followed.one({ follower: name($followUsersStore[0]) })}</p>
        {:else if $followUsersStore.length === 2}
            <p class="tw-m-1">
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
    </div>
{/if}

<style lang="scss">
    .nes-container {
        padding: 5px;
    }

    .interact-status {
        text-align: center;
        left: 0;
        right: 0;
        margin-left: auto;
        margin-right: auto;
        z-index: 400;
    }

    div.interact-menu {
        pointer-events: auto;
        position: absolute;
        margin-left: auto;
        margin-right: auto;
        z-index: 150;

        section.interact-menu-title {
            margin-bottom: 20px;
            display: flex;
            justify-content: center;
        }
    }
</style>
