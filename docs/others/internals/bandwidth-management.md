# Bandwidth Management

WorkAdventure allows users to control video and screen-sharing bandwidth consumption through configurable settings. This document explains how bandwidth management works across both P2P (WebRTC) and LiveKit connection modes.

## Overview

Bandwidth management operates at two levels:
- **Publisher side**: Limits the bitrate of outgoing video/screen-share streams
- **Subscriber side**: Requests specific quality levels for incoming streams (LiveKit only)

Users can choose between three quality levels:
1. **Low** - Minimal bandwidth usage (suitable for poor connections)
2. **Recommended** - Balanced quality and bandwidth
3. **High** - Maximum quality within preset limits

## User Settings Flow

### UI Component
[`SettingsSubMenu.svelte`](../../../play/src/front/Components/Menu/SettingsSubMenu.svelte) provides two sliders (video and screen-share) with three positions:

```typescript
// Slider values mapping:
// 1 → Low
// 2 → Recommended
// 3 → High
```

### Storage
- **Stores**: `videoQualityStore` and `screenShareQualityStore`
  - Type: `"low" | "recommended" | "high"`
  - Location: [`play/src/front/Stores/MediaStore.ts`](../../../play/src/front/Stores/MediaStore.ts) and [`play/src/front/Stores/ScreenSharingStore.ts`](../../../play/src/front/Stores/ScreenSharingStore.ts)
- **Persistence**: Values saved to `localStorage` via `LocalUserStore`

## P2P (WebRTC) Implementation

**File**: [`play/src/front/WebRtc/RemotePeer.ts`](../../../play/src/front/WebRtc/RemotePeer.ts)

### Publisher Side
- Uses `selectVideoPreset()` to choose bitrate/fps based on display dimensions and quality setting
- Applies limits via `RTCRtpSender.setParameters()` (`maxBitrate`, `maxFramerate`, `scaleResolutionDownBy`)
- Clamps bitrate with any receiver-provided max (see next section)

### Subscriber Side
- Sends display dimensions plus a `maxBitrate` hint derived from its quality setting
- The sender applies the minimum of its local preset and the receiver hint

## LiveKit Implementation

**File**: [`play/src/front/Livekit/LiveKitRoom.ts`](../../../play/src/front/Livekit/LiveKitRoom.ts)

### Publisher Side
- Reads `videoQualityStore` and `screenShareQualityStore` at track publication time
- Uses `selectVideoPreset()` to compute a bitrate for the track resolution and quality
- Publishes camera track with `videoEncoding.maxBitrate`
- Publishes screen-share track with `screenShareEncoding.maxBitrate`
- Codec: VP8, Simulcast: enabled by default

### Subscriber Side

**File**: [`play/src/front/Livekit/LivekitParticipant.ts`](../../../play/src/front/Livekit/LivekitParticipant.ts)

- Maps quality values to `VideoQuality` enum via `getVideoQualityFromSetting()` function:
  - `"low"` → `VideoQuality.LOW`
  - `"recommended"` → `VideoQuality.MEDIUM`
  - `"high"` → `VideoQuality.HIGH`
- Calls `publication.setVideoQuality()` upon subscribing to remote camera and screen-share tracks

## Bandwidth Limits Impact

### Low / Recommended / High
- Bitrate and FPS are selected from [`VideoPresets`](../../../play/src/front/WebRtc/VideoPresets.ts) based on resolution
- Higher quality picks higher bitrate and (for screen sharing) higher FPS where applicable
- **Note**: LiveKit/WebRTC still apply congestion control and adaptive bitrate

## Technical Notes

- **VideoQuality Enum**: `LOW` (0), `MEDIUM` (1), `HIGH` (2) - maps to LiveKit simulcast layers
- **Simulcast**: LiveKit encodes video at multiple resolutions/bitrates; `setVideoQuality()` selects which layer to send
- **Dynamic Updates**: Currently applied only at connection/track publication time; live bandwidth changes not yet supported

## Related Files

| File | Purpose |
|------|---------|
| [`play/src/front/Livekit/LiveKitRoom.ts`](../../../play/src/front/Livekit/LiveKitRoom.ts) | LiveKit publisher bandwidth limiting |
| [`play/src/front/Livekit/LivekitParticipant.ts`](../../../play/src/front/Livekit/LivekitParticipant.ts) | LiveKit subscriber quality selection |
| [`play/src/front/WebRtc/RemotePeer.ts`](../../../play/src/front/WebRtc/RemotePeer.ts) | P2P bandwidth limiting |
| [`play/src/front/Stores/MediaStore.ts`](../../../play/src/front/Stores/MediaStore.ts) | Video quality store |
| [`play/src/front/Stores/ScreenSharingStore.ts`](../../../play/src/front/Stores/ScreenSharingStore.ts) | Screen-share quality store |
| [`play/src/front/Components/Menu/SettingsSubMenu.svelte`](../../../play/src/front/Components/Menu/SettingsSubMenu.svelte) | User settings UI |
