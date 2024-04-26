import { z } from 'zod';
import { ITiledMapProperty } from './ITiledMapProperty';

export const ITiledMapWangColor = z.object({
  name: z.string(),
  color: z.string(),
  tile: z.number(),

  probability: z.number(),
  properties: ITiledMapProperty.array().optional(),
  type: z.string().optional(),
  class: z.string().optional(),
});

export type ITiledMapWangColor = z.infer<typeof ITiledMapWangColor>;
