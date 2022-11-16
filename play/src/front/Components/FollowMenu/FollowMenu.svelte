<script lang="ts">
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { followStateStore, followRoleStore, followUsersStore } from "../../Stores/FollowStore";
    import LL from "../../../i18n/i18n-svelte";

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
    text-center w-72 absolute bottom-36 left-0 right-0 pointer-events-auto z-[150] right-0 left-0 m-auto"
    >
        <p class="mt-2">{$LL.follow.interactMenu.title.follow({ leader: name($followUsersStore[0]) })}</p>
        <div class="flex flex-row justify-evenly">
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
    <div
        class="blue-dialog-box outline-light
    w-56 min-h-10 absolute bottom-36 text-center m-auto right-0 left-0 z-[150]"
    >
        <p>{$LL.follow.interactMenu.title.interact()}</p>
        {#if $followRoleStore === "follower"}
            <p class="m-1">{$LL.follow.interactMenu.stop.follower({ leader: name($followUsersStore[0]) })}</p>
        {:else if $followRoleStore === "leader"}
            <p class="m-1">{$LL.follow.interactMenu.stop.leader()}</p>
        {/if}
        <div class="flex flex-row justify-evenly">
            <button type="button" class="btn light" on:click|preventDefault={reset}
                >{$LL.follow.interactMenu.yes()}</button
            >
            <button type="button" class="btn outline" on:click|preventDefault={abortEnding}
                >{$LL.follow.interactMenu.no()}</button
            >
        </div>
    </div>
{/if}

{#if $followStateStore === "active" || $followStateStore === "ending"}
    <div
        class="blue-dialog-box outline-light
    w-56 min-h-10 absolute bottom-36 text-center m-auto right-0 left-0 z-[150]"
    >
        {#if $followRoleStore === "follower"}
            <p class="m-1">{$LL.follow.interactStatus.following({ leader: name($followUsersStore[0]) })}</p>
        {:else if $followUsersStore.length === 0}
            <p class="m-1">{$LL.follow.interactStatus.waitingFollowers()}</p>
        {:else if $followUsersStore.length === 1}
            <p class="m-1">{$LL.follow.interactStatus.followed.one({ follower: name($followUsersStore[0]) })}</p>
        {:else if $followUsersStore.length === 2}
            <p class="m-1">
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
