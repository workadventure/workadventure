import { z } from 'zod';

export const ITiledMapChunk = z.object({
  data: z.union([z.string(), z.number().array()]),
  height: z.number(),
  width: z.number(),
  x: z.number(),
  y: z.number(),
});

export type ITiledMapChunk = z.infer<typeof ITiledMapChunk>;
