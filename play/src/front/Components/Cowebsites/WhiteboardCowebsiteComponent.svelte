<script lang="ts">
    import type { WhiteboardCoWebsite } from "../../WebRtc/CoWebsite/WhiteboardCoWebsite";
    import WhiteboardHeader from "../Whiteboard/WhiteboardHeader.svelte";
    import { showBoard } from "../Whiteboard/showBoard";

    interface Props {
        actualCowebsite: WhiteboardCoWebsite;
        visible: boolean;
    }

    let { actualCowebsite, visible }: Props = $props();
</script>

<div class="w-full h-full flex flex-col gap-1" class:hidden={!visible} data-testid="whiteboard-cowebsite">
    <WhiteboardHeader board={actualCowebsite.board} />
    <div
        use:showBoard={actualCowebsite.board.host}
        class="relative flex-1 min-h-0 bg-white rounded-lg overflow-hidden"
    ></div>
</div>
