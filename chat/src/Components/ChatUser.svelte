<script lang="ts">
    import highlightWords from "highlight-words";
    import { ShieldOffIcon } from "svelte-feather-icons";
    import { get } from "svelte/store";
    import { LL } from "../i18n/i18n-svelte";
    import { defaultColor, defaultWoka, User } from "../Xmpp/AbstractRoom";
    import { MucRoom } from "../Xmpp/MucRoom";
    import teleport from "../../public/static/images/teleport.svg";
    import businessCard from "../../public/static/images/business-cards.svg";
    import { mucRoomsStore } from "../Stores/MucRoomsStore";
    import { ENABLE_OPENID } from "../Enum/EnvironmentVariable";
    import { iframeListener } from "../IframeListener";

    export let mucRoom: MucRoom;
    export let user: User;
    export let searchValue: string = "";

    function openChat(user: User) {
        return user;
        // activeThreadStore.set(user);
    }

    const presenceStore = mucRoomsStore.getDefaultRoom()?.getPresenceStore() ?? mucRoom.getPresenceStore();

    const me = presenceStore.get(mucRoom.myJID);

    let chatMenuActive = false;
    let openChatUserMenu = () => {
        chatMenuActive = true;
    };
    let closeChatUserMenu = () => {
        chatMenuActive = false;
    };

    function showBusinessCard(visitCardUrl: string | undefined) {
        if (visitCardUrl) {
            iframeListener.sendShowBusinessCard(visitCardUrl);
        }
        closeChatUserMenu();
    }

    function goTo(type: string, playUri: string, uuid: string) {
        if (playUri !== "" && uuid !== "") {
            mucRoom.goTo(type, playUri, uuid);
        }
        closeChatUserMenu();
    }

    function findUserInDefault(jid: string): User | undefined {
        const userData = presenceStore.get(jid);
        let user = undefined;
        if (userData) {
            user = get(userData);
        }
        return user;
    }

    function getWoka(jid: string) {
        const user = findUserInDefault(jid);
        if (user) {
            return user.woka ?? defaultWoka;
        } else {
            return defaultWoka;
        }
    }

    function getColor(jid: string) {
        const user = findUserInDefault(jid);
        if (user) {
            return user.color;
        } else {
            return defaultColor;
        }
    }

    function getColorOfAvailabilityStatus(status: number) {
        switch (status) {
            case 1:
            default:
                return "bg-pop-green";
            case 2:
                return "bg-pop-red";
            case 3:
                return "bg-warning";
        }
    }

    function getNameOfAvailabilityStatus(status: number) {
        switch (status) {
            case 1:
            default:
                return $LL.status.online();
            case 2:
                return $LL.status.away();
            case 3:
                return $LL.status.unavailable();
        }
    }

    $: chunks = highlightWords({
        text: user.name.match(/\[\d*]/) ? user.name.substring(0, user.name.search(/\[\d*]/)) : user.name,
        query: searchValue,
    });
</script>

<!-- TODO All 'cursor-default' will be deleted when Chat 1to1 will be released -->
<div class="group py-3 rounded-lg hover:bg-white/10 transition-all">
    <div
        class="group wa-chat-item relative flex items-center ml-4 {user.isAdmin ? 'admin' : 'user'}  cursor-default"
        on:click|stopPropagation={() => openChat(user)}
        on:mouseleave={closeChatUserMenu}
    >
        <div
            class="relative wa-avatar aspect-ratio h-10 w-10 rounded overflow-hidden outline outline-solid outline-contrast-400 group-hover:outline-secondary {!user.active &&
                'opacity-50'}  cursor-default"
            style={`background-color: ${getColor(user.jid)}`}
            on:click|stopPropagation={() => openChat(user)}
        >
            <div class="wa-container cursor-default">
                <img
                    class="cursor-default w-full mt-2 transition-all group-hover:mt-1"
                    style="image-rendering: pixelated;"
                    src={getWoka(user.jid)}
                    alt="Avatar"
                />
            </div>
        </div>
        {#if user.active && user.availabilityStatus}
            <span
                title={getNameOfAvailabilityStatus(user.availabilityStatus)}
                class={`w-4 h-4 ${getColorOfAvailabilityStatus(
                    user.availabilityStatus
                )}  cursor-default block rounded-full absolute -left-1.5 -top-1 border-solid border-2 border-contrast`}
            />
        {/if}
        <div class="flex-auto ml-3 $cursor-default" on:click|stopPropagation={() => openChat(user)}>
            <div class="font-bold mb-0 flex items-center cursor-default">
                {#each chunks as chunk (chunk.key)}
                    <span class={`${chunk.match ? "text-light-blue" : ""}  cursor-default`}>{chunk.text}</span>
                {/each}
                {#if user.name.match(/\[\d*]/)}
                    <span class="font-light text-xs text-gray  cursor-default">
                        #{user.name
                            .match(/\[\d*]/)
                            ?.join()
                            ?.replace("[", "")
                            ?.replace("]", "")}
                    </span>
                {/if}
                {#if user.isAdmin}
                    <div class="chip chip-xs chip-danger ml-2">
                        {$LL.role.admin()}
                    </div>
                {/if}
                {#if ENABLE_OPENID}
                    {#if user.isMember}
                        <span class="ml-2">
                            <div class="chip chip-border chip-xs chip-neutral">
                                <div class="chip-label">{$LL.role.member()}</div>
                            </div>
                        </span>
                        <!--
                    // If it's not a member
                    {:else}
                        <span class="text-pop-red" title={$LL.role.visitor()}>
                            <UserXIcon size="13" />
                        </span>
                        -->
                    {/if}
                {/if}
            </div>
            <div class="text-xs mb-0 font-condensed opacity-75  cursor-default">
                {#if user.isMe}
                    {$LL.you()}
                {:else if user.active}
                    {getNameOfAvailabilityStatus(user.availabilityStatus ?? 0)}
                {:else}
                    {$LL.userList.disconnected()}
                {/if}
            </div>
        </div>

        {#if user.unreads}
            <span
                class="bg-light-blue text-dark-purple w-5 h-5 mr-3 text-sm font-semibold flex items-center justify-center rounded"
            >
                {user.unreads}
            </span>
        {/if}

        {#if user.active && !user.isMe}
            <div class="group-hover:opacity-100 opacity-0 transition-all flex pr-3">
                <div>
                    <div class="btn btn-sm btn-secondary mr-2">
                        <div
                            class="btn-label"
                            on:click|stopPropagation={() => goTo("user", user.playUri ?? "", user.uuid ?? "")}
                        >
                            Walk to
                        </div>
                    </div>
                </div>
                <div class="relative">
                    <div class="btn btn-sm btn-ghost btn-light" on:click|stopPropagation={openChatUserMenu}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="btn-icon"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="#FFF"
                            fill="none"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </div>
                    <div
                        class={`absolute mt-2 top-9 bg-contrast/80 backdrop-blur rounded py-2 w-56 -right-3 text-white before:content-[''] before:absolute before:w-0 before:h-0 before:-top-[14px] before:right-6 before:border-solid before:border-8 before:border-solid before:border-transparent before:border-b-contrast/80 transition-all ${
                            chatMenuActive ? "" : "invisible"
                        }`}
                        on:blur={() => closeChatUserMenu}
                    >
                        {#if user.isInSameMap}
                            <div
                                class="walk-to wa-dropdown-item hover:bg-white/10 py-2 px-4 flex items-center"
                                on:click|stopPropagation={() => goTo("user", user.playUri ?? "", user.uuid ?? "")}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="icon icon-tabler icon-tabler-walk mr-2"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    stroke-width="1.5"
                                    stroke="#ffffff"
                                    fill="none"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                    <path d="M13 4m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
                                    <path d="M7 21l3 -4" />
                                    <path d="M16 21l-2 -4l-3 -3l1 -6" />
                                    <path d="M6 12l2 -3l4 -1l3 3l3 1" />
                                </svg>
                                <div>{$LL.userList.walkTo()}</div>
                            </div>
                        {:else}
                            <div
                                class="teleport wa-dropdown-item hover:bg-white/10 py-2 px-4 flex items-center"
                                on:click|stopPropagation={() => goTo("room", user.playUri ?? "", user.uuid ?? "")}
                            >
                                <img class="noselect" src={teleport} alt="Teleport to logo" height="13" width="13" />
                                {$LL.userList.teleport()}
                            </div>
                        {/if}
                        {#if user.visitCardUrl}
                            <div
                                class="businessCard wa-dropdown-item hover:bg-white/10 py-2 px-4 flex items-center"
                                on:click|stopPropagation={() => showBusinessCard(user.visitCardUrl)}
                            >
                                <img class="noselect" src={businessCard} alt="Business card" height="13" width="13" />
                                {$LL.userList.businessCard()}
                            </div>
                        {/if}
                        {#if $me && $me.isAdmin}
                            {#if user.isAdmin}
                                <div
                                    class="rank-down wa-dropdown-item text-warning hover:bg-white/10 py-2 px-4 flex items-center"
                                    on:click|stopPropagation={() => mucRoom.sendRankDown(user.jid)}
                                >
                                    <ShieldOffIcon size="13" />
                                    <div>{$LL.rankDown()}</div>
                                    <div class="text-xs text-white opacity-50 ml-1">coming soon</div>
                                </div>
                            {:else}
                                <div
                                    class="rank-up wa-dropdown-item text-warning hover:bg-white/10 py-2 px-4 flex items-center"
                                    on:click|stopPropagation={() => mucRoom.sendRankUp(user.jid)}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        class="icon icon-tabler icon-tabler-user-shield stroke-warning mr-2"
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        stroke-width="1.5"
                                        fill="none"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    >
                                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                        <path d="M6 21v-2a4 4 0 0 1 4 -4h2" />
                                        <path
                                            d="M22 16c0 4 -2.5 6 -3.5 6s-3.5 -2 -3.5 -6c1 0 2.5 -.5 3.5 -1.5c1 1 2.5 1.5 3.5 1.5z"
                                        />
                                        <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" />
                                    </svg>
                                    <div>{$LL.rankUp()}</div>
                                    <div class="text-xs text-white opacity-50 ml-1">coming soon</div>
                                </div>
                            {/if}
                            <div
                                class="ban wa-dropdown-item text-pop-red hover:bg-white/10 py-2 px-4 flex items-center"
                                on:click|stopPropagation={() =>
                                    mucRoom.sendBan(user.jid, user.name, user.playUri ?? "")}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="icon icon-tabler icon-tabler-user-x stroke-danger mr-2"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    stroke-width="1.5"
                                    fill="none"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                    <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" />
                                    <path d="M6 21v-2a4 4 0 0 1 4 -4h3.5" />
                                    <path d="M22 22l-5 -5" />
                                    <path d="M17 22l5 -5" />
                                </svg>
                                <div>{$LL.ban.title()}</div>
                                <div class="text-xs text-white opacity-50 ml-1">coming soon</div>
                            </div>
                        {/if}
                        <!--<span class="wa-dropdown-item" on:click|stopPropagation={() => openChat(user)}> Open Chat </span>
                        <div class="wa-dropdown-item">Delete chat</div>-->
                    </div>
                </div>
            </div>
        {/if}
    </div>
</div>
