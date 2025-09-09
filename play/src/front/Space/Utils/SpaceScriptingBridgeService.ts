import { FilterType } from "@workadventure/messages";
import * as Sentry from "@sentry/svelte";
import { SpaceInterface } from "../SpaceInterface";
import { SpaceRegistryInterface } from "../SpaceRegistry/SpaceRegistryInterface";
import { iframeListener } from "../../Api/IframeListener";
import { SpaceScriptingBridge } from "./SpaceScriptingBridge";

export class SpaceScriptingBridgeService {
    // Number of times a space is being joined from (different) iframes
    private spaceJoinedCounter = new Map<string, number>();
    private spaceScriptingBridges: Set<SpaceScriptingBridge> = new Set<SpaceScriptingBridge>();

    constructor(spaceRegistry: SpaceRegistryInterface) {
        iframeListener.registerOpenMessagePortAnswerer("joinSpace", async (data, port) => {
            let space: SpaceInterface;
            if (spaceRegistry.exist(data.spaceName)) {
                space = spaceRegistry.get(data.spaceName);
                if (space.filterType !== this.getFilterType(data.filterType)) {
                    throw new Error(
                        `Cannot join space ${data.spaceName} with filter type ${data.filterType}, expected ${space.filterType}`
                    );
                }
                this.spaceJoinedCounter.set(data.spaceName, (this.spaceJoinedCounter.get(data.spaceName) || 0) + 1);
            } else {
                space = await spaceRegistry.joinSpace(
                    data.spaceName,
                    this.getFilterType(data.filterType),
                    data.propertiesToSync
                );
                this.spaceJoinedCounter.set(data.spaceName, 1);
            }

            const spaceScriptingBridge = new SpaceScriptingBridge(space, port, () => {
                this.spaceScriptingBridges.delete(spaceScriptingBridge);
                let count = this.spaceJoinedCounter.get(data.spaceName);
                if (!count) {
                    throw new Error(`Space ${data.spaceName} is not joined, this should not happen`);
                }
                count -= 1;
                this.spaceJoinedCounter.set(data.spaceName, count);
                if (count === 0) {
                    spaceRegistry.leaveSpace(space).catch((e) => {
                        console.error("Error while leaving space", e);
                        Sentry.captureException(e);
                    });
                    this.spaceJoinedCounter.delete(data.spaceName);
                }
            });
            this.spaceScriptingBridges.add(spaceScriptingBridge);
        });
    }

    private getFilterType(filterTypeValue: "everyone" | "streaming"): FilterType {
        switch (filterTypeValue) {
            case "everyone":
                return FilterType.ALL_USERS;
            case "streaming":
                return FilterType.LIVE_STREAMING_USERS;
        }
    }

    public destroy(): void {
        iframeListener.unregisterOpenMessagePortAnswerer("joinSpace");
        for (const spaceScriptingBridge of this.spaceScriptingBridges.values()) {
            spaceScriptingBridge.leave();
        }
    }
}
