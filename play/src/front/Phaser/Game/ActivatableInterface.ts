export interface ActivatableInterface {
    readonly activationRadius: number;
    isActivatable: () => boolean;
    activate: () => void;
    deactivate: () => void;
    getPosition: () => { x: number; y: number };
}
