import { describe, expect, vi } from "vitest";
import { MatrixChatConnection } from "../MatrixChatConnection";
import { Connection } from "../../ChatConnection";
import { MatrixClientWrapperInterface } from "../MatrixClientWrapper";
import { MatrixClient } from "matrix-js-sdk";

describe("Matrix Chat Connection ",()=>{
    describe("EventListener",()=>{

        const mockConnection : Connection = {
            queryChatMembers : vi.fn()
        };

        const eventListenersMap = new Map<string,Function>();
        const mockClient  = {
            on : (eventName : string , callBack : Function) =>{
                eventListenersMap.set(eventName,callBack);
            },
            startClient : vi.fn(),
            store : {
                startup : vi.fn()
            }
        };

        const mockMatrixClientWrapper : MatrixClientWrapperInterface= {
            initMatrixClient: ()=> { 
                return Promise.resolve(mockClient) as unknown as Promise<MatrixClient>
            }
        };
        const matrixChatConnectionInstance = new MatrixChatConnection(mockConnection,mockMatrixClientWrapper);

        expect(eventListenersMap.size).toBe(5);


    });
    //mock connection et matrixClientWrapper avec init

    /*
        StartMatrixClient : 
            - vérifier qu'on start le client et startup les stores
            - voir comment on gere le on et les tests de events listeners
             add 

    
    */
});