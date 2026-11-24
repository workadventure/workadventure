export const DEFAULT_MEGAPHONE_NOTIFICATION_SOUND_URL = "/resources/objects/megaphone/megaphone1.mp3";

export const MEGAPHONE_NOTIFICATION_SOUNDS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
    value: `/resources/objects/megaphone/megaphone${n}.mp3`,
    label: `Megaphone ${n}`,
}));
