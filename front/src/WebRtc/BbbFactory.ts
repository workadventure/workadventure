import {mediaManager} from "./MediaManager";
import {coWebsiteManager} from "./CoWebsiteManager";
declare const window:any; // eslint-disable-line @typescript-eslint/no-explicit-any

class BbbFactory {
    public start(roomName: string, playerName:string, url: string): void {
        console.log(`BbbFactory.start(): ${url}`);
    }

    public async stop(): Promise<void> {
        console.log("BbbFactory.stop()");
        await Promise.resolve();
    }

}

export const bbbFactory = new BbbFactory();
