<script lang="ts">
    import { onDestroy } from "svelte";
    import { Color } from "@workadventure/shared-utils";
    import { meetingInvitationRequestStore } from "../../../Stores/MeetingInvitationStore";
    import { calendarEventsStore, isCalendarVisibleStore } from "../../../Stores/CalendarStore";
    import { isTodoListVisibleStore } from "../../../Stores/TodoListStore";
    import { joinMeeting } from "../../Calendar/joinMeeting";
    import type { WorkAdventureDesktopWindowsApi } from "../../../Interfaces/DesktopAppInterfaces";
    import type { CompanionAgendaMeeting } from "../../../Interfaces/DesktopAppInterfaces";
    import CompactConversation from "../../../Chat/Components/CompactConversation.svelte";
    import FloatingUiPopupList from "../../Util/FloatingUiPopupList.svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import {
        companionAgendaStore,
        companionMediaStore,
        companionUsersStore,
        createCompanionChat,
        inviteUser,
        locateUser,
        respondToInvitation,
        setCompanionStatus,
        toggleCamera,
        toggleMicrophone,
        toggleScreenSharing,
        type CompanionStatus,
    } from "./desktopCompanionState";

    /**
     * The desktop companion, mounted by PictureInPicture.svelte into a child window of the world page. It keeps
     * the design of the native panel it replaces (desktopCompanion.css): People, Chat and Today slide in over
     * the meeting, which is the page's own layout moved into the video area like the browser's
     * picture-in-picture. Same renderer as the page: everything is read from its stores.
     */
    interface Props {
        windows: WorkAdventureDesktopWindowsApi;
        /** The companion window's document. */
        ownerDocument: Document;
        videoHost?: HTMLDivElement;
    }

    let { windows, ownerDocument, videoHost = $bindable() }: Props = $props();

    const chat = createCompanionChat();
    onDestroy(() => chat.destroy());
    const conversations = chat.conversations;
    const chatStatus = chat.status;
    const selected = chat.selected;

    type View = "video" | "people" | "chat" | "agenda";
    let view: View = $state("people");
    let statusMenuOpen = $state(false);
    let inConversation = $state(false);
    // The conversation shown; null while a new direct conversation is being created.
    let conversationId: string | null = $state(null);

    let media = $derived($companionMediaStore);
    let inMeeting = $derived(media.inMeeting);
    let baseView: View = $derived(inMeeting ? "video" : "people");
    let users = $derived($companionUsersStore);
    let selfName = $derived(users.find((user) => user.isSelf)?.name || $LL.desktop.companion.you());
    let highlights = $derived($conversations.reduce((total, conversation) => total + conversation.highlightCount, 0));
    let agenda = $derived($companionAgendaStore);
    let soonMeeting = $derived(agenda?.meetings?.find((meeting) => meeting.soon));
    let shownConversation = $derived($selected && $selected.id === conversationId ? $selected : null);

    // Entering a meeting shows the video; leaving it, the people (the user can switch away meanwhile).
    let wasInMeeting = false;
    $effect(() => {
        if (inMeeting !== wasInMeeting) view = inMeeting ? "video" : "people";
        else if (!inMeeting && view === "video") view = "people";
        wasInMeeting = inMeeting;
    });
    // No Today view without a calendar nor a task list.
    $effect(() => {
        if (!agenda && view === "agenda") view = baseView;
    });

    function toggleView(next: View) {
        view = view === next ? baseView : next;
        if (view === "chat" && inMeeting && conversationId === null) {
            const id = chat.openMeeting();
            if (id) {
                conversationId = id;
                inConversation = true;
            }
        }
    }

    // A click anywhere closes the status menu.
    $effect(() => {
        if (!statusMenuOpen) return;
        const close = () => (statusMenuOpen = false);
        ownerDocument.addEventListener("click", close);
        return () => ownerDocument.removeEventListener("click", close);
    });

    const statusChoices: Array<{ status: CompanionStatus; label: () => string }> = [
        { status: "online", label: () => $LL.desktop.companion.statusOnline() },
        { status: "busy", label: () => $LL.desktop.companion.statusBusy() },
        { status: "back_in_a_moment", label: () => $LL.desktop.companion.statusBackInAMoment() },
        { status: "do_not_disturb", label: () => $LL.desktop.companion.statusDoNotDisturb() },
    ];

    function openConversation(id: string) {
        conversationId = id;
        chat.open(id);
        inConversation = true;
    }

    function messageUser(userId: string) {
        conversationId = null;
        view = "chat";
        inConversation = true;
        chat.openDirect(userId)
            .then((id) => {
                if (id && conversationId === null) conversationId = id;
                else if (!id) {
                    inConversation = false;
                    windows.focusMain();
                }
            })
            .catch(() => {
                /* the conversation stays empty */
            });
    }

    function initials(name: string): string {
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return "?";
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function join(meeting: CompanionAgendaMeeting) {
        const event = $calendarEventsStore.get(meeting.id);
        if (event) joinMeeting(event);
        // A meeting in this WorkAdventure happens in the app; another one opens in the browser.
        if (meeting.inApp) windows.focusMain();
    }

    /** Open a panel of the app and bring the app to the front. */
    function openInApp(open: () => void) {
        open();
        windows.focusMain();
    }

    let invitationParts = $derived($LL.desktop.companion.invitation({ name: "\u0000" }).split("\u0000"));
</script>

{#snippet closeIcon()}
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg
    >
{/snippet}

{#snippet avatar(name: string, woka: string | undefined, className: string)}
    {#if woka}
        <span class="{className} has-woka"><img src={woka} alt="" /></span>
    {:else}
        {@const color = Color.getColorByString(name)}
        <span class={className} style="background: {color}; color: {Color.getTextColorByBackgroundColor(color)}"
            >{initials(name)}</span
        >
    {/if}
{/snippet}

<div class="panel">
    <header class="header">
        <div class="hdr-group hdr-nav">
            <button
                class="icon-btn nav-btn"
                type="button"
                data-active={view === "chat"}
                title={$LL.desktop.companion.chat()}
                aria-label={$LL.desktop.companion.chat()}
                onclick={() => toggleView("chat")}
            >
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                    ><path
                        d="M3 20l1.3 -3.9c-2.324 -3.437 -1.426 -7.872 2.1 -10.374c3.526 -2.501 8.59 -2.296 11.845 .48c3.255 2.777 3.695 7.266 1.029 10.501c-2.666 3.235 -7.615 4.215 -11.574 2.293l-4.7 1"
                    /></svg
                >
                {#if highlights > 0}<span class="nav-badge">{highlights > 99 ? "99+" : highlights}</span>{/if}
            </button>
            <button
                class="icon-btn nav-btn"
                type="button"
                data-active={view === "people"}
                title={$LL.desktop.companion.people()}
                aria-label={$LL.desktop.companion.people()}
                onclick={() => toggleView("people")}
            >
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                    ><path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /><path
                        d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"
                    /><path d="M16 3.13a4 4 0 0 1 0 7.75" /><path d="M21 21v-2a4 4 0 0 0 -3 -3.85" /></svg
                >
                {#if users.length > 0}<span class="nav-badge count">{users.length > 99 ? "99+" : users.length}</span
                    >{/if}
            </button>
            {#if agenda}
                <button
                    class="icon-btn nav-btn"
                    type="button"
                    data-active={view === "agenda"}
                    title={$LL.desktop.companion.today()}
                    aria-label={$LL.desktop.companion.today()}
                    onclick={() => toggleView("agenda")}
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                        ><path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" /><path
                            d="M16 3v4"
                        /><path d="M8 3v4" /><path d="M4 11h16" /></svg
                    >
                    {#if soonMeeting}<span class="nav-dot"></span>{/if}
                </button>
            {/if}
        </div>

        <!-- Media controls: the app's ActionBar pill style. -->
        <div class="toolbar-pill hdr-media">
            <button
                class="toolbar-btn"
                class:is-forbidden={!media.micEnabled}
                type="button"
                data-state={media.micEnabled ? "on" : "off"}
                title={$LL.desktop.companion.toggleMic()}
                aria-label={$LL.desktop.companion.toggleMic()}
                onclick={toggleMicrophone}
            >
                <svg class="icon-only-on" viewBox="0 0 24 24" aria-hidden="true"
                    ><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
                        d="M9 2m0 3a3 3 0 0 1 3 -3h0a3 3 0 0 1 3 3v5a3 3 0 0 1 -3 3h0a3 3 0 0 1 -3 -3z"
                    /><path d="M5 10a7 7 0 0 0 14 0" /><path d="M8 21l8 0" /><path d="M12 17l0 4" /></svg
                >
                <svg class="icon-only-off" viewBox="0 0 24 24" aria-hidden="true"
                    ><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M3 3l18 18" /><path
                        d="M9 5a3 3 0 0 1 6 0v5a3 3 0 0 1 -.13 .874m-2 2a3 3 0 0 1 -3.87 -2.872v-1"
                    /><path d="M5 10a7 7 0 0 0 10.846 5.85m2 -2a6.967 6.967 0 0 0 1.152 -3.85" /><path
                        d="M8 21l8 0"
                    /><path d="M12 17l0 4" /></svg
                >
            </button>
            <button
                class="toolbar-btn"
                class:is-forbidden={!media.cameraEnabled}
                type="button"
                data-state={media.cameraEnabled ? "on" : "off"}
                title={$LL.desktop.companion.toggleCamera()}
                aria-label={$LL.desktop.companion.toggleCamera()}
                onclick={toggleCamera}
            >
                <svg class="icon-only-on" viewBox="0 0 24 24" aria-hidden="true"
                    ><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
                        d="M15 10l4.553 -2.276a1 1 0 0 1 1.447 .894v6.764a1 1 0 0 1 -1.447 .894l-4.553 -2.276v-4z"
                    /><path d="M3 6m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z" /></svg
                >
                <svg class="icon-only-off" viewBox="0 0 24 24" aria-hidden="true"
                    ><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M3 3l18 18" /><path
                        d="M15 11v-1l4.553 -2.276a1 1 0 0 1 1.447 .894v6.764a1 1 0 0 1 -.675 .946"
                    /><path
                        d="M10 6h3a2 2 0 0 1 2 2v3m0 4v1a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2v-8a2 2 0 0 1 2 -2h1"
                    /></svg
                >
            </button>
            <!-- Sharing needs a bubble, but a running share can always be stopped. -->
            <button
                class="toolbar-btn"
                class:is-active={media.screenSharing}
                type="button"
                disabled={!media.canScreenShare && !media.screenSharing}
                title={media.screenSharing
                    ? $LL.desktop.companion.stopShareScreen()
                    : media.canScreenShare
                      ? $LL.desktop.companion.shareScreen()
                      : $LL.desktop.companion.shareScreenNeedsMeeting()}
                aria-label={media.screenSharing
                    ? $LL.desktop.companion.stopShareScreen()
                    : $LL.desktop.companion.shareScreen()}
                onclick={toggleScreenSharing}
            >
                <svg viewBox="0 0 24 24" aria-hidden="true"
                    ><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
                        d="M21 12v3a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1v-10a1 1 0 0 1 1 -1h9"
                    /><path d="M7 20l10 0" /><path d="M9 16l0 4" /><path d="M15 16l0 4" /><path d="M17 4h4v4" /><path
                        d="M16 9l5 -5"
                    /></svg
                >
            </button>
        </div>

        <div class="hdr-group hdr-end">
            <button
                class="icon-btn"
                type="button"
                title={$LL.desktop.companion.backToApp()}
                aria-label={$LL.desktop.companion.backToApp()}
                onclick={() => windows.focusMain()}
            >
                <svg viewBox="0 0 24 24" aria-hidden="true"
                    ><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
                        d="M9 11l-4 4l4 4m-4 -4h11a4 4 0 0 0 0 -8h-1"
                    /></svg
                >
            </button>
            <button
                class="status-btn"
                type="button"
                aria-haspopup="true"
                aria-expanded={statusMenuOpen}
                data-testid="companion-status"
                onclick={(event) => {
                    event.stopPropagation();
                    statusMenuOpen = !statusMenuOpen;
                }}
            >
                <span class="dot" data-status={users.find((user) => user.isSelf)?.status ?? "online"}></span>
                <span class="self-name">{selfName}</span>
                <svg
                    class="chev"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"><path d="M6 9l6 6l6 -6" /></svg
                >
            </button>
            <button
                class="icon-btn"
                type="button"
                title={$LL.desktop.companion.close()}
                aria-label={$LL.desktop.companion.close()}
                data-testid="companion-close"
                onclick={() => windows.dismissCompanion()}
            >
                {@render closeIcon()}
            </button>
        </div>
    </header>

    {#if statusMenuOpen}
        <div class="status-menu" class:is-locked={media.statusLocked} role="menu">
            {#each statusChoices as choice (choice.status)}
                <button
                    class="status-opt"
                    class:is-current={!media.statusLocked && media.status === choice.status}
                    role="menuitemradio"
                    aria-checked={media.status === choice.status}
                    type="button"
                    onclick={() => {
                        if (media.statusLocked) return;
                        setCompanionStatus(choice.status);
                        statusMenuOpen = false;
                    }}><span class="dot" data-status={choice.status}></span><span>{choice.label()}</span></button
                >
            {/each}
            {#if media.statusLocked}
                <div class="status-locked">{$LL.desktop.companion.statusLocked()}</div>
            {/if}
        </div>
    {/if}

    {#if windows.visibleInShare(media.screenSharing)}
        <div class="share-warning">{$LL.desktop.companion.visibleInShare()}</div>
    {/if}

    {#if soonMeeting && !inMeeting && view !== "agenda"}
        <div class="next-strip">
            <span class="cal-ico"
                ><svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                    ><path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" /><path
                        d="M16 3v4"
                    /><path d="M8 3v4" /><path d="M4 11h16" /></svg
                ></span
            >
            <div class="next-text">
                <span class="next-title">{soonMeeting.title}</span>
                <span class="next-when" class:live={soonMeeting.live}>{soonMeeting.detail}</span>
            </div>
            {#if soonMeeting.joinable}
                {@const meeting = soonMeeting}
                <button class="join-btn" type="button" onclick={() => join(meeting)}
                    >{$LL.desktop.companion.join()}</button
                >
            {/if}
        </div>
    {/if}

    {#if $meetingInvitationRequestStore}
        <div class="invitation">
            <div class="invitation-text">
                {invitationParts[0]}<strong
                    >{$meetingInvitationRequestStore.senderName || $LL.desktop.companion.someone()}</strong
                >{invitationParts.slice(1).join("")}
            </div>
            <div class="invitation-actions">
                <button
                    class="inv-btn inv-accept"
                    type="button"
                    onclick={() => {
                        windows.focusMain();
                        respondToInvitation(true);
                    }}>{$LL.desktop.companion.accept()}</button
                >
                <button class="inv-btn inv-decline" type="button" onclick={() => respondToInvitation(false)}
                    >{$LL.desktop.companion.decline()}</button
                >
            </div>
        </div>
    {/if}

    <div class="body">
        <div class="video-area" class:has-video={inMeeting}>
            <!-- The page's meeting layout lands here (PictureInPicture.svelte). -->
            <div bind:this={videoHost} class="companion-video-host"></div>
        </div>

        <section class="view view-people" class:full={!inMeeting} data-open={view === "people"}>
            <div class="view-head">
                <span class="view-count">{users.length}</span>
                <span class="view-title">{$LL.desktop.companion.onlineUsers()}</span>
                <button
                    class="icon-btn view-close"
                    type="button"
                    title={$LL.desktop.companion.close()}
                    aria-label={$LL.desktop.companion.close()}
                    onclick={() => (view = baseView)}>{@render closeIcon()}</button
                >
            </div>
            <div class="list" data-testid="companion-people">
                {#each users as user (user.id)}
                    <div class="person">
                        {@render avatar(user.name, user.woka, "person-avatar")}
                        <span class="person-name"
                            >{user.isSelf
                                ? $LL.desktop.companion.you()
                                : user.name || $LL.desktop.companion.someone()}</span
                        >
                        {#if user.isSelf}
                            <span class="person-you">{$LL.desktop.companion.youChip()}</span>
                        {:else}
                            <div class="person-actions">
                                <button
                                    type="button"
                                    class="mini-btn"
                                    title={$LL.desktop.companion.inviteToMeeting()}
                                    aria-label={$LL.desktop.companion.inviteToMeeting()}
                                    onclick={() => inviteUser(user.id)}
                                    ><svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        ><path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" /><path d="M16 19h6" /><path
                                            d="M19 16v6"
                                        /><path d="M6 21v-2a4 4 0 0 1 4 -4h4" /></svg
                                    ></button
                                >
                                <button
                                    type="button"
                                    class="mini-btn"
                                    title={$LL.desktop.companion.message()}
                                    aria-label={$LL.desktop.companion.message()}
                                    onclick={() => messageUser(user.id)}
                                    ><svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        ><path
                                            d="M3 20l1.3 -3.9c-2.324 -3.437 -1.426 -7.872 2.1 -10.374c3.526 -2.501 8.59 -2.296 11.845 .48c3.255 2.777 3.695 7.266 1.029 10.501c-2.666 3.235 -7.615 4.215 -11.574 2.293l-4.7 1"
                                        /></svg
                                    ></button
                                >
                                <button
                                    type="button"
                                    class="mini-btn"
                                    title={$LL.desktop.companion.locate()}
                                    aria-label={$LL.desktop.companion.locate()}
                                    onclick={() => {
                                        windows.focusMain();
                                        locateUser(user.id);
                                    }}
                                    ><svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        ><path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" /><path
                                            d="M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0z"
                                        /></svg
                                    ></button
                                >
                            </div>
                        {/if}
                        <span class="dot" data-status={user.status}></span>
                    </div>
                {/each}
            </div>
            <div class="empty" class:is-visible={users.length === 0}>{$LL.desktop.companion.noOneAround()}</div>
        </section>

        <section class="view view-chat" class:full={!inMeeting} data-open={view === "chat"}>
            <div class="view-head">
                <span class="view-title">{$LL.desktop.companion.chat()}</span>
                <button
                    class="icon-btn view-close"
                    type="button"
                    title={$LL.desktop.companion.close()}
                    aria-label={$LL.desktop.companion.close()}
                    onclick={() => (view = baseView)}>{@render closeIcon()}</button
                >
            </div>

            {#if !inConversation}
                <div class="list conversations">
                    {#each $conversations as conversation (conversation.id)}
                        <button
                            class="conversation-row"
                            type="button"
                            onclick={() => openConversation(conversation.id)}
                        >
                            {#if conversation.woka}
                                <span class="conv-icon kind-{conversation.kind} has-woka"
                                    ><img src={conversation.woka} alt="" /></span
                                >
                            {:else}
                                <span class="conv-icon kind-{conversation.kind}">
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    >
                                        {#if conversation.kind === "nearby"}
                                            <path d="M18.364 19.364a9 9 0 1 0 -12.728 0" /><path
                                                d="M15.536 16.536a5 5 0 1 0 -7.072 0"
                                            /><path d="M12 13m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
                                        {:else if conversation.kind === "direct"}
                                            <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" /><path
                                                d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"
                                            />
                                        {:else}
                                            <path d="M5 9l14 0" /><path d="M5 15l14 0" /><path d="M11 4l-4 16" /><path
                                                d="M17 4l-4 16"
                                            />
                                        {/if}
                                    </svg>
                                </span>
                            {/if}
                            <div class="conv-main">
                                <div class="conv-top">
                                    <span class="conv-name"
                                        >{conversation.name || $LL.desktop.companion.conversation()}</span
                                    >
                                </div>
                                {#if conversation.preview}<div class="conv-preview">{conversation.preview}</div>{/if}
                            </div>
                            {#if conversation.highlightCount > 0}
                                <span class="conv-badge hl"
                                    >@{conversation.highlightCount > 99 ? "99+" : conversation.highlightCount}</span
                                >
                            {:else if conversation.unreadCount > 0}
                                <span
                                    class="conv-unread-dot"
                                    title={conversation.unreadCount > 1
                                        ? $LL.desktop.companion.unreadMessages({ count: conversation.unreadCount })
                                        : $LL.desktop.companion.unreadMessage()}
                                ></span>
                            {/if}
                        </button>
                    {/each}
                </div>
                <div class="empty" class:is-visible={$conversations.length === 0}>
                    {$chatStatus === "connecting"
                        ? $LL.desktop.companion.connectingChat()
                        : $chatStatus === "unavailable"
                          ? $LL.desktop.companion.chatUnavailable()
                          : $LL.desktop.companion.noConversations()}
                </div>
            {:else}
                <div class="conversation">
                    <div class="conversation-head">
                        <button
                            class="icon-btn"
                            type="button"
                            title={$LL.desktop.companion.backToConversations()}
                            aria-label={$LL.desktop.companion.backToConversations()}
                            onclick={() => (inConversation = false)}
                        >
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                aria-hidden="true"><path d="M15 6l-6 6l6 6" /></svg
                            >
                        </button>
                        <div class="conversation-title">
                            {shownConversation?.name || $LL.desktop.companion.conversation()}
                        </div>
                        {#if conversationId}
                            {@const id = conversationId}
                            <button
                                class="icon-btn"
                                type="button"
                                title={$LL.desktop.companion.openInApp()}
                                aria-label={$LL.desktop.companion.openInApp()}
                                onclick={() => openInApp(() => chat.openInApp(id))}
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    aria-hidden="true"
                                    ><path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6" /><path
                                        d="M11 13l9 -9"
                                    /><path d="M15 4h5v5" /></svg
                                >
                            </button>
                        {/if}
                    </div>
                    {#if view === "chat" && shownConversation}
                        {#key shownConversation.room.id}
                            <CompactConversation room={shownConversation.room} {ownerDocument} />
                        {/key}
                    {/if}
                </div>
            {/if}
        </section>

        {#if agenda}
            <section class="view view-agenda" class:full={!inMeeting} data-open={view === "agenda"}>
                <div class="view-head">
                    <span class="view-title">{$LL.desktop.companion.today()}</span>
                    <button
                        class="icon-btn view-close"
                        type="button"
                        title={$LL.desktop.companion.close()}
                        aria-label={$LL.desktop.companion.close()}
                        onclick={() => (view = baseView)}>{@render closeIcon()}</button
                    >
                </div>
                <div class="list">
                    {#if agenda.meetings}
                        {@const nextIndex = agenda.meetings[0]?.live ? 1 : 0}
                        <div class="ag-section">{$LL.desktop.companion.meetings()}</div>
                        {#each agenda.meetings as meeting, index (meeting.id)}
                            <div
                                class="ag-row"
                                class:live={meeting.live}
                                class:next={!meeting.live && index === nextIndex}
                            >
                                <span class="ag-time">{meeting.time}</span>
                                <span class="ag-bar"></span>
                                <div class="ag-main">
                                    <div class="ag-title">{meeting.title}</div>
                                    <div class="ag-sub">{meeting.detail}</div>
                                </div>
                                {#if meeting.joinable}
                                    <button
                                        class="join-btn"
                                        class:ghost={!meeting.live}
                                        type="button"
                                        onclick={() => join(meeting)}>{$LL.desktop.companion.join()}</button
                                    >
                                {/if}
                            </div>
                        {:else}
                            <div class="ag-empty">{$LL.desktop.companion.noMoreMeetings()}</div>
                        {/each}
                        <button
                            class="ag-more"
                            type="button"
                            onclick={() => openInApp(() => isCalendarVisibleStore.set(true))}
                            >{$LL.desktop.companion.fullAgenda()}</button
                        >
                    {/if}
                    {#if agenda.tasks}
                        <div class="ag-section">
                            {$LL.desktop.companion.tasks()}
                            {#if agenda.tasks.open > 0}<span class="view-count">{agenda.tasks.open}</span>{/if}
                        </div>
                        {#each agenda.tasks.items as task (task.id)}
                            <div class="ag-row">
                                <span class="task-dot" class:progress={task.inProgress}></span>
                                <div class="ag-main">
                                    <div class="ag-title">{task.title}</div>
                                    <div class="ag-sub">{task.list}</div>
                                </div>
                                {#if task.due}<span class="due {task.urgency}">{task.due}</span>{/if}
                            </div>
                        {:else}
                            <div class="ag-empty">{$LL.desktop.companion.noTasks()}</div>
                        {/each}
                        <button
                            class="ag-more"
                            type="button"
                            onclick={() => openInApp(() => isTodoListVisibleStore.set(true))}
                            >{$LL.desktop.companion.allTasks()}</button
                        >
                    {/if}
                </div>
            </section>
        {/if}
    </div>
</div>

<!-- Menus opened from this window (a tile's menu) render in this window. -->
<FloatingUiPopupList targetDocument={ownerDocument} />
