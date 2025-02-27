import { z } from "zod";

const regexUnit = /-*\d+(px|em|%|cm|in|pc|pt|mm|ex|vw|vh|rem)|auto|inherit/;

// Parse the string to check if is a valid CSS unit (px,%,vw,vh...)
export const isUIWebsiteCSSValue = z.string().regex(regexUnit);

export type UIWebsiteCSSValue = z.infer<typeof isUIWebsiteCSSValue>;

export const isUIWebsiteMargin = z.object({
    top: isUIWebsiteCSSValue.optional(),
    bottom: isUIWebsiteCSSValue.optional(),
    left: isUIWebsiteCSSValue.optional(),
    right: isUIWebsiteCSSValue.optional(),
});

export type UIWebsiteMargin = z.infer<typeof isUIWebsiteMargin>;

export const isViewportPositionVertical = z.enum(["top", "middle", "bottom"]);

export type ViewportPositionVertical = z.infer<typeof isViewportPositionVertical>;

export const isViewportPositionHorizontal = z.enum(["left", "middle", "right"]);

export type ViewportPositionHorizontal = z.infer<typeof isViewportPositionHorizontal>;

export const isUIWebsitePosition = z.object({
    vertical: isViewportPositionVertical,
    horizontal: isViewportPositionHorizontal,
});

export type UIWebsitePosition = z.infer<typeof isUIWebsitePosition>;

export const isUIWebsiteSize = z.object({
    height: isUIWebsiteCSSValue,
    width: isUIWebsiteCSSValue,
});

export type UIWebsiteSize = z.infer<typeof isUIWebsiteSize>;

export const isCreateUIWebsiteEvent = z.object({
    url: z.string(),
    visible: z.boolean().optional(),
    allowApi: z.boolean().optional(),
    allowPolicy: z.optional(z.string()),
    position: isUIWebsitePosition,
    size: isUIWebsiteSize,
    margin: isUIWebsiteMargin.partial().optional(),
});

export type CreateUIWebsiteEvent = z.infer<typeof isCreateUIWebsiteEvent>;

export const isModifyUIWebsiteEvent = z.object({
    id: z.string(),
    url: z.string().optional(),
    visible: z.boolean().optional(),
    position: isUIWebsitePosition.optional(),
    size: isUIWebsiteSize.optional(),
    margin: isUIWebsiteMargin.partial().optional(),
});

export type ModifyUIWebsiteEvent = z.infer<typeof isModifyUIWebsiteEvent>;

export const isUIWebsiteEvent = z.object({
    id: z.string(),
    url: z.string(),
    visible: z.boolean(),
    allowApi: z.boolean(),
    allowPolicy: z.string(),
    position: isUIWebsitePosition,
    size: isUIWebsiteSize,
    margin: isUIWebsiteMargin.partial().optional(),
});

export type UIWebsiteEvent = z.infer<typeof isUIWebsiteEvent>;
