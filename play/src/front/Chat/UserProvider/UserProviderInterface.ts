import { Readable } from "svelte/store";
import { PartialAnyKindOfUser } from "../Connection/ChatConnection";

export interface UserProviderInterface {
    users: Readable<PartialAnyKindOfUser[]>;
    setFilter: (searchText: string) => Promise<void>;
}
