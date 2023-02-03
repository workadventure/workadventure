import Olm from "@matrix-org/olm";
import sdk, {MatrixClient, MatrixError, MatrixEvent} from "matrix-js-sdk";
//import { CryptoEvent } from "matrix-js-sdk/src/crypto";
import { VerificationRequest } from "matrix-js-sdk/src/crypto/verification/request/VerificationRequest";
//import { VerificationRequest } from "matrix-js-sdk/src/crypto/verification/request/VerificationRequest";
import { logger } from 'matrix-js-sdk/src/logger';
import { ISasEvent } from "matrix-js-sdk/src/crypto/verification/SAS";

import { z } from "zod";
import {MATRIX_SERVER_URL} from "./Enum/EnvironmentVariable";
import { OlmDevice } from "matrix-js-sdk/src/crypto/OlmDevice";
import { SyncState } from "matrix-js-sdk/src/sync";

export const EmojiMapping = z.tuple([z.string(), z.string()]);
export const EmojiMappingArray = z.array(EmojiMapping);
export type EmojiMapping = z.infer<typeof EmojiMapping>;
export const NumberMappingArray = z.array(z.number());
export const MappingArray = z.union([EmojiMappingArray, NumberMappingArray]);

export class Matrix {
    private _client: MatrixClient | undefined;
    private _userId: string | undefined;
    private accessToken: string | undefined;
    private _deviceId: string | undefined;

    private _userPassword: string | undefined;

    private _roomId: string | undefined;
    constructor() {
        window.Olm = Olm;
        logger.setLevel(0);

        let userId = localStorage.getItem('mx_user_id');
        if(userId){
            this._userId = userId;
        }
        let accessToken = localStorage.getItem('mx_access_token');
        if(accessToken){
            this.accessToken = accessToken;
        }
        let deviceId = localStorage.getItem('mx_device_id');
        if(deviceId){
            this._deviceId = deviceId;
        }


        /*
        this.client = sdk.createClient({baseUrl: "https://matrix.workadventu.re"});

        this.client
            .publicRooms({filter: {generic_search_term: ""}, limit: 0, server: "", since: ""})
            .then(function (data) {
                console.warn("data %s [...]", JSON.stringify(data).substring(0, 100));
            })
            .catch(e => console.error(e));

        this.client.store.getRooms().forEach((room) => {
            room.timeline.forEach((t) => {
                console.log(t.event.type);
            });
        });
         */
    }

    /*
            this.client.on(sdk.RoomEvent.Timeline, (event, room, toStartOfTimeline) => {
                console.warn(room?.name, "Event received type :", event.getType());
            });

            this.client.on(CryptoEvent.VerificationRequest, (request) => {
                console.log("VERIFICATION REQUESTED :", request);
            });

            this.client.on(sdk.RoomEvent.Timeline, function (event, room, toStartOfTimeline) {
                if (toStartOfTimeline) {
                    return; // don't print paginated results
                }
                if (event.getType() !== "m.room.message") {
                    console.log("Timeline event => ", event.getType());
                    return; // only print messages
                }
                console.log(
                    // the room name will update with m.room.name events automatically
                    "(%s) %s :: %s",
                    room?.name,
                    event.getSender(),
                    event.getContent().body,
                );
            });
        }
    */
    /*
    const StartVerification = async (request: VerificationRequest): Promise<VerificationChallengeInterface> => {
        if (!request.verifier) {
            if (!request.initiatedByMe) {
                await request.accept();
                if (request.cancelled) {
                    throw new Error("verification aborted");
                }
                // Auto chose method as the only one we both support.
                await request.beginKeyVerification(
                    request.methods[0],
                    request.targetDevice
                );
            } else {
                await request.waitFor(() => request.started || request.cancelled);
            }
            if (request.cancelled) {
                throw new Error("verification aborted");
            }
        }
        const sasEventPromise = new Promise<any>(resolve =>
            request.verifier.once("show_sas", resolve)
        );
        request.verifier.verify();
        const sasEvent = await sasEventPromise;
        if (request.cancelled) {
            throw new Error("verification aborted");
        }
        let challenge = [];
        if (sasEvent.sas.emoji) {
            challenge = sasEvent.sas.emoji;
        } else if (sasEvent.sas.decimal) {
            challenge = sasEvent.sas.decimal;
        } else {
            sasEvent.cancel();
            throw new Error("unknown verification method");
        }
        // here you should call a screen that will display the EMOJIs to define if they match or not
        // the object returned here will be accessed from that screen and you will have access to the emoji
        // list and the functions to confirm match or not (and the option to cancel).
        router.push('/popup/device-verification'); // replace this with your wait to call another screen (this will only work for SPA applications because the object will be in memory.) You can also call a modal window instead
        return {
            challenge,
            handleResult(challengeMatches) {
                // challengeMatches is true if it matches and false if not.
                if (!challengeMatches) {
                    sasEvent.mismatch();
                } else {
                    sasEvent.confirm();
                }
            },
            cancel() {
                if (!request.cancelled) {
                    sasEvent.cancel();
                }
            },
            cancelPromise: request.waitFor(() => request.cancelled),
        };
    }
     */


    private async startVerification(request: VerificationRequest): Promise<ISasEvent> {
        if (!request.verifier) {
            if (!request.initiatedByMe) {
                await request.accept();
                if (request.cancelled) {
                    throw new Error("verification aborted 1");
                }
                // Auto chose method as the only one we both support.
                request.beginKeyVerification(
                    request.methods[0],
                    request.targetDevice
                );
            } else {
                await request.waitFor(() => request.started || request.cancelled);
            }
            if (request.cancelled) {
                throw new Error("verification aborted 2");
            }
        }


        if(!request.verifier){
            throw new Error("No verifier");
        }
        console.warn("SAAS => challenge =>> verify");
        request.verifier.verify().then(e => console.log("SAAS => challenge =>> verify => ", e)).catch(e => console.error("SAAS => challenge =>> verify => ", e));
        console.warn("SAAS => challenge =>> waiting show_sas");
        const sasEvent = await new Promise<ISasEvent>((resolve, reject) => {
            if(!request.verifier){
                reject("No verifier");
                throw new Error("No verifier");
            }
            request.verifier.on("show_sas", (e: ISasEvent) => resolve(e));
        });
        if (request.cancelled) {
            throw new Error("verification aborted 3");
        }

        if (!sasEvent.sas.emoji && !sasEvent.sas.decimal){
            sasEvent.cancel();
            throw new Error("unknown verification method");
        }
        return sasEvent;
    }


    async start(){
        try{
            if(!this._userId || !this._deviceId || !this.accessToken){
                throw new Error('You need to use login() or register() before calling start()');
            }
            this._client = await this.newClient();
            await this.client.initCrypto();
            await this.client.startClient();
            this.client.setGlobalErrorOnUnknownDevices(false);
            await this.client.setAccountData('m.user.workadventure', {mapUrl: 'test', color: 'red'});
            console.log(this.client.getAccountData('m.user.workadventure')?.event);
        } catch(err) {
            if(err instanceof MatrixError) {
                console.error("Matrix => start => ", err.errcode, err.data.error);
            } else {
                console.trace("Matrix => receive => error", err);
            }
            throw new Error("Fail start");
        }
    }

    async login(username: string, password: string){
        const tempClient = await this.newClient();
        this._userPassword = password;
        const response = await tempClient.loginWithPassword(username.includes(':')?username : `@${username}:${MATRIX_SERVER_URL}`, password);
        await this.setConfig(response, tempClient);
        tempClient.stopClient();
        //await tempClient.logout();
        //await tempClient.clearStores();

        // Override client with a new one with all the user's information
        log("Matrix => login => success");
    }

    async register(username: string, password: string){
        const tempClient = await this.newClient();
        this._userPassword = password;
        const response = await tempClient.register(username, password, null, {type: 'm.login.dummy'});
        await this.setConfig(response, tempClient);
        tempClient.stopClient();

        log("Matrix => register => success");
    }

    async crossSign() {
        try {
            const crossSignInfo = this.client.getStoredCrossSigningForUser(this.userId);
            const deviceInfo = this.client.getStoredDevice(this.userId, this.deviceId);
            if(crossSignInfo && deviceInfo) {
                const deviceTrust = crossSignInfo.checkDeviceTrust(crossSignInfo, deviceInfo, false, true);
                return deviceTrust.isCrossSigningVerified();
            }
            return null;
        } catch {
            // device does not support encryption
            return null;
        }

        return;

        console.log(await this.client.prepareKeyBackupVersion(this._userPassword));

        return;
        console.log("getCryptoTrustCrossSignedDevices => ", this.client.getCryptoTrustCrossSignedDevices());

        return;
        //const recoveryKey = await this.client.createRecoveryKeyFromPassphrase(passphrase);
        const isSigned = this.client.checkIfOwnDeviceCrossSigned(this.deviceId);
        console.log("CrossSigning key", isSigned);

        if (!isSigned) {
            await this.client.bootstrapCrossSigning({});
        }
    }

    async keyVerification(){
        const recoveryKey = await this.client.crypto?.createRecoveryKeyFromPassphrase("maPassphrase");
        console.warn("encodedPrivateKey =>", recoveryKey?.encodedPrivateKey);
        return;
        /*
        const olmDevice = new OlmDevice();
        return olmDevice.createAccount();
        this.client.createKey();
        */
        return;
        await this.client.bootstrapSecretStorage({});
        console.log(await this.client.isCrossSigningReady());

        const isSigned = this.client.checkIfOwnDeviceCrossSigned(this.deviceId);
        console.log("CrossSigning key", isSigned);

        if (!isSigned) {
            await this.client.bootstrapCrossSigning({});
        }

        console.log(await this.client.isCrossSigningReady());

        const response = await this.client.crypto!.setDeviceVerification(this.userId, this.deviceId, true);
        console.log(response);
        //await this.client.beginKeyVerification();
    }

    async verifyDevice(){
        const {devices} = await this.client.getDevices();
        for(let device of devices) {
            const deviceTrust = await this.client.crypto?.checkDeviceTrust(this.userId, device.device_id);
            console.log(device.device_id, deviceTrust);
        }
    }

    private async setConfig(response: sdk.IAuthData, client: MatrixClient) {
        if (response.user_id) {
            this._userId = response.user_id;
            localStorage.setItem('mx_user_id', response.user_id);
        }
        if (response.access_token) {
            this.accessToken = response.access_token;
            client.setAccessToken(response.access_token);
            localStorage.setItem('mx_access_token', response.access_token);
        }
        if (response.device_id) {
            this._deviceId = response.device_id;
            localStorage.setItem('mx_device_id', response.device_id);
            await client.setDeviceDetails(response.device_id, {display_name: "WorkAdventure - Chat"});
        }
    }

    async verify(): Promise<ISasEvent | undefined> {
        try {
            const {devices} = await this.client.getDevices();
            /*
            for(let device of devices) {
                const isCrossSigned = this.client.checkIfOwnDeviceCrossSigned(device.device_id);
                const deviceTrusted = this.client.checkDeviceTrust(this.userId, device.device_id);
                console.log(device.device_id, "isCrossSigned =>", isCrossSigned);
                console.log(device.device_id, "deviceTrusted =>", deviceTrusted);
                //await this.client.setDeviceVerified(this.userId, device.device_id, true);
            }
             */
            const currentVerificationRequest = await this.client.requestVerification(this.userId, ['MRIVBLJXND']);//devices.map(device => device.device_id));
            console.warn("verify => verify", currentVerificationRequest);
            return await this.startVerification(currentVerificationRequest);
        } catch(e: unknown){
            throw new Error('Error verif'+ e);
        }
        return undefined;
    }

    async createE2EERoom(){

        const room_raw = await this.client.createRoom({
            visibility: sdk.Visibility.Private,
            name: "My e2ee Room 3",
            initial_state: [{
                type: 'm.room.encryption',
                state_key: '',
                content: {
                    algorithm: 'm.megolm.v1.aes-sha2',
                },
            }],
        });

        const room = this.client.getRoom(room_raw.room_id);
        //const room = {roomId: "!eAQbuBPCLJrgJbZZMg:matrix.workadventure.localhost", name: "My e2ee Room 2"};
        if(!room){
            throw new Error("No room created");
        }

        this._roomId = room.roomId;
        console.warn("Room created with ID: ", room.roomId);

        //debugger;
        console.warn("Room"+room?.name+" is"+this.client.isRoomEncrypted(room.roomId)?"encrypted":"not encrypted");

        const encryptionEvent = {
            algorithm: "m.megolm.v1.aes-sha2",
        };
        await this.client.setRoomEncryption(room.roomId, encryptionEvent);

        console.warn("Room"+room?.name+" is"+this.client.isRoomEncrypted(room.roomId)?"encrypted":"not encrypted");


        const response = await this.client.sendEvent(room.roomId, "m.room.encryption", encryptionEvent);
        console.warn("Response =>", response);

        console.warn("Room"+room?.name+" is"+this.client.isRoomEncrypted(room.roomId)?"encrypted":"not encrypted");
    }

    async sendMessage(){
        //let room = {roomId: this._roomId ?? "", name: "My e2ee Room 2"};
        const room = {roomId: "!eAQbuBPCLJrgJbZZMg:matrix.workadventure.localhost", name: "My e2ee Room 2"};
        const room_ = this.client.getRoom(room.roomId);

        if(!room_){
            throw new Error("No room found");
        }

        console.warn("Room"+room?.name+" is"+(this.client.isRoomEncrypted(room.roomId)?"encrypted":"not encrypted"));

        const event = new sdk.MatrixEvent({
            type: "m.room.message",
            room_id: room_.roomId,
            content: {
                msgtype: "m.text",
                body: 'This is an encrypted message.',
            },
        });

        console.log(event);
        await this.client.crypto?.encryptEvent(event, room_);
        await this.client.sendEvent(room.roomId, event.getType(), event.getContent());

        console.warn("RoomMemberEvent sent", await this.client.sendEvent(room.roomId, "m.user.workadventu.re", {map: {url: 'https://test.fr', name: 'WA Village'}, color: 'red'}));

        return;

        const message = "Hello, this is a message sent to the e2ee room";

        this.client.sendMessage(room.roomId, {
            msgtype: "m.text",
            body: message
        }).then((response) => {
            console.warn(`Message sent to room ${room.roomId} with event id ${response.event_id}`);
        }).catch((err) => {
            console.error("Error sending message: ", err);
        });


    }

    private async newClient(accessToken = this.accessToken, userId = this._userId, deviceId = this._deviceId) {
        const indexedDBStore = new sdk.IndexedDBStore({
            indexedDB: global.indexedDB,
            localStorage: global.localStorage,
            dbName: 'web-sync-store',
        });
        await indexedDBStore.startup();

        const client = sdk.createClient({
            baseUrl: `http://${MATRIX_SERVER_URL}`,
            accessToken,
            userId,
            deviceId,
            verificationMethods: ["m.sas.v1"],
            idBaseUrl: "WorkAdventure",
            store: indexedDBStore,
            cryptoStore: new sdk.IndexedDBCryptoStore(global.indexedDB, 'crypto-store'),
        });

        client.on(sdk.RoomEvent.Timeline, async (message, room) => {
            let body = '';
            try {
                if (message.event.type === 'm.room.encrypted') {
                    const event = await client.crypto?.decryptEvent(message);
                    if (event) {
                        ({body} = event.clearEvent.content);
                    }
                } else {
                    ({body} = message.event.content);
                }
                if (body) {
                    console.warn(body);
                    // do something
                }
            } catch (error) {
                console.error('#### ', error);
            }
        });

        client.on(sdk.ClientEvent.Sync, (state, prevState) => {
            switch (state) {
                case SyncState.Syncing: {
                    console.log('SYNCING state');
                    break;
                }
                case SyncState.Error: {
                    console.error('ERROR state');
                    break;
                }
                case SyncState.Catchup: {
                    console.log('CATCHUP state');
                    break;
                }
                case SyncState.Prepared: {
                    console.log('PREPARED state');
                    console.log('Previous state: ', prevState);
                    break;
                }
                case SyncState.Stopped: {
                    console.log('STOPPED state');
                    break;
                }
                case SyncState.Reconnecting: {
                    console.log('RECONNECTING state');
                    break;
                }
                default: {
                    console.log('DEFAULT state', state);
                    break;
                }
            }
        });

        client.on(sdk.RoomEvent.Timeline, (event, room, toStartOfTimeline) => {
            if (event.getType() === "m.room.encrypted") {
                const content = event.getContent();
                console.log("Encrypted event received from "+room?.name, content);
            }
        });

        return client;
    }

    get client(): MatrixClient{
        if(!this._client){
            throw new Error("No client defined");
        }
        return this._client;
    }

    get deviceId(): string{
        if(!this._deviceId){
            throw new Error("No deviceId defined");
        }
        return this._deviceId;
    }
    get userId(): string{
        if(!this._userId){
            throw new Error("No userId defined");
        }
        return this._userId;
    }


    public backupSession(): boolean{
        return !!this._userId && !!this._deviceId && !!this.accessToken;
    }
}

function log(message?: unknown,...optionalParams: unknown[]){
    console.log(message);
}
