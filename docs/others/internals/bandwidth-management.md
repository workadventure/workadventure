# Bandwidth Management

WorkAdventure lets users control the bandwidth of their camera and screen share through a quality setting. This
document explains how that setting turns into a codec, a bitrate and a frame rate, on both P2P (WebRTC) and LiveKit
connections.

Everything described here lives in
[`play/src/front/WebRtc/VideoPresets.ts`](../../../play/src/front/WebRtc/VideoPresets.ts), which is the single
source of truth for codec preferences and bitrate budgets. The two transports only call it.

## Overview

Bandwidth management operates at two levels:

- **Publisher side**: chooses the codec and caps the bitrate and frame rate of the outgoing camera and screen share.
- **Subscriber side**: asks for a quality level of incoming streams (LiveKit simulcast layer, or a P2P bitrate hint).

Users choose between three quality levels, separately for the camera and the screen share:

1. **Low**: minimal bandwidth, and the cheapest codecs (suitable for poor connections and weak machines)
2. **Recommended**: balanced quality and bandwidth
3. **High**: maximum quality within the budget

## User Settings Flow

### UI Component

[`SettingsSubMenu.svelte`](../../../play/src/front/Components/Menu/SettingsSubMenu.svelte) provides two sliders
(camera and screen share) with three positions:

```typescript
// Slider values mapping:
// 1 → Low
// 2 → Recommended
// 3 → High
```

The same menu holds the *"If network bandwidth is limited"* choice (`degradationPreference`): whether a constrained
screen share should keep its resolution or its frame rate. It is applied on both transports and is not covered
further here.

### Storage

- **Stores**: `videoQualityStore` and `screenShareQualityStore`
    - Type: `"low" | "recommended" | "high"` (`VideoQualitySetting`)
    - Location: [`play/src/front/Stores/MediaStore.ts`](../../../play/src/front/Stores/MediaStore.ts) and
      [`play/src/front/Stores/ScreenSharingStore.ts`](../../../play/src/front/Stores/ScreenSharingStore.ts)
- **Persistence**: values saved to `localStorage` via `LocalUserStore`
- **When read**: at track publication (LiveKit) or peer creation and every encoding update (P2P). A change of setting
  applies to the next stream, not to the running one.

## Codec Selection

`preferredVideoCodecs(category, quality)` returns the codecs we are willing to encode with, best first. The transport
keeps the first one the browser can encode.

| Situation | Camera | Screen share |
|---|---|---|
| Desktop, quality recommended or high | VP9, VP8 | AV1, VP9, VP8 |
| Desktop, quality low | VP9, VP8 | VP9, VP8 |
| Android or iOS | VP8 | VP8 |

Why these choices:

- **AV1 for screen shares**: text and UI stay sharp at a much lower bitrate than with VP9. The price is the encoder:
  on nearly every machine AV1 is encoded in software (`libaom`), and a 1080p or 1440p screen share can saturate a
  laptop. The rough CPU cost is 3 to 5 times VP8 for AV1 and 2 times VP8 for VP9.
- **No AV1 on "low"**: the "low" setting is the user telling us the machine or the connection is weak. Dropping AV1 is
  the cheapest way to halve the encode cost.
- **VP8 only on phones**: no phone should run a software VP9 or AV1 encoder.
- **VP9 for cameras**: at camera sizes the AV1 saving does not justify its CPU cost, and VP9 hardware encoders exist on
  some machines.

A more complete treatment (automatic codec downgrade when the encoder reports it is CPU limited) is designed but not
implemented; see the "Future work" section.

### Applying the preference

- **LiveKit** ([`LiveKitRoom.ts`](../../../play/src/front/Livekit/LiveKitRoom.ts), `getVideoCodec()`): the first
  preferred codec for which `supportsAV1()` / `supportsVP9()` from `livekit-client` answers true, passed as
  `videoCodec` at `publishTrack()`. This is explicit on purpose: LiveKit silently rewrites an unsupported codec to its
  hardcoded default of VP8, not to `publishDefaults.videoCodec`. When the primary codec is VP8, LiveKit disables the
  VP8 backup track on its own.
- **P2P** ([`RemotePeer.ts`](../../../play/src/front/WebRtc/RemotePeer.ts)): the list is handed to
  `@workadventure/simple-peer` as `preferredCodecs`, which calls `RTCRtpTransceiver.setCodecPreferences()` with the
  listed codecs first, in order, and the remaining browser codecs after them. The codec actually used is negotiated per
  connection, so the setting of the peer that initiates the connection tends to win. The encoder budget therefore
  follows the **negotiated** codec, read from `RTCRtpSender.getParameters().codecs[0]`, not the preference.

## Bitrate Budget

`selectVideoPreset(displayHeight, displayWidth, isScreenShare, quality, codec)` returns the `maxBitrate` and
`maxFramerate` to apply to an encoder producing frames of that size.

### The formula

```
pixels  = min(width × height, 1920 × 1080)
bitrate = anchor[quality] × (pixels / anchorPixels) ^ exponent × codecFactor[codec] / codecFactor[anchorCodec]
```

A straight line on a log-log chart: the budget grows with the pixel count at a rate set by `exponent`, and is pinned
at one reference size (`anchorPixels`) by three `anchor` values, one per quality setting. Anything larger than 1080p is
budgeted like 1080p.

Two curves exist, one per stream category:

| Parameter | Camera | Screen share |
|---|---|---|
| `anchorPixels` | 1280 × 720 | 1920 × 1080 |
| `anchor.low` | 400 kbps | 1 Mbps |
| `anchor.recommended` | 700 kbps | 3 Mbps |
| `anchor.high` | 1.8 Mbps | 4.5 Mbps |
| `exponent` | 0.75 | 0.5 |
| `anchorCodec` | VP9 | AV1 |
| Frame rate | see below | 30 |

### Why an exponent, and why two different ones

At equal perceived quality, the bitrate a codec needs does not grow linearly with the pixel count. Natural video
(a camera, with motion and sensor noise) needs roughly `pixels ^ 0.75`. Static, sharp screen content needs less, about
`pixels ^ 0.5`: most of its cost is in edges and keyframes, not in the area. This is the only real difference between
the two curves. Nothing in VP9 or AV1 requires discrete resolution steps.

The camera curve is fitted on the [LiveKit bitrate guide](https://livekit.io/webrtc/bitrate-guide), which is the
table WorkAdventure used before. The fit is within 20 % of that table at every standard size up to 1080p, and a unit
test in [`VideoPresets.test.ts`](../../../play/src/front/WebRtc/VideoPresets.test.ts) keeps it there: retuning the
exponent or an anchor makes the test fail if the curve drifts away from the reference.

### Why a curve rather than a table

- **Continuity.** The P2P viewer reports the exact size at which it displays a video, and that size moves with the
  layout. With a stepped table, a 640 × 360 tile that grows by one pixel jumped from 270 kbps to 450 kbps. The curve
  changes by a fraction of a percent.
- **One codec factor.** Scaling a curve for a cheaper codec is a multiplication. Scaling a table would have meant a
  table per codec.
- **Fewer numbers.** Six parameters per category instead of a nine-row table with three bitrates and three frame rates
  per row.

### The codec factor

`BITRATE_FACTOR` expresses how much bitrate each codec needs for the same visual quality, relative to AV1:

| Codec | Factor |
|---|---|
| AV1 | 1 |
| VP9 | 1.4 |
| VP8 | 2 |

Each codec generation saves roughly 30 % over the previous one. The anchors of a curve are expressed for one codec
(`anchorCodec`), and the budget is multiplied by the ratio of the two factors. So the camera anchors, which are VP9
values, are multiplied by 2 / 1.4 ≈ 1.43 for a VP8 encoder, and the screen share anchors, which are AV1 values, by 1.4
for VP9 and by 2 for VP8.

This is what makes dropping AV1 on the "low" setting safe: the screen share keeps its sharpness on VP9 because it gets
40 % more bandwidth to do so.

### Frame rate

Screen shares always target 30 fps: the frame rate follows the content anyway, and a static screen costs nothing at
30 fps.

Cameras lower the frame rate on small tiles, where it is the cheapest thing to give up:

| Quality | Below 1280 × 720 | 1280 × 720 and above |
|---|---|---|
| Low | 15 | 20 |
| Recommended | 20 | 30 |
| High | 30 | 30 |

### Worked examples

Camera, recommended:

| Displayed size | VP9 | VP8 |
|---|---|---|
| 160 × 90 | 31 kbps | 44 kbps |
| 320 × 180 | 88 kbps | 125 kbps |
| 640 × 360 | 247 kbps | 354 kbps |
| 960 × 540 | 455 kbps | 650 kbps |
| 1280 × 720 | 700 kbps | 1 Mbps |
| 1920 × 1080 and above | 1.29 Mbps | 1.84 Mbps |

Screen share, recommended:

| Captured size | AV1 | VP9 | VP8 |
|---|---|---|---|
| 1280 × 720 | 2 Mbps | 2.8 Mbps | 4 Mbps |
| 1440 × 900 | 2.37 Mbps | 3.32 Mbps | 4.74 Mbps |
| 1920 × 1080 and above | 3 Mbps | 4.2 Mbps | 6 Mbps |

These are caps (`maxBitrate`). The encoder uses less when the content allows it, and the browser's congestion control
lowers the actual bitrate further when the network cannot carry it.

### Capture resolution of screen shares

Independently of the bitrate, `screenShareMaxResolution` caps the **captured** size of a screen share per quality
setting: 720p for "low", 1080p for "recommended", 1440p for "high". Nothing downstream lowers the resolution of a
screen share, so this cap is what bounds the encode cost of a 4K display.

### Tuning

- To make every stream of a category cheaper or richer, change its three `anchor` values.
- To change how small tiles compare to large ones, change `exponent`. Higher values starve small tiles, lower values
  starve large ones. Keep the fit test green, or update the reference table in it knowingly.
- To rebalance codecs, change `BITRATE_FACTOR`. The AV1 entry is the reference and stays at 1.
- To budget frames above 1080p, raise `MAX_PIXELS`.

## P2P (WebRTC) Implementation

**File**: [`play/src/front/WebRtc/RemotePeer.ts`](../../../play/src/front/WebRtc/RemotePeer.ts)

One `RTCPeerConnection` per remote peer, hence one encoder per peer: with three viewers, the camera is encoded three
times.

### Publisher side

- `applyVideoEncoding()` computes the encoding from the size the viewer reports, the negotiated codec and the local
  quality setting, through
  [`AdaptiveVideoEncoding.ts`](../../../play/src/front/WebRtc/AdaptiveVideoEncoding.ts).
- Applies it with `RTCRtpSender.setParameters()`: `maxBitrate`, `maxFramerate`, `scaleResolutionDownBy`, and for
  screen shares `degradationPreference`.
- Clamps the bitrate with the viewer's hint (see below).
- A viewer that does not display the video (hidden tile, background tab) gets no encoding at all.

### Subscriber side

- Reports its display size, plus a `maxBitrate` hint: the budget of `selectVideoPreset()` for that size, its own
  quality setting, and the codec negotiated on the connection (read from `RTCRtpReceiver.getParameters().codecs[0]`).
- The sender applies the minimum of its own budget and the hint. Both are computed with the same curve and the same
  codec, so the hint only bites when the viewer's quality setting is lower than the sender's.
- Before the negotiation completes the codec is unknown and the hint is computed for VP8, the most expensive one, so it
  never starves the sender.

## LiveKit Implementation

**File**: [`play/src/front/Livekit/LiveKitRoom.ts`](../../../play/src/front/Livekit/LiveKitRoom.ts)

### Publisher side

- Reads `videoQualityStore` and `screenShareQualityStore` at track publication time.
- Chooses the codec with `getVideoCodec()` (see Codec Selection).
- Computes the budget with `selectVideoPreset()` for the captured size and that codec.
- Publishes the camera with `videoEncoding.maxBitrate` / `maxFramerate`, and the screen share with
  `screenShareEncoding.maxBitrate` / `maxFramerate` and the user's `degradationPreference`.
- Simulcast is enabled. Our budget applies to the **top** layer only; `livekit-client` derives the lower layers from
  its own presets.
- The camera declares VP8 as a backup codec (`backupCodecPolicy: SIMULCAST`): if a subscriber cannot decode VP9,
  LiveKit asks the publisher to also encode VP8, instead of downgrading everyone.

### Subscriber side

**File**: [`play/src/front/Livekit/LivekitParticipant.ts`](../../../play/src/front/Livekit/LivekitParticipant.ts)

- Maps the quality setting to the `VideoQuality` enum via `getVideoQualityFromSetting()`:
    - `"low"` → `VideoQuality.LOW`
    - `"recommended"` → `VideoQuality.MEDIUM`
    - `"high"` → `VideoQuality.HIGH`
- Calls `publication.setVideoQuality()` when subscribing to remote camera and screen share tracks, which selects the
  simulcast layer the server forwards.

## Technical Notes

- **VideoQuality enum**: `LOW` (0), `MEDIUM` (1), `HIGH` (2), maps to LiveKit simulcast layers.
- **Congestion control** still applies on top of every cap: the browser lowers the actual bitrate when the network
  cannot carry it, and libwebrtc lowers resolution or frame rate when the CPU cannot keep up (reported as
  `qualityLimitationReason` in the encoder stats and in the video quality analytics).
- **Dynamic updates**: the quality setting is applied at publication time on LiveKit, and at every encoding update on
  P2P. Live changes of the setting reach LiveKit tracks at their next publication.

## Future work

The design of an automatic codec downgrade (AV1 → VP9 → VP8 when the encoder reports a sustained CPU limitation) and
of an earlier P2P → LiveKit switch for CPU-limited machines is written up separately. The codec preference list and the
codec factor above are its building blocks: once the detector exists, it only has to pick a lower entry of the list
and republish, and the bitrate follows.

## Related Files

| File | Purpose |
|------|---------|
| [`play/src/front/WebRtc/VideoPresets.ts`](../../../play/src/front/WebRtc/VideoPresets.ts) | Codec preferences, bitrate curves, frame rates |
| [`play/src/front/WebRtc/VideoPresets.test.ts`](../../../play/src/front/WebRtc/VideoPresets.test.ts) | Fit against the reference table, codec scaling |
| [`play/src/front/WebRtc/AdaptiveVideoEncoding.ts`](../../../play/src/front/WebRtc/AdaptiveVideoEncoding.ts) | P2P encoding from the viewer's display size |
| [`play/src/front/Livekit/LiveKitRoom.ts`](../../../play/src/front/Livekit/LiveKitRoom.ts) | LiveKit publisher codec and bandwidth limiting |
| [`play/src/front/Livekit/LivekitParticipant.ts`](../../../play/src/front/Livekit/LivekitParticipant.ts) | LiveKit subscriber quality selection |
| [`play/src/front/WebRtc/RemotePeer.ts`](../../../play/src/front/WebRtc/RemotePeer.ts) | P2P codec preference, bandwidth limiting, viewer hint |
| [`play/src/front/Stores/MediaStore.ts`](../../../play/src/front/Stores/MediaStore.ts) | Camera quality store |
| [`play/src/front/Stores/ScreenSharingStore.ts`](../../../play/src/front/Stores/ScreenSharingStore.ts) | Screen share quality store |
| [`play/src/front/Components/Menu/SettingsSubMenu.svelte`](../../../play/src/front/Components/Menu/SettingsSubMenu.svelte) | User settings UI |
