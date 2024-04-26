import { z } from 'zod';
import { ITiledMapFrame } from './ITiledMapFrame';
import { ITiledMapObjectLayer } from './ITiledMapObjectLayer';
import { ITiledMapProperty } from './ITiledMapProperty';
import { ITiledMapTerrain } from './ITiledMapTerrain';

export const ITiledMapTile = z.object({
  id: z.number(),

  animation: ITiledMapFrame.array().optional(),
  image: z.string().optional(),
  imageheight: z.number().optional(),
  imagewidth: z.number().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  objectgroup: ITiledMapObjectLayer.optional(),
  probability: z.number().optional(),
  properties: ITiledMapProperty.array().optional(),
  class: z.string().optional(),
  terrain: ITiledMapTerrain.array().optional(),
  type: z.string().optional(),
});

export type ITiledMapTile = z.infer<typeof ITiledMapTile>;
