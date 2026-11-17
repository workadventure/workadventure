import type { Component } from "svelte";
import type { WokaEmoteId } from "@workadventure/shared-utils";
import type { WokaEmoteFamily } from "../../Phaser/Game/Emote/WokaEmoteCatalog";
import {
    IconArrowBigUpLines,
    IconConfetti,
    IconHeart,
    IconHelp,
    IconMoodCrazyHappy,
    IconMoodSmile,
    IconMoodX,
    IconMusic,
    IconRotate360,
    IconRun,
    IconWalk,
    IconZzz,
} from "@wa-icons";

// Line icons rather than emojis: an emoji is drawn differently on every OS and clashes with the pixel art.
export const wokaEmoteIcons: Record<WokaEmoteId, Component> = {
    nod: IconMoodSmile,
    nope: IconMoodX,
    question: IconHelp,
    laugh: IconMoodCrazyHappy,
    love: IconHeart,
    celebrate: IconConfetti,
    dance: IconMusic,
    moonwalk: IconWalk,
    runInPlace: IconRun,
    jump: IconArrowBigUpLines,
    spin: IconRotate360,
    afk: IconZzz,
};

// Theme colours, so the families follow the design system (and a white-labelled theme). Only the raw
// HSL triplets exist at runtime: the --color-* variables are inlined by Tailwind, never emitted.
export const wokaEmoteFamilyColors: Record<WokaEmoteFamily, string> = {
    react: "hsl(var(--secondary))",
    move: "hsl(var(--primary))",
    status: "hsl(var(--neutral))",
};
