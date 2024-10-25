import {MatrixChatConnection} from "../../Connection/Matrix/MatrixChatConnection";
import {Observable} from "rxjs";
import {get, Readable, Writable, writable} from "svelte/store";

export class AutoAcceptInvitation{
    private joinRoomObservable: Observable<string>
    public joinRoomPromise: Writable<Promise<void> | undefined>
    private joinRoomQueue: string[] = []
    constructor(private MatrixChatConnection: MatrixChatConnection) {
        this.joinRoomObservable = this.MatrixChatConnection.joinBotRoomStream;
        this.joinRoomPromise = writable(undefined)
        this.joinRoomObservable.subscribe(async (roomId) => {
            if (get(this.joinRoomPromise)) {
                this.joinRoomQueue.push(roomId)
               // await this.joinRoomPromise;
                return;
            }
            this.joinRoomPromise.set(this.joinRoom(roomId));

            console.log('>>>before subscribe await ')
            try{
                await get(this.joinRoomPromise);
            }catch (error) {
                console.error('Error while joining room', error)
            }

            console.log('>>>>after subscribe await ')
            this.joinRoomPromise.set(undefined);
        })
    }

    private async joinRoom(roomId: string):Promise<void> {
        try {
            await this.MatrixChatConnection.joinRoom(roomId)
        }catch (error){
            console.error('Error while joining room', error)
        }finally {
            const promise = new Promise<void>((resolve)=>{
            setTimeout(async () => {
                console.log('AutoAcceptInvitation: Room joined')
                const roomId = this.joinRoomQueue.pop()
                console.log('>>>>before joinRoom await ' , roomId)
                if(roomId) await  this.joinRoom(roomId)
                console.log('>>>>after joinRoom await ', roomId)
                //this.joinRoomPromise = undefined
                resolve();
            }, 0)
            })
            await promise;
        }
    }
}