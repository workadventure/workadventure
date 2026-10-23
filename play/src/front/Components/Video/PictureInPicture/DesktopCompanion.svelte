<script lang="ts">
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { activePictureInPictureStore } from "../../../Stores/PeerStore";
    import type { UserProviderMerger } from "../../../Chat/UserProviderMerger/UserProviderMerger";
    import UserList from "../../../Chat/Components/UserList/UserList.svelte";
    import Button from "../../UI/Button.svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { IconX } from "@wa-icons";

    // PROTOTYPE: the desktop companion window, mounted by PictureInPicture.svelte into a child window of
    // this page (same renderer: the stores and the MediaStreams are the page's own). The meeting video
    // is the page's PresentationLayout, moved into `videoHost` like the browser's Document PiP.
    interface Props {
        userProviderMerger: UserProviderMerger;
        videoHost?: HTMLDivElement;
        onClose: () => void;
    }

    let { userProviderMerger, videoHost = $bindable(), onClose }: Props = $props();

    const gameScene = gameManager.getCurrentGameScene();
    const usersByRoom = userProviderMerger.usersByRoomStore;
    let users = $derived($usersByRoom.get(gameScene.roomUrl)?.users ?? []);
</script>

<div class="flex flex-col h-screen w-full bg-contrast-1100 text-white">
    <header class="flex items-center gap-2 px-3 py-2 border-b border-white/10" style="-webkit-app-region: drag">
        <span class="font-bold truncate grow">{gameScene.room.roomName ?? "WorkAdventure"}</span>
        <span style="-webkit-app-region: no-drag">
            <Button appearance="ghost" size="sm" square onclick={onClose} aria-label={$LL.actionbar.close()}>
                {#snippet icon()}<IconX font-size="18" />{/snippet}
            </Button>
        </span>
    </header>
    <!-- Takes the space it needs in a meeting, nothing otherwise. -->
    <div bind:this={videoHost} class={$activePictureInPictureStore ? "relative min-h-0 grow-[2]" : "hidden"}></div>
    <section class="flex flex-col min-h-0 grow overflow-y-auto p-2" data-testid="companion-people">
        <h2 class="text-sm font-bold opacity-70 px-2 my-1">
            {$LL.desktop.companion.people()} · {users.length}
        </h2>
        <UserList userList={users} isMatrixChatEnabled={gameScene.room.isMatrixChatEnabled} />
    </section>
</div>
