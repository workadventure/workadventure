import { EntityData } from "@workadventure/map-editor";
import { Observable, Subject } from "rxjs";
import { actionsMenuStore } from "../../../Stores/ActionsMenuStore";
import { Entity, EntityEvent } from "../../ECS/Entity";
import { TexturesHelper } from "../../Helpers/TexturesHelper";
import type { GameScene } from "../GameScene";
import type { GameMapFrontWrapper } from "./GameMapFrontWrapper";

export enum EntitiesManagerEvent {
    RemoveEntity = "EntitiesManagerEvent:RemoveEntity",
    UpdateEntity = "EntitiesManagerEvent:UpdateEntity",
}

export class EntitiesManager extends Phaser.Events.EventEmitter {
    private scene: GameScene;
    private gameMapFrontWrapper: GameMapFrontWrapper;

    private entities: Entity[];

    private properties: Map<string, string | boolean | number>;

    /**
     * Firing on map change, containing newest collision grid array
     */
    private pointerOverEntitySubject = new Subject<Entity>();
    private pointerOutEntitySubject = new Subject<Entity>();

    constructor(scene: GameScene, gameMapFrontWrapper: GameMapFrontWrapper) {
        super();
        this.scene = scene;
        this.gameMapFrontWrapper = gameMapFrontWrapper;
        this.entities = [];
        this.properties = new Map<string, string | boolean | number>();

        // clear properties immediately on every ActionsMenu change
        actionsMenuStore.subscribe((data) => {
            this.clearProperties();
            this.gameMapFrontWrapper.handleEntityActionTrigger();
        });
    }

    public async addEntity(data: EntityData, imagePathPrefix?: string): Promise<void> {
        await TexturesHelper.loadEntityImage(
            this.scene,
            data.prefab.imagePath,
            `${imagePathPrefix ?? ""}${data.prefab.imagePath}`
        );
        const entity = new Entity(this.scene, data);

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
        this.scene.markDirty();
    }

    public deleteEntity(id: number): boolean {
        const index = this.entities.findIndex((ent) => ent.getEntityData().id === id);
        if (index === -1) {
            return false;
        }
        const entity = this.entities[index];
        this.entities.splice(index, 1);

        const colGrid = entity.getReversedCollisionGrid();
        if (colGrid) {
            this.gameMapFrontWrapper.modifyToCollisionsLayer(
                entity.getTopLeft().x,
                entity.getTopLeft().y,
                "0",
                colGrid
            );
        }

        entity.destroy();
        this.scene.markDirty();
        return true;
    }

    public getProperties(): Map<string, string | boolean | number> {
        return this.properties;
    }

    public makeAllEntitiesNonInteractive(): void {
        this.entities.forEach((entity) => entity.disableInteractive());
    }

    public clearAllEntitiesTint(): void {
        this.entities.forEach((entity) => entity.clearTint());
    }

    public makeAllEntitiesInteractive(): void {
        this.entities.forEach((entity) => entity.setInteractive({ pixelPerfect: true, cursor: "pointer" }));
    }

    private bindEntityEventHandlers(entity: Entity): void {
        entity.on(EntityEvent.Remove, () => {
            this.emit(EntitiesManagerEvent.RemoveEntity, entity);
        });
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
            const entityData = structuredClone(entity.getEntityData());
            entityData.x = entity.x;
            entityData.y = entity.y;
            this.emit(EntitiesManagerEvent.UpdateEntity, entityData);
        });
        // get the type! Switch to rxjs?
        entity.on(
            EntityEvent.PropertySet,
            (data: { propertyName: string; propertyValue: string | number | boolean }) => {
                this.properties.set(data.propertyName, data.propertyValue);
                this.gameMapFrontWrapper.handleEntityActionTrigger();
            }
        );
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

    public clearProperties(): void {
        this.properties.clear();
    }
}
