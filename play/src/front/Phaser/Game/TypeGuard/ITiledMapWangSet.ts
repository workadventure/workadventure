import { z } from 'zod';
import { ITiledMapProperty } from './ITiledMapProperty';
import { ITiledMapWangColor } from './ITiledMapWangColor';
import { ITiledMapWangTile } from './ITiledMapWangTile';

export const ITiledMapWangSet = z.object({
  name: z.string(),
  tile: z.number(),

  colors: ITiledMapWangColor.array().optional(),
  properties: ITiledMapProperty.array().optional(),
  wangtiles: ITiledMapWangTile.array().optional(),
  type: z.enum(['corner', 'edge', 'mixed']),
  class: z.string().optional(),
});

export type ITiledMapWangSet = z.infer<typeof ITiledMapWangSet>;
