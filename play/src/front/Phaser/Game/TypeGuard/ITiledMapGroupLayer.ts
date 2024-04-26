import { z } from 'zod';
import { ITiledMapProperty } from './ITiledMapProperty';
import { ITiledMapLayer } from './ITiledMapLayer';

interface TiledMapGroupLayerOptional {
  height: number;
  draworder: string;
  id: number;
  class: string;
  offsetx: number;
  offsety: number;
  parallaxx: number;
  parallaxy: number;
  properties: ITiledMapProperty[];
  startx: number;
  starty: number;
  tintcolor: string;
  width: number;
  x: number;
  y: number;
}

export interface TiledMapGroupLayer extends Partial<TiledMapGroupLayerOptional> {
  opacity: number;
  name: string;
  visible: boolean;
  type: 'group';
  layers: ITiledMapLayer[];
}

export const ITiledMapGroupLayer: z.ZodType<TiledMapGroupLayer> = z.object({
  name: z.string(),
  opacity: z.number(),
  type: z.literal('group'),
  layers: z.lazy(() => ITiledMapLayer.array()),
  visible: z.boolean(),

  height: z.number().optional(),
  draworder: z.string().optional(),
  id: z.number().optional(),
  class: z.string().optional(),
  offsetx: z.number().optional(),
  offsety: z.number().optional(),
  parallaxx: z.number().optional(),
  parallaxy: z.number().optional(),
  properties: ITiledMapProperty.array().optional(),
  startx: z.number().optional(),
  starty: z.number().optional(),
  tintcolor: z.string().optional(),
  width: z.number().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
});

export type ITiledMapGroupLayer = z.infer<typeof ITiledMapGroupLayer>;
