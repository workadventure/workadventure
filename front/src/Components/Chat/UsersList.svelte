<script lang="ts">
    import type { TeleportStore, User, UsersStore, UserStore } from "../../Xmpp/MucRoom";
    import LL from "../../i18n/i18n-svelte";
    import {MucRoom, USER_STATUS_AVAILABLE, USER_STATUS_DISCONNECTED} from "../../Xmpp/MucRoom";
    import { searchValue } from "../../Stores/Utils/SearchStore";
    import { localUserStore } from "../../Connexion/LocalUserStore";
    import { activeSubMenuStore, menuVisiblilityStore } from "../../Stores/MenuStore";
    import { chatVisibilityStore } from "../../Stores/ChatStore";

    export let usersListStore: UsersStore;

    export let meStore: UserStore;

    export let teleportStore: TeleportStore;

    export let mucRoom: MucRoom;

    function filter(user: User) {
        return (
            $searchValue === null ||
            $searchValue === "" ||
            user.nick.toLocaleLowerCase().indexOf($searchValue?.toLocaleLowerCase()) !== -1
        );
    }

    function openInviteMenu() {
        chatVisibilityStore.set(false);
        activeSubMenuStore.set(2);
        menuVisiblilityStore.set(true);
    }

    let message = '';

    function sendMessage(){
        mucRoom.sendMessage(message);
        message = '';
    }
</script>

<ul>
    {#if $meStore?.isModerator}
        <li>Vous êtes modérateur</li>
    {/if}
    {#if [...$usersListStore].length === 0}
        <p>This room is empty, copy this link to invite colleague or friend!</p>
        <button type="button" class="nes-btn is-primary" on:click={openInviteMenu}>{$LL.menu.sub.invite()}</button>
    {:else}
        {#each [...$usersListStore] as [jid, user]}
            {#if filter(user)}
                <li class={user.status} id={jid}>
                    <div>
                        <div class="nick">
                            {#if user.nick.match(/\[\d*]/)}
                                <span>{user.nick.substring(0, user.nick.search(/\[\d*]/))}</span>
                                <span class="no">
                                    #{user.nick
                                        .match(/\[\d*]/)
                                        ?.join()
                                        ?.replace("[", "")
                                        ?.replace("]", "")}
                                </span>
                            {:else}
                                <span>{user.nick}</span>
                            {/if}
                        </div>
                        <div>
                            {#if $meStore.isModerator && user.status === USER_STATUS_AVAILABLE}
                                <button
                                        on:click|preventDefault={() => mucRoom.ban(jid, user.nick, user.roomId)}
                                        src="btn btn-alert"
                                >Bannir</button>
                                {#if user.isModerator}
                                    <button
                                            on:click|preventDefault={() => mucRoom.rankDown(jid)}
                                            src="btn btn-alert"
                                    >Rank down</button>
                                {:else}
                                    <button
                                            on:click|preventDefault={() => mucRoom.rankUp(jid)}
                                            src="btn btn-alert"
                                    >Rank up</button>
                                {/if}
                            {/if}
                            {#if $teleportStore.state === true}
                                {#if $teleportStore.to === user.uuid}
                                    <button src="btn btn-primary">{$LL.muc.userList.teleporting()}</button>
                                {/if}
                            {:else if user.status === USER_STATUS_DISCONNECTED}
                                <button src="btn btn-primary" disabled>
                                    {$LL.muc.userList.disconnected()}
                                </button>
                            {:else if user.isInSameMap === false}
                                <button
                                        on:click|preventDefault={() => mucRoom.goTo("room", user.roomId, localUserStore.getLocalUser()?.uuid || "")}
                                        src="btn btn-primary"
                                >
                                    {$LL.muc.userList.teleport()}
                                </button>
                            {:else}
                                <button on:click|preventDefault={() => mucRoom.goTo("user", user.roomId, user.uuid)} src="btn btn-primary">
                                    {$LL.muc.userList.walkTo()}
                                </button>
                            {/if}
                        </div>
                    </div>
                </li>
            {/if}
        {/each}
    {/if}
</ul>
<div>
    <input type="text" placeholder="Votre message ..." bind:value={message}/>
    <button on:click|preventDefault={sendMessage} src="btn btn-primary">
        Envoyer
    </button>
</div>

<style>
    ul {
        list-style: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' version='1.1' width='10' height='10'><circle id='green_circle' stroke='black' fill='%2364dd17' cx='5' cy='5' r='5' /></svg>");
    }
    ul li.disconnected {
        list-style: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' version='1.1' width='10' height='10'><circle id='red_circle' stroke='black'' fill='%23ff2138' cx='5' cy='5' r='5' /></svg>");
    }
    li {
        margin: 2px 0;
    }
    li div {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
    }
    ul li div.nick span.no {
        color: gray;
        font-size: 0.8rem;
        margin-left: 5px;
        margin-bottom: 1px;
    }
    ul li div.nick {
        align-items: flex-end;
    }
    ul li div.nick span.is-admin {
        color: red;
    }
    button[disabled] {
        color: white;
    }
</style>
