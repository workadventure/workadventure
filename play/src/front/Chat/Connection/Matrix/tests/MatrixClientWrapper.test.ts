import { describe, expect, it, vi} from "vitest";
import { MatrixClientWrapper, MatrixClientWrapperInterface, MatrixLocalUserStore } from "../MatrixClientWrapper";

describe("MatrixClientWrapper", () => {
    
    describe("initMatrixClient",()=>{


        it("should throw a error when localUserStore uuid is undefined or null",()=>{
            const mockClient = {
                login : ()=>{
                    return {
                        user_id :  "", 
                        access_token : null, 
                        refresh_token : null, 
                        expires_in_ms : ""
                    }
                },
                registerGuest : ()=>{
                    Promise.resolve({
                        access_token: null,
                        refresh_token:null,
                        user_id:null
                    })
                    return {
                        access_token: null,
                        refresh_token:null,
                        user_id:null
                    }
                },
                setGuest : ()=>{}
            };

            const createClient = vi.fn().mockReturnValue(mockClient);

            const matrixBaseURL = "";

            const localUserStoreMock = {
                getLocalUser : ()=>{
                    return null
                }
            };
            const matrixClientWrapperInstance : MatrixClientWrapperInterface = new MatrixClientWrapper(matrixBaseURL,localUserStoreMock,createClient);

            expect(matrixClientWrapperInstance.initMatrixClient()).rejects.toThrow()
        })
        it("should throw a error when registerGuest throw a error",async ()=>{
            const mockClient = {
                login : ()=>{
                    return {
                        user_id :  "", 
                        access_token : null, 
                        refresh_token : null, 
                        expires_in_ms : ""
                    }
                },
                registerGuest : ()=>{
                    Promise.resolve({
                        access_token: null,
                        refresh_token:null,
                        user_id:null
                    })
                    return {
                        access_token: null,
                        refresh_token:null,
                        user_id:null
                    }
                },
                setGuest : ()=>{}
            };

            const createClient = vi.fn().mockReturnValue(mockClient);

            const matrixBaseURL = "testUrl";

            const localUserStoreMock : MatrixLocalUserStore = {
                getLocalUser: vi.fn().mockReturnValue({
                    uuid: "myUuid",
                    email: "",
                    isMatrixRegistered: false,
                    matrixUserId: ""
                })
                ,
                getMatrixDeviceId: vi.fn().mockReturnValue(null),
                getMatrixAccessToken: vi.fn().mockReturnValue(null),
                getMatrixRefreshToken: vi.fn().mockReturnValue(null),
                getMatrixUserId: vi.fn().mockReturnValue(null),
                getMatrixLoginToken:vi.fn().mockReturnValue(null),
                setMatrixDeviceId: vi.fn(),
                setMatrixLoginToken: function (loginToken: string | null): void {
                    throw new Error("setMatrixLoginToken not implemented.");
                },
                setMatrixUserId: function (userId: string): void {
                    throw new Error("setMatrixUserId not implemented.");
                },
                setMatrixAccessToken: function (accessToken: string): void {
                    throw new Error("setMatrixAccessToken not implemented.");
                },
                setMatrixRefreshToken: function (refreshToken: string | null): void {
                    throw new Error("setMatrixRefreshToken not implemented.");
                },
                setMatrixAccessTokenExpireDate: function (AccessTokenExpireDate: Date): void {
                    throw new Error("setMatrixAccessTokenExpireDate not implemented.");
                },
                getName: function (): string {
                    throw new Error("getName not implemented.");
                }
            };
            const matrixClientWrapperInstance : MatrixClientWrapperInterface = new MatrixClientWrapper(matrixBaseURL,localUserStoreMock,createClient);

            expect(matrixClientWrapperInstance.initMatrixClient()).rejects.toThrow("Unable to etablish a Matrix Guest connection")
        })
        it("should throw a error when matrix access token is null",async ()=>{
            const mockClient = {
                login : ()=>{
                    return {
                        user_id :  "", 
                        access_token : null, 
                        refresh_token : null, 
                        expires_in_ms : ""
                    }
                },
                registerGuest : ()=>{
                    Promise.resolve({
                        access_token: null,
                        refresh_token:null,
                        user_id:null
                    })
                    return {
                        access_token: null,
                        refresh_token:null,
                        user_id:null
                    }
                },
                setGuest : ()=>{}
            };

            const createClient = vi.fn().mockReturnValue(mockClient);

            const matrixBaseURL = "testUrl";

            const localUserStoreMock : MatrixLocalUserStore = {
                getLocalUser: vi.fn().mockReturnValue({
                    uuid: "myUuid",
                    email: "",
                    isMatrixRegistered: false,
                    matrixUserId: ""
                })
                ,
                getMatrixDeviceId: vi.fn().mockReturnValue(null),
                getMatrixAccessToken: vi.fn().mockReturnValue(null),
                getMatrixRefreshToken: vi.fn().mockReturnValue(null),
                getMatrixUserId: vi.fn().mockReturnValue(null),
                getMatrixLoginToken:vi.fn().mockReturnValue(null),
                setMatrixDeviceId: vi.fn(),
                setMatrixLoginToken: function (loginToken: string | null): void {
                    throw new Error("setMatrixLoginToken not implemented.");
                },
                setMatrixUserId: vi.fn(),
                setMatrixAccessToken: vi.fn(),
                setMatrixRefreshToken: vi.fn(),
                setMatrixAccessTokenExpireDate: vi.fn(),
                getName:  vi.fn().mockReturnValue(""),
            };
            const matrixClientWrapperInstance : MatrixClientWrapperInterface = new MatrixClientWrapper(matrixBaseURL,localUserStoreMock,createClient);

           // matrixClientWrapperInstance.initMatrixClient()
            expect(matrixClientWrapperInstance.initMatrixClient()).rejects.toThrow("Unable to connect to matrix, access token is null")
        })
        it("should throw a error when matrixUserId is null",async ()=>{
            const mockClient = {
                login : ()=>{
                    return {
                        user_id :  "", 
                        access_token : null, 
                        refresh_token : null, 
                        expires_in_ms : ""
                    }
                },
                registerGuest : ()=>{
                    return {
                        access_token: "accessToken",
                        refresh_token:null,
                        user_id:null
                    }
                },
                setGuest : ()=>{}
            };

            const createClient = vi.fn().mockReturnValue(mockClient);

            const matrixBaseURL = "testUrl";

            const localUserStoreMock : MatrixLocalUserStore = {
                getLocalUser: vi.fn().mockReturnValue({
                    uuid: "myUuid",
                    email: "",
                    isMatrixRegistered: false,
                    matrixUserId: ""
                })
                ,
                getMatrixDeviceId: vi.fn().mockReturnValue(null),
                getMatrixAccessToken: vi.fn().mockReturnValue(null),
                getMatrixRefreshToken: vi.fn().mockReturnValue(null),
                getMatrixUserId: vi.fn().mockReturnValue(null),
                getMatrixLoginToken:vi.fn().mockReturnValue(null),
                setMatrixDeviceId: vi.fn(),
                setMatrixLoginToken: function (loginToken: string | null): void {
                    throw new Error("setMatrixLoginToken not implemented.");
                },
                setMatrixUserId: vi.fn(),
                setMatrixAccessToken: vi.fn(),
                setMatrixRefreshToken: vi.fn(),
                setMatrixAccessTokenExpireDate: vi.fn(),
                getName:  vi.fn().mockReturnValue(""),
            };
            const matrixClientWrapperInstance : MatrixClientWrapperInterface = new MatrixClientWrapper(matrixBaseURL,localUserStoreMock,createClient);

           // matrixClientWrapperInstance.initMatrixClient()
            expect(matrixClientWrapperInstance.initMatrixClient()).rejects.toThrow("Unable to connect to matrix, matrixUserId is null")
        })

        it("should Call clearStore when oldMatrixId !== newMatrixI",async ()=>{
            //oldFromLocalStorage
            //newFrom login token or guestAccess
            const spyClearStore = vi.fn();
            const mockClient = {
                login : ()=>{
                    return {
                        user_id :  "matrixIdFromLogin", 
                        access_token : null, 
                        refresh_token : null, 
                        expires_in_ms : ""
                    }
                },
                registerGuest : ()=>{
                    return {
                        access_token: "accessToken",
                        refresh_token:null,
                        user_id:"matrixIdFromRegisterGuest"
                    }
                },
                setGuest : ()=>{},
                clearStores : spyClearStore
            };

            const createClient = vi.fn().mockReturnValue(mockClient);

            const matrixBaseURL = "testUrl";

            const localUserStoreMock : MatrixLocalUserStore = {
                getLocalUser: vi.fn().mockReturnValue({
                    uuid: "myUuid",
                    email: "",
                    isMatrixRegistered: false,
                    matrixUserId: "matrixIdFromLocalUser"
                })
                ,
                getMatrixDeviceId: vi.fn().mockReturnValue(null),
                getMatrixAccessToken: vi.fn().mockReturnValue(null),
                getMatrixRefreshToken: vi.fn().mockReturnValue(null),
                getMatrixUserId: vi.fn().mockReturnValue(null),
                getMatrixLoginToken:vi.fn().mockReturnValue(null),
                setMatrixDeviceId: vi.fn(),
                setMatrixLoginToken: function (loginToken: string | null): void {
                    throw new Error("setMatrixLoginToken not implemented.");
                },
                setMatrixUserId: vi.fn(),
                setMatrixAccessToken: vi.fn(),
                setMatrixRefreshToken: vi.fn(),
                setMatrixAccessTokenExpireDate: vi.fn(),
                getName:  vi.fn().mockReturnValue(""),
            };

            const mock = vi.spyOn(MatrixClientWrapper.prototype as any,'matrixWebClientStore').mockReturnValue({})
            const matrixClientWrapperInstance : MatrixClientWrapperInterface = new MatrixClientWrapper(matrixBaseURL,localUserStoreMock,createClient);
            
            
            await matrixClientWrapperInstance.initMatrixClient()
            expect(spyClearStore).toHaveBeenCalledOnce()

        })

        it("should call final create client with user Information when user have a matrix account",()=>{
            expect(true).toBe(false);
        })
        
        it("should call final create client with new guest account Information when user have not a matrix account",()=>{
            expect(true).toBe(false);
        })
    })
});



/*
    localUserStore {
        getLocalUser()?.uuid
        setMatrixDeviceId(deviceId, userId);
        localUserStore.getMatrixAccessToken();
        localUserStore.getMatrixRefreshToken();
        localUserStore.getMatrixUserId();
        localUserStore.getMatrixLoginToken();
        localUserStore.setMatrixUserId(user_id);
        localUserStore.setMatrixAccessToken(access_token);
        localUserStore.setMatrixRefreshToken(refresh_token ?? null);
        localUserStore.setMatrixAccessTokenExpireDate(expireDate);
    }

    createClient from matrix js sdk ==> client 

    client {
        login("",{
            token: loginToken,
            device_id: deviceId,
            initial_device_display_name: "WorkAdventure",
        })

        registerGuest
        client.setGuest(true);
        clearStore
    }
*/