<script lang="ts">
    import { onDestroy, setContext } from "svelte";
    import { Color } from "@workadventure/shared-utils";
    import type { WorkAdventureDesktopWindowsApi } from "@workadventure/desktop-api";
    import { meetingInvitationRequestStore } from "../../../Stores/MeetingInvitationStore";
    import { calendarEventsStore, isCalendarVisibleStore } from "../../../Stores/CalendarStore";
    import { isTodoListVisibleStore } from "../../../Stores/TodoListStore";
    import { joinMeeting } from "../../Calendar/joinMeeting";
    import type { MiniWindowAgendaMeeting, MiniWindowAgendaTask } from "../../../Api/Desktop/MiniWindowAgenda";
    import CompactConversation from "../../../Chat/Components/CompactConversation.svelte";
    import FloatingUiPopupList from "../../Util/FloatingUiPopupList.svelte";
    import DesktopCapturerSourcePicker from "../DesktopCapturerSourcePicker.svelte";
    import { screenSharingAvailableStore, showDesktopCapturerSourcePicker } from "../../../Stores/ScreenSharingStore";
    import {
        inExternalServiceStore,
        myCameraStore,
        myMicrophoneStore,
        proximityMeetingStore,
    } from "../../../Stores/MyMediaStore";
    import MicrophoneMenuItem from "../../ActionBar/MenuIcons/MicrophoneMenuItem.svelte";
    import CameraMenuItem from "../../ActionBar/MenuIcons/CameraMenuItem.svelte";
    import ScreenSharingMenuItem from "../../ActionBar/MenuIcons/ScreenSharingMenuItem.svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import {
        miniWindowAgendaStore,
        miniWindowMediaStore,
        miniWindowUsersStore,
        createMiniWindowChat,
        inviteUser,
        locateUser,
        respondToInvitation,
        setMiniWindowStatus,
        statusDotColor,
        type MiniWindowStatus,
    } from "./desktopMiniWindowState";

    /**
     * The desktop mini window, mounted by PictureInPicture.svelte into a child window of the world page. People,
     * Chat and Today slide in over the meeting, which is the page's own layout moved into the video area like the
     * browser's picture-in-picture. Same renderer as the page: everything is read from its stores, and the page's
     * styles are copied in, so it is styled with the app's Tailwind theme and follows the colors set in the admin.
     */
    interface Props {
        windows: WorkAdventureDesktopWindowsApi;
        /** The mini window's document. */
        ownerDocument: Document;
        videoHost?: HTMLDivElement;
    }

    let { windows, ownerDocument, videoHost = $bindable() }: Props = $props();

    // The app's ActionBarButtons in this window are compact: it is too small for the action bar's.
    setContext("compactActionBar", true);

    const chat = createMiniWindowChat();
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

    let media = $derived($miniWindowMediaStore);
    let inMeeting = $derived(media.inMeeting);
    let baseView: View = $derived(inMeeting ? "video" : "people");
    let users = $derived($miniWindowUsersStore);
    let selfName = $derived(users.find((user) => user.isSelf)?.name || $LL.desktop.miniWindow.you());
    let selfStatus = $derived(users.find((user) => user.isSelf)?.status ?? "online");
    let highlights = $derived($conversations.reduce((total, conversation) => total + conversation.highlightCount, 0));
    let agenda = $derived($miniWindowAgendaStore);
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

    const statusChoices: Array<{ status: MiniWindowStatus; label: () => string }> = [
        { status: "online", label: () => $LL.desktop.miniWindow.statusOnline() },
        { status: "busy", label: () => $LL.desktop.miniWindow.statusBusy() },
        { status: "back_in_a_moment", label: () => $LL.desktop.miniWindow.statusBackInAMoment() },
        { status: "do_not_disturb", label: () => $LL.desktop.miniWindow.statusDoNotDisturb() },
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

    function join(meeting: MiniWindowAgendaMeeting) {
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

    let invitationParts = $derived($LL.desktop.miniWindow.invitation({ name: "\u0000" }).split("\u0000"));

    // The app's looks (ActionBarButton, AwayPausedOverlay): theme colors, so the admin's colors apply here too.
    const iconButton =
        "relative inline-flex size-8 shrink-0 items-center justify-center rounded p-0 text-white transition-colors [-webkit-app-region:no-drag] [&>svg]:size-4.5";
    const activeButton = "bg-secondary hover:bg-secondary-600";
    const textButton = "shrink-0 rounded-md px-3 py-1 text-xs font-bold text-white";
    const navBadge =
        "absolute top-0.5 right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-xxs leading-none font-bold";
    const count =
        "inline-flex h-4.5 min-w-5 items-center justify-center rounded-full bg-white/10 px-1.5 text-xxs font-bold text-white/60";
    const listRow = "flex items-center gap-2.5 rounded px-2 py-1.5 hover:bg-white/5";
    const rowButton =
        "inline-flex size-7 items-center justify-center rounded text-white/60 hover:bg-white/10 hover:text-white [&>svg]:size-3.75";
    const wokaImage = "size-full object-contain [image-rendering:pixelated]";
    const due: Record<MiniWindowAgendaTask["urgency"], string> = {
        late: "bg-danger/20 text-danger",
        today: "bg-warning/15 text-warning",
        later: "bg-white/10 text-white/60",
    };

    /** People, Chat and Today: a side panel sliding in over the meeting, the whole window out of a meeting. */
    function viewClass(open: boolean): string {
        return [
            "absolute inset-y-0 left-0 z-20 flex flex-col bg-contrast-900 transition-transform duration-200",
            open ? "translate-x-0" : "-translate-x-full",
            inMeeting ? "w-[min(320px,66%)] border-r border-white/10 shadow-xl" : "w-full",
        ].join(" ");
    }
</script>

{#snippet closeIcon()}
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg
    >
{/snippet}

{#snippet viewHead(title: string, viewCount?: number)}
    <div class="flex items-center gap-2 border-b border-white/10 py-2.5 ps-3 pe-2">
        {#if viewCount !== undefined}<span class={count}>{viewCount}</span>{/if}
        <span class="text-sm font-bold">{title}</span>
        <button
            class="{iconButton} ms-auto hover:bg-white/10"
            type="button"
            title={$LL.desktop.miniWindow.close()}
            aria-label={$LL.desktop.miniWindow.close()}
            onclick={() => (view = baseView)}>{@render closeIcon()}</button
        >
    </div>
{/snippet}

<div class="flex h-screen flex-col overflow-hidden bg-contrast-900 text-xs text-white">
    <header
        class="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-white/10 bg-contrast px-2.5 py-2 [-webkit-app-region:drag] max-[400px]:gap-1 max-[400px]:px-1.5"
    >
        <div class="flex items-center gap-1 justify-self-start">
            <button
                class="{iconButton} {view === 'chat' ? activeButton : 'hover:bg-white/10'}"
                type="button"
                title={$LL.desktop.miniWindow.chat()}
                aria-label={$LL.desktop.miniWindow.chat()}
                onclick={() => toggleView("chat")}
            >
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                    ><path
                        d="M3 20l1.3 -3.9c-2.324 -3.437 -1.426 -7.872 2.1 -10.374c3.526 -2.501 8.59 -2.296 11.845 .48c3.255 2.777 3.695 7.266 1.029 10.501c-2.666 3.235 -7.615 4.215 -11.574 2.293l-4.7 1"
                    /></svg
                >
                {#if highlights > 0}<span class="{navBadge} bg-danger text-white"
                        >{highlights > 99 ? "99+" : highlights}</span
                    >{/if}
            </button>
            <button
                class="{iconButton} {view === 'people' ? activeButton : 'hover:bg-white/10'}"
                type="button"
                title={$LL.desktop.miniWindow.people()}
                aria-label={$LL.desktop.miniWindow.people()}
                onclick={() => toggleView("people")}
            >
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                    ><path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /><path
                        d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"
                    /><path d="M16 3.13a4 4 0 0 1 0 7.75" /><path d="M21 21v-2a4 4 0 0 0 -3 -3.85" /></svg
                >
                {#if users.length > 0}<span class="{navBadge} bg-contrast-900 text-white/70"
                        >{users.length > 99 ? "99+" : users.length}</span
                    >{/if}
            </button>
            {#if agenda}
                <button
                    class="{iconButton} {view === 'agenda' ? activeButton : 'hover:bg-white/10'}"
                    type="button"
                    title={$LL.desktop.miniWindow.today()}
                    aria-label={$LL.desktop.miniWindow.today()}
                    onclick={() => toggleView("agenda")}
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                        ><path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" /><path
                            d="M16 3v4"
                        /><path d="M8 3v4" /><path d="M4 11h16" /></svg
                    >
                    {#if soonMeeting}<span class="absolute top-1 end-1 size-2 rounded-full bg-warning"></span>{/if}
                </button>
            {/if}
        </div>

        <!-- The app's own media buttons, compact (see setContext above), shown as in its action bar. -->
        <div class="flex items-center gap-0.5 justify-self-center [-webkit-app-region:no-drag]">
            {#if !$inExternalServiceStore && $proximityMeetingStore && $myMicrophoneStore}
                <MicrophoneMenuItem />
            {/if}
            {#if !$inExternalServiceStore && $myCameraStore}
                <CameraMenuItem />
            {/if}
            {#if $screenSharingAvailableStore}
                <ScreenSharingMenuItem />
            {/if}
        </div>

        <div class="flex items-center gap-1.5 justify-self-end max-[400px]:gap-0.5">
            <button
                class="{iconButton} hover:bg-white/10"
                type="button"
                title={$LL.desktop.miniWindow.backToApp()}
                aria-label={$LL.desktop.miniWindow.backToApp()}
                onclick={() => windows.focusMain()}
            >
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                    ><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
                        d="M9 11l-4 4l4 4m-4 -4h11a4 4 0 0 0 0 -8h-1"
                    /></svg
                >
            </button>
            <!-- At the default width (340px), the name does not fit with the close button: the dot alone says the
                 status, the menu still opens on it. -->
            <button
                class="inline-flex h-8 max-w-[140px] items-center gap-2 rounded border border-solid border-white/10 bg-white/10 px-2 text-white hover:bg-white/20 [-webkit-app-region:no-drag]"
                type="button"
                title={media.statusLabel}
                aria-haspopup="true"
                aria-expanded={statusMenuOpen}
                data-testid="mini-window-status"
                onclick={(event) => {
                    event.stopPropagation();
                    statusMenuOpen = !statusMenuOpen;
                }}
            >
                <span
                    class="dot size-2.5 shrink-0 rounded-full"
                    data-status={selfStatus}
                    style:background-color={statusDotColor(selfStatus)}
                ></span>
                <span class="truncate font-bold max-[400px]:hidden">{selfName}</span>
                <svg
                    class="size-3.5 shrink-0 text-white/60 max-[400px]:hidden"
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
                class="{iconButton} hover:bg-white/10"
                type="button"
                title={$LL.desktop.miniWindow.close()}
                aria-label={$LL.desktop.miniWindow.close()}
                data-testid="mini-window-close"
                onclick={() => windows.dismissMiniWindow()}
            >
                {@render closeIcon()}
            </button>
        </div>
    </header>

    {#if statusMenuOpen}
        <div
            class="absolute top-[46px] right-2.5 z-40 min-w-44 rounded-md border border-solid border-white/15 bg-contrast p-1.5 shadow-xl"
            role="menu"
        >
            {#each statusChoices as choice (choice.status)}
                {@const current = !media.statusLocked && media.status === choice.status}
                <button
                    class={[
                        "flex w-full items-center gap-2.5 rounded p-2 text-start text-white hover:bg-white/10",
                        current && "font-bold",
                        media.statusLocked && "pointer-events-none opacity-40",
                    ]}
                    role="menuitemradio"
                    aria-checked={media.status === choice.status}
                    type="button"
                    onclick={() => {
                        if (media.statusLocked) return;
                        setMiniWindowStatus(choice.status);
                        statusMenuOpen = false;
                    }}
                >
                    <span class="size-2.5 shrink-0 rounded-full" style:background-color={statusDotColor(choice.status)}
                    ></span>
                    <span>{choice.label()}</span>
                    {#if current}<span class="ms-auto text-white/60">✓</span>{/if}
                </button>
            {/each}
            {#if media.statusLocked}
                <div class="px-2 pt-2 pb-1 text-xxs text-white/40">{$LL.desktop.miniWindow.statusLocked()}</div>
            {/if}
        </div>
    {/if}

    {#if windows.visibleInShare(media.screenSharing)}
        <div class="border-b border-white/10 bg-warning/15 px-3 py-2 font-bold text-warning">
            {$LL.desktop.miniWindow.visibleInShare()}
        </div>
    {/if}

    {#if soonMeeting && !inMeeting && view !== "agenda"}
        <div class="flex items-center gap-2 border-b border-white/10 bg-white/5 py-2 ps-3 pe-2.5">
            <span class="grid size-6.5 shrink-0 place-items-center rounded bg-secondary/20 text-secondary-300"
                ><svg
                    class="size-4"
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
            <div class="flex min-w-0 flex-1 flex-col">
                <span class="truncate font-bold">{soonMeeting.title}</span>
                <span class="text-xxs {soonMeeting.live ? 'text-success' : 'text-warning'}">{soonMeeting.detail}</span>
            </div>
            {#if soonMeeting.joinable}
                {@const meeting = soonMeeting}
                <button class="{textButton} {activeButton}" type="button" onclick={() => join(meeting)}
                    >{$LL.desktop.miniWindow.join()}</button
                >
            {/if}
        </div>
    {/if}

    {#if $meetingInvitationRequestStore}
        <div class="flex items-center gap-2.5 border-b border-white/10 bg-secondary/20 px-3 py-2">
            <div>
                {invitationParts[0]}<strong
                    >{$meetingInvitationRequestStore.senderName || $LL.desktop.miniWindow.someone()}</strong
                >{invitationParts.slice(1).join("")}
            </div>
            <div class="ms-auto flex gap-1.5">
                <button
                    class="{textButton} {activeButton}"
                    type="button"
                    onclick={() => {
                        windows.focusMain();
                        respondToInvitation(true);
                    }}>{$LL.desktop.miniWindow.accept()}</button
                >
                <button
                    class="{textButton} bg-white/10 hover:bg-white/20"
                    type="button"
                    onclick={() => respondToInvitation(false)}>{$LL.desktop.miniWindow.decline()}</button
                >
            </div>
        </div>
    {/if}

    <div class="relative min-h-0 flex-1 overflow-hidden">
        <!-- The page's meeting layout lands here (PictureInPicture.svelte). Its controls are the header's here, and
             its map backdrop would cover the whole window. -->
        <div
            bind:this={videoHost}
            class="absolute inset-0 bg-contrast-900 [&_.pip-action-bar]:hidden [&_.pip-map-background]:hidden"
        ></div>

        <section class={viewClass(view === "people")}>
            {@render viewHead($LL.desktop.miniWindow.onlineUsers(), users.length)}
            <div class="min-h-0 flex-1 overflow-y-auto p-1.5" data-testid="mini-window-people">
                {#each users as user (user.id)}
                    <div class="group {listRow}">
                        {#if user.woka}
                            <span class="size-6.5 shrink-0 overflow-hidden rounded-full"
                                ><img class={wokaImage} src={user.woka} alt="" /></span
                            >
                        {:else}
                            {@const color = Color.getColorByString(user.name)}
                            <span
                                class="grid size-6.5 shrink-0 place-items-center rounded-full text-xxs font-bold uppercase"
                                style="background: {color}; color: {Color.getTextColorByBackgroundColor(color)}"
                                >{initials(user.name)}</span
                            >
                        {/if}
                        <span class="flex-1 truncate font-medium"
                            >{user.isSelf
                                ? $LL.desktop.miniWindow.you()
                                : user.name || $LL.desktop.miniWindow.someone()}</span
                        >
                        {#if user.isSelf}
                            <span class="shrink-0 text-xxs text-white/40">{$LL.desktop.miniWindow.youChip()}</span>
                        {:else}
                            <div class="hidden shrink-0 gap-0.5 group-hover:flex">
                                <button
                                    class={rowButton}
                                    type="button"
                                    title={$LL.desktop.miniWindow.inviteToMeeting()}
                                    aria-label={$LL.desktop.miniWindow.inviteToMeeting()}
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
                                    class={rowButton}
                                    type="button"
                                    title={$LL.desktop.miniWindow.message()}
                                    aria-label={$LL.desktop.miniWindow.message()}
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
                                    class={rowButton}
                                    type="button"
                                    title={$LL.desktop.miniWindow.locate()}
                                    aria-label={$LL.desktop.miniWindow.locate()}
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
                        <span
                            class="size-2.5 shrink-0 rounded-full"
                            style:background-color={statusDotColor(user.status)}
                        ></span>
                    </div>
                {/each}
            </div>
            {#if users.length === 0}
                <div class="px-4 py-5 text-center text-white/40">{$LL.desktop.miniWindow.noOneAround()}</div>
            {/if}
        </section>

        <section class={viewClass(view === "chat")}>
            {@render viewHead($LL.desktop.miniWindow.chat())}

            {#if !inConversation}
                <div class="min-h-0 flex-1 overflow-y-auto p-1.5">
                    {#each $conversations as conversation (conversation.id)}
                        <button
                            class="flex w-full items-center gap-2.5 rounded p-2 text-start text-white hover:bg-white/5"
                            type="button"
                            onclick={() => openConversation(conversation.id)}
                        >
                            {#if conversation.woka}
                                <span class="size-7.5 shrink-0 overflow-hidden rounded-full bg-white/10"
                                    ><img class={wokaImage} src={conversation.woka} alt="" /></span
                                >
                            {:else}
                                <span
                                    class="inline-flex size-7.5 shrink-0 items-center justify-center rounded bg-white/10 text-white/60"
                                >
                                    <svg
                                        class="size-4"
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
                            <div class="min-w-0 flex-1">
                                <div class="truncate font-bold">
                                    {conversation.name || $LL.desktop.miniWindow.conversation()}
                                </div>
                                {#if conversation.preview}<div class="truncate text-xxs text-white/40">
                                        {conversation.preview}
                                    </div>{/if}
                            </div>
                            {#if conversation.highlightCount > 0}
                                <span
                                    class="inline-flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full bg-danger px-1.5 text-xxs font-bold text-white"
                                    >@{conversation.highlightCount > 99 ? "99+" : conversation.highlightCount}</span
                                >
                            {:else if conversation.unreadCount > 0}
                                <span
                                    class="size-2.5 shrink-0 rounded-full bg-success"
                                    title={conversation.unreadCount > 1
                                        ? $LL.desktop.miniWindow.unreadMessages({ count: conversation.unreadCount })
                                        : $LL.desktop.miniWindow.unreadMessage()}
                                ></span>
                            {/if}
                        </button>
                    {/each}
                </div>
                {#if $conversations.length === 0}
                    <div class="px-4 py-5 text-center text-white/40">
                        {$chatStatus === "connecting"
                            ? $LL.desktop.miniWindow.connectingChat()
                            : $chatStatus === "unavailable"
                              ? $LL.desktop.miniWindow.chatUnavailable()
                              : $LL.desktop.miniWindow.noConversations()}
                    </div>
                {/if}
            {:else}
                <div class="flex min-h-0 flex-1 flex-col">
                    <div class="flex items-center gap-1.5 border-b border-white/10 px-2 py-1.5">
                        <button
                            class="{iconButton} hover:bg-white/10"
                            type="button"
                            title={$LL.desktop.miniWindow.backToConversations()}
                            aria-label={$LL.desktop.miniWindow.backToConversations()}
                            onclick={() => (inConversation = false)}
                        >
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1.8"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                aria-hidden="true"><path d="M15 6l-6 6l6 6" /></svg
                            >
                        </button>
                        <div class="flex-1 truncate font-bold">
                            {shownConversation?.name || $LL.desktop.miniWindow.conversation()}
                        </div>
                        {#if conversationId}
                            {@const id = conversationId}
                            <button
                                class="{iconButton} hover:bg-white/10"
                                type="button"
                                title={$LL.desktop.miniWindow.openInApp()}
                                aria-label={$LL.desktop.miniWindow.openInApp()}
                                onclick={() => openInApp(() => chat.openInApp(id))}
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="1.8"
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
            <section class={viewClass(view === "agenda")}>
                {@render viewHead($LL.desktop.miniWindow.today())}
                <div class="min-h-0 flex-1 overflow-y-auto p-1.5">
                    {#if agenda.meetings}
                        {@const nextIndex = agenda.meetings[0]?.live ? 1 : 0}
                        <div
                            class="flex items-center gap-1.5 px-1.5 pt-2.5 pb-1 text-xxs font-bold tracking-wide text-white/40 uppercase"
                        >
                            {$LL.desktop.miniWindow.meetings()}
                        </div>
                        {#each agenda.meetings as meeting, index (meeting.id)}
                            <div class={listRow}>
                                <span
                                    class="w-10.5 shrink-0 text-end text-xxs tabular-nums {meeting.live
                                        ? 'font-bold text-success'
                                        : 'text-white/60'}">{meeting.time}</span
                                >
                                <span
                                    class="w-0.75 shrink-0 self-stretch rounded-sm {meeting.live
                                        ? 'bg-success'
                                        : index === nextIndex
                                          ? 'bg-secondary'
                                          : 'bg-white/10'}"
                                ></span>
                                <div class="min-w-0 flex-1">
                                    <div class="truncate font-bold">{meeting.title}</div>
                                    <div class="truncate text-xxs text-white/40">{meeting.detail}</div>
                                </div>
                                {#if meeting.joinable}
                                    <button
                                        class="{textButton} {meeting.live
                                            ? activeButton
                                            : 'bg-white/10 hover:bg-white/20'}"
                                        type="button"
                                        onclick={() => join(meeting)}>{$LL.desktop.miniWindow.join()}</button
                                    >
                                {/if}
                            </div>
                        {:else}
                            <div class="px-2 pt-1 pb-1.5 text-white/40">{$LL.desktop.miniWindow.noMoreMeetings()}</div>
                        {/each}
                        <button
                            class="mb-1.5 flex items-center gap-1.5 rounded px-2 py-1.5 font-bold text-secondary-300 hover:bg-white/5"
                            type="button"
                            onclick={() => openInApp(() => isCalendarVisibleStore.set(true))}
                            >{$LL.desktop.miniWindow.fullAgenda()}</button
                        >
                    {/if}
                    {#if agenda.tasks}
                        <div
                            class="flex items-center gap-1.5 px-1.5 pt-2.5 pb-1 text-xxs font-bold tracking-wide text-white/40 uppercase"
                        >
                            {$LL.desktop.miniWindow.tasks()}
                            {#if agenda.tasks.open > 0}<span class={count}>{agenda.tasks.open}</span>{/if}
                        </div>
                        {#each agenda.tasks.items as task (task.id)}
                            <div class={listRow}>
                                <span
                                    class="size-3.5 shrink-0 rounded-full border-2 border-solid {task.inProgress
                                        ? 'border-secondary bg-conic from-secondary from-50% to-transparent to-50%'
                                        : 'border-white/40'}"
                                ></span>
                                <div class="min-w-0 flex-1">
                                    <div class="truncate font-bold">{task.title}</div>
                                    <div class="truncate text-xxs text-white/40">{task.list}</div>
                                </div>
                                {#if task.due}<span
                                        class="shrink-0 rounded-full px-2 py-0.5 text-xxs font-bold {due[task.urgency]}"
                                        >{task.due}</span
                                    >{/if}
                            </div>
                        {:else}
                            <div class="px-2 pt-1 pb-1.5 text-white/40">{$LL.desktop.miniWindow.noTasks()}</div>
                        {/each}
                        <button
                            class="mb-1.5 flex items-center gap-1.5 rounded px-2 py-1.5 font-bold text-secondary-300 hover:bg-white/5"
                            type="button"
                            onclick={() => openInApp(() => isTodoListVisibleStore.set(true))}
                            >{$LL.desktop.miniWindow.allTasks()}</button
                        >
                    {/if}
                </div>
            </section>
        {/if}
    </div>
</div>

<!-- The share's source is picked here too: no need to come back to the world window to start sharing. -->
{#if $showDesktopCapturerSourcePicker}
    <DesktopCapturerSourcePicker />
{/if}

<!-- Menus opened from this window (a tile's menu) render in this window. -->
<FloatingUiPopupList targetDocument={ownerDocument} />
