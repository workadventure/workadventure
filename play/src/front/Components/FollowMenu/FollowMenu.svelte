<script lang="ts">
    import { followStateStore, followRoleStore, followUsersStore } from "../../Stores/FollowStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import { GameScene } from "../../Phaser/Game/GameScene";

    let gameScene: GameScene | undefined;

    function name(userId: number): string {
        const user = gameScene?.MapPlayersByKey.get(userId);
        return user ? user.playerName : "";
    }

    function acceptFollowRequest() {
        gameScene?.CurrentPlayer.startFollowing();
    }

    function abortEnding() {
        followStateStore.set("active");
    }

    function reset() {
        gameScene?.connection?.emitFollowAbort();
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
        class="interact-menu text-center text-white w-96 absolute bottom-12 left-0 right-0 pointer-events-auto z-[150] right-0 left-0 m-auto bg-contrast/80 backdrop-blur rounded-lg overflow-hidden"
    >
        <div class="my-8 text-lg bold">
            <div>
                <svg
                    class="opacity-50"
                    width="23"
                    height="23"
                    viewBox="0 0 23 23"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M5.875 3.625C5.875 4.22174 5.63795 4.79403 5.21599 5.21599C4.79403 5.63795 4.22174 5.875 3.625 5.875C3.02826 5.875 2.45597 5.63795 2.03401 5.21599C1.61205 4.79403 1.375 4.22174 1.375 3.625C1.375 3.02826 1.61205 2.45597 2.03401 2.03401C2.45597 1.61205 3.02826 1.375 3.625 1.375C4.22174 1.375 4.79403 1.61205 5.21599 2.03401C5.63795 2.45597 5.875 3.02826 5.875 3.625ZM5.875 3.625L16.5625 3.625C17.6068 3.625 18.6083 4.03984 19.3467 4.77827C20.0852 5.51669 20.5 6.51821 20.5 7.5625C20.5 8.60679 20.0852 9.60831 19.3467 10.3467C18.6083 11.0852 17.6068 11.5 16.5625 11.5H6.4375C5.39321 11.5 4.39169 11.9148 3.65327 12.6533C2.91484 13.3917 2.5 14.3932 2.5 15.4375C2.5 16.4818 2.91484 17.4833 3.65327 18.2217C4.39169 18.9602 5.39321 19.375 6.4375 19.375H21.625M21.625 19.375L18.25 16M21.625 19.375L18.25 22.75"
                        stroke="white"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>
            </div>
            {$LL.follow.interactMenu.title.follow({ leader: name($followUsersStore[0]) })}
        </div>
        <div class="flex flex-row justify-evenly bg-contrast p-4">
            <button
                type="button"
                class="btn btn-ghost btn-sm btn-light w-full justify-center mr-1"
                on:click|preventDefault={reset}
                >{$LL.follow.interactMenu.no()}
            </button>
            <button
                type="button"
                class="btn btn-secondary btn-sm w-full justify-center ml-1"
                on:click|preventDefault={acceptFollowRequest}
                >{$LL.follow.interactMenu.yes()}
            </button>
        </div>
    </div>
{/if}

{#if $followStateStore === "ending"}
    <div
        class="w-56 min-h-10 absolute bottom-12 text-center m-auto right-0 left-0 z-[150] bg-contrast/80 backdrop-blur rounded-lg overflow-hidden text-white"
    >
        <div>{$LL.follow.interactMenu.title.interact()}</div>
        {#if $followRoleStore === "follower"}
            <div class="m-1">{$LL.follow.interactMenu.stop.follower({ leader: name($followUsersStore[0]) })}</div>
        {:else if $followRoleStore === "leader"}
            <div class="m-1">{$LL.follow.interactMenu.stop.leader()}</div>
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
        class="blue-dialog-box outline-light w-72 min-h-10 absolute bottom-12 text-center m-auto right-0 left-0 z-[150] bg-contrast/80 backdrop-blur rounded-lg overflow-hidden text-white animate-bounce hover:animate-none transition-all pointer-events-auto"
    >
        {#if $followRoleStore === "follower"}
            <div class="m-1 px-8 py-4">
                {$LL.follow.interactStatus.following({ leader: name($followUsersStore[0]) })}
            </div>
            <div class="flex flex-row justify-evenly bg-contrast p-4">
                <button
                    type="button"
                    class="btn btn-sm btn-danger w-full justify-center"
                    on:click|preventDefault={reset}
                    >Stop following
                </button>
            </div>
        {:else if $followUsersStore.length === 0}
            <div class="m-1 px-8 py-4">{$LL.follow.interactStatus.waitingFollowers()}</div>
        {:else if $followUsersStore.length === 1}
            <div class="m-1 px-8 py-4">
                {$LL.follow.interactStatus.followed.one({ follower: name($followUsersStore[0]) })}
            </div>

            <div class="flex flex-row justify-evenly bg-contrast p-4">
                <button
                    type="button"
                    class="btn btn-sm btn-danger w-full justify-center"
                    on:click|preventDefault={reset}
                    >Stop following
                </button>
            </div>
        {:else if $followUsersStore.length === 2}
            <div class="m-1 px-8 py-4">
                {$LL.follow.interactStatus.followed.two({
                    firstFollower: name($followUsersStore[0]),
                    secondFollower: name($followUsersStore[1]),
                })}
            </div>
        {:else}
            <div>
                {$LL.follow.interactStatus.followed.many({
                    followers: $followUsersStore.slice(0, -1).map(name).join(", "),
                    lastFollower: name($followUsersStore[$followUsersStore.length - 1]),
                })}
            </div>
            <div class="flex flex-row justify-evenly bg-contrast p-4">
                <button
                    type="button"
                    class="btn btn-sm btn-danger w-full justify-center"
                    on:click|preventDefault={reset}
                    >Cancel
                </button>
            </div>
        {/if}
    </div>
{/if}
