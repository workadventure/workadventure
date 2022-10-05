import { z } from "zod";

export const isMenuItemClickedEvent = z.object({
    menuItem: z.string(),
});

/**
 * A message sent from the game to the iFrame when a menu item is clicked.
 */
export type MenuItemClickedEvent = z.infer<typeof isMenuItemClickedEvent>;
