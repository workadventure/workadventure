<script lang="ts">
    import { derived } from "svelte/store";
    import { screenAnnotationManager } from "../../../Space/ScreenAnnotation/ScreenAnnotationManager";
    import { localAnnotationTargetStore } from "../../../Stores/ScreenAnnotationStore";
    import { requestedScreenSharingState, screenSharingLocalStreamStore } from "../../../Stores/ScreenSharingStore";
    import ScreenAnnotationOverlay from "../ScreenAnnotationOverlay.svelte";
    import ScreenAnnotationToolbar from "../ScreenAnnotationToolbar.svelte";
    import PresenterEffectsOverlay from "../PresenterEffectsOverlay.svelte";

    let me = screenAnnotationManager.localUserId;
    let drawing = $derived(!!me && $localAnnotationTargetStore === me);
    const stream = derived(screenSharingLocalStreamStore, (value) =>
        value.type === "success" ? value.stream : undefined,
    );
</script>

<div class="fixed inset-0 overflow-hidden" data-testid="desktop-annotation-overlay">
    {#if me}
        <ScreenAnnotationOverlay targetUserId={me} canDraw={$requestedScreenSharingState} />
        <PresenterEffectsOverlay targetUserId={me} {stream} />
        {#if drawing}
            <ScreenAnnotationToolbar targetUserId={me} isPresenter={true} presenterEffects={true} placement="top" />
        {/if}
    {/if}
</div>
