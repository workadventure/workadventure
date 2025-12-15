import { FilterType } from "@workadventure/messages";
import * as Sentry from "@sentry/svelte";
import type { SpaceInterface } from "../SpaceInterface";
import type { SpaceRegistryInterface } from "../SpaceRegistry/SpaceRegistryInterface";
import { iframeListener } from "../../Api/IframeListener";
import { SpaceScriptingBridge } from "./SpaceScriptingBridge";

export class SpaceScriptingBridgeService {
    // Number of times a space is being joined from (different) iframes
    private spaceJoinedCounter = new Map<
        string,
        {
            counter: number;
            abortController: AbortController;
        }
    >();
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
                const counterObj = this.spaceJoinedCounter.get(data.spaceName);
                this.spaceJoinedCounter.set(data.spaceName, {
                    counter: (counterObj?.counter ?? 0) + 1,
                    abortController: counterObj?.abortController ?? new AbortController(),
                });
            } else {
                const abortController = new AbortController();
                space = await spaceRegistry.joinSpace(
                    data.spaceName,
                    this.getFilterType(data.filterType),
                    data.propertiesToSync,
                    abortController.signal
                );
                this.spaceJoinedCounter.set(data.spaceName, {
                    counter: 1,
                    abortController,
                });
            }

            const decreaseCounter = () => {
                const countObj = this.spaceJoinedCounter.get(data.spaceName);
                if (!countObj) {
                    throw new Error(`Space ${data.spaceName} is not joined, this should not happen`);
                }
                const count = countObj.counter - 1;
                this.spaceJoinedCounter.set(data.spaceName, {
                    counter: count,
                    abortController: countObj.abortController,
                });
                if (count === 0) {
                    spaceRegistry.leaveSpace(space).catch((e) => {
                        console.error("Error while leaving space", e);
                        Sentry.captureException(e);
                    });
                    this.spaceJoinedCounter.delete(data.spaceName);
                    countObj.abortController.abort();
                }
            };

            const portSubscription = port.closeEvent.subscribe(() => {
                decreaseCounter();
                portSubscription.unsubscribe();
            });

            const spaceScriptingBridge = new SpaceScriptingBridge(space, port, () => {
                this.spaceScriptingBridges.delete(spaceScriptingBridge);
                decreaseCounter();
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
