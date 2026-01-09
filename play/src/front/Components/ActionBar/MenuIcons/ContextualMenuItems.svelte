<script lang="ts">
    import { getContext } from "svelte";
    import { audioManagerVisibilityStore } from "../../../Stores/AudioManagerStore";
    import { bottomActionBarVisibilityStore } from "../../../Stores/BottomActionBarStore";
    import { inLivekitStore } from "../../../Stores/MediaStore";
    import { followStateStore } from "../../../Stores/FollowStore";
    import { requestedMegaphoneStore } from "../../../Stores/MegaphoneStore";
    import LL from "../../../../i18n/i18n-svelte";
    import AppsMenuItem from "./AppsMenuItem.svelte";
    import FollowMenuItem from "./FollowMenuItem.svelte";
    import EmojiMenuItem from "./EmojiMenuItem.svelte";
    import LockDiscussionMenuItem from "./LockDiscussionMenuItem.svelte";
    import MusicMenuItem from "./MusicMenuItem.svelte";
    import HeaderMenuItem from "./HeaderMenuItem.svelte";
    import MegaphoneMenuItem from "./MegaphoneMenuItem.svelte";
    import { derived } from "svelte/store";
    import RecordingMenuItem from "./RecordingMenuItem.svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";

    const inProfileMenu = getContext("profileMenu");

    const gameScene = gameManager.getCurrentGameScene();
    const spacesWithRecording = gameScene.spaceRegistry.spacesWithRecording;
    const shouldDisplayRecordingButton = derived(
        [spacesWithRecording],
        ([$spacesWithRecording]) => $spacesWithRecording.length > 0
    );

    // These menu items are displayed to the left of the camera/microphone icons.
    // They switch automatically to the profile menu when the screen is small.
</script>

{#if inProfileMenu && ($audioManagerVisibilityStore !== "hidden" || $bottomActionBarVisibilityStore)}
    <HeaderMenuItem label={$LL.menu.sub.contextualActions()} />
{/if}

{#if $audioManagerVisibilityStore !== "hidden"}
    <MusicMenuItem />
{/if}

{#if !inProfileMenu}
    <EmojiMenuItem />
    <AppsMenuItem />
{/if}

{#if ($bottomActionBarVisibilityStore && !$inLivekitStore) || $followStateStore !== "off"}
    <!-- <ChangeLayoutMenuItem /> -->

    <FollowMenuItem />
{/if}

{#if $bottomActionBarVisibilityStore && !$inLivekitStore}
    <!-- <ChangeLayoutMenuItem /> -->

    <LockDiscussionMenuItem />
{/if}

{#if $shouldDisplayRecordingButton}
    <RecordingMenuItem />
{/if}

{#if $requestedMegaphoneStore}
    <MegaphoneMenuItem />
{/if}

{#if inProfileMenu}
    <!-- In the profile menu, the apps submenu is displayed at the end (because it contains a heading) -->
    <AppsMenuItem />
{/if}
