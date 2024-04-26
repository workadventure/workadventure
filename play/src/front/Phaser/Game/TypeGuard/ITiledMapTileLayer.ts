import { z } from 'zod';
import { ITiledMapProperty } from './ITiledMapProperty';
import { ITiledMapChunk } from './ITiledMapChunk';

export const ITiledMapTileLayer = z.object({
  data: z.union([z.string(), z.number().array()]),
  height: z.number(),
  id: z.number(),
  name: z.string(),
  opacity: z.number(),
  type: z.literal('tilelayer'),
  visible: z.boolean(),
  width: z.number(),

  chunks: ITiledMapChunk.array().optional(),
  compression: z.string().optional(),
  encoding: z.enum(['csv', 'base64']).optional(),
  offsetx: z.number().optional(),
  offsety: z.number().optional(),
  parallaxx: z.number().optional(),
  parallaxy: z.number().optional(),
  properties: ITiledMapProperty.array().optional(),
  startx: z.number().optional(),
  starty: z.number().optional(),
  tintcolor: z.string().optional(),
  class: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
});

export type ITiledMapTileLayer = z.infer<typeof ITiledMapTileLayer>;
