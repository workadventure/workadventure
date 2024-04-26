import { z } from 'zod';
import { ITiledMapProperty } from './ITiledMapProperty';
import { ITiledMapTerrain } from './ITiledMapTerrain';
import { ITiledMapGrid } from './ITiledMapGrid';
import { ITiledMapOffset } from './ITiledMapOffset';
import { ITiledMapTile } from './ITiledMapTile';
import { ITiledMapTransformations } from './ITiledMapTransformations';
import { ITiledMapWangSet } from './ITiledMapWangSet';

export const ITiledMapEmbeddedTileset = z.object({
  name: z.string(),
  image: z.string(),

  backgroundcolor: z.string().optional(),
  columns: z.number().optional(),
  fillmode: z.enum(['stretch', 'preserve-aspect-fit']).optional(),
  firstgid: z.number().optional(),
  grid: ITiledMapGrid.optional(),
  id: z.number().optional(),
  imageheight: z.number().optional(),
  imagewidth: z.number().optional(),
  margin: z.number().optional(),
  objectalignment: z.string().optional(),
  properties: ITiledMapProperty.array().optional(),
  //source: z.undefined(),
  spacing: z.number().optional(),
  terrains: ITiledMapTerrain.array().optional(),
  tilecount: z.number().optional(),
  tiledversion: z.string().optional(),
  tileheight: z.number().optional(),
  tileoffset: ITiledMapOffset.optional(),
  tilerendersize: z.enum(['tile', 'grid']).optional(),
  tiles: ITiledMapTile.array().optional(),
  tilewidth: z.number().optional(),
  transformations: ITiledMapTransformations.optional(),
  transparentcolor: z.string().optional(),
  type: z.literal('tileset').optional(),
  class: z.string().optional(),
  version: z.union([z.string(), z.number()]).optional(),
  wangsets: ITiledMapWangSet.array().optional(),
});

export type ITiledMapEmbeddedTileset = z.infer<typeof ITiledMapEmbeddedTileset>;
