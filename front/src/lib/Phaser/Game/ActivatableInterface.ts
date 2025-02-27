import { Entity } from "../ECS/Entity";
import { RemotePlayer } from "../Entity/RemotePlayer";
import { ActionableItem } from "../Items/ActionableItem";

export interface ActivatableInterface {
    readonly activationRadius: number;
    isActivatable: () => boolean;
    activate: () => void;
    deactivate: () => void;
    getPosition: () => { x: number; y: number };
    playText(id: string, text: string, duration?: number, callback?: () => void): void;
    destroyText(id: string): void;
}

export function isActivatable(object: unknown): object is ActivatableInterface {
    return (
        (object instanceof Entity || object instanceof RemotePlayer || object instanceof ActionableItem) &&
        object.isActivatable()
    );
}
