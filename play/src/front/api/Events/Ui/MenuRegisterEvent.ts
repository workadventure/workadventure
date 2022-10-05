import { z } from "zod";

/**
 * A message sent from a script to the game to remove a custom menu from the menu
 */
export const isUnregisterMenuEvent = z.object({
    name: z.string(),
});

export type UnregisterMenuEvent = z.infer<typeof isUnregisterMenuEvent>;

export const isMenuRegisterOptions = z.object({
    allowApi: z.boolean(),
});

/**
 * A message sent from a script to the game to add a custom menu from the menu
 */
export const isMenuRegisterEvent = z.object({
    name: z.string(),
    iframe: z.optional(z.string()),
    options: isMenuRegisterOptions,
});

export type MenuRegisterEvent = z.infer<typeof isMenuRegisterEvent>;
