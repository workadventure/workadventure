<script lang="ts">
    import type { TeleportStore, User, UsersStore } from "../../Xmpp/MucRoom";
    import LL from "../../i18n/i18n-svelte";
    import { USER_STATUS_DISCONNECTED } from "../../Xmpp/MucRoom";
    import { createEventDispatcher } from "svelte";
    import { searchValue } from "../../Stores/Utils/SearchStore";
    import { localUserStore } from "../../Connexion/LocalUserStore";
    import {
        activeSubMenuStore,
        MenuItem,
        menuVisiblilityStore,
        SubMenusInterface,
        subMenusStore,
        TranslatedMenu,
    } from "../../Stores/MenuStore";
    import { chatVisibilityStore } from "../../Stores/ChatStore";

    export let usersListStore: UsersStore;

    export let teleportStore: TeleportStore;

    const dispatch = createEventDispatcher();

    function goTo(type: string, roomId: string, uuid: string) {
        dispatch("goTo", { type, roomId, uuid });
    }

    function filter(user: User) {
        return (
            $searchValue === null ||
            $searchValue === "" ||
            user.nick.toLocaleLowerCase().indexOf($searchValue?.toLocaleLowerCase()) !== -1
        );
    }

    function openInviteMenu() {
        chatVisibilityStore.set(false);
        const indexInviteMenu = $subMenusStore.findIndex(
            (menu: MenuItem) => (menu as TranslatedMenu).key === SubMenusInterface.invite
        );
        if (indexInviteMenu === -1) {
            console.error(`Menu key: ${SubMenusInterface.invite} was not founded in subMenusStore: `, $subMenusStore);
            return;
        }
        activeSubMenuStore.set(indexInviteMenu);
        menuVisiblilityStore.set(true);
    }
</script>

<ul>
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
                                    on:click={() =>
                                        goTo("room", user.roomId, localUserStore.getLocalUser()?.uuid || "")}
                                    src="btn btn-primary"
                                >
                                    {$LL.muc.userList.teleport()}
                                </button>
                            {:else}
                                <button on:click={() => goTo("user", user.roomId, user.uuid)} src="btn btn-primary">
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
        align-items: center;
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
    button[disabled] {
        color: white;
    }
</style>
