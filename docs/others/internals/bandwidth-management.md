# Bandwidth Management

WorkAdventure allows users to control video and screen-sharing bandwidth consumption through configurable settings. This document explains how bandwidth management works across both P2P (WebRTC) and LiveKit connection modes.

## Overview

Bandwidth management operates at two levels:
- **Publisher side**: Limits the bitrate of outgoing video/screen-share streams
- **Subscriber side**: Requests specific quality levels for incoming streams (LiveKit only)

Users can choose between three quality levels:
1. **Low** - Minimal bandwidth usage (suitable for poor connections)
2. **Recommended** - Balanced quality and bandwidth
3. **Unlimited** - Maximum quality (no artificial limits)

## Environment Variables

These variables define the bandwidth thresholds (in **kilobits per second**):

| Variable | Default | Description |
|----------|---------|-------------|
| `PEER_VIDEO_LOW_BANDWIDTH` | 150 | Low quality video bandwidth limit |
| `PEER_VIDEO_RECOMMENDED_BANDWIDTH` | 600 | Recommended quality video bandwidth limit |
| `PEER_SCREEN_SHARE_LOW_BANDWIDTH` | 250 | Low quality screen-share bandwidth limit |
| `PEER_SCREEN_SHARE_RECOMMENDED_BANDWIDTH` | 1000 | Recommended quality screen-share bandwidth limit |

### Configuration Files
- **Source**: [`.env.template`](../../../.env.template) (lines 48-52)
- **TypeScript constants**: [`play/src/front/Enum/EnvironmentVariable.ts`](../../../play/src/front/Enum/EnvironmentVariable.ts) (lines 37-40)

## User Settings Flow

### UI Component
[`SettingsSubMenu.svelte`](../../../play/src/front/Components/Menu/SettingsSubMenu.svelte) provides two sliders (video and screen-share) with three positions:

```typescript
// Slider values mapping:
// 1 → Low bandwidth (PEER_VIDEO_LOW_BANDWIDTH)
// 2 → Recommended bandwidth (PEER_VIDEO_RECOMMENDED_BANDWIDTH)  
// 3 → Unlimited
```

### Storage
- **Stores**: `videoBandwidthStore` and `screenShareBandwidthStore`
  - Type: `number | "unlimited"` (numeric values in kbps)
  - Location: [`play/src/front/Stores/MediaStore.ts`](../../../play/src/front/Stores/MediaStore.ts) and [`play/src/front/Stores/ScreenSharingStore.ts`](../../../play/src/front/Stores/ScreenSharingStore.ts)
- **Persistence**: Values saved to `localStorage` via `LocalUserStore`

## P2P (WebRTC) Implementation

**File**: [`play/src/front/WebRtc/RemotePeer.ts`](../../../play/src/front/WebRtc/RemotePeer.ts)

### Publisher Side
- Reads `videoBandwidthStore` during PeerConnection creation
- Uses `sdpTransform()` option with `getSdpTransform()` to inject SDP bandwidth constraints (b=AS/TIAS lines)
- Dynamically adjusts bitrate via `updateVideoConstraintsForDisplayDimensions()` method
  - Modifies `maxBitrate`, `maxFramerate`, `scaleResolutionDownBy` in `RTCRtpEncodingParameters`
  - Uses `selectVideoPreset()` to choose resolution/fps based on display dimensions
- Applied via `sender.setParameters()` when SDP transformation in [`play/src/front/Components/Video/utils.ts`](../../../play/src/front/Components/Video/utils.ts)

## LiveKit Implementation

**File**: [`play/src/front/Livekit/LiveKitRoom.ts`](../../../play/src/front/Livekit/LiveKitRoom.ts)

### Publisher Side
- Reads `videoBandwidthStore` and `screenShareBandwidthStore` at track publication time
- Publishes camera track with `videoEncoding.maxBitrate` option (unless bandwidth is `"unlimited"`)
- Publishes screen-share track with `screenShareEncoding.maxBitrate` option (unless bandwidth is `"unlimited"`)
- Uses helper function `getBitrateLimitBps()` to convert kbps → bits/second
- Codec: VP8, Simulcast: enabled by default

### Subscriber Side

**File**: [`play/src/front/Livekit/LivekitParticipant.ts`](../../../play/src/front/Livekit/LivekitParticipant.ts)

- Maps bandwidth values to `VideoQuality` enum via `getVideoQualityFromBandwidth()` function:
  - `"unlimited"` → `VideoQuality.HIGH`
  - Bandwidth ≤ low threshold → `VideoQuality.LOW`
  - Otherwise → `VideoQuality.MEDIUM`
- Calls `publication.setVideoQuality()` upon subscribing to remote camera and screen-share tracks
- Thresholds: `PEER_VIDEO_LOW_BANDWIDTH` and `PEER_SCREEN_SHARE_LOW_BANDWIDTH`

## Bandwidth Limits Impact

### Low Setting
- **Video**: ≤ 150 kbps (typically 320×180 @ 20 fps)
- **Screen-share**: ≤ 250 kbps (typically 640×360 @ 15 fps)
- **Use case**: Poor network conditions, mobile data

### Recommended Setting  
- **Video**: ~150-600 kbps (typically 640×360 @ 20 fps)
- **Screen-share**: ~1000 kbps (typically 1280×720 @ 15 fps)
- **Use case**: Standard office/home network

### Unlimited Setting
- **Video**: No artificial limit (up to 1080p @ 30 fps or higher)
- **Screen-share**: No artificial limit (up to 1080p+ @ 30 fps)
- **Use case**: Excellent network, presentation mode
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
| [`play/src/front/Components/Video/utils.ts`](../../../play/src/front/Components/Video/utils.ts) | SDP transformation utilities |
| [`play/src/front/Stores/MediaStore.ts`](../../../play/src/front/Stores/MediaStore.ts) | Video bandwidth store |
| [`play/src/front/Stores/ScreenSharingStore.ts`](../../../play/src/front/Stores/ScreenSharingStore.ts) | Screen-share bandwidth store |
| [`play/src/front/Components/Menu/SettingsSubMenu.svelte`](../../../play/src/front/Components/Menu/SettingsSubMenu.svelte) | User settings UI |
