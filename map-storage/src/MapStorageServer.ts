import { sendUnaryData, ServerUnaryCall } from "@grpc/grpc-js";
import { IMapStorageServer } from "./Messages/generated/messages_grpc_pb";
import { EditMapWithKeyMessage, EmptyMessage, PingMessage } from "./Messages/generated/messages_pb";

const mapStorageServer: IMapStorageServer = {
    ping(call: ServerUnaryCall<PingMessage, EmptyMessage>, callback: sendUnaryData<PingMessage>): void {
        callback(null, call.request);
    },
    handleEditMapWithKeyMessage(
        call: ServerUnaryCall<EditMapWithKeyMessage, EmptyMessage>,
        callback: sendUnaryData<EmptyMessage>
    ): void {
        console.log(call.request.getEditmapmessage());
        callback(null, new EmptyMessage());
    },
};

export { mapStorageServer };
