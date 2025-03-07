import { ICommunicationStrategy } from "../Interfaces/ICommunicationStrategy"

import { ICommunicationSpace } from "../Interfaces/ICommunicationSpace"
import { SpaceUser } from "@workadventure/messages"
import { LiveKitService } from "../Services/LivekitService"
import * as Sentry from "@sentry/node"

export class LivekitCommunicationStrategy implements ICommunicationStrategy {
    
    private usersReady: number[] = []

    constructor(private space: ICommunicationSpace, private livekitService = new LiveKitService()) {
        this.livekitService.createRoom(this.space.getSpaceName()).catch((error) => {
            console.error(`Error creating room ${this.space.getSpaceName()} on Livekit:`, error)
            Sentry.captureException(error)
        })
    }

    //TODO ; voir si on peut integrer une notion de salle d'attente directement dans cette partie 
    // avec un salon ouvert / fermé
    
    async addUser(user: SpaceUser , switchInProgress: boolean = false): Promise<void> {
            const token = await this.livekitService.generateToken(this.space.getSpaceName(), user)
            this.space.dispatchPrivateEvent({
                spaceName: this.space.getSpaceName(),
            receiverUserId: user.id,
            senderUserId: user.id,
            spaceEvent: {
                event: {
                    $case: "livekitInvitationMessage",
                    livekitInvitationMessage: {
                        token: token,
                        serverUrl: this.livekitService.getLivekitFrontendUrl(),
                        shouldJoinRoomImmediately: !switchInProgress
                    },
                },
                },
            })
        
    }

    async deleteUser(user: SpaceUser): Promise<void> {
        try {
            await this.livekitService.removeParticipant(this.space.getSpaceName(), user.name)
        } catch (error) {
            console.error(`Error removing participant ${user.name} from Livekit:`, error)
            Sentry.captureException(error)
        }
        this.space.dispatchPrivateEvent({
            spaceName: this.space.getSpaceName(),
            receiverUserId: user.id,
            senderUserId: user.id,
            spaceEvent: {
                event: {
                    $case: "livekitDisconnectMessage",
                    livekitDisconnectMessage: {
                    },
                },
            },
        }) 
        
    }
    

    updateUser(user: SpaceUser): void {
        //TODO : voir si besoin
    }

    initialize(): void {
        const users = this.space.getAllUsers()
        users.forEach(user => {
            this.addUser(user).catch((error) => {
                console.error(`Error adding user ${user.id} to Livekit:`, error)
                Sentry.captureException(error)
            })
        })
    }

    addUserReady(userId: number): void {
        this.usersReady.push(userId)
    }

    canSwitch(): boolean {
        return this.usersReady.length === this.space.getAllUsers().length
    }
    cleanup(): void {
        this.livekitService.deleteRoom(this.space.getSpaceName())
        const users = this.space.getAllUsers()
        users.forEach(user => {
            this.deleteUser(user).catch((error) => {
                console.error(`Error deleting user ${user.id} from Livekit:`, error)
                Sentry.captureException(error)
            })
        })
        this.livekitService.deleteRoom(this.space.getSpaceName())
    }

}



