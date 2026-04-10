import type { Readable } from "svelte/store";
import type { PartialAnyKindOfUser } from "../Connection/ChatConnection";

export interface UserProviderInterface {
    users: Readable<PartialAnyKindOfUser[]>;
    setFilter: (searchText: string) => Promise<void>;
}
