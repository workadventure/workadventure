import { z } from 'zod';
import { ITiledMapProperty } from './ITiledMapProperty';

export const ITiledMapImageLayer = z.object({
  image: z.string(),
  name: z.string(),
  opacity: z.number(),
  type: z.literal('imagelayer'),
  visible: z.boolean(),

  height: z.number().optional(),
  id: z.number().optional(),
  offsetx: z.number().optional(),
  offsety: z.number().optional(),
  parallaxx: z.number().optional(),
  parallaxy: z.number().optional(),
  properties: ITiledMapProperty.array().optional(),
  repeatx: z.boolean().optional(),
  repeaty: z.boolean().optional(),
  startx: z.number().optional(),
  starty: z.number().optional(),
  tintcolor: z.string().optional(),
  class: z.string().optional(),
  width: z.number().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
});

export type ITiledMapImageLayer = z.infer<typeof ITiledMapImageLayer>;
