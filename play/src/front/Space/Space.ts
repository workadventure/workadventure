import { SpaceInterface } from "./SpaceInterface";
import { SpaceFilterAlreadyExistError, SpaceFilterDoesNotExistError, SpaceNameIsEmptyError } from "./Errors/SpaceError";
import { SpaceFilter, SpaceFilterInterface } from "./SpaceFilter/SpaceFilter";
import { SpaceEventEmitterInterface, SpaceFilterEventEmitterInterface } from "./SpaceEventEmitter/SpaceEventEmitterInterface";
import { AllSapceEventEmitter } from "./SpaceProvider/SpaceStore";


export const WORLD_SPACE_NAME = "allWorldUser";


export class Space implements SpaceInterface {
    private name: string;
    private spaceFilterEventEmitter: SpaceFilterEventEmitterInterface | undefined= undefined;
    private spaceEventEmitter: SpaceEventEmitterInterface | undefined = undefined;

    constructor(
        name: string,
        private metadata = new Map<string, unknown>(),
        private allSpaceEventEmitter: AllSapceEventEmitter | undefined = undefined,
        private filters: Map<string, SpaceFilterInterface> = new Map<string, SpaceFilterInterface>(),

    ) {
        if (name === "") throw new SpaceNameIsEmptyError();
        this.name = name;

        if(!allSpaceEventEmitter)return; 
        const {
            userJoinSpace ,
            userLeaveSpace,
            updateSpaceMetadata,
            addSpaceFilter,
            removeSpaceFilter,
            updateSpaceFilter,
            emitJitsiParticipantId,
            emitKickOffUserMessage,
            emitMuteEveryBodySpace,
            emitMuteParticipantIdSpace,
            emitMuteVideoEveryBodySpace,
            emitMuteVideoParticipantIdSpace
        } = allSpaceEventEmitter;

        this.spaceEventEmitter = {
            userJoinSpace,
            userLeaveSpace,
            updateSpaceMetadata,
            emitJitsiParticipantId
        };
        this.spaceFilterEventEmitter = {
            addSpaceFilter,
            removeSpaceFilter,
            updateSpaceFilter,
            emitKickOffUserMessage,
            emitMuteEveryBodySpace,
            emitMuteParticipantIdSpace,
            emitMuteVideoEveryBodySpace,
            emitMuteVideoParticipantIdSpace
        };

        if (this.spaceEventEmitter) this.spaceEventEmitter?.userJoinSpace(this.name);
    }

    emitJitsiParticipantId(participantId: string): void {
        this.spaceEventEmitter?.emitJitsiParticipantId(this.name,participantId)
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
        const newFilter: SpaceFilterInterface = new SpaceFilter(filterName, this.name,undefined,this.spaceFilterEventEmitter);
        this.filters.set(newFilter.getName(), newFilter);
        return newFilter;
    }
    getAllSpacesFilter(): SpaceFilterInterface[] {
        return Array.from(this.filters.values());
    }

    getSpaceFilter(filterName: string): SpaceFilterInterface {
        if (this.filters.has(filterName)) return this.filters.get(filterName);
        return undefined;
    }

    stopWatching(filterName: string) {
        if (!this.filters.has(filterName)) throw new SpaceFilterDoesNotExistError(this.name, filterName);
        const filter: SpaceFilterInterface = this.filters.get(filterName);
        filter.destroy();
        this.filters.delete(filterName);
    }

    destroy() {
        if (this.spaceEventEmitter) this.spaceEventEmitter.userLeaveSpace(this.name);
    }
}
