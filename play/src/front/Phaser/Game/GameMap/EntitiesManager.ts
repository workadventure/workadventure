import { Observable, Subject } from "rxjs";
import type { EntityConfig } from "../../ECS/Entity";
import { Entity, EntityEvent } from "../../ECS/Entity";
import type { GameScene } from "../GameScene";
import type { GameMapFrontWrapper } from "./GameMapFrontWrapper";

export class EntitiesManager {
    private scene: GameScene;
    private gameMapFrontWrapper: GameMapFrontWrapper;

    private entities: Entity[];

    /**
     * Firing on map change, containing newest collision grid array
     */
    private pointerOverEntitySubject = new Subject<Entity>();
    private pointerOutEntitySubject = new Subject<Entity>();

    constructor(scene: GameScene, gameMapFrontWrapper: GameMapFrontWrapper) {
        this.scene = scene;
        this.gameMapFrontWrapper = gameMapFrontWrapper;
        this.entities = [];
        this.addEntity(320, 336, {
            id: 0,
            image: "table",
            collisionGrid: [
                [0, 0],
                [1, 1],
                [1, 1],
            ],
            interactive: true,
            properties: {
                openWebsite: "https://wikipedia.org",
            },
        });
    }

    public addEntity(x: number, y: number, config: EntityConfig): void {
        const entity = new Entity(this.scene, x, y, config);

        this.bindEntityEventHandlers(entity);

        const colGrid = entity.getCollisionGrid();
        if (colGrid) {
            this.gameMapFrontWrapper.modifyToCollisionsLayer(
                entity.getTopLeft().x,
                entity.getTopLeft().y,
                "0",
                colGrid
            );
        }

        this.entities.push(entity);
    }

    private bindEntityEventHandlers(entity: Entity): void {
        entity.on(EntityEvent.Moved, (oldX: number, oldY: number) => {
            const reversedGrid = entity.getReversedCollisionGrid();
            const grid = entity.getCollisionGrid();
            if (reversedGrid && grid) {
                this.gameMapFrontWrapper.modifyToCollisionsLayer(oldX, oldY, "0", reversedGrid);
                this.gameMapFrontWrapper.modifyToCollisionsLayer(
                    entity.getTopLeft().x,
                    entity.getTopLeft().y,
                    "0",
                    grid
                );
            }
        });
        entity.on(Phaser.Input.Events.POINTER_OVER, () => {
            this.pointerOverEntitySubject.next(entity);
        });
        entity.on(Phaser.Input.Events.POINTER_OUT, () => {
            this.pointerOutEntitySubject.next(entity);
        });
    }

    public getEntities(): Entity[] {
        return this.entities;
    }

    public getPointerOverEntityObservable(): Observable<Entity> {
        return this.pointerOverEntitySubject.asObservable();
    }

    public getPointerOutEntityObservable(): Observable<Entity> {
        return this.pointerOutEntitySubject.asObservable();
    }
}
