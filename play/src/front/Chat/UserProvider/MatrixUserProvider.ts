import { Readable, readable } from "svelte/store";
import { MatrixClient } from "matrix-js-sdk";
import { PartialChatUser } from "../Connection/ChatConnection";
import { chatUserFactory } from "../Connection/Matrix/MatrixChatUser";
import { UserProvideInterface } from "./UserProvideInterface";

export class MatrixUserProvider implements UserProvideInterface {
    users: Readable<PartialChatUser[]>;
    constructor(clientPromise: Promise<MatrixClient>) {
        this.users = readable([] as PartialChatUser[], (set) => {
            clientPromise
                .then((client) => {
                    const userFromMatrix = client
                        .getUsers()
                        .filter((user) => user.userId !== client.getUserId())
                        .map((user) => {
                            return chatUserFactory(user, client);
                        });
                    set(userFromMatrix);
                })
                .catch((error) => {
                    throw new Error("An error occurred while processing Matrix users: " + error);
                });
        });
    }
}
