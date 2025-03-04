import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { Space } from '../src/Model/Space';
import { PrivateEvent, PublicEvent, SpaceUser } from '@workadventure/messages';
import { CommunicationManager, CommunicationType, ICommunicationSpaceManager } from '../src/Model/CommunicationManager';

/*
* Role du communication manager 
* sert pour le pattern de strategy
* prevoir un switch entre les differentes strategies
* doit pouvoir se faire par rapport aux nombre de personne dans le space 
* voir si c'est lui qui doit gerer si le space a une connexion ou non ou on laisse le space initialiser la connexion
* 
*
*
*/ 


describe('Communication Manager Tests', () => {
    
    beforeEach(() => {
        // Setup before each test
    });

    afterEach(() => {
        // Cleanup after each test
    });

    it('should return NONE if no properties to sync', () => {
        //Arrange
            const space : ICommunicationSpaceManager = {
                getAllUsers: () => [],
                getUser: (userId: number) => undefined,
                dispatchPrivateEvent: (privateEvent: PrivateEvent) => {},
                dispatchPublicEvent: (publicEvent: PublicEvent) => {},
                getSpaceName: () => "test",
                getPropertiesToSync: () => [],
            }

            
        //Act
            const communicationManager = new CommunicationManager(space);  
        //Assert
            expect(communicationManager.getCommunicationStrategy()).toBe(CommunicationType.NONE);
    });

    it('should return WEBRTC if properties to sync include cameraState, microphoneState or screenSharingState', () => {
        // Test leaving space logic
               //Arrange
               const space : ICommunicationSpaceManager = {
                getAllUsers: () => [],
                getUser: (userId: number) => undefined,
                dispatchPrivateEvent: (privateEvent: PrivateEvent) => {},
                dispatchPublicEvent: (publicEvent: PublicEvent) => {},
                getSpaceName: () => "test",
                getPropertiesToSync: () => ["cameraState", "microphoneState", "screenSharingState"],
            }

            
        //Act
            const communicationManager = new CommunicationManager(space);  
        //Assert
            expect(communicationManager.getCommunicationStrategy()).toBe(CommunicationType.WEBRTC); 
    });

    it('should return WEBRTC if properties to sync include cameraState, microphoneState or screenSharingState', () => {
        // Test leaving space logic
               //Arrange
               const space : ICommunicationSpaceManager = {
                getAllUsers: () => [],
                getUser: (userId: number) => undefined,
                dispatchPrivateEvent: (privateEvent: PrivateEvent) => {},
                dispatchPublicEvent: (publicEvent: PublicEvent) => {},
                getSpaceName: () => "test",
                getPropertiesToSync: () => ["screenSharingState"],
            }

            
        //Act
            const communicationManager = new CommunicationManager(space);  
        //Assert
            expect(communicationManager.getCommunicationStrategy()).toBe(CommunicationType.WEBRTC); 
    });


    it('should return WEBRTC if properties to sync include cameraState, microphoneState or screenSharingState', () => {
        // Test leaving space logic
               //Arrange
               const userDefault : SpaceUser = SpaceUser.fromPartial({});

               const space : ICommunicationSpaceManager = {
                getAllUsers: () => [userDefault,userDefault,userDefault,userDefault],
                getUser: (userId: number) => undefined,
                dispatchPrivateEvent: (privateEvent: PrivateEvent) => {},
                dispatchPublicEvent: (publicEvent: PublicEvent) => {},
                getSpaceName: () => "test",
                getPropertiesToSync: () => ["screenSharingState"],
            }

            
        //Act
            const communicationManager = new CommunicationManager(space);  
            communicationManager.onUserAdded(userDefault);
        //Assert
            expect(communicationManager.getCommunicationStrategy()).toBe(CommunicationType.WEBRTC); 
    });


    it('should return WEBRTC if properties to sync include cameraState, microphoneState or screenSharingState', () => {
        // Test leaving space logic
               //Arrange
               const userDefault : SpaceUser = SpaceUser.fromPartial({});

               const space : ICommunicationSpaceManager = {
                getAllUsers: () => [userDefault,userDefault,userDefault,userDefault,userDefault],
                getUser: (userId: number) => undefined,
                dispatchPrivateEvent: (privateEvent: PrivateEvent) => {},
                dispatchPublicEvent: (publicEvent: PublicEvent) => {},
                getSpaceName: () => "test",
                getPropertiesToSync: () => ["screenSharingState"],
            }

            
        //Act
            const communicationManager = new CommunicationManager(space);  
            communicationManager.onUserAdded(userDefault);
        //Assert
            expect(communicationManager.getCommunicationStrategy()).toBe(CommunicationType.LIVEKIT); 
    });

    it('should return WEBRTC if properties to sync include cameraState, microphoneState or screenSharingState', () => {
        // Test leaving space logic
               //Arrange
               const userDefault : SpaceUser = SpaceUser.fromPartial({});
               const users : SpaceUser[] = [userDefault,userDefault,userDefault,userDefault,userDefault];
               const space : ICommunicationSpaceManager = {
                getAllUsers: () => users,
                getUser: (userId: number) => users[userId],
                dispatchPrivateEvent: (privateEvent: PrivateEvent) => {},
                dispatchPublicEvent: (publicEvent: PublicEvent) => {},
                getSpaceName: () => "test",
                getPropertiesToSync: () => ["screenSharingState"],
            }

            
        //Act
            const communicationManager = new CommunicationManager(space); 
            communicationManager.onUserAdded(userDefault);
            expect(communicationManager.getCommunicationStrategy()).toBe(CommunicationType.LIVEKIT);  
            users.pop();
            communicationManager.onUserDeleted(userDefault);
        //Assert
            expect(communicationManager.getCommunicationStrategy()).toBe(CommunicationType.WEBRTC); 
    });

    it('should return LIVEKIT if properties to sync include screenSharingState and there are 4 users or less', () => {
        // Test leaving space logic
               //Arrange
               const userDefault : SpaceUser = SpaceUser.fromPartial({});
               const users : SpaceUser[] = [userDefault,userDefault,userDefault,userDefault,userDefault];
               const space : ICommunicationSpaceManager = {
                getAllUsers: () => users,
                getUser: (userId: number) => users[userId],
                dispatchPrivateEvent: (privateEvent: PrivateEvent) => {},
                dispatchPublicEvent: (publicEvent: PublicEvent) => {},
                getSpaceName: () => "test",
                getPropertiesToSync: () => ["screenSharingState"],
            }

            
        //Act
            const communicationManager = new CommunicationManager(space); 
            communicationManager.onUserAdded(userDefault);
            expect(communicationManager.getCommunicationStrategy()).toBe(CommunicationType.LIVEKIT);  
            communicationManager.onUserDeleted(userDefault);
        
        //Assert
            expect(communicationManager.getCommunicationStrategy()).toBe(CommunicationType.LIVEKIT); 
    });


    it('should return LIVEKIT if properties to sync include screenSharingState and there are 4 users or less', () => {
        // Test leaving space logic
               //Arrange
               const userDefault : SpaceUser = SpaceUser.fromPartial({});
               const users : SpaceUser[] = [userDefault,userDefault,userDefault,userDefault,userDefault];
               const space : ICommunicationSpaceManager = {
                getAllUsers: () => users,
                getUser: (userId: number) => users[userId],
                dispatchPrivateEvent: (privateEvent: PrivateEvent) => {},
                dispatchPublicEvent: (publicEvent: PublicEvent) => {},
                getSpaceName: () => "test",
                getPropertiesToSync: () => [],
            }

            
        //Act
            const communicationManager = new CommunicationManager(space); 
            communicationManager.onUserAdded(userDefault);
            expect(communicationManager.getCommunicationStrategy()).toBe(CommunicationType.NONE);  
            communicationManager.onUserDeleted(userDefault);
        
        //Assert
            expect(communicationManager.getCommunicationStrategy()).toBe(CommunicationType.NONE); 
    });
});

