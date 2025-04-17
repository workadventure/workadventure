<script lang="ts">
    import { getContext } from "svelte";
    import { audioManagerVisibilityStore } from "../../../Stores/AudioManagerStore";
    import { silentStore } from "../../../Stores/MediaStore";
    import { bottomActionBarVisibilityStore } from "../../../Stores/BottomActionBarStore";
    import LL from "../../../../i18n/i18n-svelte";
    import AppsMenuItem from "./AppsMenuItem.svelte";
    import FollowMenuItem from "./FollowMenuItem.svelte";
    import EmojiMenuItem from "./EmojiMenuItem.svelte";
    import LockDiscussionMenuItem from "./LockDiscussionMenuItem.svelte";
    import MusicMenuItem from "./MusicMenuItem.svelte";
    import HeaderMenuItem from "./HeaderMenuItem.svelte";
    import ActionBarButton from "../ActionBarButton.svelte";
    import {contextualMenuItemsStore} from "../../../Stores/ContextuaMenuAdditionalItems";
    import { ActionBarItem } from "../../../Stores/ContextuaMenuAdditionalItems";
    import { ICON_URL} from "../../../Enum/EnvironmentVariable";

    const inProfileMenu = getContext("profileMenu");

    let additionalItems: ActionBarItem[] = [];
    contextualMenuItemsStore.subscribe((value) => {
        console.log('store updated')
        additionalItems = value;
    });

    // These menu items are displayed to the left of the camera/microphone icons.
    // They switch automatically to the profile menu when the screen is small.
</script>

{#if inProfileMenu && (($audioManagerVisibilityStore !== "hidden" && !$silentStore) || $bottomActionBarVisibilityStore)}
    <HeaderMenuItem label={$LL.menu.sub.contextualActions()} />
{/if}

{#if $audioManagerVisibilityStore !== "hidden" && !$silentStore}
    <MusicMenuItem />
{/if}

{#if !inProfileMenu}
    <EmojiMenuItem />
    <AppsMenuItem />
{/if}

{#if $bottomActionBarVisibilityStore}
    <!-- <ChangeLayoutMenuItem /> -->

    <FollowMenuItem />
    <LockDiscussionMenuItem />
{/if}

{#if inProfileMenu}
    <!-- In the profile menu, the apps submenu is displayed at the end (because it contains a heading) -->
    <AppsMenuItem />
{/if}

{#each additionalItems as item (item.id)}


    <ActionBarButton
        tooltipTitle={item.label}
        on:click={item.callback}
    >
        <img
            class="h-6 w-6"
            src={`${ICON_URL}/icon?url=${encodeURIComponent(item.coWebsiteUrl)}&size=64..96..256&fallback_icon_color=14304c`}
            alt={item.label}
        >
    </ActionBarButton>
<!--    http://icon.workadventure.localhost/icon?url=https%3A%2F%2Fantoine-rubeo.me%2F&size=64..96..256&fallback_icon_color=14304c-->
<!--    http://icon.workadventure.localhost/icon?url=undefined&size=64..96..256&fallback_icon_color=14304c-->

    <!--{#if !inProfileMenu }-->
    <!--{/if}-->
{/each}

