import { Writable, writable } from "svelte/store";
import { MatrixClient } from "matrix-js-sdk";
import { PartialChatUser } from "../Connection/ChatConnection";
import { chatUserFactory } from "../Connection/Matrix/MatrixChatUser";
import { UserProvideInterface } from "./UserProvideInterface";

export class MatrixUserProvider implements UserProvideInterface {
    users: Writable<PartialChatUser[]> = writable([]);
    constructor(clientPromise: Promise<MatrixClient>) {
        // TODO: use a readable instead of a writable to query the Matrix user list only when the user list is displayed.
        clientPromise
            .then((client) => {
                const userFromMatrix = client
                    .getUsers()
                    .filter((user) => user.userId !== client.getUserId())
                    .map((user) => {
                        return chatUserFactory(user, client);
                    });

                this.users.set(userFromMatrix);
            })
            .catch((error) => {
                throw new Error("An error occurred while processing Matrix users: " + error);
            });
    }
}
