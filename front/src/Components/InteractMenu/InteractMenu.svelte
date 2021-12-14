<!--
vim: ft=typescript
-->
<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import type { Unsubscriber } from "svelte/store";
    import { get } from "svelte/store";
    import { gameManager } from "../../Phaser/Game/GameManager";

    import {
        followStateStore,
        followRoleStore,
        followUsersStore,
        followRoles,
        followStates,
    } from "../../Stores/InteractStore";

    const gameScene = gameManager.getCurrentGameScene();

    let followState: string;
    let followRole: string;
    let followUsers: string[];
    let stateUnsubscriber: Unsubscriber;
    let roleUnsubscriber: Unsubscriber;
    let nameUnsubscriber: Unsubscriber;

    onMount(() => {
        followState = get(followStateStore);
        followRole = get(followRoleStore);
        followUsers = get(followUsersStore);
        stateUnsubscriber = followStateStore.subscribe((state) => {
            followState = state;
        });
        roleUnsubscriber = followRoleStore.subscribe((role) => {
            followRole = role;
        });
        nameUnsubscriber = followUsersStore.subscribe((users) => {
            followUsers = users;
        });
    });

    onDestroy(() => {
        if (stateUnsubscriber) {
            stateUnsubscriber();
        }
        if (roleUnsubscriber) {
            roleUnsubscriber();
        }
        if (nameUnsubscriber) {
            nameUnsubscriber();
        }
    });

    function sendFollowRequest() {
        gameScene.connection?.emitFollowRequest(gameManager.getPlayerName());
        followStateStore.set(followStates.active);
    }

    function acceptFollowRequest() {
        gameScene.CurrentPlayer.enableFollowing();
        gameScene.connection?.emitFollowConfirmation(followUsers[0], gameManager.getPlayerName());
    }

    function abortEnding() {
        followStateStore.set(followStates.active);
    }

    function reset() {
        if (followRole === followRoles.leader && followUsers.length > 0) {
            gameScene.connection?.emitFollowAbort(gameManager.getPlayerName(), "*");
        } else {
            gameScene.connection?.emitFollowAbort(followUsers[0], gameManager.getPlayerName());
        }
        followStateStore.set(followStates.off);
        followRoleStore.set(followRoles.leader);
        followUsersStore.set([]);
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            reset();
        }
    }
</script>

<svelte:window on:keydown={onKeyDown} />

{#if followState === followStates.requesting}
    <div class="interact-menu nes-container is-rounded">
        <section class="interact-menu-title">
            <h2>Interaction</h2>
        </section>
        {#if followRole === followRoles.follower}
            <section class="interact-menu-question">
                <p>Do you want to follow {followUsers[0]}?</p>
            </section>
            <section class="interact-menu-action">
                <button type="button" class="accept" on:click|preventDefault={acceptFollowRequest}>Yes</button>
                <button type="button" class="deny" on:click|preventDefault={reset}>No</button>
            </section>
        {:else if followRole === followRoles.leader}
            <section class="interact-menu-question">
                <p>Ask others to follow you?</p>
            </section>
            <section class="interact-menu-action">
                <button type="button" class="accept" on:click|preventDefault={sendFollowRequest}>Yes</button>
                <button type="button" class="deny" on:click|preventDefault={reset}>No</button>
            </section>
        {/if}
    </div>
{/if}

{#if followState === followStates.ending}
    <div class="interact-menu nes-container is-rounded">
        <section class="interact-menu-title">
            <h2>Interaction</h2>
        </section>
        {#if followRole === followRoles.follower}
            <section class="interact-menu-question">
                <p>Do you want to stop following {followUsers[0]}?</p>
            </section>
        {:else if followRole === followRoles.leader}
            <section class="interact-menu-question">
                <p>Do you want to stop leading the way?</p>
            </section>
        {/if}
        <section class="interact-menu-action">
            <button type="button" class="accept" on:click|preventDefault={reset}>Yes</button>
            <button type="button" class="deny" on:click|preventDefault={abortEnding}>No</button>
        </section>
    </div>
{/if}

{#if followState === followStates.active || followState === followStates.ending}
    <div class="interact-status nes-container is-rounded">
        <section class="interact-status">
            {#if followRole === followRoles.follower}
                <p>Following {followUsers[0]}</p>
            {:else if followUsers.length === 0}
                <p>Waiting for followers' confirmation</p>
            {:else if followUsers.length === 1}
                <p>{followUsers[0]} is following you</p>
            {:else if followUsers.length === 2}
                <p>{followUsers[0]} and {followUsers[1]} are following you</p>
            {:else}
                <p>{followUsers[0]}, {followUsers[1]} and {followUsers[2]} are following you</p>
            {/if}
        </section>
    </div>
{/if}

<style lang="scss">
    .nes-container {
        padding: 5px;
    }

    div.interact-status {
        background-color: #333333;
        color: whitesmoke;

        position: relative;
        height: 2.7em;
        width: 40vw;
        top: 87vh;
        margin: auto;
        text-align: center;
    }

    div.interact-menu {
        pointer-events: auto;
        background-color: #333333;
        color: whitesmoke;

        position: relative;
        height: 19vh;
        width: 60vw;
        top: 60vh;
        margin: auto;

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
            grid-template-columns: 50% 50%;
            margin-bottom: 20px;

            button {
                display: inline-block;
                margin: 4px;
                padding: 0px;
                border: medium solid black;
                font-weight: bold;
                height: 2.5em;
            }

            .accept {
                background-color: #00ff0088;
            }
            .accept:hover {
                background-color: #00ff00cc;
            }
            .deny {
                background-color: #ff000088;
            }
            .deny:hover {
                background-color: #ff0000cc;
            }
        }
    }

    @media only screen and (max-width: 800px) {
        div.interact-status {
            width: 100vw;
            top: 78vh;
            font-size: 0.75em;
        }

        div.interact-menu {
            height: 21vh;
            width: 100vw;
            font-size: 0.75em;
        }
    }
</style>
