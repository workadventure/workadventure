import { z } from 'zod';

export const ITiledMapText = z.object({
  text: z.string(),

  bold: z.boolean().optional(),
  color: z.string().optional(),
  fontfamily: z.string().optional(),
  halign: z.enum(['center', 'right', 'justify', 'left']).optional(),
  italic: z.boolean().optional(),
  kerning: z.boolean().optional(),
  pixelsize: z.number().optional(),
  strikeout: z.boolean().optional(),
  underline: z.boolean().optional(),
  valign: z.enum(['center', 'bottom', 'top']).optional(),
  wrap: z.boolean().optional(),
});

export type ITiledMapText = z.infer<typeof ITiledMapText>;
