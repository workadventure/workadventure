import { z } from 'zod';

export const ITiledMapTransformations = z.object({
  hflip: z.boolean().optional(),
  vflip: z.boolean().optional(),
  rotate: z.boolean().optional(),
  preferuntransformed: z.boolean().optional(),
});

export type ITiledMapTransformations = z.infer<typeof ITiledMapTransformations>;
