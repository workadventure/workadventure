import { GoogleChat } from '../src/Services/GoogleChat/GoogleChat';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

jest.mock('googleapis', () => {
    const mockChat = {
        spaces: {
            messages: {
                create: jest.fn(),
            },
            create: jest.fn(),
            members: {
                create: jest.fn(),
                delete: jest.fn(),
            },
        },
    };
    return {
        google: {
            chat: jest.fn(() => mockChat),
        },
    };
});

describe('GoogleChat', () => {
    let googleChat: GoogleChat;
    let mockChat: any;

    beforeEach(() => {
        const auth = new OAuth2Client();
        googleChat = new GoogleChat(auth);
        mockChat = google.chat({} as any);
    });

    it('should send a message', async () => {
        await googleChat.sendMessage('spaceId', 'message');
        expect(mockChat.spaces.messages.create).toHaveBeenCalledWith({
            parent: 'spaceId',
            requestBody: {
                text: 'message',
            },
        });
    });

    it('should create a space and add members', async () => {
        mockChat.spaces.create.mockResolvedValue({
            data: {
                name: 'newSpaceId',
            },
        });
        await googleChat.createSpace('name', ['member1', 'member2']);
        expect(mockChat.spaces.create).toHaveBeenCalledWith({
            requestBody: {
                displayName: 'name',
            },
        });
        expect(mockChat.spaces.members.create).toHaveBeenCalledWith({
            parent: 'newSpaceId',
            requestBody: {
                membership: {
                    member: {
                        name: 'users/member1',
                    },
                },
            },
        });
        expect(mockChat.spaces.members.create).toHaveBeenCalledWith({
            parent: 'newSpaceId',
            requestBody: {
                membership: {
                    member: {
                        name: 'users/member2',
                    },
                },
            },
        });
    });

    it('should add a member to a space', async () => {
        await googleChat.addMemberToSpace('spaceId', 'userId');
        expect(mockChat.spaces.members.create).toHaveBeenCalledWith({
            parent: 'spaceId',
            requestBody: {
                membership: {
                    member: {
                        name: 'users/userId',
                    },
                },
            },
        });
    });

    it('should remove a member from a space', async () => {
        await googleChat.removeMemberFromSpace('spaceId', 'userId');
        expect(mockChat.spaces.members.delete).toHaveBeenCalledWith({
            name: 'spaceId/members/userId',
        });
    });
});
