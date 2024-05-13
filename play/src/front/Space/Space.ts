import { ClientToServerMessage, SpaceFilterMessage, UnwatchSpaceMessage, UpdateSpaceMetadataMessage, WatchSpaceMessage } from "@workadventure/messages";
import { SpaceInterface } from "./SpaceInterface";
import { SpaceFilterAlreadyExistError, SpaceFilterDoesNotExistError, SpaceNameIsEmptyError } from "./Errors/SpaceError";
import { SpaceFilter, SpaceFilterInterface } from "./SpaceFilter/SpaceFilter";

export const WORLD_SPACE_NAME = "allWorldUser";
export const CONNECTED_USER_FILTER_NAME = 'connected_users';
export class Space implements SpaceInterface {
    private readonly name: string;

    constructor(
        name: string,
        private metadata = new Map<string, unknown>(),
        private socket : WebSocket | undefined = undefined,
        private encoder: {encode: (messageCoded: ClientToServerMessage) => {finish:()=>Uint8Array}},
        private filters: Map<string, SpaceFilterInterface> = new Map<string, SpaceFilterInterface>(),
      
    ) {
        if (name === "") throw new SpaceNameIsEmptyError();
        this.name = name;

        this.userJoinSpace();
    }

    getName(): string {
        return this.name;
    }
    getMetadata(): Map<string, unknown> {
        return this.metadata;
    }
    setMetadata(metadata: Map<string, unknown>): void {
        metadata.forEach((value, key) => {
            this.metadata.set(key, value);
        });
    }

    watch(filterName: string): SpaceFilterInterface {
        if (this.filters.has(filterName)) throw new SpaceFilterAlreadyExistError(this.name, filterName);
        const newFilter: SpaceFilterInterface = new SpaceFilter(
            filterName,
            this.name,
            undefined,
            (message : ClientToServerMessage)=>{this.send(message)}
        );
        this.filters.set(newFilter.getName(), newFilter);
        return newFilter;
    }
    getAllSpacesFilter(): SpaceFilterInterface[] {
        return Array.from(this.filters.values());
    }

    getSpaceFilter(filterName: string): SpaceFilterInterface {
        const spaceFilter = this.filters.get(filterName);
        if (!spaceFilter) {
            throw new Error("Something went wrong with filterName");
        }
        return spaceFilter;
    }

    spaceFilterExist(filterName:string) : boolean {
       return this.filters.has(filterName);
    }

    stopWatching(filterName: string) {
        const filter: SpaceFilterInterface | undefined = this.filters.get(filterName);
        if (!filter) throw new SpaceFilterDoesNotExistError(this.name, filterName);
        filter.destroy();
        this.filters.delete(filterName);
    }

    private userLeaveSpace(){
        this.send({
            message: {
                $case: "unwatchSpaceMessage",
                unwatchSpaceMessage: UnwatchSpaceMessage.fromPartial({
                    spaceName : this.name,
                }),
            },
        });
    }

    private userJoinSpace(){
        const spaceFilter: SpaceFilterMessage = {
            filterName: "",
            spaceName : this.name,
            filter: undefined,
        };
        this.send({
            message: {
                $case: "watchSpaceMessage",
                watchSpaceMessage: WatchSpaceMessage.fromPartial({
                    spaceName : this.name,
                    spaceFilter,
                }),
            },
        });
    
    }

    private updateSpaceMetadata(metadata: Map<string, unknown>){
        const metadataMap = Object.fromEntries(metadata);
        this.send({
            message: {
                $case: "updateSpaceMetadataMessage",
                updateSpaceMetadataMessage: UpdateSpaceMetadataMessage.fromPartial({
                    spaceName : this.name,
                    metadata: JSON.stringify(metadataMap),
                }),
            },
        });
    }

    emitJitsiParticipantId(participantId: string){
        this.send({
            message: {
                $case: "jitsiParticipantIdSpaceMessage",
                jitsiParticipantIdSpaceMessage: {
                    spaceName : this.name,
                    value: participantId,
                },
            },
        });
    }

    private send(message : ClientToServerMessage): void {
        const bytes = this.encoder.encode(message).finish();
        if(!this.socket)return;
        if (this.socket.readyState === WebSocket.CLOSING || this.socket.readyState === WebSocket.CLOSED) {
            console.warn("Trying to send a message to the server, but the connection is closed. Message: ", message);
            return;
        }

        this.socket.send(bytes);
    }

    destroy() {
        if (this.socket) this.userLeaveSpace();
    }
}
