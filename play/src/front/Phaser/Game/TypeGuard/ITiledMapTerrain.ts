import { z } from 'zod';
import { ITiledMapProperty } from './ITiledMapProperty';

export const ITiledMapTerrain = z.object({
  name: z.string(),
  tile: z.number(),
  properties: ITiledMapProperty.array().optional(),
});

export type ITiledMapTerrain = z.infer<typeof ITiledMapTerrain>;
