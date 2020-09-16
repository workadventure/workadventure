import * as tg from "generic-type-guard";
import {isPointInterface} from "./PointInterface";
import {isViewport} from "./ViewportMessage";


export const isUserMovesInterface =
    new tg.IsInterface().withProperties({
        position: isPointInterface,
        viewport: isViewport,
    }).get();
export type UserMovesInterface = tg.GuardedType<typeof isUserMovesInterface>;
