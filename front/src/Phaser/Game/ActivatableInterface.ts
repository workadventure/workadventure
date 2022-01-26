
export interface ActivatableInterface {
    readonly activationRadius: number;
    activate: () => void;
    getPosition: () => { x: number, y: number };
}
