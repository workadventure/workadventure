import { z } from "zod";

/**
 * The onboarding of a world: its own items, and which built-in ones it keeps. The SaaS admin serves it per world, and
 * a self-hosted install from `ONBOARDING_URL`. Exported as JSON Schema to docs/schema/onboarding.json.
 */

/**
 * The UI elements of WorkAdventure that onboarding items can point at, with the name the admin editor shows. The front
 * sets them with the `onboarding` attachment. World configs name them: while the feature is marked experimental, a
 * minor release may remove one, and its release notes say so. The id up to its first dot is an `OnboardingAnchorArea`.
 */
export const BuiltinOnboardingAnchor = z.union([
  z.literal("actionBar.mapMenu").describe("Tools menu button"),
  z.literal("actionBar.profileMenu").describe("Profile menu button"),
  z.literal("actionBar.camera").describe("Camera button"),
  z.literal("actionBar.microphone").describe("Microphone button"),
  z.literal("actionBar.screenShare").describe("Screen sharing button"),
  z.literal("actionBar.chat").describe("Chat button"),
  z.literal("actionBar.emoji").describe("Emoji reactions button"),
  z
    .literal("actionBar.lockBubble")
    .describe("Lock conversation button (in a conversation)"),
  z
    .literal("actionBar.pictureInPicture")
    .describe("Picture-in-picture button (in a conversation)"),
  z
    .literal("mapMenu.editMap")
    .describe(
      "Map editor entry (in the Tools menu), for users who can edit the map",
    ),
  z.literal("mapEditor.tool.area").describe("Area tool"),
  z.literal("mapEditor.tool.entity").describe("Furniture tool"),
  z.literal("mapEditor.tool.exploration").describe("Explore the room tool"),
  z.literal("mapEditor.entityList").describe("Object list"),
  z
    .literal("tutorial.simulatedUser")
    .describe("Video of the tutorial's fake user"),
]);
export type BuiltinOnboardingAnchor = z.infer<typeof BuiltinOnboardingAnchor>;

/** Where an anchor is, for the admin editor to group anchors: the anchor id up to its first dot. */
export const OnboardingAnchorArea = z.union([
  z.literal("actionBar").describe("Action bar"),
  z.literal("mapMenu").describe("Tools menu"),
  z.literal("mapEditor").describe("Map editor"),
  z.literal("tutorial").describe("Tutorial"),
]);

export const OnboardingAnchor = z
  .union([
    BuiltinOnboardingAnchor,
    z
      .string()
      .regex(/^actionBar\.custom\..+/)
      // Narrows the type, so that a typo in a built-in anchor still fails type checking.
      .refine((anchor): anchor is `actionBar.custom.${string}` =>
        anchor.startsWith("actionBar.custom."),
      )
      .describe(
        "A button that a map script added with WA.ui.actionBar.addButton({ id }): actionBar.custom.<id>.",
      ),
  ])
  .describe("A UI element the step points at.");
export type OnboardingAnchor = z.infer<typeof OnboardingAnchor>;

/**
 * The topics of the built-in items, with their English name. A built-in id is `wa.<group>` or `wa.<group>.<name>`: the
 * second segment of the id is its group.
 */
export const OnboardingTipGroup = z.union([
  z.literal("tutorial").describe("First visit"),
  z.literal("announcement").describe("What's new"),
  z.literal("conversation").describe("Conversations"),
  z.literal("chat").describe("Chat"),
  z.literal("presence").describe("Status and expression"),
  z.literal("mapEditor").describe("Map editor"),
  z.literal("navigation").describe("Finding people and places"),
  z.literal("worldAdmin").describe("World admin tools"),
  z.literal("app").describe("App and settings"),
]);
export type OnboardingTipGroup = z.infer<typeof OnboardingTipGroup>;

/** The built-in tours a world can turn off, with the label the admin editor shows. */
export const BuiltinTourId = z.union([
  z
    .literal("wa.mapEditor.furniture")
    .describe("Map editor: placing furniture (for map editors)"),
  z
    .literal("wa.conversation.lockBubble")
    .describe("Tip: locking a conversation"),
  z.literal("wa.conversation.screenShare").describe("Tip: sharing the screen"),
  z
    .literal("wa.conversation.pictureInPicture")
    .describe("Tip: picture-in-picture"),
]);
export type BuiltinTourId = z.infer<typeof BuiltinTourId>;

export const OnboardingText = z
  .union([z.string(), z.record(z.string(), z.string())])
  .describe(
    'Text or Markdown, the same for everyone or by locale ({ "en-US": "…", "fr-FR": "…" }). A user gets their locale, then their language, then en-US, then the first one.',
  );
export type OnboardingText = z.infer<typeof OnboardingText>;

// A function: each step gets its own schemas, which the JSON Schema export inlines instead of pointing into the other.
const stepContent = () => ({
  title: OnboardingText.optional(),
  text: OnboardingText,
  image: z.string().url().optional().describe("An image above the text."),
  video: z
    .string()
    .url()
    .optional()
    .describe("A video above the text, muted and looping."),
  // An anchor a later release added, or this one removed, leaves the step without skipIfUsed instead of dropping the
  // item. The JSON Schema export ignores the catch, so editors still flag it.
  skipIfUsed: OnboardingAnchor.optional()
    .catch(undefined)
    .describe(
      "The step never shows to someone who already clicked this anchor.",
    ),
});

export const OnboardingStepData = z.discriminatedUnion("type", [
  z
    .object({
      type: z
        .literal("modal")
        .describe(
          "Centered, with Next, or Got it on the last step. A --- line splits its text into pages.",
        ),
      ...stepContent(),
    })
    .strict(),
  z
    .object({
      type: z.literal("popover").describe("Attached to `anchor`."),
      anchor: OnboardingAnchor,
      side: z.enum(["top", "right", "bottom", "left"]).optional(),
      advance: z
        .enum(["next", "click"])
        .optional()
        .describe(
          'A click on the anchor always completes the step. "next" (the default) also shows a Next button, "click" does not.',
        ),
      ...stepContent(),
    })
    .strict(),
]);
export type OnboardingStepData = z.infer<typeof OnboardingStepData>;

export const OnboardingItemData = z
  .object({
    id: z
      .string()
      .max(100)
      .regex(/^(?!wa\.)./, "World item ids cannot start with wa.")
      .describe(
        "Unique and stable: what each user saw is recorded by id, so a new id shows the item again.",
      ),
    kind: z
      .enum(["tour", "announcement"])
      .describe(
        "A tour waits until the user has been in the world for a while. An announcement starts at load, and only the first pending one does.",
      ),
    title: OnboardingText.optional().describe(
      "Its name in the Help menu. Defaults to the first title of its steps.",
    ),
    published: z
      .boolean()
      .optional()
      .describe(
        "Defaults to true. An unpublished item never starts by itself: only users with the admin tag see it, in the Help menu, to preview it.",
      ),
    audience: z
      .object({
        tags: z
          .array(z.string())
          .optional()
          .describe("The user has at least one of them."),
        excludeTags: z
          .array(z.string())
          .optional()
          .describe("The user has none of them."),
        guests: z
          .boolean()
          .optional()
          .describe("true: guests only. false: logged users only."),
        touch: z
          .boolean()
          .optional()
          .describe("true: touch devices only. false: the others."),
      })
      .strict()
      .optional()
      .describe("Who gets the item. All conditions apply."),
    when: z
      .object({
        minDaysSinceFirstVisit: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Day 0 is the user's first visit to the world."),
        maxDaysSinceFirstVisit: z.number().int().min(0).optional(),
        expiresAt: z
          .union([z.string().date(), z.string().datetime({ offset: true })])
          .optional(),
        after: z
          .union([
            z.string(),
            z
              .object({ item: z.string(), minHours: z.number().min(0) })
              .strict(),
          ])
          .optional()
          .describe(
            "An item that must be over first (done, dismissed, skipped, or one that can never show to this user), and how long ago it ended.",
          ),
        onAnchor: OnboardingAnchor.optional().describe(
          "Starts when this anchor appears instead of at load.",
        ),
      })
      .strict()
      .optional(),
    steps: z.array(OnboardingStepData).min(1),
  })
  .strict();
export type OnboardingItemData = z.infer<typeof OnboardingItemData>;

export const DEFAULT_QUIET_PERIOD_MINUTES = 60;

// Not strict, as the root below: a field of a later release is dropped, so an older front still reads the file.
// zod-to-json-schema exports both with `additionalProperties: false` all the same, so editors flag a misspelled field.
// Items stay strict: a field a later release adds to an item may limit who sees it, and an older front must drop that
// item rather than show it to more people.
const OnboardingBuiltin = z.object({
  announcements: z
    .boolean()
    .optional()
    .describe(
      "false turns off every WorkAdventure announcement (the release notes).",
    ),
  disabledTours: z
    .array(BuiltinTourId)
    .optional()
    .describe(
      "The built-in tours this world turns off. The tutorial has its own switch.",
    ),
});

export const OnboardingData = z
  .object({
    $schema: z.string().optional(),
    version: z.literal(1),
    quietPeriodMinutes: z
      .number()
      .int()
      .min(0)
      .max(10080)
      .default(DEFAULT_QUIET_PERIOD_MINUTES)
      .describe(
        "No item starts by itself within this many minutes of the last one that did. 0 leaves only one item at a time and the `after` delays.",
      ),
    builtin: OnboardingBuiltin.optional().describe(
      "The built-in content this world keeps. Everything is on by default.",
    ),
    items: z
      .array(OnboardingItemData)
      .default([])
      .describe(
        "The world's own items, in priority order, before the built-in ones.",
      ),
  })
  .describe(
    "The onboarding of a WorkAdventure world. It is public: guests read it too, so nothing secret goes in it.",
  );
export type OnboardingData = z.infer<typeof OnboardingData>;

/**
 * The root, with the items and the built-in tour ids left to check one by one. `extend()` keeps the unknown-keys mode,
 * so it drops unknown keys at the root and in `builtin` too.
 */
const OnboardingRoot = OnboardingData.extend({
  builtin: OnboardingBuiltin.extend({
    disabledTours: z.array(z.string()).optional(),
  }).optional(),
  items: z.array(z.unknown()).default([]),
});

/** The keys of `raw` that parsing dropped. */
function droppedKeys(raw: unknown, parsed: object | undefined): string[] {
  if (typeof raw !== "object" || raw === null) {
    return [];
  }
  return Object.keys(raw).filter((key) => !parsed || !(key in parsed));
}

function describeIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
}

/**
 * Checks each item on its own, so a broken one does not take the others down. `data` holds the valid items, and is
 * undefined when the root itself is wrong. A tour id this release does not know is left out: a tour removed in a
 * later release does not break the worlds that had turned it off. So is a field of the root or of `builtin`: a file
 * written for a later release still works.
 */
export function parseOnboardingData(json: unknown): {
  data?: OnboardingData;
  errors: string[];
} {
  const root = OnboardingRoot.safeParse(json);
  if (!root.success) {
    return { errors: [describeIssues(root.error)] };
  }
  const errors: string[] = [
    ...droppedKeys(json, root.data).map(
      (key) => `unknown field "${key}" is ignored`,
    ),
    ...droppedKeys(
      (json as { builtin?: unknown }).builtin,
      root.data.builtin,
    ).map((key) => `builtin: unknown field "${key}" is ignored`),
  ];
  const disabledTours = root.data.builtin?.disabledTours?.filter(
    (id): id is BuiltinTourId => {
      const known = BuiltinTourId.safeParse(id).success;
      if (!known) {
        errors.push(`builtin.disabledTours: "${id}" is not a built-in tour`);
      }
      return known;
    },
  );
  const ids = new Set<string>();
  const items: OnboardingItemData[] = [];
  root.data.items.forEach((raw, index) => {
    const item = OnboardingItemData.safeParse(raw);
    const rawId = (raw as { id?: unknown } | null)?.id;
    const name = `items.${index}${typeof rawId === "string" ? ` ("${rawId}")` : ""}`;
    if (!item.success) {
      errors.push(`${name} is ignored: ${describeIssues(item.error)}`);
    } else if (ids.has(item.data.id)) {
      errors.push(`${name} is ignored: an earlier item has the same id`);
    } else {
      ids.add(item.data.id);
      items.push(item.data);
    }
  });
  const builtin = root.data.builtin && {
    ...root.data.builtin,
    disabledTours,
  };
  return { data: { ...root.data, builtin, items }, errors };
}
