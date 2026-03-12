import type { Readable } from "svelte/store";
import type { PartialAnyKindOfUser } from "../Connection/ChatConnection.ts";

export interface UserProviderInterface {
    users: Readable<PartialAnyKindOfUser[]>;
    setFilter: (searchText: string) => Promise<void>;
}
