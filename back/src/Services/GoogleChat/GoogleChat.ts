import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

class GoogleChat {
    private chat;

    constructor(auth: OAuth2Client) {
        this.chat = google.chat({ version: 'v1', auth });
    }

    async sendMessage(spaceId: string, message: string) {
        await this.chat.spaces.messages.create({
            parent: spaceId,
            requestBody: {
                text: message,
            },
        });
    }

    async createSpace(name: string, members: string[]) {
        const space = await this.chat.spaces.create({
            requestBody: {
                displayName: name,
            },
        });

        for (const member of members) {
            await this.addMemberToSpace(space.data.name!, member);
        }

        return space.data;
    }

    async addMemberToSpace(spaceId: string, userId: string) {
        await this.chat.spaces.members.create({
            parent: spaceId,
            requestBody: {
                membership: {
                    member: {
                        name: `users/${userId}`,
                    },
                },
            },
        });
    }

    async removeMemberFromSpace(spaceId: string, userId: string) {
        await this.chat.spaces.members.delete({
            name: `${spaceId}/members/${userId}`,
        });
    }
}

export { GoogleChat };
