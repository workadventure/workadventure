<script lang="ts">
    import { onMount, setContext, tick } from "svelte";
    import type { DesktopCapturerSource, WorkAdventureDesktopWindowsApi } from "@workadventure/desktop-api";
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
    import {
        inExternalServiceStore,
        myCameraStore,
        myMicrophoneStore,
        proximityMeetingStore,
    } from "../../../Stores/MyMediaStore";
    import { startScreenShareWithSource } from "../../../Stores/ScreenSharingStore";
    import { localUserStore } from "../../../Connection/LocalUserStore";
    import { LL } from "../../../../i18n/i18n-svelte";
    import MicrophoneMenuItem from "../../ActionBar/MenuIcons/MicrophoneMenuItem.svelte";
    import CameraMenuItem from "../../ActionBar/MenuIcons/CameraMenuItem.svelte";
    import ScreenSharingMenuItem from "../../ActionBar/MenuIcons/ScreenSharingMenuItem.svelte";
    import {
        IconCamera,
        IconCheck,
        IconDeviceComputerCamera,
        IconDeviceDesktopUp,
        IconDots,
        IconGripVertical,
        IconMicrophone,
        IconPencil,
        IconSettings,
        IconUsersGroup,
        IconX,
    } from "@wa-icons";

    /**
     * The desktop presenter meeting bar, mounted into a child window of the world page while the user shares
     * their screen. Styled with the app's Tailwind theme (the page's styles are copied in), with the app's own
     * media buttons. The desktop app places it on the shared screen and keeps it out of the capture; the window
     * grows upwards while the menu, the source picker or the device list is open.
     */
    interface Props {
        windows: WorkAdventureDesktopWindowsApi;
        /** The bar window's document. */
        ownerDocument: Document;
    }

    let { windows, ownerDocument }: Props = $props();

    // The app's ActionBarButtons in this window are compact, as in the mini window.
    setContext("compactActionBar", true);

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
    const sourceKinds = ["screen", "window"] as const;
    let pickerKind: (typeof sourceKinds)[number] = $state("screen");
    let sources: Array<DesktopCapturerSource & { kind: "screen" | "window" }> | undefined = $state();
    let sourcesError = $state(false);
    let moreButton: HTMLButtonElement | undefined = $state();
    let menuElement: HTMLDivElement | undefined = $state();
    let devicesElement: HTMLDivElement | undefined = $state();
    let menuLeft = $state(6);
    let caretLeft = $state(0);

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
            if (devicesOpen && !devicesElement?.contains(target)) devicesOpen = false;
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

    // The look of the app's compact ActionBarButton (as in the mini window), with the theme's colors.
    const barButton = "inline-flex size-9 items-center justify-center rounded text-neutral-100 [&>svg]:size-6";
    const activeButton = "bg-secondary hover:bg-secondary-600";
    const surface = "rounded-xl bg-contrast/90 shadow-xl backdrop-blur";
    const panel = `${surface} mb-2 flex min-h-0 flex-col`;
    const panelHead = "flex items-center justify-between gap-2 border-b border-white/10 px-2.5 py-2";
    const closeButton = "inline-flex size-6 items-center justify-center rounded bg-white/5 hover:bg-white/15";
    const menuItem = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-sm hover:bg-white/10";
    const menuIcon = "inline-flex w-8.5 shrink-0 justify-center [&>svg]:size-4.5";
    const separator = "mx-1.5 my-1 h-px bg-white/10";
    const muted = "text-xs text-white/60";
</script>

{#snippet panelHeader(title: string, closeLabel: string, close: () => void, withKinds: boolean)}
    <div class={panelHead}>
        <span class="text-xs font-bold">{title}</span>
        {#if withKinds}
            <div class="flex gap-1">
                {#each sourceKinds as kind (kind)}
                    <button
                        class="rounded-full px-2.5 py-1 text-xxs {pickerKind === kind
                            ? 'bg-secondary'
                            : 'bg-white/5 hover:bg-white/10'}"
                        type="button"
                        onclick={() => (pickerKind = kind)}
                        >{kind === "screen"
                            ? $LL.desktop.meetingBar.screens()
                            : $LL.desktop.meetingBar.windows()}</button
                    >
                {/each}
            </div>
        {/if}
        <button class={closeButton} type="button" aria-label={closeLabel} onclick={close}>
            <IconX class="size-4" />
        </button>
    </div>
{/snippet}

{#snippet deviceGroup(
    kind: "camera" | "microphone",
    devices: MediaDeviceInfo[] | undefined,
    currentId: string | undefined,
    enabled: boolean,
)}
    <div class="flex items-center gap-1.5 px-1 pt-2 pb-1 text-xxs font-bold tracking-wide text-white/60 uppercase">
        {#if kind === "camera"}<IconCamera class="size-3.5" />{:else}<IconMicrophone class="size-3.5" />{/if}
        <span>{kind === "camera" ? $LL.desktop.meetingBar.camera() : $LL.desktop.meetingBar.microphone()}</span>
    </div>
    {#if !enabled}
        <div class="{muted} px-2.5 py-2">
            {kind === "camera" ? $LL.desktop.meetingBar.cameraOff() : $LL.desktop.meetingBar.microphoneOff()}
        </div>
    {:else if !devices || devices.length === 0}
        <div class="{muted} px-2.5 py-2">
            {kind === "camera" ? $LL.desktop.meetingBar.noCamera() : $LL.desktop.meetingBar.noMicrophone()}
        </div>
    {:else}
        {#each devices as device (device.deviceId)}
            <button
                type="button"
                class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start text-xs hover:bg-white/10"
                onclick={() => pickDevice(kind, device.deviceId)}
            >
                <IconCheck class="size-4 shrink-0 text-secondary {device.deviceId === currentId ? '' : 'invisible'}" />
                <span class="truncate">{device.label || device.deviceId}</span>
            </button>
        {/each}
    {/if}
{/snippet}

<!-- Bottom-anchored: the pill stays pinned to the window's bottom edge, so the panels open above it. -->
<div class="flex h-screen flex-col justify-end text-white">
    {#if pickerOpen}
        <div class="{panel} mx-1 flex-1" role="dialog" aria-label={$LL.desktop.meetingBar.switchSharedScreenDialog()}>
            {@render panelHeader(
                $LL.desktop.meetingBar.switchWhatYouShare(),
                $LL.desktop.meetingBar.cancel(),
                () => (pickerOpen = false),
                true,
            )}
            {#if sourcesError}
                <div class="{muted} grid flex-1 place-items-center">{$LL.desktop.meetingBar.unableToListSources()}</div>
            {:else if !shownSources}
                <div class="{muted} grid flex-1 place-items-center">{$LL.desktop.meetingBar.loadingSources()}</div>
            {:else}
                <div class="grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto p-2">
                    {#each shownSources as source, index (source.id)}
                        <button
                            class="flex flex-col overflow-hidden rounded-md border border-solid border-white/5 bg-white/5 text-start hover:border-secondary/60 hover:bg-secondary/20"
                            type="button"
                            title={source.name}
                            onclick={() => pickSource(source)}
                        >
                            <img
                                class="block aspect-video w-full bg-black object-cover"
                                alt={source.name}
                                src={source.thumbnailURL}
                            />
                            <span class="truncate px-1.5 py-1 text-xxs"
                                >{pickerKind === "screen"
                                    ? `${index + 1} · ${source.name || $LL.desktop.meetingBar.screen()}`
                                    : source.name || $LL.desktop.meetingBar.untitled()}</span
                            >
                        </button>
                    {:else}
                        <div class="{muted} col-span-full p-1.5 text-center">
                            {pickerKind === "screen"
                                ? $LL.desktop.meetingBar.noScreen()
                                : $LL.desktop.meetingBar.noWindow()}
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}

    {#if devicesOpen}
        <div
            class="{panel} w-full max-w-90 self-center"
            role="dialog"
            aria-label={$LL.desktop.meetingBar.changeDevicesDialog()}
            bind:this={devicesElement}
        >
            {@render panelHeader(
                $LL.desktop.meetingBar.cameraAndMicrophone(),
                $LL.desktop.meetingBar.close(),
                () => (devicesOpen = false),
                false,
            )}
            <div class="min-h-0 flex-1 overflow-y-auto px-2 pt-1.5 pb-2">
                {@render deviceGroup("camera", $cameraListStore, $usedCameraDeviceIdStore, $requestedCameraState)}
                {@render deviceGroup(
                    "microphone",
                    $microphoneListStore,
                    $usedMicrophoneDeviceIdStore,
                    $requestedMicrophoneState,
                )}
            </div>
        </div>
    {/if}

    {#if menuOpen}
        <!-- Right-aligned to the "…" (left set by toggleMenu), just above the bar. -->
        <div
            class="{surface} fixed bottom-14 z-10 flex min-w-56 flex-col p-1.5"
            role="menu"
            aria-label={$LL.desktop.meetingBar.moreOptions()}
            bind:this={menuElement}
            style:left="{menuLeft}px"
        >
            <button
                class={menuItem}
                type="button"
                role="menuitemcheckbox"
                aria-checked={tabStripShown}
                onclick={() => {
                    windows.toggleTabStrip();
                    menuOpen = false;
                }}
            >
                <span
                    class="relative h-4.5 w-8.5 shrink-0 rounded-full transition-colors {tabStripShown
                        ? 'bg-secondary'
                        : 'bg-white/20'}"
                    aria-hidden="true"
                >
                    <span
                        class="absolute top-0.5 left-0.5 size-3.5 rounded-full bg-white transition-transform {tabStripShown
                            ? 'translate-x-4'
                            : ''}"
                    ></span>
                </span>
                <span class="flex-1">{$LL.desktop.meetingBar.displayTabs()}</span>
            </button>
            <div class={separator}></div>
            <button class={menuItem} type="button" onclick={openPicker}>
                <span class={menuIcon}><IconDeviceDesktopUp /></span>
                <span class="flex-1">{$LL.desktop.meetingBar.switchSharedScreen()}</span>
            </button>
            <button class={menuItem} type="button" onclick={openDevices}>
                <span class={menuIcon}><IconDeviceComputerCamera /></span>
                <span class="flex-1">{$LL.desktop.meetingBar.changeDevices()}</span>
            </button>
            <div class={separator}></div>
            <button
                class={menuItem}
                type="button"
                onclick={() => {
                    menuOpen = false;
                    windows.focusMain();
                }}
            >
                <span class={menuIcon}><IconSettings /></span>
                <span class="flex-1">{$LL.desktop.meetingBar.otherSettings()}</span>
            </button>
            <!-- Joins the menu to the "…" button, so it is clear which button opened it. -->
            <span
                class="pointer-events-none absolute -bottom-2 size-0 -translate-x-1/2 border-x-7 border-t-8 border-solid border-x-transparent border-t-contrast/90"
                aria-hidden="true"
                style:left="{caretLeft}px"
            ></span>
        </div>
    {/if}

    <div class="flex shrink-0 justify-center px-1 pt-1 pb-2" data-testid="desktop-meeting-bar">
        <!-- Drags the window; the buttons opt out. -->
        <div class="{surface} inline-flex items-center px-2 py-1 [-webkit-app-region:drag]">
            <IconGripVertical class="me-1.5 size-5 cursor-grab text-white/60" aria-hidden="true" />
            <div class="flex items-center gap-0.5 [-webkit-app-region:no-drag]">
                <button
                    type="button"
                    class="{barButton} {$localAnnotationActiveStore ? activeButton : 'hover:bg-white/10'}"
                    data-testid="desktop-annotate"
                    title={$LL.desktop.meetingBar.annotate()}
                    aria-label={$LL.desktop.meetingBar.annotate()}
                    aria-pressed={$localAnnotationActiveStore}
                    onclick={() => screenAnnotationManager.toggleDrawingOnMyShare()}
                >
                    <IconPencil />
                </button>
                <button
                    type="button"
                    class="{barButton} {othersAllowed ? activeButton : 'hover:bg-white/10'}"
                    data-testid="desktop-allow-annotations"
                    aria-pressed={othersAllowed}
                    title={othersAllowed
                        ? $LL.screenAnnotation.disallowAnnotations()
                        : $LL.screenAnnotation.allowAnnotations()}
                    aria-label={othersAllowed
                        ? $LL.screenAnnotation.disallowAnnotations()
                        : $LL.screenAnnotation.allowAnnotations()}
                    onclick={() => screenAnnotationManager.setOthersAllowed(!othersAllowed)}
                >
                    <IconUsersGroup />
                </button>
                <!-- The app's own media buttons, as in its action bar. -->
                {#if !$inExternalServiceStore && $proximityMeetingStore && $myMicrophoneStore}
                    <MicrophoneMenuItem />
                {/if}
                {#if !$inExternalServiceStore && $myCameraStore}
                    <CameraMenuItem />
                {/if}
                <ScreenSharingMenuItem />
                <button
                    type="button"
                    class="{barButton} hover:bg-white/10"
                    title={$LL.desktop.meetingBar.moreOptions()}
                    aria-label={$LL.desktop.meetingBar.moreOptions()}
                    aria-haspopup="true"
                    aria-expanded={menuOpen}
                    bind:this={moreButton}
                    onclick={toggleMenu}
                >
                    <IconDots />
                </button>
            </div>
        </div>
    </div>
</div>
