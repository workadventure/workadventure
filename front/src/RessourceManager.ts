export enum RessourceNames {
    Tiles = 'tiles',
    Map = 'map',
    Player = 'player',
}

export enum RessourceTypes {
    Image = 1,
    JsonImage,
    Spritesheet,    
}


//the class responsible for loading all the external image ressources
export class RessourceManager {
    private data = [
        {name: RessourceNames.Tiles, path: 'maps/tiles.png', type: RessourceTypes.Image}, 
        {name: RessourceNames.Map, path: 'maps/map2.json', type: RessourceTypes.JsonImage}, 
        {name: RessourceNames.Player, path: 'resources/characters/pipoya/Male 01-1.png', type: RessourceTypes.Spritesheet, config: { frameWidth: 32, frameHeight: 32 }}, 
    ];
    
    load(load: Phaser.Loader.LoaderPlugin) {
        this.data.forEach(d => {
            switch (d.type) {
                case RessourceTypes.Image:
                    load.image(d.name, d.path);
                    break;
                case RessourceTypes.JsonImage:    
                    load.tilemapTiledJSON(d.name, d.path);
                    break;
                case RessourceTypes.Spritesheet:
                    load.spritesheet(d.name, d.path, d.config)
                    break;
            }
        })
    }
}