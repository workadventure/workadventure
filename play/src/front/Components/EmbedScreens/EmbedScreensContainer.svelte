<script lang="ts">
    import "../../style/wa-theme/video-ui.scss";
    import { focusMode, rightMode, lightMode } from "../../Stores/ActionsCamStore";
    import PresentationLayout from "./Layouts/PresentationLayout.svelte";
</script>

<div
    id="embedScreensContainer"
    class="{$focusMode
        ? `group relative h-full w-full @sm/main-layout @xl/main-layout items-center pointer-events-auto transition-all`
        : `group relative h-full w-full @sm/main-layout @xl/main-layout items-center pointer-events-auto transition-all`}
        {$rightMode
        ? 'group relative h-full w-full @sm/main-layout @xl/main-layout items-center pointer-events-auto transition-all flex flex-col'
        : 'group relative h-full w-full @sm/main-layout @xl/main-layout items-center pointer-events-auto transition-all'}
        {$lightMode
        ? 'group relative h-full w-full @sm/main-layout @xl/main-layout items-center pointer-events-auto transition-all'
        : ''}"
>
    <PresentationLayout />
</div>
