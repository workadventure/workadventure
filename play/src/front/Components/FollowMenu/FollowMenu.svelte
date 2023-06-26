<script lang="ts">
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { followStateStore, followRoleStore, followUsersStore } from "../../Stores/FollowStore";
    import { LL } from "../../../i18n/i18n-svelte";

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
    tw-text-center tw-w-72 tw-absolute tw-bottom-36 tw-left-0 tw-right-0 tw-pointer-events-auto tw-z-[150] tw-right-0 tw-left-0 tw-m-auto"
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
    <div
        class="blue-dialog-box outline-light
    tw-w-56 tw-min-h-10 tw-absolute tw-bottom-36 tw-text-center tw-m-auto tw-right-0 tw-left-0 tw-z-[150]"
    >
        <p>{$LL.follow.interactMenu.title.interact()}</p>
        {#if $followRoleStore === "follower"}
            <p class="tw-m-1">{$LL.follow.interactMenu.stop.follower({ leader: name($followUsersStore[0]) })}</p>
        {:else if $followRoleStore === "leader"}
            <p class="tw-m-1">{$LL.follow.interactMenu.stop.leader()}</p>
        {/if}
        <div class="tw-flex tw-flex-row tw-justify-evenly">
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
    tw-w-56 tw-min-h-10 tw-absolute tw-bottom-36 tw-text-center tw-m-auto tw-right-0 tw-left-0 tw-z-[150]"
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
