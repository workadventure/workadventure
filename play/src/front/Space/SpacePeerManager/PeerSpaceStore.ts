import {Writable, writable, get} from 'svelte/store';
import { SpaceInterface } from '../SpaceInterface';


function createPeerSpaceStore() {
    const peerSpace: Writable<SpaceInterface | undefined> = writable(undefined);
    return {
        peerSpaceSubscribe: peerSpace.subscribe,
        startRecording() {
            const peerSpaceInstance = get(peerSpace)
            if (peerSpace){
                peerSpaceInstance.();
            }
        }
    };
}

export const recordingStore = writable<SpaceInterface | undefined>(undefined);