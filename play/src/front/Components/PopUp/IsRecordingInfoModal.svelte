<script lang="ts">
    import PopUpContainer from "./PopUpContainer.svelte";
    import {recordingStore} from "../../Stores/RecordingStore";
</script>

<PopUpContainer reduceOnSmallScreen={true}>
        <p class="text-center">
            A recording is started. You can open the recording tab to see the progress.
        </p>
    <span>
        {$recordingStore.isRecording}
    </span>
</PopUpContainer>

<style>
    @media (max-width: 768px) {
        .responsive-message {
            font-size: 24px;
            line-height: 32px;
            padding-bottom: 14px;
        }
    }
</style>
