import path from "path";
import * as Sentry from "@sentry/node";
import { GameMapProperties, WAMFileFormat } from "@workadventure/map-editor";
import { LocalUrlError } from "@workadventure/map-editor/src/LocalUrlError";
import { mapFetcher } from "@workadventure/map-editor/src/MapFetcher";
import {
    EditMapCommandMessage,
    EmoteEventMessage,
    isMapDetailsData,
    JoinRoomMessage,
    MapBbbData,
    MapDetailsData,
    MapJitsiData,
    MapThirdPartyData,
    RefreshRoomMessage,
    ServerToClientMessage,
    SetPlayerDetailsMessage,
    SubToPusherRoomMessage,
    VariableWithTagMessage,
} from "@workadventure/messages";
import { Jitsi } from "@workadventure/shared-utils";
import { ITiledMap, ITiledMapProperty, Json } from "@workadventure/tiled-map-type-guard";
import {
    ADMIN_API_URL,
    BBB_SECRET,
    BBB_URL,
    ENABLE_CHAT,
    ENABLE_CHAT_UPLOAD,
    INTERNAL_MAP_STORAGE_URL,
    JITSI_ISS,
    JITSI_URL,
    PUBLIC_MAP_STORAGE_PREFIX,
    PUBLIC_MAP_STORAGE_URL,
    SECRET_JITSI_KEY,
    STORE_VARIABLES_FOR_LOCAL_MAPS,
} from "../Enum/EnvironmentVariable";
import { Admin } from "../Model/Admin";
import { Movable } from "../Model/Movable";
import { PositionInterface } from "../Model/PositionInterface";
import { ProtobufUtils } from "../Model/Websocket/ProtobufUtils";
import {
    EmoteCallback,
    EntersCallback,
    LeavesCallback,
    LockGroupCallback,
    MovesCallback,
    PlayerDetailsUpdatedCallback,
} from "../Model/Zone";
import { EventSocket, RoomSocket, VariableSocket, ZoneSocket } from "../RoomManager";
import { adminApi } from "../Services/AdminApi";
import { MapLoadingError } from "../Services/MapLoadingError";
import { getMapStorageClient } from "../Services/MapStorageClient";
import { emitError, emitErrorOnRoomSocket } from "../Services/MessageHelpers";
import { ModeratorTagFinder } from "../Services/ModeratorTagFinder";
import { VariableError } from "../Services/VariableError";
import { VariablesManager } from "../Services/VariablesManager";
import { BrothersFinder } from "./BrothersFinder";
import { Group } from "./Group";
import { PositionNotifier } from "./PositionNotifier";
import { User, UserSocket } from "./User";
import { PointInterface } from "./Websocket/PointInterface";

export type ConnectCallback = (user: User, group: Group) => void;
export type DisconnectCallback = (user: User, group: Group) => void;

export class GameRoom implements BrothersFinder {
    public readonly id: string;
    // Users, sorted by ID
    private readonly users = new Map<number, User>();
    private readonly usersByUuid = new Map<string, Set<User>>();
    private readonly groups: Map<number, Group> = new Map<number, Group>();
    private readonly admins = new Set<Admin>();

    private itemsState = new Map<number, unknown>();

    private readonly positionNotifier: PositionNotifier;
    private versionNumber = 1;
    private nextUserId = 1;

    private roomListeners: Set<RoomSocket> = new Set<RoomSocket>();
    private variableListeners: Map<string, Set<VariableSocket>> = new Map<string, Set<VariableSocket>>();
    // The key is the event name
    private eventListeners: Map<string, Set<EventSocket>> = new Map<string, Set<EventSocket>>();

    private constructor(
        public readonly _roomUrl: string,
        private _roomGroup: string | null,
        private readonly connectCallback: ConnectCallback,
        private readonly disconnectCallback: DisconnectCallback,
        private readonly minDistance: number,
        private readonly groupRadius: number,
        onEnters: EntersCallback,
        onMoves: MovesCallback,
        onLeaves: LeavesCallback,
        onEmote: EmoteCallback,
        onLockGroup: LockGroupCallback,
        onPlayerDetailsUpdated: PlayerDetailsUpdatedCallback,
        private thirdParty: MapThirdPartyData | undefined,
        private editable: boolean,
        private _mapUrl: string,
        private _wamUrl?: string,
        private _wamSettings: WAMFileFormat["settings"] = {}
    ) {
        // uniq id for the room is timestamp
        this.id = Date.now().toString();

        // A zone is 10 sprites wide.
        this.positionNotifier = new PositionNotifier(
            320,
            320,
            onEnters,
            onMoves,
            onLeaves,
            onEmote,
            onLockGroup,
            onPlayerDetailsUpdated
        );
    }

    public static async create(
        roomUrl: string,
        connectCallback: ConnectCallback,
        disconnectCallback: DisconnectCallback,
        minDistance: number,
        groupRadius: number,
        onEnters: EntersCallback,
        onMoves: MovesCallback,
        onLeaves: LeavesCallback,
        onEmote: EmoteCallback,
        onLockGroup: LockGroupCallback,
        onPlayerDetailsUpdated: PlayerDetailsUpdatedCallback
    ): Promise<GameRoom> {
        const mapDetails = await GameRoom.getMapDetails(roomUrl);
        const wamUrl = mapDetails.wamUrl;

        let mapUrl: string;
        let wamFile: WAMFileFormat | undefined = undefined;

        if (!wamUrl && mapDetails.mapUrl) {
            mapUrl = mapDetails.mapUrl;
        } else if (wamUrl) {
            wamFile = await mapFetcher.fetchWamFile(wamUrl, INTERNAL_MAP_STORAGE_URL, PUBLIC_MAP_STORAGE_PREFIX);
            mapUrl = new URL(wamFile.mapUrl, wamUrl).toString();
        } else {
            throw new Error("No mapUrl or wamUrl");
        }

        const gameRoom = new GameRoom(
            roomUrl,
            mapDetails.group,
            connectCallback,
            disconnectCallback,
            minDistance,
            groupRadius,
            onEnters,
            onMoves,
            onLeaves,
            onEmote,
            onLockGroup,
            onPlayerDetailsUpdated,
            mapDetails.thirdParty ?? undefined,
            mapDetails.editable ?? false,
            mapUrl,
            wamUrl,
            wamFile ? wamFile.settings : undefined
        );

        return gameRoom;
    }

    public getUsers(): Map<number, User> {
        return this.users;
    }

    public dispatchRoomMessage(message: SubToPusherRoomMessage): void {
        // Dispatch the message on the room listeners
        for (const socket of this.roomListeners) {
            socket.write({
                payload: [message],
            });
        }
    }

    public sendRefreshRoomMessageToUsers(): void {
        this.users.forEach((user) =>
            user.socket.write({
                message: {
                    $case: "refreshRoomMessage",
                    refreshRoomMessage: RefreshRoomMessage.fromPartial({
                        roomId: this._roomUrl,
                        timeToRefresh: 30,
                    }),
                },
            })
        );
    }

    public getUserByUuid(uuid: string): User | undefined {
        const users = this.usersByUuid.get(uuid);
        if (users === undefined) {
            return undefined;
        }
        const [user] = users;
        return user;
    }

    public getUserById(id: number): User | undefined {
        return this.users.get(id);
    }

    public getUsersByUuid(uuid: string): Set<User> {
        return this.usersByUuid.get(uuid) ?? new Set();
    }

    public async join(socket: UserSocket, joinRoomMessage: JoinRoomMessage): Promise<User> {
        const positionMessage = joinRoomMessage.positionMessage;
        if (positionMessage === undefined) {
            throw new Error("Missing position message");
        }
        const position = ProtobufUtils.toPointInterface(positionMessage);

        this.nextUserId++;
        const user = await User.create(
            this.nextUserId,
            joinRoomMessage.userUuid,
            joinRoomMessage.isLogged,
            joinRoomMessage.IPAddress,
            position,
            this.positionNotifier,
            joinRoomMessage.availabilityStatus,
            socket,
            joinRoomMessage.tag,
            joinRoomMessage.canEdit,
            joinRoomMessage.visitCardUrl ?? null,
            joinRoomMessage.name,
            joinRoomMessage.characterTextures,
            this._roomUrl,
            this._roomGroup ?? undefined,
            this,
            joinRoomMessage.companionTexture,
            undefined,
            undefined,
            joinRoomMessage.activatedInviteUser,
            joinRoomMessage.applications,
            joinRoomMessage.chatID,
            undefined
        );
        this.users.set(user.id, user);
        let set = this.usersByUuid.get(user.uuid);
        if (set === undefined) {
            set = new Set<User>();
            this.usersByUuid.set(user.uuid, set);
        }
        set.add(user);
        this.updateUserGroup(user);

        // Notify admins
        for (const admin of this.admins) {
            admin.sendUserJoin(user.uuid, user.name, user.IPAddress);
        }

        return user;
    }

    public leave(user: User) {
        if (user.disconnected === true) {
            console.warn("User ", user.id, "already disconnected!");
            return;
        }
        user.disconnected = true;

        if (!this.users.has(user.id)) {
            console.warn("User ", user.id, "does not belong to this game room! It should!");
        }

        // If a user leaves the group, it cannot lead or follow anymore.
        if (user.hasFollowers()) {
            user.stopLeading();
        }
        if (user.following) {
            user.following.delFollower(user);
        }

        if (user.group !== undefined) {
            this.leaveGroup(user);
        }

        this.users.delete(user.id);
        const set = this.usersByUuid.get(user.uuid);
        if (set !== undefined) {
            set.delete(user);
            if (set.size === 0) {
                this.usersByUuid.delete(user.uuid);
            }
        }

        if (user !== undefined) {
            this.positionNotifier.leave(user);
        }

        // Notify admins
        for (const admin of this.admins) {
            admin.sendUserLeft(user.uuid /*, user.name, user.IPAddress*/);
        }
    }

    public isEmpty(): boolean {
        return (
            this.users.size === 0 &&
            this.admins.size === 0 &&
            this.roomListeners.size === 0 &&
            this.variableListeners.size === 0 &&
            this.eventListeners.size === 0
        );
    }

    public updatePosition(user: User, userPosition: PointInterface): void {
        user.setPosition(userPosition);

        this.updateUserGroup(user);
    }

    updatePlayerDetails(user: User, playerDetailsMessage: SetPlayerDetailsMessage) {
        user.updateDetails(playerDetailsMessage);
        if (user.group !== undefined && user.silent) {
            this.leaveGroup(user);
        }
    }

    private updateUserGroup(user: User): void {
        if (user.silent) {
            return;
        }

        const group = user.group;
        const closestItem: User | Group | null = this.searchClosestAvailableUserOrGroup(user);

        if (group === undefined) {
            // If the user is not part of a group:
            //  should he join a group?

            // If the user is moving, don't try to join
            if (user.getPosition().moving) {
                return;
            }

            if (closestItem !== null) {
                if (closestItem instanceof Group) {
                    // Let's join the group!
                    closestItem.join(user);
                    closestItem.setOutOfBounds(false);
                } else {
                    const closestUser: User = closestItem;
                    const group: Group = new Group(
                        this._roomUrl,
                        [user, closestUser],
                        this.groupRadius,
                        this.connectCallback,
                        this.disconnectCallback,
                        this.positionNotifier
                    );
                    this.groups.set(group.getId(), group);
                }
            }
        } else {
            let hasKickOutSomeone = false;
            let followingMembers: User[] = [];

            const previewNewGroupPosition = group.previewGroupPosition();

            if (!previewNewGroupPosition) {
                this.leaveGroup(user);
                return;
            }

            if (user.hasFollowers() || user.following) {
                followingMembers = user.hasFollowers()
                    ? group.getUsers().filter((currentUser) => currentUser.following === user)
                    : group.getUsers().filter((currentUser) => currentUser.following === user.following);

                // If all group members are part of the same follow group
                if (group.getUsers().length - 1 === followingMembers.length) {
                    let isOutOfBounds = false;

                    // If a follower is far away from the leader, "outOfBounds" is set to true
                    for (const member of followingMembers) {
                        const distance = GameRoom.computeDistanceBetweenPositions(
                            member.getPosition(),
                            previewNewGroupPosition
                        );

                        if (distance > this.groupRadius) {
                            isOutOfBounds = true;
                            break;
                        }
                    }
                    group.setOutOfBounds(isOutOfBounds);
                }
            }

            // Check if the moving user has kicked out another user
            for (const headMember of group.getGroupHeads()) {
                if (!headMember.group) {
                    this.leaveGroup(headMember);
                    continue;
                }

                const headPosition = headMember.getPosition();
                const distance = GameRoom.computeDistanceBetweenPositions(headPosition, previewNewGroupPosition);

                if (distance > this.groupRadius) {
                    hasKickOutSomeone = true;
                    break;
                }
            }

            /**
             * If the current moving user has kicked another user from the radius,
             * the moving user leaves the group because he is too far away.
             */
            const userDistance = GameRoom.computeDistanceBetweenPositions(user.getPosition(), previewNewGroupPosition);

            if (hasKickOutSomeone && userDistance > this.groupRadius) {
                if (user.hasFollowers() && group.getUsers().length === 3 && followingMembers.length === 1) {
                    const other = group
                        .getUsers()
                        .find((currentUser) => !currentUser.hasFollowers() && !currentUser.following);
                    if (other) {
                        this.leaveGroup(other);
                    }
                } else if (user.hasFollowers()) {
                    this.leaveGroup(user);
                    for (const member of followingMembers) {
                        this.leaveGroup(member);
                    }

                    // Re-create a group with the followers
                    const newGroup: Group = new Group(
                        this._roomUrl,
                        [user, ...followingMembers],
                        this.groupRadius,
                        this.connectCallback,
                        this.disconnectCallback,
                        this.positionNotifier
                    );
                    this.groups.set(newGroup.getId(), newGroup);
                } else {
                    this.leaveGroup(user);
                }
            }
        }

        user.group?.updatePosition();
        user.group?.searchForNearbyUsers();
    }

    public sendToOthersInGroupIncludingUser(user: User, message: ServerToClientMessage): void {
        user.group?.getUsers().forEach((currentUser: User) => {
            if (currentUser.id !== user.id) {
                currentUser.socket.write(message);
            }
        });
    }

    /**
     * Makes a user leave a group and closes and destroy the group if the group contains only one remaining person.
     *
     * @param user
     */
    private leaveGroup(user: User): void {
        const group = user.group;
        if (group === undefined) {
            throw new Error("The user is part of no group");
        }

        group.leave(user);
        if (group.isEmpty()) {
            group.destroy();
            if (!this.groups.has(group.getId())) {
                throw new Error(`Could not find group ${group.getId()} referenced by user ${user.id} in World.`);
            }
            this.groups.delete(group.getId());
            //todo: is the group garbage collected?
        } else {
            group.updatePosition();
            //this.positionNotifier.updatePosition(group, group.getPosition(), oldPosition);
        }
    }

    /**
     * Looks for the closest user that is:
     * - close enough (distance <= minDistance)
     * - not in a group
     * - not silent
     * OR
     * - close enough to a group (distance <= groupRadius)
     */
    private searchClosestAvailableUserOrGroup(user: User): User | Group | null {
        let minimumDistanceFound: number = Math.max(this.minDistance, this.groupRadius);
        let matchingItem: User | Group | null = null;
        this.users.forEach((currentUser) => {
            // Let's only check users that are not part of a group
            if (typeof currentUser.group !== "undefined") {
                return;
            }
            if (currentUser === user) {
                return;
            }
            if (currentUser.silent) {
                return;
            }

            const distance = GameRoom.computeDistance(user, currentUser); // compute distance between peers.

            if (distance <= minimumDistanceFound && distance <= this.minDistance) {
                minimumDistanceFound = distance;
                matchingItem = currentUser;
            }
        });

        this.groups.forEach((group: Group) => {
            if (group.isFull() || group.isLocked()) {
                return;
            }
            const distance = GameRoom.computeDistanceBetweenPositions(user.getPosition(), group.getPosition());
            if (distance <= minimumDistanceFound && distance <= this.groupRadius) {
                minimumDistanceFound = distance;
                matchingItem = group;
            }
        });

        return matchingItem;
    }

    public static computeDistance(user1: User, user2: User): number {
        const user1Position = user1.getPosition();
        const user2Position = user2.getPosition();
        return Math.sqrt(
            Math.pow(user2Position.x - user1Position.x, 2) + Math.pow(user2Position.y - user1Position.y, 2)
        );
    }

    public static computeDistanceBetweenPositions(position1: PositionInterface, position2: PositionInterface): number {
        return Math.sqrt(Math.pow(position2.x - position1.x, 2) + Math.pow(position2.y - position1.y, 2));
    }

    public setItemState(itemId: number, state: unknown) {
        this.itemsState.set(itemId, state);
    }

    public getItemsState(): Map<number, unknown> {
        return this.itemsState;
    }

    public async setVariable(name: string, value: string, user: User | "RoomApi"): Promise<void> {
        // First, let's check if "user" is allowed to modify the variable.
        const variableManager = await this.getVariableManager();

        try {
            const readableBy = variableManager.setVariable(name, value, user);

            // If the variable was not changed, let's not dispatch anything.
            if (readableBy === false) {
                return;
            }

            // TODO: should we batch those every 100ms?
            const variableMessage: Partial<VariableWithTagMessage> = {
                name,
                value,
            };
            if (readableBy) {
                variableMessage.readableBy = readableBy;
            }

            // Dispatch the message on the room listeners
            this.sendSubMessageToRoom({
                message: {
                    $case: "variableMessage",
                    variableMessage: VariableWithTagMessage.fromPartial(variableMessage),
                },
            });

            // Dispatch the variable update to variable listeners
            const listeners = this.variableListeners.get(name);
            for (const listener of listeners ?? []) {
                listener.write(JSON.parse(value));
            }
        } catch (e) {
            if (e instanceof VariableError) {
                // Ok, we have an error setting a variable. Either the user is trying to hack the map... or the map
                // is not up-to-date. So let's try to reload the map from scratch.
                if (this.variableManagerLastLoad === undefined) {
                    throw e;
                }
                const lastLoaded = new Date().getTime() - this.variableManagerLastLoad.getTime();
                if (lastLoaded < 10000) {
                    console.log(
                        'An error occurred while setting the "' +
                            name +
                            "\" variable. But we tried to reload the map less than 10 seconds ago, so let's fail."
                    );
                    // Do not try to reload if we tried to reload less than 10 seconds ago.
                    throw e;
                }

                // Reset the variable manager
                this.variableManagerPromise = undefined;
                this.mapPromise = undefined;

                console.log(
                    'An error occurred while setting the "' + name + "\" variable. Let's reload the map and try again"
                );
                // Try to set the variable again!
                await this.setVariable(name, value, user);
            } else {
                throw e;
            }
        }
    }

    public addZoneListener(call: ZoneSocket, x: number, y: number): Set<Movable> {
        return this.positionNotifier.addZoneListener(call, x, y);
    }

    public removeZoneListener(call: ZoneSocket, x: number, y: number): void {
        return this.positionNotifier.removeZoneListener(call, x, y);
    }

    public adminJoin(admin: Admin): void {
        this.admins.add(admin);

        // Let's send all connected users
        for (const user of this.users.values()) {
            admin.sendUserJoin(user.uuid, user.name, user.IPAddress);
        }
    }

    public adminLeave(admin: Admin): void {
        this.admins.delete(admin);
    }

    public async incrementVersion(): Promise<number> {
        // Let's check if the mapUrl has changed
        const mapDetails = await GameRoom.getMapDetails(this._roomUrl);
        const mapUrl = await mapFetcher.getMapUrl(
            mapDetails.mapUrl,
            mapDetails.wamUrl,
            INTERNAL_MAP_STORAGE_URL,
            PUBLIC_MAP_STORAGE_PREFIX
        );
        if (this._mapUrl !== mapUrl) {
            this._mapUrl = mapUrl;
            this.mapPromise = undefined;
            // Reset the variable manager
            this.variableManagerPromise = undefined;
        }

        this.versionNumber++;
        return this.versionNumber;
    }

    public emitEmoteEvent(user: User, emoteEventMessage: EmoteEventMessage) {
        this.positionNotifier.emitEmoteEvent(user, emoteEventMessage);
    }

    public emitLockGroupEvent(user: User, groupId: number) {
        this.positionNotifier.emitLockGroupEvent(user, groupId);
    }

    public addRoomListener(socket: RoomSocket) {
        this.roomListeners.add(socket);
    }

    public removeRoomListener(socket: RoomSocket) {
        this.roomListeners.delete(socket);
    }

    public addVariableListener(socket: VariableSocket) {
        let listenersSet = this.variableListeners.get(socket.request.name);
        if (!listenersSet) {
            listenersSet = new Set<VariableSocket>();
            this.variableListeners.set(socket.request.name, listenersSet);
        }
        listenersSet.add(socket);
    }

    public removeVariableListener(socket: VariableSocket) {
        let listenersSet = this.variableListeners.get(socket.request.name);
        if (!listenersSet) {
            listenersSet = new Set<VariableSocket>();
            this.variableListeners.set(socket.request.name, listenersSet);
        }
        listenersSet.add(socket);
    }

    public addEventListener(socket: EventSocket) {
        let listenersSet = this.eventListeners.get(socket.request.name);
        if (!listenersSet) {
            listenersSet = new Set<EventSocket>();
            this.eventListeners.set(socket.request.name, listenersSet);
        }
        listenersSet.add(socket);
    }

    public removeEventListener(socket: EventSocket) {
        const listenersSet = this.eventListeners.get(socket.request.name);
        if (listenersSet) {
            listenersSet.delete(socket);
            if (listenersSet.size === 0) {
                this.eventListeners.delete(socket.request.name);
            }
        }
    }

    /**
     * Connects to the admin server to fetch map details.
     * If there is no admin server, the map details are generated by analysing the map URL (that must be in the form: /_/instance/map_url)
     */
    private static async getMapDetails(roomUrl: string): Promise<MapDetailsData> {
        if (!ADMIN_API_URL) {
            const roomUrlObj = new URL(roomUrl);

            let mapUrl = undefined;
            let wamUrl = undefined;
            let canEdit = false;
            const match = /\/~\/(.+)/.exec(roomUrlObj.pathname);
            if (match && PUBLIC_MAP_STORAGE_URL) {
                if (path.extname(roomUrlObj.pathname) === ".tmj") {
                    mapUrl = `${PUBLIC_MAP_STORAGE_URL}/${match[1]}`;
                } else {
                    wamUrl = `${PUBLIC_MAP_STORAGE_URL}/${match[1]}`;
                }
                canEdit = true;
            } else {
                const match = /\/_\/[^/]+\/(.+)/.exec(roomUrlObj.pathname);
                if (!match) {
                    console.error("Unexpected room URL", roomUrl);
                    Sentry.captureException(`Unexpected room URL ${roomUrl}`);
                    throw new Error('Unexpected room URL "' + roomUrl + '"');
                }

                mapUrl = roomUrlObj.protocol + "//" + match[1];
            }
            return {
                mapUrl,
                wamUrl,
                editable: canEdit,
                authenticationMandatory: null,
                group: null,
                showPoweredBy: true,
                enableChat: ENABLE_CHAT,
                enableChatUpload: ENABLE_CHAT_UPLOAD,
            };
        }

        const result = isMapDetailsData.safeParse(await adminApi.fetchMapDetails(roomUrl));

        if (result.success) {
            return result.data;
        }

        console.error(result.error.issues);
        console.error("Unexpected room redirect or error received while querying map details", result);
        Sentry.captureException(result.error.issues);
        Sentry.captureException(
            `Unexpected room redirect or error received while querying map details ${JSON.stringify(result)}`
        );
        throw new Error("Unexpected room redirect received or error while querying map details");
    }

    private mapPromise: Promise<ITiledMap> | undefined;

    /**
     * Returns a promise to the map file.
     * @throws LocalUrlError if the map we are trying to load is hosted on a local network
     * @throws Error
     */
    private getMap(canLoadLocalUrl = false): Promise<ITiledMap> {
        if (!this.mapPromise) {
            this.mapPromise = mapFetcher.fetchMap(
                this._mapUrl,
                this._wamUrl,
                canLoadLocalUrl,
                STORE_VARIABLES_FOR_LOCAL_MAPS,
                INTERNAL_MAP_STORAGE_URL,
                PUBLIC_MAP_STORAGE_PREFIX
            );
        }

        return this.mapPromise;
    }

    private wamPromise: Promise<WAMFileFormat> | undefined;

    /**
     * Returns a promise to the WAM file.
     * @throws LocalUrlError if the map we are trying to load is hosted on a local network
     * @throws Error
     */
    private getWam(): Promise<WAMFileFormat | undefined> {
        if (!this._wamUrl) return Promise.resolve(undefined);
        if (!this.wamPromise) {
            this.wamPromise = mapFetcher.fetchWamFile(
                this._wamUrl,
                INTERNAL_MAP_STORAGE_URL,
                PUBLIC_MAP_STORAGE_PREFIX
            );
        }
        return this.wamPromise;
    }

    private variableManagerPromise: Promise<VariablesManager> | undefined;
    private variableManagerLastLoad: Date | undefined;

    private getVariableManager(): Promise<VariablesManager> {
        if (!this.variableManagerPromise) {
            this.variableManagerLastLoad = new Date();
            this.variableManagerPromise = this.getMap()
                .then(async (map) => {
                    const variablesManager = await VariablesManager.create(this._roomUrl, map);
                    return variablesManager.init();
                })
                .catch(async (e) => {
                    if (e instanceof LocalUrlError) {
                        // If we are trying to load a local URL, we are probably in test mode.
                        // In this case, let's bypass the server-side checks completely.

                        // Note: we run this message inside a setTimeout so that the room listeners can have time to connect.
                        setTimeout(() => {
                            for (const roomListener of this.roomListeners) {
                                emitErrorOnRoomSocket(
                                    roomListener,
                                    "You are loading a local map. If you use the scripting API in this map, please be aware that server-side checks and variable persistence is disabled."
                                );
                            }
                        }, 1000);

                        const variablesManager = await VariablesManager.create(this._roomUrl, null);
                        return variablesManager.init();
                    } else {
                        // An error occurred while loading the map
                        // Right now, let's bypass the error. In the future, we should make sure the user is aware of that
                        // and that he/she will act on it to fix the problem.

                        // Note: we run this message inside a setTimeout so that the room listeners can have time to connect.
                        setTimeout(() => {
                            for (const roomListener of this.roomListeners) {
                                emitErrorOnRoomSocket(
                                    roomListener,
                                    "Your map does not seem accessible from the WorkAdventure servers. Is it behind a firewall or a proxy? Your map should be accessible from the WorkAdventure servers. If you use the scripting API in this map, please be aware that server-side checks and variable persistence is disabled."
                                );
                            }
                        }, 1000);

                        const variablesManager = await VariablesManager.create(this._roomUrl, null);
                        return variablesManager.init();
                    }
                });
        }
        return this.variableManagerPromise;
    }

    public async getVariablesForTags(tags: string[] | undefined): Promise<Map<string, string>> {
        const variablesManager = await this.getVariableManager();
        return variablesManager.getVariablesForTags(tags);
    }

    public getGroupById(id: number): Group | undefined {
        return this.groups.get(id);
    }

    private jitsiModeratorTagFinderPromise: Promise<ModeratorTagFinder> | undefined;

    /**
     * Returns the moderator tag associated with jitsiRoom
     */
    public async getModeratorTagForJitsiRoom(jitsiRoom: string): Promise<string | undefined> {
        if (this.jitsiModeratorTagFinderPromise === undefined) {
            this.jitsiModeratorTagFinderPromise = Promise.all([this.getMap(), this.getWam()])
                .then(([map, wam]) => {
                    return new ModeratorTagFinder(
                        map,
                        (properties: ITiledMapProperty[]): { mainValue: string; tagValue: string } | undefined => {
                            // We need to detect the "jitsiRoom" and "jitsiRoomAdminTag" properties AND to slugify the "jitsiRoom" in the same way
                            // as we do on the front.
                            let mainValue: string | undefined = undefined;
                            let tagValue: string | undefined = undefined;
                            for (const property of properties ?? []) {
                                if (property.name === "jitsiRoom" && typeof property.value === "string") {
                                    mainValue = property.value;
                                } else if (
                                    property.name === "jitsiRoomAdminTag" &&
                                    typeof property.value === "string"
                                ) {
                                    tagValue = property.value;
                                }
                            }
                            if (mainValue !== undefined && tagValue !== undefined) {
                                // Compute allprops (needed for utility function)
                                const allProps = new Map<string, string | number | boolean | Json>();
                                for (const property of properties ?? []) {
                                    if (property.value !== undefined) {
                                        allProps.set(property.name, property.value);
                                    }
                                }
                                return {
                                    mainValue: Jitsi.slugifyJitsiRoomName(
                                        mainValue,
                                        this._roomUrl,
                                        allProps.has(GameMapProperties.JITSI_NO_PREFIX)
                                    ),
                                    tagValue,
                                };
                            }
                            return undefined;
                        },
                        this._roomUrl,
                        wam
                    );
                })
                .catch((e) => {
                    if (e instanceof LocalUrlError) {
                        // If we are trying to load a local URL, we are probably in test mode.
                        // In this case, let's bypass the server-side checks completely.

                        for (const roomListener of this.roomListeners) {
                            emitErrorOnRoomSocket(
                                roomListener,
                                "You are loading a local map. The 'jitsiRoomAdminTag' property cannot be read from local maps."
                            );
                        }
                    } else {
                        // An error occurred while loading the map
                        // Right now, let's bypass the error. In the future, we should make sure the user is aware of that
                        // and that he/she will act on it to fix the problem.

                        for (const roomListener of this.roomListeners) {
                            emitErrorOnRoomSocket(
                                roomListener,
                                "Your map does not seem accessible from the WorkAdventure servers. Is it behind a firewall or a proxy? Your map should be accessible from the WorkAdventure servers. The 'jitsiRoomAdminTag' property cannot be read from local maps."
                            );
                        }
                    }
                    throw new MapLoadingError(
                        e instanceof Error ? e.message : typeof e === "string" ? e : "unknown_error"
                    );
                });
        }

        try {
            const jitsiModeratorTagFinder = await this.jitsiModeratorTagFinderPromise;
            return jitsiModeratorTagFinder.getModeratorTag(jitsiRoom);
        } catch (e) {
            console.warn("Could not access map file.", e);
            if (e instanceof MapLoadingError) {
                return undefined;
            }
            throw e;
        }
    }

    private bbbModeratorTagFinderPromise: Promise<ModeratorTagFinder> | undefined;

    /**
     * Returns the moderator tag associated with bbbMeeting
     */
    public async getModeratorTagForBbbMeeting(bbbRoom: string): Promise<string | undefined> {
        if (this.bbbModeratorTagFinderPromise === undefined) {
            this.bbbModeratorTagFinderPromise = this.getMap()
                .then((map) => {
                    return new ModeratorTagFinder(
                        map,
                        (properties: ITiledMapProperty[]): { mainValue: string; tagValue: string } | undefined => {
                            let mainValue: string | undefined = undefined;
                            let tagValue: string | undefined = undefined;
                            for (const property of properties ?? []) {
                                if (property.name === "bbbMeeting" && typeof property.value === "string") {
                                    mainValue = property.value;
                                } else if (
                                    property.name === "bbbMeetingAdminTag" &&
                                    typeof property.value === "string"
                                ) {
                                    tagValue = property.value;
                                }
                            }
                            if (mainValue !== undefined && tagValue !== undefined) {
                                return {
                                    mainValue,
                                    tagValue,
                                };
                            }
                            return undefined;
                        }
                    );
                })
                .catch((e) => {
                    if (e instanceof LocalUrlError) {
                        // If we are trying to load a local URL, we are probably in test mode.
                        // In this case, let's bypass the server-side checks completely.

                        for (const roomListener of this.roomListeners) {
                            emitErrorOnRoomSocket(
                                roomListener,
                                "You are loading a local map. The 'bbbMeetingAdminTag' property cannot be read from local maps."
                            );
                        }
                    } else {
                        // An error occurred while loading the map
                        // Right now, let's bypass the error. In the future, we should make sure the user is aware of that
                        // and that he/she will act on it to fix the problem.

                        for (const roomListener of this.roomListeners) {
                            emitErrorOnRoomSocket(
                                roomListener,
                                "Your map does not seem accessible from the WorkAdventure servers. Is it behind a firewall or a proxy? Your map should be accessible from the WorkAdventure servers. The 'bbbMeetingAdminTag' property cannot be read from local maps."
                            );
                        }
                    }
                    throw new MapLoadingError(
                        e instanceof Error ? e.message : typeof e === "string" ? e : "unknown_error"
                    );
                });
        }

        try {
            const bbbModeratorTagFinder = await this.bbbModeratorTagFinderPromise;
            return bbbModeratorTagFinder.getModeratorTag(bbbRoom);
        } catch (e) {
            console.warn("Could not access map file.", e);
            if (e instanceof MapLoadingError) {
                return undefined;
            }
            throw e;
        }
    }

    public getJitsiSettings(): MapJitsiData | undefined {
        const jitsi = this.thirdParty?.jitsi;

        if (jitsi) {
            return jitsi;
        }
        if (JITSI_URL) {
            return {
                url: JITSI_URL,
                iss: JITSI_ISS,
                secret: SECRET_JITSI_KEY,
            };
        }
        return undefined;
    }

    public getBbbSettings(): MapBbbData | undefined {
        const bbb = this.thirdParty?.bbb;
        if (bbb) {
            return bbb;
        }
        if (BBB_URL && BBB_SECRET) {
            return {
                url: BBB_URL,
                secret: BBB_SECRET,
            };
        }
        return undefined;
    }

    /**
     * Returns the list of users in this room that share the same UUID
     */
    public getBrothers(user: User): Array<User> {
        const family = this.usersByUuid.get(user.uuid);
        if (family === undefined) {
            return [];
        }
        return [...family].filter((theUser) => theUser !== user);
    }

    public sendSubMessageToRoom(subMessage: SubToPusherRoomMessage) {
        // Dispatch the message on the room listeners
        for (const socket of this.roomListeners) {
            socket.write({
                payload: [subMessage],
            });
        }
    }

    forwardEditMapCommandMessage(user: User, message: EditMapCommandMessage) {
        if (!this._wamUrl) {
            emitError(user.socket, "WAM file url is undefined. Cannot edit map without WAM file.");
            return;
        }
        getMapStorageClient().handleEditMapCommandWithKeyMessage(
            {
                mapKey: this._wamUrl,
                editMapCommandMessage: message,
                connectedUserTags: user.tags,
                userCanEdit: user.canEdit,
                userUUID: user.uuid,
            },
            (err: unknown, editMapCommandMessage: EditMapCommandMessage) => {
                if (err) {
                    let message = "Unknown error";
                    if (err instanceof Error) {
                        message = err.message;
                    } else if (typeof err === "string") {
                        message = err;
                    }
                    emitError(user.socket, message);
                    return;
                }
                if (editMapCommandMessage.editMapMessage?.message?.$case === "errorCommandMessage") {
                    // Return the error message to the sender and don't dispatch it to the room
                    user.socket.write({
                        message: {
                            $case: "batchMessage",
                            batchMessage: {
                                event: "",
                                payload: [
                                    {
                                        message: {
                                            $case: "editMapCommandMessage",
                                            editMapCommandMessage,
                                        },
                                    },
                                ],
                            },
                        },
                    });
                    return;
                }
                if (editMapCommandMessage.editMapMessage?.message?.$case === "updateWAMSettingsMessage") {
                    if (!this._wamSettings) {
                        this._wamSettings = {};
                    }
                    if (
                        editMapCommandMessage.editMapMessage.message.updateWAMSettingsMessage.message?.$case ===
                        "updateMegaphoneSettingMessage"
                    ) {
                        this._wamSettings.megaphone =
                            editMapCommandMessage.editMapMessage.message.updateWAMSettingsMessage.message.updateMegaphoneSettingMessage;
                    }
                }
                if (editMapCommandMessage.editMapMessage?.message?.$case === "modifyAreaMessage") {
                    // If the area is modified, we need to reset the WAM and the moderator tag finder.
                    // So that the next call to getModeratorTagForJitsiRoom will reload the map and the WAM.
                    // We also check if the settings like jitsi admin tag have been modified.
                    // IMPROVE ME: We could imagine directly updating the jitsi admin tag in the finder moderator tag and don't have useless reloads or calls to get the WAM file.
                    this.wamPromise = undefined;
                    this.jitsiModeratorTagFinderPromise = undefined;
                }
                if (editMapCommandMessage.editMapMessage?.message?.$case === "modifyEntityMessage") {
                    // If the area is modified, we need to reset the WAM and the moderator tag finder.
                    // So that the next call to getModeratorTagForJitsiRoom will reload the map and the WAM.
                    // We also check if the settings like jitsi admin tag have been modified.
                    // IMPROVE ME: We could imagine directly updating the jitsi admin tag in the finder moderator tag and don't have useless reloads or calls to get the WAM file.
                    this.wamPromise = undefined;
                    this.jitsiModeratorTagFinderPromise = undefined;
                }
                this.dispatchRoomMessage({
                    message: {
                        $case: "editMapCommandMessage",
                        editMapCommandMessage,
                    },
                });
            }
        );
    }

    public dispatchEvent(name: string, data: unknown, senderId: number | "RoomApi", targetUserIds: number[]): void {
        if (targetUserIds.length === 0) {
            // Dispatch to all users
            this.sendSubMessageToRoom({
                message: {
                    $case: "receivedEventMessage",
                    receivedEventMessage: {
                        name,
                        data,
                        senderId: senderId === "RoomApi" ? undefined : senderId,
                    },
                },
            });

            // Dispatch to RoomApi listeners
            const listeners = this.eventListeners.get(name);
            for (const eventListener of listeners ?? []) {
                eventListener.write({
                    senderId: senderId === "RoomApi" ? undefined : senderId,
                    data,
                });
            }
        } else {
            for (const targetUserId of targetUserIds) {
                const targetUser = this.getUserById(targetUserId);
                if (targetUser) {
                    targetUser.emitInBatch({
                        message: {
                            $case: "receivedEventMessage",
                            receivedEventMessage: {
                                name,
                                data,
                                senderId: senderId === "RoomApi" ? undefined : senderId,
                            },
                        },
                    });
                }
            }
        }
    }

    get mapUrl(): string {
        return this._mapUrl;
    }

    get wamUrl(): string | undefined {
        return this._wamUrl;
    }

    get roomUrl(): string {
        return this._roomUrl;
    }

    get roomGroup(): string | null {
        return this._roomGroup;
    }

    get wamSettings(): WAMFileFormat["settings"] {
        return this._wamSettings;
    }
}
