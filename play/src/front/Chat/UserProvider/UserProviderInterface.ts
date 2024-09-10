import { Readable } from "svelte/store";
import { PartialChatUser } from "../Connection/ChatConnection";

export interface UserProviderInterface {
    users: Readable<PartialChatUser[]>;
    setFilter: (searchText: string) => Promise<void>;
}
