import type { Observable } from "rxjs";
import type { NewSpaceUserEvent } from "../../Events/NewSpaceUserEvent";

export type SpaceUser = NewSpaceUserEvent & {
    reactiveUser: ReactiveSpaceUser;
};

export type ReactiveSpaceUser = {
    [K in keyof Omit<SpaceUser, "spaceUserId">]: Readonly<Observable<SpaceUser[K]>>;
};
