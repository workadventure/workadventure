<script lang="ts">
    import { mouseInCameraTriggerArea } from "../../Stores/MediaStore";
    /**
     * This component contains an invisible zone positioned at the middle top of the screen.
     * When the mouse enters this zone, the camera is displayed (because we set the mouseInCameraTriggerArea store to true)
     */
</script>

<div
    class="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/4 h-1/6 pointer-events-none"
    on:mouseenter={() => {
        mouseInCameraTriggerArea.set(true);
    }}
    on:mouseleave={() => mouseInCameraTriggerArea.set(false)}
/>
