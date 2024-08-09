import { Readable, readable } from "svelte/store";
import { MatrixClient } from "matrix-js-sdk";
import { PartialChatUser } from "../Connection/ChatConnection";
import { chatUserFactory } from "../Connection/Matrix/MatrixChatUser";
import { UserProvideInterface } from "./UserProvideInterface";

export class MatrixUserProvider implements UserProvideInterface {
    users: Readable<PartialChatUser[]>;
    private _allUser: PartialChatUser[] = [];
    private _setUsers: ((value: PartialChatUser[]) => void) | undefined;

    constructor(clientPromise: Promise<MatrixClient>) {
        this.users = readable([] as PartialChatUser[], (set) => {
            this._setUsers = set;
            clientPromise
                .then((client) => {
                    const userFromMatrix = client
                        .getUsers()
                        .filter((user) => user.userId !== client.getUserId())
                        .map((user) => {
                            return chatUserFactory(user, client);
                        });
                    this._allUser = userFromMatrix;
                    set(userFromMatrix);
                })
                .catch((error) => {
                    throw new Error("An error occurred while processing Matrix users: " + error);
                });
        });
    }

    setFilter(searchText: string): Promise<void> {
        return new Promise((res, _) => {
            if (!this._setUsers) {
                res();
                return;
            }

            if (searchText === "") {
                this._setUsers(this._allUser);
                res();
                return;
            }

            const filteredUsers = this._allUser.filter((user) =>
                user?.username?.toLocaleLowerCase().includes(searchText.toLocaleLowerCase())
            );
            this._setUsers(filteredUsers);
            res();
        });
    }
}
