import { z } from "zod";

/**
 * The onboarding of a world: its own items, and which built-in ones it keeps. The SaaS admin serves it per world, and
 * a self-hosted install from `ONBOARDING_URL`. Exported as JSON Schema to docs/schema/onboarding.json.
 */

/**
 * The UI elements of WorkAdventure that onboarding items can point at. The front sets them with the `onboarding`
 * attachment. World configs name them, so removing or renaming one is a breaking change that goes in the release notes.
 */
export const BuiltinOnboardingAnchor = z.enum([
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

/** The built-in tours a world can turn off, with the label the admin editor shows. */
export const BuiltinTourId = z.union([
  z
    .literal("wa.mapEditor.furniture")
    .describe("Map editor: placing furniture (for map editors)"),
  z.literal("wa.tip.lockBubble").describe("Tip: locking a conversation"),
  z.literal("wa.tip.screenShare").describe("Tip: sharing the screen"),
  z.literal("wa.tip.pictureInPicture").describe("Tip: picture-in-picture"),
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
  skipIfUsed: OnboardingAnchor.optional().describe(
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

const OnboardingBuiltin = z
  .object({
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
  })
  .strict();

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
  .strict()
  .describe(
    "The onboarding of a WorkAdventure world. It is public: guests read it too, so nothing secret goes in it.",
  );
export type OnboardingData = z.infer<typeof OnboardingData>;

/** The root, with the items and the built-in tour ids left to check one by one. */
const OnboardingRoot = OnboardingData.extend({
  builtin: OnboardingBuiltin.extend({
    disabledTours: z.array(z.string()).optional(),
  }).optional(),
  items: z.array(z.unknown()).default([]),
});

function describeIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
}

/**
 * Checks each item on its own, so a broken one does not take the others down. `data` holds the valid items, and is
 * undefined when the root itself is wrong. A tour id this release does not know is left out: a tour removed in a
 * later release does not break the worlds that had turned it off.
 */
export function parseOnboardingData(json: unknown): {
  data?: OnboardingData;
  errors: string[];
} {
  const root = OnboardingRoot.safeParse(json);
  if (!root.success) {
    return { errors: [describeIssues(root.error)] };
  }
  const errors: string[] = [];
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
