<script lang="ts">
    import { onMount, tick } from "svelte";
    import { screenAnnotationManager } from "../../../Space/ScreenAnnotation/ScreenAnnotationManager";
    import { localAnnotationActiveStore, screenAnnotationEnabledStore } from "../../../Stores/ScreenAnnotationStore";
    import {
        cameraListStore,
        microphoneListStore,
        requestedCameraDeviceIdStore,
        requestedCameraState,
        requestedMicrophoneDeviceIdStore,
        requestedMicrophoneState,
        usedCameraDeviceIdStore,
        usedMicrophoneDeviceIdStore,
    } from "../../../Stores/MediaStore";
    import { requestedScreenSharingState, startScreenShareWithSource } from "../../../Stores/ScreenSharingStore";
    import { localUserStore } from "../../../Connection/LocalUserStore";
    import type {
        DesktopCapturerSource,
        WorkAdventureDesktopWindowsApi,
    } from "../../../Interfaces/DesktopAppInterfaces";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { toggleCamera, toggleMicrophone } from "./desktopCompanionState";

    /**
     * The desktop presenter meeting bar, mounted into a child window of the world page while the user shares
     * their screen. It keeps the design of the native bar it replaces (desktopMeetingBar.css). The desktop app
     * places it on the shared screen and keeps it out of the capture; the window grows upwards while the menu,
     * the source picker or the device list is open.
     */
    interface Props {
        windows: WorkAdventureDesktopWindowsApi;
        /** The bar window's document. */
        ownerDocument: Document;
    }

    let { windows, ownerDocument }: Props = $props();

    // Read the id on each store update: the bar can open before the share's space is known.
    let othersAllowed = $derived($screenAnnotationEnabledStore.get(screenAnnotationManager.localUserId ?? "") ?? false);

    // The desktop app opens the window this high (the pill is pinned to its bottom): a page cannot make a
    // window less than 100 high.
    const COLLAPSED_HEIGHT = 100;
    const EXPANDED_HEIGHT = 420;

    let menuOpen = $state(false);
    let pickerOpen = $state(false);
    let devicesOpen = $state(false);
    let tabStripShown = $state(false);
    let pickerKind: "screen" | "window" = $state("screen");
    let sources: Array<DesktopCapturerSource & { kind: "screen" | "window" }> | undefined = $state();
    let sourcesError = $state(false);
    let moreButton: HTMLButtonElement | undefined = $state();
    let menuElement: HTMLDivElement | undefined = $state();
    let menuLeft = $state(6);
    let caretLeft = $state(0);

    let micEnabled = $derived($requestedMicrophoneState);
    let cameraEnabled = $derived($requestedCameraState);
    let shownSources = $derived(sources?.filter((source) => source.kind === pickerKind));

    // Bottom-anchored: the window grows upwards, the pill staying where the user left it. Not before the
    // window shows: until then it has no size yet (the desktop app opens it at the pill's size).
    $effect(() => {
        const height = menuOpen || pickerOpen || devicesOpen ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;
        const win = ownerDocument.defaultView;
        if (!win || win.outerWidth === 0) return;
        if (win.outerHeight === height) return;
        const left = win.screenX;
        const bottom = win.screenY + win.outerHeight;
        win.resizeTo(win.outerWidth, height);
        win.moveTo(left, bottom - height);
    });

    onMount(() => {
        ownerDocument.documentElement.lang = document.documentElement.lang;
        ownerDocument.documentElement.dir = document.documentElement.dir;
        const onKeydown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            if (menuOpen) menuOpen = false;
            else if (pickerOpen) pickerOpen = false;
            else if (devicesOpen) devicesOpen = false;
        };
        // The menu and the device list close on a click elsewhere.
        const onMousedown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (menuOpen && !moreButton?.contains(target) && !menuElement?.contains(target)) menuOpen = false;
            if (devicesOpen && !ownerDocument.getElementById("devices")?.contains(target)) devicesOpen = false;
        };
        ownerDocument.addEventListener("keydown", onKeydown);
        ownerDocument.addEventListener("mousedown", onMousedown, true);
        return () => {
            ownerDocument.removeEventListener("keydown", onKeydown);
            ownerDocument.removeEventListener("mousedown", onMousedown, true);
        };
    });

    async function toggleMenu() {
        if (menuOpen) {
            menuOpen = false;
            return;
        }
        pickerOpen = false;
        devicesOpen = false;
        windows
            .tabStripShown()
            .then((shown) => (tabStripShown = shown))
            .catch(() => {});
        menuOpen = true;
        await tick();
        // Right-aligned to the "…", the caret pointing at it.
        if (!moreButton || !menuElement) return;
        const rect = moreButton.getBoundingClientRect();
        menuLeft = Math.max(6, Math.round(rect.right - menuElement.offsetWidth));
        caretLeft = Math.round((rect.left + rect.right) / 2 - menuLeft);
    }

    function openPicker() {
        menuOpen = false;
        devicesOpen = false;
        pickerOpen = true;
        sources = undefined;
        sourcesError = false;
        const getSources = window.WAD?.getDesktopCapturerSources;
        if (!getSources) {
            sourcesError = true;
            return;
        }
        getSources({ types: ["screen", "window"], thumbnailSize: { width: 320, height: 180 } })
            .then((list) => {
                sources = list.map((source) => ({
                    ...source,
                    kind: source.id.startsWith("window:") ? ("window" as const) : ("screen" as const),
                }));
            })
            .catch(() => (sourcesError = true));
    }

    function pickSource(source: DesktopCapturerSource) {
        // Already sharing: the new source is captured in place, the share goes on.
        startScreenShareWithSource(source);
        pickerOpen = false;
    }

    function openDevices() {
        menuOpen = false;
        pickerOpen = false;
        devicesOpen = true;
    }

    function pickDevice(kind: "camera" | "microphone", deviceId: string) {
        if (kind === "camera") {
            requestedCameraDeviceIdStore.set(deviceId);
            localUserStore.setPreferredVideoInputDevice(deviceId);
        } else {
            requestedMicrophoneDeviceIdStore.set(deviceId);
            localUserStore.setPreferredAudioInputDevice(deviceId);
        }
        devicesOpen = false;
    }
</script>

{#snippet deviceGroup(
    kind: "camera" | "microphone",
    devices: MediaDeviceInfo[] | undefined,
    currentId: string | undefined,
    enabled: boolean,
)}
    <div class="dv-group">
        <span class="dv-group-ico">
            {#if kind === "camera"}
                <svg viewBox="0 0 24 24" aria-hidden="true"
                    ><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
                        d="M15 10l4.553 -2.276a1 1 0 0 1 1.447 .894v6.764a1 1 0 0 1 -1.447 .894l-4.553 -2.276v-4z"
                    /><path d="M3 6m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z" /></svg
                >
            {:else}
                <svg viewBox="0 0 24 24" aria-hidden="true"
                    ><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
                        d="M9 2m0 3a3 3 0 0 1 3 -3h0a3 3 0 0 1 3 3v5a3 3 0 0 1 -3 3h0a3 3 0 0 1 -3 -3z"
                    /><path d="M5 10a7 7 0 0 0 14 0" /><path d="M8 21l8 0" /><path d="M12 17l0 4" /></svg
                >
            {/if}
        </span>
        <span>{kind === "camera" ? $LL.desktop.meetingBar.camera() : $LL.desktop.meetingBar.microphone()}</span>
    </div>
    {#if !enabled}
        <div class="dv-empty">
            {kind === "camera" ? $LL.desktop.meetingBar.cameraOff() : $LL.desktop.meetingBar.microphoneOff()}
        </div>
    {:else if !devices || devices.length === 0}
        <div class="dv-empty">
            {kind === "camera" ? $LL.desktop.meetingBar.noCamera() : $LL.desktop.meetingBar.noMicrophone()}
        </div>
    {:else}
        {#each devices as device (device.deviceId)}
            <button
                type="button"
                class="dv-item"
                class:is-current={device.deviceId === currentId}
                onclick={() => pickDevice(kind, device.deviceId)}
            >
                <span class="dv-check"
                    ><svg viewBox="0 0 24 24" aria-hidden="true"
                        ><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M5 12l5 5l10 -10" /></svg
                    ></span
                >
                <span class="dv-name">{device.label || device.deviceId}</span>
            </button>
        {/each}
    {/if}
{/snippet}

<div
    id="picker"
    class:visible={pickerOpen}
    role="dialog"
    aria-label={$LL.desktop.meetingBar.switchSharedScreenDialog()}
>
    <div class="pk-header">
        <span class="pk-title">{$LL.desktop.meetingBar.switchWhatYouShare()}</span>
        <div class="pk-tabs">
            <button
                class="pk-tab"
                class:active={pickerKind === "screen"}
                type="button"
                onclick={() => (pickerKind = "screen")}>{$LL.desktop.meetingBar.screens()}</button
            >
            <button
                class="pk-tab"
                class:active={pickerKind === "window"}
                type="button"
                onclick={() => (pickerKind = "window")}>{$LL.desktop.meetingBar.windows()}</button
            >
        </div>
        <button
            class="pk-close"
            type="button"
            aria-label={$LL.desktop.meetingBar.cancel()}
            onclick={() => (pickerOpen = false)}>×</button
        >
    </div>
    {#if sourcesError}
        <div class="pk-body empty">{$LL.desktop.meetingBar.unableToListSources()}</div>
    {:else if !shownSources}
        <div class="pk-body loading">{$LL.desktop.meetingBar.loadingSources()}</div>
    {:else if shownSources.length === 0}
        <div class="pk-body">
            <div class="pk-note">
                {pickerKind === "screen" ? $LL.desktop.meetingBar.noScreen() : $LL.desktop.meetingBar.noWindow()}
            </div>
        </div>
    {:else}
        <div class="pk-body">
            {#each shownSources as source, index (source.id)}
                <button class="pk-tile" type="button" title={source.name} onclick={() => pickSource(source)}>
                    <img alt={source.name} src={source.thumbnailURL} />
                    <span class="pk-tile-name"
                        >{pickerKind === "screen"
                            ? `${index + 1} · ${source.name || $LL.desktop.meetingBar.screen()}`
                            : source.name || $LL.desktop.meetingBar.untitled()}</span
                    >
                </button>
            {/each}
        </div>
    {/if}
</div>

<div id="devices" class:visible={devicesOpen} role="dialog" aria-label={$LL.desktop.meetingBar.changeDevicesDialog()}>
    <div class="pk-header">
        <span class="pk-title">{$LL.desktop.meetingBar.cameraAndMicrophone()}</span>
        <button
            class="pk-close"
            type="button"
            aria-label={$LL.desktop.meetingBar.close()}
            onclick={() => (devicesOpen = false)}>×</button
        >
    </div>
    <div class="dv-body">
        {@render deviceGroup("camera", $cameraListStore, $usedCameraDeviceIdStore, cameraEnabled)}
        {@render deviceGroup("microphone", $microphoneListStore, $usedMicrophoneDeviceIdStore, micEnabled)}
    </div>
</div>

<div
    id="menu"
    class:visible={menuOpen}
    role="menu"
    aria-label={$LL.desktop.meetingBar.moreOptions()}
    bind:this={menuElement}
    style="left: {menuLeft}px"
>
    <button
        class="mn-item"
        type="button"
        role="menuitemcheckbox"
        aria-checked={tabStripShown}
        onclick={() => {
            windows.toggleTabStrip();
            menuOpen = false;
        }}
    >
        <span class="mn-toggle" aria-hidden="true"></span>
        <span class="mn-label">{$LL.desktop.meetingBar.displayTabs()}</span>
    </button>
    <div class="mn-sep"></div>
    <button class="mn-item" type="button" onclick={openPicker}>
        <span class="mn-ico"
            ><svg viewBox="0 0 24 24" aria-hidden="true"
                ><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
                    d="M3 5m0 1a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1z"
                /><path d="M7 20h10" /><path d="M9 16v4" /><path d="M15 16v4" /><path d="M9 11l3 -3l3 3" /></svg
            ></span
        >
        <span class="mn-label">{$LL.desktop.meetingBar.switchSharedScreen()}</span>
    </button>
    <button class="mn-item" type="button" onclick={openDevices}>
        <span class="mn-ico"
            ><svg viewBox="0 0 24 24" aria-hidden="true"
                ><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
                    d="M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0"
                /><path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path
                    d="M5 19h14a2 2 0 0 0 -2 -2h-10a2 2 0 0 0 -2 2"
                /></svg
            ></span
        >
        <span class="mn-label">{$LL.desktop.meetingBar.changeDevices()}</span>
    </button>
    <div class="mn-sep"></div>
    <button
        class="mn-item"
        type="button"
        onclick={() => {
            menuOpen = false;
            windows.focusMain();
        }}
    >
        <span class="mn-ico"
            ><svg viewBox="0 0 24 24" aria-hidden="true"
                ><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
                    d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"
                /><path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" /></svg
            ></span
        >
        <span class="mn-label">{$LL.desktop.meetingBar.otherSettings()}</span>
    </button>
    <span class="mn-caret" aria-hidden="true" style="left: {caretLeft}px"></span>
</div>

<div id="bar" data-testid="desktop-meeting-bar">
    <div class="pill">
        <button
            type="button"
            class="bar-btn"
            class:is-active={$localAnnotationActiveStore}
            data-testid="desktop-annotate"
            title={$LL.desktop.meetingBar.annotate()}
            aria-label={$LL.desktop.meetingBar.annotate()}
            aria-pressed={$localAnnotationActiveStore}
            onclick={() => screenAnnotationManager.toggleDrawingOnMyShare()}
        >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l12-12-4-4L4 16z" /></svg>
        </button>
        <button
            type="button"
            class="bar-btn"
            class:is-active={othersAllowed}
            data-testid="desktop-allow-annotations"
            aria-pressed={othersAllowed}
            title={othersAllowed ? $LL.screenAnnotation.disallowAnnotations() : $LL.screenAnnotation.allowAnnotations()}
            aria-label={othersAllowed
                ? $LL.screenAnnotation.disallowAnnotations()
                : $LL.screenAnnotation.allowAnnotations()}
            onclick={() => screenAnnotationManager.setOthersAllowed(!othersAllowed)}
        >
            <svg viewBox="0 0 24 24" aria-hidden="true"
                ><circle cx="9" cy="7" r="3" /><path
                    d="M3 21v-2a6 6 0 0 1 12 0v2M17 4a3 3 0 0 1 0 6M21 21v-2a6 6 0 0 0-3-5"
                /></svg
            >
        </button>
        <span class="bar-handle" aria-hidden="true">
            <svg viewBox="0 0 24 24"
                ><circle cx="8" cy="5" r="1.5" /><circle cx="16" cy="5" r="1.5" /><circle
                    cx="8"
                    cy="12"
                    r="1.5"
                /><circle cx="16" cy="12" r="1.5" /><circle cx="8" cy="19" r="1.5" /><circle
                    cx="16"
                    cy="19"
                    r="1.5"
                /></svg
            >
        </span>
        <button
            class="bar-btn"
            class:is-forbidden={!micEnabled}
            type="button"
            data-state={micEnabled ? "on" : "off"}
            title={$LL.desktop.meetingBar.toggleMic()}
            aria-label={$LL.desktop.meetingBar.toggleMic()}
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
                /><path d="M5 10a7 7 0 0 0 10.846 5.85m2 -2a6.967 6.967 0 0 0 1.152 -3.85" /><path d="M8 21l8 0" /><path
                    d="M12 17l0 4"
                /></svg
            >
        </button>
        <button
            class="bar-btn"
            class:is-forbidden={!cameraEnabled}
            type="button"
            data-state={cameraEnabled ? "on" : "off"}
            title={$LL.desktop.meetingBar.toggleCamera()}
            aria-label={$LL.desktop.meetingBar.toggleCamera()}
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
                /><path d="M10 6h3a2 2 0 0 1 2 2v3m0 4v1a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2v-8a2 2 0 0 1 2 -2h1" /></svg
            >
        </button>
        <button
            class="bar-btn is-active"
            type="button"
            title={$LL.desktop.meetingBar.stopSharing()}
            aria-label={$LL.desktop.meetingBar.stopSharing()}
            onclick={() => requestedScreenSharingState.disableScreenSharing()}
        >
            <svg viewBox="0 0 24 24" aria-hidden="true"
                ><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
                    d="M21 12v3a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1v-10a1 1 0 0 1 1 -1h9"
                /><path d="M7 20l10 0" /><path d="M9 16l0 4" /><path d="M15 16l0 4" /><path d="M17 4h4v4" /><path
                    d="M16 9l5 -5"
                /></svg
            >
        </button>
        <button
            class="bar-btn"
            type="button"
            title={$LL.desktop.meetingBar.moreOptions()}
            aria-label={$LL.desktop.meetingBar.moreOptions()}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            bind:this={moreButton}
            onclick={toggleMenu}
        >
            <svg viewBox="0 0 24 24" aria-hidden="true" style="fill:currentColor;stroke:none"
                ><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle
                    cx="19"
                    cy="12"
                    r="1.7"
                /></svg
            >
        </button>
    </div>
</div>
