import { z } from 'zod';

export const ITiledMapWangTile = z.object({
  tileid: z.number(),
  wangid: z.number().array(),
});

export type ITiledMapWangTile = z.infer<typeof ITiledMapWangTile>;
