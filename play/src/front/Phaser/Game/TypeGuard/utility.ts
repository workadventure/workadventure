import { ITiledMap } from './ITiledMap';
import { ITiledMapLayer } from './ITiledMapLayer';

export function upgradeMapToNewest(map: ITiledMap, useCopy = false): ITiledMap {
  const newMap: ITiledMap = useCopy ? JSON.parse(JSON.stringify(map)) : map;

  for (const layer of newMap.layers) {
    updateLayerFieldValue(layer);
  }

  return newMap;
}

function updateLayerFieldValue(layer: ITiledMapLayer): void {
  if (layer.type === 'group') {
    for (const deeperLayer of layer.layers ?? []) {
      updateLayerFieldValue(deeperLayer);
    }
  }
  if (layer.type === 'objectgroup') {
    for (const obj of layer.objects) {
      if (obj.class === undefined) {
        obj.class = obj.type;
      }
    }
  }
}
