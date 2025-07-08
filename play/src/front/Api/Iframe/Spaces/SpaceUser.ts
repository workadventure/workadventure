import { Observable } from "rxjs";
import { NewSpaceUserEvent } from "../../Events/NewSpaceUserEvent";

export type SpaceUser = NewSpaceUserEvent & {
    reactiveUser: ReactiveSpaceUser;
};

export type ReactiveSpaceUser = {
    [K in keyof Omit<SpaceUser, "spaceUserId">]: Readonly<Observable<SpaceUser[K]>>;
};
