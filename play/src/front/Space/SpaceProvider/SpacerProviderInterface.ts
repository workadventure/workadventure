import { SpaceInterface } from "../SpaceInterface";
export interface SpaceProviderInterface {
    getAll(): SpaceInterface[];
    get(spaceName: string): SpaceInterface;
    add(spaceName: string): SpaceInterface;
    exist(spaceName: string): boolean;
    delete(spaceName: string): void;
    destroy():void;
}