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

`preferredVideoCodecs(category, quality, direction, pixels)` returns the codecs we are willing to encode (or, for
the P2P receive preference, decode) with at a given frame size, best first. The transport keeps the first one the
browser can use.

It starts from a static order and filters it with what the browser knows about this machine:

| Situation | Camera | Screen share |
|---|---|---|
| Quality recommended or high | VP9, H.264 | AV1, VP9, H.264 |
| Quality low | VP9, H.264 | VP9, H.264 |

Then, for every codec except H.264, which always stays:

- **Desktop**: the codec is kept unless the browser remembers it as *not smooth* at that frame size (see below). With
  no verdict, it is kept.
- **Android and iOS**: the codec is kept only if the browser reports a hardware encoder (or decoder) for it, and it is
  smooth. With no verdict, it is dropped: a phone does not experiment on its battery.
- A codec dropped for smoothness gets **one retry per week**, so a single bad session cannot demote it forever.

So a Pixel with a hardware VP9 encoder keeps VP9; a phone without one encodes H.264; a weak laptop that struggled with
VP9 at 720p last week gets H.264.

### What the browser knows: `CodecPerformance.ts`

At startup, [`CodecPerformance.ts`](../../../play/src/front/WebRtc/CodecPerformance.ts) asks
`navigator.mediaCapabilities.encodingInfo()` and `decodingInfo()` with `type: "webrtc"` about AV1, VP9 and H.264 at
three frame sizes, 720p, 1080p and 1440p. That is a few milliseconds of lookups, no encoding. The answers are
cached and read synchronously afterwards; until they arrive, the lists behave as if there were no verdict.

In Chromium (verified in the source):

- `powerEfficient` is true when a hardware encoder or decoder exists for the codec. There is no small-size heuristic
  on the WebRTC path.
- `smooth` comes from the browser's WebRTC performance history: per codec, frame size bucket, hardware flag and
  direction, the 99th percentile of the processing time per frame measured in real sessions on this profile, on any
  site. A stream is smooth when that percentile stays under the frame duration. The history is only written while a
  **single** encoder runs (one camera, no screen share, no other P2P peer), so verdicts come from clean measurements,
  and a user who only ever sits in large bubbles never writes any. With no history the answer is optimistic.
  Verdicts infer across sizes: smooth at a large size implies smooth below, not smooth at a small size implies not
  smooth above.
- Safari answers the WebRTC type too. An iPhone 14 reports VP9 as decodable in hardware but encodable in software
  only, H.264 in hardware both ways, and no AV1 at all. A browser without the API leaves everything unknown, and the
  static rule applies.

The decision is made at the size we encode: the capture size on LiveKit, and 720p for a P2P connection, whose codec
set cannot change without a renegotiation. 720p is also the most sensitive question to ask a history that infers
across sizes: not smooth at any smaller size means not smooth at 720p.

The weekly retry is a timestamp per codec and direction, kept by `LocalUserStore` like every other local setting,
decided once per session so every stream of the session agrees. Without it, avoiding a codec would mean never encoding with it again, so the browser would
never refresh its verdict.

Why these choices:

- **AV1 for screen shares**: text and UI stay sharp at a much lower bitrate than with VP9. The price is the encoder:
  on nearly every machine AV1 is encoded in software (`libaom`), and a 1080p or 1440p screen share can saturate a
  laptop. The rough CPU cost is 3 to 5 times VP8 for AV1 and 2 times VP8 for VP9.
- **No AV1 on "low"**: the "low" setting is the user telling us the machine or the connection is weak. Dropping AV1 is
  the cheapest way to halve the encode cost.
- **VP9 for cameras**: at camera sizes the AV1 saving does not justify its CPU cost, and VP9 hardware encoders exist on
  some machines.
- **H.264 as the fallback**: it is the only codec with a hardware encoder nearly everywhere (VideoToolbox on macOS,
  MediaFoundation on Windows, MediaCodec on Android). macOS in particular has no hardware encoder for VP8, VP9 or AV1,
  so H.264 is the only rung that actually frees the CPU there. It costs bandwidth: WebRTC negotiates constrained
  baseline H.264, which is VP8-class, so about 40 % more than VP9 for the same quality, which is why it is not the
  default on desktop.
- **VP8 is never preferred**: it is mandatory in WebRTC, so every browser negotiates it anyway, and it is software
  everywhere. It remains the floor when H.264 is missing (a Firefox whose OpenH264 download is blocked by policy,
  Chromium builds without proprietary codecs). LiveKit rewrites an unsupported codec to VP8 on its own, and in P2P
  the browser's remaining codecs are appended after our list.

A more complete treatment (automatic codec downgrade when the encoder reports it is CPU limited) is designed but not
implemented; see the "Future work" section.

### Applying the preference

- **LiveKit** ([`LiveKitRoom.ts`](../../../play/src/front/Livekit/LiveKitRoom.ts), `getVideoCodec()`): the first
  preferred codec for which `supportsAV1()` / `supportsVP9()` from `livekit-client` answers true, passed as
  `videoCodec` at `publishTrack()`. This is explicit on purpose: LiveKit silently rewrites an unsupported codec to its
  hardcoded default of VP8, not to `publishDefaults.videoCodec`. When the primary codec is VP8, LiveKit disables the
  VP8 backup track on its own.
- **P2P** ([`RemotePeer.ts`](../../../play/src/front/WebRtc/RemotePeer.ts)): the list is handed to
  `@workadventure/simple-peer` as `receiveCodecs`, **exclusive**. WebRTC separates what a peer prefers to receive
  from what it sends: `RTCRtpTransceiver.setCodecPreferences()` only shapes what we advertise for receiving, and a
  browser sends the codecs of the *remote* description, in the remote's order. On its own, a preference therefore
  drives the *peer's* encoder, not ours: a phone asking for H.264 made its desktop peer encode H.264, while the phone
  itself encoded whatever the desktop asked for. So the negotiation is limited to what we can afford to **encode**,
  ordered by what we prefer to decode (`negotiableVideoCodecs()`, judged at 720p since the set cannot change without
  a renegotiation): the fork (12.2.0) leaves the other codecs out of our offers and answers and removes them from
  every remote description before applying it, so neither direction can use anything else. Within that set the
  peer's order wins: the browser encodes the first codec the peer listed, and the encoder budget follows that codec,
  read from `RTCRtpSender.getParameters().codecs[0]`.

  An iPhone decodes VP9 in hardware but encodes it in software, so it ends up on hardware H.264 both ways, at the
  cost of about 40 % more bandwidth than VP9. Receiving VP9 while sending H.264 would need the peer to know what we
  can encode before it offers, a protocol change kept for later. The WebRTC codec selection API
  (`RTCRtpEncodingParameters.codec`, Chrome 119+, Firefox 142+) could pick the send codec per tile size without a
  renegotiation, but it yields the same codec in every common case, so it is not used.

  The end-to-end test `tests/webrtc_codecs.spec.ts` checks what each side of a bubble encodes, with Bob in
  Chromium, Firefox or WebKit (`BOB_BROWSER`), against a deployment when `PLAY_URL` and `CODEC_TEST_MAP_URL` are
  set.

### When the encoder cannot keep up: `CpuLimitationDetector.ts`

The probe above is a memory: it says nothing about the current load. During a stream, the browser does.
`qualityLimitationReason === "cpu"` in the `outbound-rtp` stats is the verdict of libwebrtc's overuse detector: the
encoder took longer than a frame interval for several seconds, and the resolution or the frame rate has **already**
been lowered (following `degradationPreference`). The machine is never unprotected. The question is only whether that
degradation is the right one for the viewers: for a software encoder, a cheaper codec at full resolution usually is,
above all on a screen share where sharpness is the product, at the price of bandwidth.

[`CpuLimitationDetector.ts`](../../../play/src/front/WebRtc/CpuLimitationDetector.ts) watches the aggregated encoder
stats of each category (`localEncoderStatsStore`, the worst case over the encoders of the category, the same numbers
the local feedback tiles show) and takes one sample a second. The reason stays set while the adaptation is in force,
so the share of `cpu` samples over a window is the share of time the encoder was limited: gaps in a long episode
are tolerated, a lone spike is ignored.

- Window of 60 samples, threshold 70 % (Jitsi waits for a 60 s streak; same length, gaps tolerated). The first 10
  samples after a stream starts are ignored: keyframes and rate-control ramp-up look like overload.
- The window starts over when the stream stops, the transport changes (P2P ↔ LiveKit) or the codec changes.
- One decision per full window, then a full window of cooldown.
- Never for H.264 (nothing below it), never for a hardware encoder (a cheaper codec gains it nothing).
- The camera holds back while a screen share is being sent: the screen share is the heavy encoder and goes first;
  demoting the camera in the meantime would mark the wrong codec.

A decision takes one of two actions, then waits a full window.

**Fewer encoders first.** In P2P, Chrome runs one encoder per `RTCPeerConnection`: with three peers the machine
encodes every frame three times. On LiveKit it encodes once (SVC or simulcast add a fraction, not a multiple), and
the viewers lose nothing. So when the limited encoders serve more than one P2P peer, the first action is to raise
the `cpuLimited` flag of our `SpaceUser` (`cpuLimitedStore`, synchronised to the space by `SpacePeerManager` like
the camera state). The back's `TransitionPolicy` then moves the bubble to LiveKit even below `MAX_USERS_FOR_WEBRTC`,
provided the bubble has more than two users (a pair gives one encoder each), and refuses to bring it back while a
flagged user is present, whatever the count, the way an ongoing recording pins it. The two legs are asymmetric so
that a third member coming and going never bounces the bubble; the flagged user leaving takes the usual delayed
LiveKit → WebRTC path. The flag stays up for the session and never goes down (lowering it on LiveKit, where the
load is gone, would bounce the bubble), so the next bubbles start on LiveKit without paying the window again. The
transport switch resets the detector's window; if the back cannot switch (no LiveKit, or
`LIVEKIT_SWITCH_ON_CPU_LIMITATION=false` for self-hosters who would rather not pay SFU bandwidth for small bubbles),
the next window falls through to the codec.

**Then the codec.** Otherwise the decision **demotes** the codec for the rest of the session: `demotedCodecStore`
in `CodecPerformance.ts` records it per category, and `preferredVideoCodecs()` leaves it out together with every
codec above it (screen share AV1 → VP9 → H.264, camera VP9 → H.264). Nothing is persisted, the browser's own smooth
history is the memory across sessions, and nothing goes back up before the page is reloaded. The publishers
subscribe to the store:

- **LiveKit**: the codec of a publication is fixed at `publishTrack()`, so `LiveKitRoom` unpublishes and publishes
  again, the same two updates a share that stops and starts goes through. The camera publication is normally reused
  for the whole room (turning the camera off pauses it, see `unpublishCameraTrack()`): a demotion is the one time it
  is really unpublished.
- **P2P**: `RemotePeer` sets the fork's `receiveCodecs` to the new `negotiableVideoCodecs()` and calls
  `negotiate()`. The fork (12.3.0) re-applies the preference before every offer and answer, so both sides end up on
  the remaining codecs whoever initiates the renegotiation, and the bitrate budget follows the new codec on the
  `negotiated` event. The transceivers and ICE stay: viewers get a keyframe and a sub-second freeze.

A raised flag is reported to PostHog as `wa_cpu_limited_flag` and each demotion as `wa_codec_downgrade` (category,
codec left, transport); the codec change itself shows in the video quality samples through `mimeType`. Firefox
reports no limitation reason and never reacts.

To see it happen: DevTools → Performance → CPU 6× slowdown, share a screen with the quality set to "high" (1440p,
AV1), enable the video quality stats overlay: the tile reports `Limited by: cpu`, and about 70 s later the codec
changes. The end-to-end test `tests/webrtc_cpu_limitation.spec.ts` (opt-in, `RUN_CPU_LIMITATION_E2E=1`, a few
minutes) drives the whole chain on a deployment by making one page report every outbound video stream as
CPU-limited: three users in a bubble, the flag, the switch to LiveKit, the bubble staying there when a member
leaves, then the camera republished in H.264; with `CPU_LIMITATION_EXPECT=demote` it checks the codec
renegotiation with both peers instead.

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
| H.264 | 2 |
| VP8 | 2 |

Each codec generation saves roughly 30 % over the previous one; constrained baseline H.264 sits with VP8. The anchors of a curve are expressed for one codec
(`anchorCodec`), and the budget is multiplied by the ratio of the two factors. So the camera anchors, which are VP9
values, are multiplied by 2 / 1.4 ≈ 1.43 for a VP8 encoder, and the screen share anchors, which are AV1 values, by 1.4
for VP9 and by 2 for VP8.

This is what makes dropping AV1 on the "low" setting safe: the screen share keeps its sharpness on VP9 because it gets
40 % more bandwidth to do so. The same applies when a stream lands on H.264: the hardware encoder is nearly free for
the CPU, and the budget doubles to compensate for its lower efficiency.

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

| Displayed size | VP9 | H.264 or VP8 |
|---|---|---|
| 160 × 90 | 31 kbps | 44 kbps |
| 320 × 180 | 88 kbps | 125 kbps |
| 640 × 360 | 247 kbps | 354 kbps |
| 960 × 540 | 455 kbps | 650 kbps |
| 1280 × 720 | 700 kbps | 1 Mbps |
| 1920 × 1080 and above | 1.29 Mbps | 1.84 Mbps |

Screen share, recommended:

| Captured size | AV1 | VP9 | H.264 or VP8 |
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

- Reports its display size, plus a `maxBitrate` hint: the budget of `selectVideoPreset()` for that size and its own
  quality setting.
- The sender applies the minimum of its own budget and the hint, so the hint only bites when the viewer's quality
  setting is lower than the sender's.
- The viewer does not know which codec the sender picked, so the hint is budgeted for the most expensive one (VP8
  class, which H.264 shares). It therefore never starves the sender; on a VP9 sender it is 1.4× looser than the
  viewer's setting strictly implies. Sending the quality setting instead of a bitrate would remove that approximation.

## LiveKit Implementation

**File**: [`play/src/front/Livekit/LiveKitRoom.ts`](../../../play/src/front/Livekit/LiveKitRoom.ts)

### Publisher side

- Reads `videoQualityStore` and `screenShareQualityStore` at track publication time.
- Chooses the codec with `getVideoCodec()` for the capture size of the track (see Codec Selection).
- Computes the budget with `selectVideoPreset()` for the captured size and that codec.
- Publishes the camera with `videoEncoding.maxBitrate` / `maxFramerate`, and the screen share with
  `screenShareEncoding.maxBitrate` / `maxFramerate` and the user's `degradationPreference`.
- Simulcast is enabled. Our budget applies to the **top** layer only; `livekit-client` derives the lower layers from
  its own presets.
- The camera declares VP8 as a backup codec (`backupCodecPolicy: SIMULCAST`): if a subscriber cannot decode VP9,
  LiveKit asks the publisher to also encode VP8, instead of downgrading everyone. When the primary codec is already
  VP8, LiveKit disables the backup itself.

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

Left for later: persisting a demotion across sessions with an expiry, an encode-time-per-frame signal for Firefox,
and asymmetric codecs in P2P (a desktop sending VP9 to a phone that decodes it in hardware while the phone sends
H.264), which needs each peer to signal what it can encode before the offer.

## Related Files

| File | Purpose |
|------|---------|
| [`play/src/front/WebRtc/VideoPresets.ts`](../../../play/src/front/WebRtc/VideoPresets.ts) | Codec preferences, bitrate curves, frame rates |
| [`play/src/front/WebRtc/VideoPresets.test.ts`](../../../play/src/front/WebRtc/VideoPresets.test.ts) | Fit against the reference table, codec scaling, codec filtering |
| [`play/src/front/WebRtc/CodecPerformance.ts`](../../../play/src/front/WebRtc/CodecPerformance.ts) | What the browser knows about each codec: hardware, past smoothness |
| [`play/src/front/WebRtc/AdaptiveVideoEncoding.ts`](../../../play/src/front/WebRtc/AdaptiveVideoEncoding.ts) | P2P encoding from the viewer's display size |
| [`play/src/front/Livekit/LiveKitRoom.ts`](../../../play/src/front/Livekit/LiveKitRoom.ts) | LiveKit publisher codec and bandwidth limiting |
| [`play/src/front/Livekit/LivekitParticipant.ts`](../../../play/src/front/Livekit/LivekitParticipant.ts) | LiveKit subscriber quality selection |
| [`play/src/front/WebRtc/RemotePeer.ts`](../../../play/src/front/WebRtc/RemotePeer.ts) | P2P codec preference, bandwidth limiting, viewer hint |
| [`play/src/front/WebRtc/CpuLimitationDetector.ts`](../../../play/src/front/WebRtc/CpuLimitationDetector.ts) | Codec demotion when the encoder is CPU-limited |
| [`play/src/front/Stores/MediaStore.ts`](../../../play/src/front/Stores/MediaStore.ts) | Camera quality store |
| [`play/src/front/Stores/ScreenSharingStore.ts`](../../../play/src/front/Stores/ScreenSharingStore.ts) | Screen share quality store |
| [`play/src/front/Components/Menu/SettingsSubMenu.svelte`](../../../play/src/front/Components/Menu/SettingsSubMenu.svelte) | User settings UI |
