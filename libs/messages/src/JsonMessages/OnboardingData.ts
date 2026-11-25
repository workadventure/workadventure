import { z } from "zod";

/**
 * The UI elements onboarding items can point at. The front sets them with the `onboarding` attachment.
 * World configs name them, so removing or renaming one is a breaking change that goes in the release notes.
 */
export const OnboardingAnchor = z.enum([
  "actionBar.mapMenu",
  "actionBar.profileMenu",
  "actionBar.camera",
  "actionBar.microphone",
  "actionBar.screenShare",
  "actionBar.chat",
  "actionBar.emoji",
  "actionBar.lockBubble",
  "actionBar.pictureInPicture",
  "mapMenu.editMap",
  "mapEditor.tool.area",
  "mapEditor.tool.entity",
  "mapEditor.tool.exploration",
  "mapEditor.entityList",
  "tutorial.simulatedUser",
]);
export type OnboardingAnchor = z.infer<typeof OnboardingAnchor>;
