import { SpaceRecordingLayoutMode } from "@workadventure/messages";

/** Custom template layout id passed to LiveKit room composite egress (see livekit-recording-template). */
export const LIVEKIT_RECORDING_LAYOUT_SPEAKER = "wa-speaker";

/**
 * Maps the client-selected recording layout to the `layout` string read by the egress web template.
 * {@link SpaceRecordingLayoutMode.UNSPECIFIED} is treated like grid for older clients.
 */
export function livekitRecordingTemplateLayout(layoutMode: SpaceRecordingLayoutMode | undefined): string {
    if (layoutMode === SpaceRecordingLayoutMode.SPEAKER) {
        return LIVEKIT_RECORDING_LAYOUT_SPEAKER;
    }
    return "grid";
}
