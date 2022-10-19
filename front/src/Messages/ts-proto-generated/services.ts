/* eslint-disable */
import {
  CallOptions,
  ChannelCredentials,
  ChannelOptions,
  Client,
  ClientDuplexStream,
  ClientReadableStream,
  ClientUnaryCall,
  handleBidiStreamingCall,
  handleServerStreamingCall,
  handleUnaryCall,
  makeGenericClientConstructor,
  Metadata,
  ServiceError,
  UntypedServiceImplementation,
} from "@grpc/grpc-js";
import {
  AdminGlobalMessage,
  AdminMessage,
  AdminPusherToBackMessage,
  AdminRoomMessage,
  BanMessage,
  BatchToPusherMessage,
  BatchToPusherRoomMessage,
  EditMapCommandMessage,
  EditMapCommandWithKeyMessage,
  EmptyMessage,
  PingMessage,
  PusherToBackMessage,
  RefreshRoomPromptMessage,
  RoomMessage,
  RoomsList,
  ServerToAdminClientMessage,
  ServerToClientMessage,
  WorldFullWarningToRoomMessage,
  ZoneMessage,
} from "./messages";

export const protobufPackage = "";

/** Service handled by the "back". Pusher servers connect to this service. */
export type RoomManagerService = typeof RoomManagerService;
export const RoomManagerService = {
  /** Holds a connection between one given client and the back */
  joinRoom: {
    path: "/RoomManager/joinRoom",
    requestStream: true,
    responseStream: true,
    requestSerialize: (value: PusherToBackMessage) => Buffer.from(PusherToBackMessage.encode(value).finish()),
    requestDeserialize: (value: Buffer) => PusherToBackMessage.decode(value),
    responseSerialize: (value: ServerToClientMessage) => Buffer.from(ServerToClientMessage.encode(value).finish()),
    responseDeserialize: (value: Buffer) => ServerToClientMessage.decode(value),
  },
  /** Connection used to send to a pusher messages related to a given zone of a given room */
  listenZone: {
    path: "/RoomManager/listenZone",
    requestStream: false,
    responseStream: true,
    requestSerialize: (value: ZoneMessage) => Buffer.from(ZoneMessage.encode(value).finish()),
    requestDeserialize: (value: Buffer) => ZoneMessage.decode(value),
    responseSerialize: (value: BatchToPusherMessage) => Buffer.from(BatchToPusherMessage.encode(value).finish()),
    responseDeserialize: (value: Buffer) => BatchToPusherMessage.decode(value),
  },
  /** Connection used to send to a pusher messages related to a given room */
  listenRoom: {
    path: "/RoomManager/listenRoom",
    requestStream: false,
    responseStream: true,
    requestSerialize: (value: RoomMessage) => Buffer.from(RoomMessage.encode(value).finish()),
    requestDeserialize: (value: Buffer) => RoomMessage.decode(value),
    responseSerialize: (value: BatchToPusherRoomMessage) =>
      Buffer.from(BatchToPusherRoomMessage.encode(value).finish()),
    responseDeserialize: (value: Buffer) => BatchToPusherRoomMessage.decode(value),
  },
  adminRoom: {
    path: "/RoomManager/adminRoom",
    requestStream: true,
    responseStream: true,
    requestSerialize: (value: AdminPusherToBackMessage) => Buffer.from(AdminPusherToBackMessage.encode(value).finish()),
    requestDeserialize: (value: Buffer) => AdminPusherToBackMessage.decode(value),
    responseSerialize: (value: ServerToAdminClientMessage) =>
      Buffer.from(ServerToAdminClientMessage.encode(value).finish()),
    responseDeserialize: (value: Buffer) => ServerToAdminClientMessage.decode(value),
  },
  sendAdminMessage: {
    path: "/RoomManager/sendAdminMessage",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: AdminMessage) => Buffer.from(AdminMessage.encode(value).finish()),
    requestDeserialize: (value: Buffer) => AdminMessage.decode(value),
    responseSerialize: (value: EmptyMessage) => Buffer.from(EmptyMessage.encode(value).finish()),
    responseDeserialize: (value: Buffer) => EmptyMessage.decode(value),
  },
  sendGlobalAdminMessage: {
    path: "/RoomManager/sendGlobalAdminMessage",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: AdminGlobalMessage) => Buffer.from(AdminGlobalMessage.encode(value).finish()),
    requestDeserialize: (value: Buffer) => AdminGlobalMessage.decode(value),
    responseSerialize: (value: EmptyMessage) => Buffer.from(EmptyMessage.encode(value).finish()),
    responseDeserialize: (value: Buffer) => EmptyMessage.decode(value),
  },
  ban: {
    path: "/RoomManager/ban",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: BanMessage) => Buffer.from(BanMessage.encode(value).finish()),
    requestDeserialize: (value: Buffer) => BanMessage.decode(value),
    responseSerialize: (value: EmptyMessage) => Buffer.from(EmptyMessage.encode(value).finish()),
    responseDeserialize: (value: Buffer) => EmptyMessage.decode(value),
  },
  sendAdminMessageToRoom: {
    path: "/RoomManager/sendAdminMessageToRoom",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: AdminRoomMessage) => Buffer.from(AdminRoomMessage.encode(value).finish()),
    requestDeserialize: (value: Buffer) => AdminRoomMessage.decode(value),
    responseSerialize: (value: EmptyMessage) => Buffer.from(EmptyMessage.encode(value).finish()),
    responseDeserialize: (value: Buffer) => EmptyMessage.decode(value),
  },
  sendWorldFullWarningToRoom: {
    path: "/RoomManager/sendWorldFullWarningToRoom",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: WorldFullWarningToRoomMessage) =>
      Buffer.from(WorldFullWarningToRoomMessage.encode(value).finish()),
    requestDeserialize: (value: Buffer) => WorldFullWarningToRoomMessage.decode(value),
    responseSerialize: (value: EmptyMessage) => Buffer.from(EmptyMessage.encode(value).finish()),
    responseDeserialize: (value: Buffer) => EmptyMessage.decode(value),
  },
  sendRefreshRoomPrompt: {
    path: "/RoomManager/sendRefreshRoomPrompt",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: RefreshRoomPromptMessage) => Buffer.from(RefreshRoomPromptMessage.encode(value).finish()),
    requestDeserialize: (value: Buffer) => RefreshRoomPromptMessage.decode(value),
    responseSerialize: (value: EmptyMessage) => Buffer.from(EmptyMessage.encode(value).finish()),
    responseDeserialize: (value: Buffer) => EmptyMessage.decode(value),
  },
  getRooms: {
    path: "/RoomManager/getRooms",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: EmptyMessage) => Buffer.from(EmptyMessage.encode(value).finish()),
    requestDeserialize: (value: Buffer) => EmptyMessage.decode(value),
    responseSerialize: (value: RoomsList) => Buffer.from(RoomsList.encode(value).finish()),
    responseDeserialize: (value: Buffer) => RoomsList.decode(value),
  },
  ping: {
    path: "/RoomManager/ping",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: PingMessage) => Buffer.from(PingMessage.encode(value).finish()),
    requestDeserialize: (value: Buffer) => PingMessage.decode(value),
    responseSerialize: (value: PingMessage) => Buffer.from(PingMessage.encode(value).finish()),
    responseDeserialize: (value: Buffer) => PingMessage.decode(value),
  },
} as const;

export interface RoomManagerServer extends UntypedServiceImplementation {
  /** Holds a connection between one given client and the back */
  joinRoom: handleBidiStreamingCall<PusherToBackMessage, ServerToClientMessage>;
  /** Connection used to send to a pusher messages related to a given zone of a given room */
  listenZone: handleServerStreamingCall<ZoneMessage, BatchToPusherMessage>;
  /** Connection used to send to a pusher messages related to a given room */
  listenRoom: handleServerStreamingCall<RoomMessage, BatchToPusherRoomMessage>;
  adminRoom: handleBidiStreamingCall<AdminPusherToBackMessage, ServerToAdminClientMessage>;
  sendAdminMessage: handleUnaryCall<AdminMessage, EmptyMessage>;
  sendGlobalAdminMessage: handleUnaryCall<AdminGlobalMessage, EmptyMessage>;
  ban: handleUnaryCall<BanMessage, EmptyMessage>;
  sendAdminMessageToRoom: handleUnaryCall<AdminRoomMessage, EmptyMessage>;
  sendWorldFullWarningToRoom: handleUnaryCall<WorldFullWarningToRoomMessage, EmptyMessage>;
  sendRefreshRoomPrompt: handleUnaryCall<RefreshRoomPromptMessage, EmptyMessage>;
  getRooms: handleUnaryCall<EmptyMessage, RoomsList>;
  ping: handleUnaryCall<PingMessage, PingMessage>;
}

export interface RoomManagerClient extends Client {
  /** Holds a connection between one given client and the back */
  joinRoom(): ClientDuplexStream<PusherToBackMessage, ServerToClientMessage>;
  joinRoom(options: Partial<CallOptions>): ClientDuplexStream<PusherToBackMessage, ServerToClientMessage>;
  joinRoom(
    metadata: Metadata,
    options?: Partial<CallOptions>,
  ): ClientDuplexStream<PusherToBackMessage, ServerToClientMessage>;
  /** Connection used to send to a pusher messages related to a given zone of a given room */
  listenZone(request: ZoneMessage, options?: Partial<CallOptions>): ClientReadableStream<BatchToPusherMessage>;
  listenZone(
    request: ZoneMessage,
    metadata?: Metadata,
    options?: Partial<CallOptions>,
  ): ClientReadableStream<BatchToPusherMessage>;
  /** Connection used to send to a pusher messages related to a given room */
  listenRoom(request: RoomMessage, options?: Partial<CallOptions>): ClientReadableStream<BatchToPusherRoomMessage>;
  listenRoom(
    request: RoomMessage,
    metadata?: Metadata,
    options?: Partial<CallOptions>,
  ): ClientReadableStream<BatchToPusherRoomMessage>;
  adminRoom(): ClientDuplexStream<AdminPusherToBackMessage, ServerToAdminClientMessage>;
  adminRoom(options: Partial<CallOptions>): ClientDuplexStream<AdminPusherToBackMessage, ServerToAdminClientMessage>;
  adminRoom(
    metadata: Metadata,
    options?: Partial<CallOptions>,
  ): ClientDuplexStream<AdminPusherToBackMessage, ServerToAdminClientMessage>;
  sendAdminMessage(
    request: AdminMessage,
    callback: (error: ServiceError | null, response: EmptyMessage) => void,
  ): ClientUnaryCall;
  sendAdminMessage(
    request: AdminMessage,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: EmptyMessage) => void,
  ): ClientUnaryCall;
  sendAdminMessage(
    request: AdminMessage,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: EmptyMessage) => void,
  ): ClientUnaryCall;
  sendGlobalAdminMessage(
    request: AdminGlobalMessage,
    callback: (error: ServiceError | null, response: EmptyMessage) => void,
  ): ClientUnaryCall;
  sendGlobalAdminMessage(
    request: AdminGlobalMessage,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: EmptyMessage) => void,
  ): ClientUnaryCall;
  sendGlobalAdminMessage(
    request: AdminGlobalMessage,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: EmptyMessage) => void,
  ): ClientUnaryCall;
  ban(request: BanMessage, callback: (error: ServiceError | null, response: EmptyMessage) => void): ClientUnaryCall;
  ban(
    request: BanMessage,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: EmptyMessage) => void,
  ): ClientUnaryCall;
  ban(
    request: BanMessage,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: EmptyMessage) => void,
  ): ClientUnaryCall;
  sendAdminMessageToRoom(
    request: AdminRoomMessage,
    callback: (error: ServiceError | null, response: EmptyMessage) => void,
  ): ClientUnaryCall;
  sendAdminMessageToRoom(
    request: AdminRoomMessage,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: EmptyMessage) => void,
  ): ClientUnaryCall;
  sendAdminMessageToRoom(
    request: AdminRoomMessage,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: EmptyMessage) => void,
  ): ClientUnaryCall;
  sendWorldFullWarningToRoom(
    request: WorldFullWarningToRoomMessage,
    callback: (error: ServiceError | null, response: EmptyMessage) => void,
  ): ClientUnaryCall;
  sendWorldFullWarningToRoom(
    request: WorldFullWarningToRoomMessage,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: EmptyMessage) => void,
  ): ClientUnaryCall;
  sendWorldFullWarningToRoom(
    request: WorldFullWarningToRoomMessage,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: EmptyMessage) => void,
  ): ClientUnaryCall;
  sendRefreshRoomPrompt(
    request: RefreshRoomPromptMessage,
    callback: (error: ServiceError | null, response: EmptyMessage) => void,
  ): ClientUnaryCall;
  sendRefreshRoomPrompt(
    request: RefreshRoomPromptMessage,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: EmptyMessage) => void,
  ): ClientUnaryCall;
  sendRefreshRoomPrompt(
    request: RefreshRoomPromptMessage,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: EmptyMessage) => void,
  ): ClientUnaryCall;
  getRooms(request: EmptyMessage, callback: (error: ServiceError | null, response: RoomsList) => void): ClientUnaryCall;
  getRooms(
    request: EmptyMessage,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: RoomsList) => void,
  ): ClientUnaryCall;
  getRooms(
    request: EmptyMessage,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: RoomsList) => void,
  ): ClientUnaryCall;
  ping(request: PingMessage, callback: (error: ServiceError | null, response: PingMessage) => void): ClientUnaryCall;
  ping(
    request: PingMessage,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: PingMessage) => void,
  ): ClientUnaryCall;
  ping(
    request: PingMessage,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: PingMessage) => void,
  ): ClientUnaryCall;
}

export const RoomManagerClient = makeGenericClientConstructor(RoomManagerService, "RoomManager") as unknown as {
  new (address: string, credentials: ChannelCredentials, options?: Partial<ChannelOptions>): RoomManagerClient;
  service: typeof RoomManagerService;
};

/** Service handled by the "map-storage". Back servers connect to this service. */
export type MapStorageService = typeof MapStorageService;
export const MapStorageService = {
  ping: {
    path: "/MapStorage/ping",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: PingMessage) => Buffer.from(PingMessage.encode(value).finish()),
    requestDeserialize: (value: Buffer) => PingMessage.decode(value),
    responseSerialize: (value: PingMessage) => Buffer.from(PingMessage.encode(value).finish()),
    responseDeserialize: (value: Buffer) => PingMessage.decode(value),
  },
  handleEditMapCommandWithKeyMessage: {
    path: "/MapStorage/handleEditMapCommandWithKeyMessage",
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: EditMapCommandWithKeyMessage) =>
      Buffer.from(EditMapCommandWithKeyMessage.encode(value).finish()),
    requestDeserialize: (value: Buffer) => EditMapCommandWithKeyMessage.decode(value),
    responseSerialize: (value: EditMapCommandMessage) => Buffer.from(EditMapCommandMessage.encode(value).finish()),
    responseDeserialize: (value: Buffer) => EditMapCommandMessage.decode(value),
  },
} as const;

export interface MapStorageServer extends UntypedServiceImplementation {
  ping: handleUnaryCall<PingMessage, PingMessage>;
  handleEditMapCommandWithKeyMessage: handleUnaryCall<EditMapCommandWithKeyMessage, EditMapCommandMessage>;
}

export interface MapStorageClient extends Client {
  ping(request: PingMessage, callback: (error: ServiceError | null, response: PingMessage) => void): ClientUnaryCall;
  ping(
    request: PingMessage,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: PingMessage) => void,
  ): ClientUnaryCall;
  ping(
    request: PingMessage,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: PingMessage) => void,
  ): ClientUnaryCall;
  handleEditMapCommandWithKeyMessage(
    request: EditMapCommandWithKeyMessage,
    callback: (error: ServiceError | null, response: EditMapCommandMessage) => void,
  ): ClientUnaryCall;
  handleEditMapCommandWithKeyMessage(
    request: EditMapCommandWithKeyMessage,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: EditMapCommandMessage) => void,
  ): ClientUnaryCall;
  handleEditMapCommandWithKeyMessage(
    request: EditMapCommandWithKeyMessage,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: (error: ServiceError | null, response: EditMapCommandMessage) => void,
  ): ClientUnaryCall;
}

export const MapStorageClient = makeGenericClientConstructor(MapStorageService, "MapStorage") as unknown as {
  new (address: string, credentials: ChannelCredentials, options?: Partial<ChannelOptions>): MapStorageClient;
  service: typeof MapStorageService;
};
