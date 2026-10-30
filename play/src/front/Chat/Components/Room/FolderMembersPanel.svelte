<script lang="ts">
    import LL from "../../../../i18n/i18n-svelte";
    import type { RoomFolder } from "../../Connection/ChatConnection";
    import { folderPanelStore } from "../../Stores/RoomSidePanelStore";
    import RoomSidePanelParticipants from "./RoomSidePanelParticipants.svelte";
    import { IconChevronLeft } from "@wa-icons";

    interface Props {
        folder: RoomFolder;
    }

    let { folder }: Props = $props();
    let folderName = $derived(folder.name);

    function close() {
        folderPanelStore.set(undefined);
    }
</script>

<!-- Escape only closes while the focus is inside the panel, as in the create view, so it never fights the game,
     an open "…" menu (which stops its own Escape) or a modal. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="flex h-full min-h-0 flex-col text-white"
    data-testid="folderMembersPanel"
    onkeydown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented) close();
    }}
>
    <div class="flex items-center gap-2 border border-solid border-x-0 border-t-0 border-white/10 p-2">
        <button
            type="button"
            class="m-0 flex aspect-square h-12 w-12 shrink-0 items-center justify-center rounded hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60"
            data-testid="folderMembersPanelBackButton"
            title={$LL.chat.roomPanel.closeFolderMembers()}
            aria-label={$LL.chat.roomPanel.closeFolderMembers()}
            onclick={close}
        >
            <IconChevronLeft font-size="20" />
        </button>
        <div class="min-w-0 flex-1">
            <h2 class="m-0 truncate text-base font-bold">{$LL.chat.manageRoomUsers.sectionJoined()}</h2>
            <div class="truncate text-xs text-white/60">{$folderName}</div>
        </div>
    </div>
    <p class="m-0 border border-solid border-x-0 border-t-0 border-white/10 px-3 py-2 text-xs text-white/60">
        {$LL.chat.roomPanel.folderMembersHint()}
    </p>
    <div class="min-h-0 flex-1">
        <RoomSidePanelParticipants room={folder} />
    </div>
</div>
