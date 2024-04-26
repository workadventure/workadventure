import { z } from 'zod';
import { ITiledMapProperty } from './ITiledMapProperty';
import { ITiledMapObject } from './ITiledMapObject';

export const ITiledMapObjectLayer = z.object({
  name: z.string(),
  objects: ITiledMapObject.array(),
  opacity: z.number(),
  type: z.literal('objectgroup'),
  visible: z.boolean(),

  draworder: z.string().optional(),
  height: z.number().optional(),
  id: z.number().optional(),
  offsetx: z.number().optional(),
  offsety: z.number().optional(),
  parallaxx: z.number().optional(),
  parallaxy: z.number().optional(),
  properties: ITiledMapProperty.array().optional(),
  startx: z.number().optional(),
  starty: z.number().optional(),
  tintcolor: z.string().optional(),
  width: z.number().optional(),
  class: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
});

export type ITiledMapObjectLayer = z.infer<typeof ITiledMapObjectLayer>;
