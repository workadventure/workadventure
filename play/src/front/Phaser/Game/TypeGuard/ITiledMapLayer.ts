import { z } from 'zod';
import { ITiledMapTileLayer } from './ITiledMapTileLayer';
import { ITiledMapGroupLayer } from './ITiledMapGroupLayer';
import { ITiledMapObjectLayer } from './ITiledMapObjectLayer';
import { ITiledMapImageLayer } from './ITiledMapImageLayer';

export const ITiledMapLayer = z.union([
  ITiledMapTileLayer,
  ITiledMapGroupLayer,
  ITiledMapObjectLayer,
  ITiledMapImageLayer,
]);

export type ITiledMapLayer = z.infer<typeof ITiledMapLayer>;
