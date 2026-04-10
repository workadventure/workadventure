import { TokenBucket } from "../../Utils/TokenBucket";

/**
 * We limit the visibility updates of the video box to 24 per second (one every ~41.67ms).
 * This is because in Chrome / Ubuntu, when scrolling over a big number of video boxes quickly, we end up with a hard
 * crash of Chrome. It seems the video card cannot handle a big number of simultaneous calls to the hardware acceleration
 * for vp8 decoding.
 */
export const videoBoxVisibilityTokenBucket = new TokenBucket(24, 1, 1000 / 24);
