import { z } from 'zod';

export const ITiledMapTilesetReference = z
  .object({
    firstgid: z.number(),
    source: z.string(),
  })
  .strict();

export type ITiledMapTilesetReference = z.infer<typeof ITiledMapTilesetReference>;
