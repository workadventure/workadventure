import { z } from 'zod';
import { ITiledMapEmbeddedTileset } from './ITiledMapEmbeddedTileset';
import { ITiledMapTilesetReference } from './ITiledMapTilesetReference';

export const ITiledMapTileset = z.union([ITiledMapEmbeddedTileset, ITiledMapTilesetReference]);

export type ITiledMapTileset = z.infer<typeof ITiledMapTileset>;
