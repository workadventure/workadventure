import { z } from 'zod';
import { ITiledMapProperty } from './ITiledMapProperty';
import { ITiledMapPoint } from './ITiledMapPoint';
import { ITiledMapText } from './ITiledMapText';

export const ITiledMapObject = z.object({
  id: z.number(),
  name: z.string(),
  visible: z.boolean(),
  x: z.number(),
  y: z.number(),

  ellipse: z.boolean().optional(),
  gid: z.number().optional(),
  height: z.number().optional(),
  point: z.boolean().optional(),
  polygon: ITiledMapPoint.array().optional(),
  polyline: ITiledMapPoint.array().optional(),
  properties: ITiledMapProperty.array().optional(),
  rotation: z.number().optional(),
  template: z.string().optional(),
  text: ITiledMapText.optional(),
  type: z.string().optional(),
  class: z.string().optional(),
  width: z.number().optional(),
});

export type ITiledMapObject = z.infer<typeof ITiledMapObject>;
