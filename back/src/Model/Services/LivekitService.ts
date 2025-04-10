import { SpaceUser } from '@workadventure/messages';
import { RoomServiceClient, AccessToken , CreateOptions, TrackSource } from 'livekit-server-sdk';
import * as Sentry from "@sentry/node";
import { LIVEKIT_WS_URL, LIVEKIT_API_SECRET, LIVEKIT_API_KEY, LIVEKIT_HOST } from '../../Enum/EnvironmentVariable';
    
const defaultRoomServiceClient = (livekitHost: string, livekitApiKey: string, livekitApiSecret: string) => new RoomServiceClient(livekitHost, livekitApiKey, livekitApiSecret);
export class LiveKitService {

    private roomServiceClient: RoomServiceClient;

    constructor(createRoomServiceClient: (livekitHost: string, livekitApiKey: string, livekitApiSecret: string) => RoomServiceClient = defaultRoomServiceClient, private livekitHost = LIVEKIT_HOST, private livekitApiKey = LIVEKIT_API_KEY, private livekitApiSecret = LIVEKIT_API_SECRET, private livekitFrontendUrl = LIVEKIT_WS_URL) {
        this.roomServiceClient = createRoomServiceClient(this.livekitHost, this.livekitApiKey, this.livekitApiSecret);
    }


    async createRoom(roomName: string): Promise<void> {
        //TODO : revoir les options
        const createOptions: CreateOptions = {
            name: roomName,
            emptyTimeout: 10000,
            maxParticipants: 1000,
            departureTimeout: 10000,
        }
        
        await this.roomServiceClient.createRoom(createOptions);
    }

    async generateToken(roomName: string, user: SpaceUser): Promise<string> {
        console.log(">>>> generateToken", {
            identity: `${user.uuid}||${user.spaceUserId}`,
        });
        try {
            const token = new AccessToken(this.livekitApiKey, this.livekitApiSecret, {
                //TODO : séparateur a maintenir coté front et back : voir comment on peut changer ça 
                //TODO : voir si on utilise pas le uuid si on peut supprimer la partie avant le ||
                identity: `${user.uuid}||${user.spaceUserId}`,
                name: user.name,
                metadata: JSON.stringify({
                    userId: user.spaceUserId,
                }),
            });

        token.addGrant({
            room: roomName,
            canPublish: true,
            canSubscribe: true,
            roomJoin: true,
            canPublishSources: [
                TrackSource.CAMERA,
                TrackSource.MICROPHONE,
                TrackSource.SCREEN_SHARE,
            ],

        });
            return token.toJwt();
        } catch (error) {
            throw error;
        }
    }

    deleteRoom(roomName: string): void {
        try {
            this.roomServiceClient.deleteRoom(roomName);
        } catch (error) {
            console.error(`Error deleting room ${roomName}:`, error);
            Sentry.captureException(error);
        }
    }

    async removeParticipant(roomName: string, participantName: string): Promise<void> {
        try {
            const rooms = await this.roomServiceClient.listRooms([roomName]);

            if (rooms && rooms.length > 0) {
                const participants = await this.roomServiceClient.listParticipants(roomName);
                const participantExists = participants.some(p => p.identity === participantName);
                
                if (!participantExists) {
                    console.warn(`Participant ${participantName} not found in room ${roomName}`);
                    return;
                }
            } else {
                console.warn(`Room ${roomName} not found`);
                return;
            }
            await this.roomServiceClient.removeParticipant(roomName, participantName);
        } catch (error) {
            console.error(`Error removing participant ${participantName} from room ${roomName}:`, error);
            Sentry.captureException(error);
        }
    }


    getLivekitFrontendUrl(): string {
        return this.livekitFrontendUrl;
    }
    
}