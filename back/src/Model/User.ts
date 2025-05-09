import { ServerDuplexStream } from "@grpc/grpc-js";
import * as Sentry from "@sentry/node";
import {
    ApplicationMessage,
    AvailabilityStatus,
    CharacterTextureMessage,
    CompanionTextureMessage,
    PusherToBackMessage,
    SayMessage,
    ServerToClientMessage,
    SetPlayerDetailsMessage,
    SetPlayerVariableMessage,
    SetPlayerVariableMessage_Scope,
    SubMessage,
} from "@workadventure/messages";
import { Movable } from "../Model/Movable";
import { PositionNotifier } from "../Model/PositionNotifier";
import { Zone } from "../Model/Zone";
import { PlayerVariables } from "../Services/PlayersRepository/PlayerVariables";
import { getPlayersVariablesRepository } from "../Services/PlayersRepository/PlayersVariablesRepository";
import { BrothersFinder } from "./BrothersFinder";
import { CustomJsonReplacerInterface } from "./CustomJsonReplacerInterface";
import { Group } from "./Group";
import { PointInterface } from "./Websocket/PointInterface";

export type UserSocket = ServerDuplexStream<PusherToBackMessage, ServerToClientMessage>;

export class User implements Movable, CustomJsonReplacerInterface {
    public listenedZones: Set<Zone>;
    public group?: Group;
    private _following: User | undefined;
    private followedBy: Set<User> = new Set<User>();
    public disconnected = false;
    private isRoomJoinedMessage = false;
    private pendingMessages: NonNullable<ServerToClientMessage["message"]>[] = [];

    public constructor(
        public id: number,
        public readonly uuid: string,
        public readonly isLogged: boolean,
        public readonly IPAddress: string,
        private position: PointInterface,
        private positionNotifier: PositionNotifier,
        private availabilityStatus: AvailabilityStatus,
        public readonly socket: UserSocket,
        public readonly tags: string[],
        public readonly canEdit: boolean,
        public readonly visitCardUrl: string | null,
        public readonly name: string,
        public readonly characterTextures: CharacterTextureMessage[],
        private readonly variables: PlayerVariables,
        private readonly brothersFinder: BrothersFinder,
        public readonly companionTexture?: CompanionTextureMessage,
        private outlineColor?: number,
        private voiceIndicatorShown?: boolean,
        public readonly activatedInviteUser?: boolean,
        public readonly applications?: ApplicationMessage[],
        public readonly chatID?: string,
        private sayMessage?: SayMessage
    ) {
        this.listenedZones = new Set<Zone>();

        this.positionNotifier.enter(this);
    }

    public static async create(
        id: number,
        uuid: string,
        isLogged: boolean,
        IPAddress: string,
        position: PointInterface,
        positionNotifier: PositionNotifier,
        availabilityStatus: AvailabilityStatus,
        socket: UserSocket,
        tags: string[],
        canEdit: boolean,
        visitCardUrl: string | null,
        name: string,
        characterTextures: CharacterTextureMessage[],
        roomUrl: string,
        roomGroup: string | undefined,
        brothersFinder: BrothersFinder,
        companionTexture?: CompanionTextureMessage,
        outlineColor?: number,
        voiceIndicatorShown?: boolean,
        activatedInviteUser?: boolean,
        applications?: ApplicationMessage[],
        chatID?: string,
        sayMessage?: SayMessage
    ): Promise<User> {
        const playersVariablesRepository = await getPlayersVariablesRepository();
        const variables = new PlayerVariables(uuid, roomUrl, roomGroup, playersVariablesRepository, isLogged);
        await variables.load();

        return new User(
            id,
            uuid,
            isLogged,
            IPAddress,
            position,
            positionNotifier,
            availabilityStatus,
            socket,
            tags,
            canEdit,
            visitCardUrl,
            name,
            characterTextures,
            variables,
            brothersFinder,
            companionTexture,
            outlineColor,
            voiceIndicatorShown,
            activatedInviteUser,
            applications,
            chatID,
            sayMessage
        );
    }

    public getPosition(): PointInterface {
        return this.position;
    }

    public setPosition(position: PointInterface): void {
        const oldPosition = this.position;
        this.position = position;
        this.positionNotifier.updatePosition(this, position, oldPosition);
    }

    public addFollower(follower: User): void {
        this.followedBy.add(follower);
        follower._following = this;

        this.socket.write({
            message: {
                $case: "followConfirmationMessage",
                followConfirmationMessage: {
                    follower: follower.id,
                    leader: this.id,
                },
            },
        });
    }

    public delFollower(follower: User): void {
        this.followedBy.delete(follower);
        follower._following = undefined;

        const clientMessage = {
            message: {
                $case: "followAbortMessage",
                followAbortMessage: {
                    follower: follower.id,
                    leader: this.id,
                },
            },
        } as const;
        this.socket.write(clientMessage);
        follower.socket.write(clientMessage);
    }

    public hasFollowers(): boolean {
        return this.followedBy.size !== 0;
    }

    public getOutlineColor(): number | undefined {
        return this.outlineColor;
    }

    public getAvailabilityStatus(): AvailabilityStatus {
        return this.availabilityStatus;
    }

    public getSayMessage(): SayMessage | undefined {
        return this.sayMessage;
    }

    public get silent(): boolean {
        return (
            this.availabilityStatus === AvailabilityStatus.DENY_PROXIMITY_MEETING ||
            this.availabilityStatus === AvailabilityStatus.SILENT ||
            this.availabilityStatus === AvailabilityStatus.JITSI ||
            this.availabilityStatus === AvailabilityStatus.BBB ||
            this.availabilityStatus === AvailabilityStatus.SPEAKER ||
            this.availabilityStatus === AvailabilityStatus.DO_NOT_DISTURB ||
            this.availabilityStatus === AvailabilityStatus.BACK_IN_A_MOMENT
        );
    }

    get following(): User | undefined {
        return this._following;
    }

    public stopLeading(): void {
        for (const follower of this.followedBy) {
            this.delFollower(follower);
        }
    }

    private batchedMessages: SubMessage[] = [];
    private batchTimeout: NodeJS.Timeout | null = null;

    public emitInBatch(payload: SubMessage): void {
        this.batchedMessages.push(payload);

        if (this.batchTimeout === null) {
            this.batchTimeout = setTimeout(() => {
                /*if (socket.disconnecting) {
                    return;
                }*/

                this.socket.write({
                    message: {
                        $case: "batchMessage",
                        batchMessage: {
                            event: "", // FIXME: remove event
                            payload: this.batchedMessages,
                        },
                    },
                });
                this.batchedMessages = [];
                this.batchTimeout = null;
            }, 100);
        }
    }

    public updateDetails(details: SetPlayerDetailsMessage) {
        if (details.removeOutlineColor) {
            this.outlineColor = undefined;
        } else if (details.outlineColor !== undefined) {
            this.outlineColor = details.outlineColor;
        }
        this.voiceIndicatorShown = details.showVoiceIndicator;

        const availabilityStatus = details.availabilityStatus;
        if (availabilityStatus && availabilityStatus !== this.availabilityStatus) {
            this.availabilityStatus = availabilityStatus;
        }

        const setVariable = details.setVariable;
        if (setVariable) {
            /*console.log(
                "Variable '" + setVariable.getName() + "' for user '" + this.name + "' updated. New value: '",
                setVariable.getValue() + "'"
            );*/
            const scope = setVariable.scope;
            if (scope === SetPlayerVariableMessage_Scope.WORLD) {
                this.variables
                    .saveWorldVariable(
                        setVariable.name,
                        setVariable.value,
                        setVariable.public,
                        setVariable.ttl,
                        setVariable.persist
                    )
                    .catch((e) => {
                        console.error("An error occurred while saving world variable: ", e);
                        Sentry.captureException(`An error occurred while saving world variable: ${JSON.stringify(e)}`);
                    });

                this.updateDataUserSameUUID(setVariable, details);
            } else if (scope === SetPlayerVariableMessage_Scope.ROOM) {
                this.variables
                    .saveRoomVariable(
                        setVariable.name,
                        setVariable.value,
                        setVariable.public,
                        setVariable.ttl,
                        setVariable.persist
                    )
                    .catch((e) => {
                        console.error("An error occurred while saving room variable: ", e);
                        Sentry.captureException(`An error occurred while saving room variable: ${JSON.stringify(e)}`);
                    });

                this.updateDataUserSameUUID(setVariable, details);
            } else if (scope === SetPlayerVariableMessage_Scope.UNRECOGNIZED) {
                console.warn("Unrecognized scope for SetPlayerVariableMessage");
            } else {
                const _exhaustiveCheck: never = scope;
            }
        }

        const sayMessage = details.sayMessage;
        if (sayMessage) {
            if (sayMessage.message) {
                this.sayMessage = sayMessage;
            } else {
                this.sayMessage = undefined;
            }
        }

        this.positionNotifier.updatePlayerDetails(this, details);
    }

    public getVariables(): PlayerVariables {
        return this.variables;
    }

    private updateDataUserSameUUID(
        setVariable: SetPlayerVariableMessage,
        details: SetPlayerDetailsMessage | undefined
    ) {
        // Very special case: if we are updating a player variable AND if if the variable is persisted, we must also
        // update the variable of all other users with the same UUID!
        if (setVariable.persist) {
            // Let's have a look at all other users sharing the same UUID
            const brothers = this.brothersFinder.getBrothers(this);

            for (const brother of brothers) {
                brother.variables
                    .saveRoomVariable(
                        setVariable.name,
                        setVariable.value,
                        setVariable.public,
                        setVariable.ttl,
                        // We don't need to persist this for every player as this will write in the same place in DB.
                        false
                    )
                    .catch((e) => {
                        console.error("An error occurred while saving room variable for a user with same UUID: ", e);
                        Sentry.captureException(
                            `An error occurred while saving room variable for a user with same UUID: ${JSON.stringify(
                                e
                            )}`
                        );
                    });

                // Let's dispatch the message to the user.
                brother.emitInBatch({
                    message: {
                        $case: "playerDetailsUpdatedMessage",
                        playerDetailsUpdatedMessage: {
                            userId: brother.id,
                            details,
                        },
                    },
                });
            }
        }
    }

    public customJsonReplacer(key: unknown, value: unknown): string | undefined {
        if (key === "positionNotifier") {
            return "positionNotifier";
        }
        if (key === "group") {
            const group = value as Group | undefined;
            return group ? `group ${group.getId()}` : "no group";
        }
        return undefined;
    }

    /**
     * Due to race conditions, it is possible that the first call to "write" is not a "roomJoinedMessage".
     * If this is the case, the message is lost on the front side. This method is putting back the messages
     * in the correct order. If the first message is not a "roomJoinedMessage", it is buffered until the
     * "roomJoinedMessage" message is received.
     */
    public write(chunk: NonNullable<ServerToClientMessage["message"]>, cb?: (...args: unknown[]) => unknown): boolean {
        //TODO : handle socket.write return false
        if (this.isRoomJoinedMessage) {
            return this.socket.write(
                {
                    message: chunk,
                },
                cb
            );
        }

        if (chunk.$case === "roomJoinedMessage") {
            this.isRoomJoinedMessage = true;

            this.socket.write(
                {
                    message: chunk,
                },
                cb
            );

            this.pendingMessages.forEach((message) => {
                this.socket.write(
                    {
                        message,
                    },
                    cb
                );
            });

            this.pendingMessages = [];
            return true;
        }

        this.pendingMessages.push(chunk);
        return true;
    }
}
