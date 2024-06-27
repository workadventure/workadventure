import { localUserStore } from "../../Connection/LocalUserStore";
import { RoomConnection } from "../../Connection/RoomConnection";
import { MATRIX_PUBLIC_URI } from "../../Enum/EnvironmentVariable";
import { ChatConnectionInterface, ChatType } from "./ChatConnection";
import { MatrixChatConnection } from "./Matrix/MatrixChatConnection";
import { MatrixClientWrapper } from "./Matrix/MatrixClientWrapper";
import { matrixSecurity } from "./Matrix/MatrixSecurity";
import { ProximityChatConnection } from "./Proximity/ProximityChatConnection";

export class ChatConnectionFactory {
    static async createConnection(chatType: ChatType, connection: RoomConnection): Promise<ChatConnectionInterface> {
        switch (chatType) {
            case "MATRIX":
                try {
                    const matrixClientWrapper = new MatrixClientWrapper(MATRIX_PUBLIC_URI ?? "", localUserStore);
                    const matrixClientPromise = matrixClientWrapper.initMatrixClient();
                    const matrixClient = await matrixClientPromise;
                    matrixSecurity.updateMatrixClientStore(matrixClient);
                    const chatId = localUserStore.getChatId();
                    const email: string | null = localUserStore.getLocalUser()?.email || null;
                    if (email && chatId && connection) connection.emitUpdateChatId(email, chatId);
                    return Promise.resolve(new MatrixChatConnection(connection, matrixClientPromise));
                } catch (e) {
                    console.error(e);
                    return Promise.reject(new Error("Failed to create matrix client"));
                }
                break;
            case "PROXIMITY":
                return Promise.resolve(
                    new ProximityChatConnection(
                        connection,
                        connection.getUserId(),
                        localUserStore.getLocalUser()?.uuid ?? "unknow"
                    )
                );
        }
    }
}
