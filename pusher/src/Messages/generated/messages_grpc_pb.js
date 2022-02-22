// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('grpc');
var messages_pb = require('./messages_pb.js');

function serialize_AdminGlobalMessage(arg) {
  if (!(arg instanceof messages_pb.AdminGlobalMessage)) {
    throw new Error('Expected argument of type AdminGlobalMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_AdminGlobalMessage(buffer_arg) {
  return messages_pb.AdminGlobalMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_AdminMessage(arg) {
  if (!(arg instanceof messages_pb.AdminMessage)) {
    throw new Error('Expected argument of type AdminMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_AdminMessage(buffer_arg) {
  return messages_pb.AdminMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_AdminPusherToBackMessage(arg) {
  if (!(arg instanceof messages_pb.AdminPusherToBackMessage)) {
    throw new Error('Expected argument of type AdminPusherToBackMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_AdminPusherToBackMessage(buffer_arg) {
  return messages_pb.AdminPusherToBackMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_AdminRoomMessage(arg) {
  if (!(arg instanceof messages_pb.AdminRoomMessage)) {
    throw new Error('Expected argument of type AdminRoomMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_AdminRoomMessage(buffer_arg) {
  return messages_pb.AdminRoomMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_BanMessage(arg) {
  if (!(arg instanceof messages_pb.BanMessage)) {
    throw new Error('Expected argument of type BanMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_BanMessage(buffer_arg) {
  return messages_pb.BanMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_BatchToPusherMessage(arg) {
  if (!(arg instanceof messages_pb.BatchToPusherMessage)) {
    throw new Error('Expected argument of type BatchToPusherMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_BatchToPusherMessage(buffer_arg) {
  return messages_pb.BatchToPusherMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_BatchToPusherRoomMessage(arg) {
  if (!(arg instanceof messages_pb.BatchToPusherRoomMessage)) {
    throw new Error('Expected argument of type BatchToPusherRoomMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_BatchToPusherRoomMessage(buffer_arg) {
  return messages_pb.BatchToPusherRoomMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_EmptyMessage(arg) {
  if (!(arg instanceof messages_pb.EmptyMessage)) {
    throw new Error('Expected argument of type EmptyMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_EmptyMessage(buffer_arg) {
  return messages_pb.EmptyMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_PusherToBackMessage(arg) {
  if (!(arg instanceof messages_pb.PusherToBackMessage)) {
    throw new Error('Expected argument of type PusherToBackMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_PusherToBackMessage(buffer_arg) {
  return messages_pb.PusherToBackMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_RefreshRoomPromptMessage(arg) {
  if (!(arg instanceof messages_pb.RefreshRoomPromptMessage)) {
    throw new Error('Expected argument of type RefreshRoomPromptMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_RefreshRoomPromptMessage(buffer_arg) {
  return messages_pb.RefreshRoomPromptMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_RoomMessage(arg) {
  if (!(arg instanceof messages_pb.RoomMessage)) {
    throw new Error('Expected argument of type RoomMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_RoomMessage(buffer_arg) {
  return messages_pb.RoomMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_ServerToAdminClientMessage(arg) {
  if (!(arg instanceof messages_pb.ServerToAdminClientMessage)) {
    throw new Error('Expected argument of type ServerToAdminClientMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_ServerToAdminClientMessage(buffer_arg) {
  return messages_pb.ServerToAdminClientMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_ServerToClientMessage(arg) {
  if (!(arg instanceof messages_pb.ServerToClientMessage)) {
    throw new Error('Expected argument of type ServerToClientMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_ServerToClientMessage(buffer_arg) {
  return messages_pb.ServerToClientMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_WorldFullWarningToRoomMessage(arg) {
  if (!(arg instanceof messages_pb.WorldFullWarningToRoomMessage)) {
    throw new Error('Expected argument of type WorldFullWarningToRoomMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_WorldFullWarningToRoomMessage(buffer_arg) {
  return messages_pb.WorldFullWarningToRoomMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_ZoneMessage(arg) {
  if (!(arg instanceof messages_pb.ZoneMessage)) {
    throw new Error('Expected argument of type ZoneMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_ZoneMessage(buffer_arg) {
  return messages_pb.ZoneMessage.deserializeBinary(new Uint8Array(buffer_arg));
}


// *
// Service handled by the "back". Pusher servers connect to this service.
var RoomManagerService = exports.RoomManagerService = {
  joinRoom: {
    path: '/RoomManager/joinRoom',
    requestStream: true,
    responseStream: true,
    requestType: messages_pb.PusherToBackMessage,
    responseType: messages_pb.ServerToClientMessage,
    requestSerialize: serialize_PusherToBackMessage,
    requestDeserialize: deserialize_PusherToBackMessage,
    responseSerialize: serialize_ServerToClientMessage,
    responseDeserialize: deserialize_ServerToClientMessage,
  },
  // Holds a connection between one given client and the back
listenZone: {
    path: '/RoomManager/listenZone',
    requestStream: false,
    responseStream: true,
    requestType: messages_pb.ZoneMessage,
    responseType: messages_pb.BatchToPusherMessage,
    requestSerialize: serialize_ZoneMessage,
    requestDeserialize: deserialize_ZoneMessage,
    responseSerialize: serialize_BatchToPusherMessage,
    responseDeserialize: deserialize_BatchToPusherMessage,
  },
  // Connection used to send to a pusher messages related to a given zone of a given room
listenRoom: {
    path: '/RoomManager/listenRoom',
    requestStream: false,
    responseStream: true,
    requestType: messages_pb.RoomMessage,
    responseType: messages_pb.BatchToPusherRoomMessage,
    requestSerialize: serialize_RoomMessage,
    requestDeserialize: deserialize_RoomMessage,
    responseSerialize: serialize_BatchToPusherRoomMessage,
    responseDeserialize: deserialize_BatchToPusherRoomMessage,
  },
  // Connection used to send to a pusher messages related to a given room
adminRoom: {
    path: '/RoomManager/adminRoom',
    requestStream: true,
    responseStream: true,
    requestType: messages_pb.AdminPusherToBackMessage,
    responseType: messages_pb.ServerToAdminClientMessage,
    requestSerialize: serialize_AdminPusherToBackMessage,
    requestDeserialize: deserialize_AdminPusherToBackMessage,
    responseSerialize: serialize_ServerToAdminClientMessage,
    responseDeserialize: deserialize_ServerToAdminClientMessage,
  },
  sendAdminMessage: {
    path: '/RoomManager/sendAdminMessage',
    requestStream: false,
    responseStream: false,
    requestType: messages_pb.AdminMessage,
    responseType: messages_pb.EmptyMessage,
    requestSerialize: serialize_AdminMessage,
    requestDeserialize: deserialize_AdminMessage,
    responseSerialize: serialize_EmptyMessage,
    responseDeserialize: deserialize_EmptyMessage,
  },
  sendGlobalAdminMessage: {
    path: '/RoomManager/sendGlobalAdminMessage',
    requestStream: false,
    responseStream: false,
    requestType: messages_pb.AdminGlobalMessage,
    responseType: messages_pb.EmptyMessage,
    requestSerialize: serialize_AdminGlobalMessage,
    requestDeserialize: deserialize_AdminGlobalMessage,
    responseSerialize: serialize_EmptyMessage,
    responseDeserialize: deserialize_EmptyMessage,
  },
  ban: {
    path: '/RoomManager/ban',
    requestStream: false,
    responseStream: false,
    requestType: messages_pb.BanMessage,
    responseType: messages_pb.EmptyMessage,
    requestSerialize: serialize_BanMessage,
    requestDeserialize: deserialize_BanMessage,
    responseSerialize: serialize_EmptyMessage,
    responseDeserialize: deserialize_EmptyMessage,
  },
  sendAdminMessageToRoom: {
    path: '/RoomManager/sendAdminMessageToRoom',
    requestStream: false,
    responseStream: false,
    requestType: messages_pb.AdminRoomMessage,
    responseType: messages_pb.EmptyMessage,
    requestSerialize: serialize_AdminRoomMessage,
    requestDeserialize: deserialize_AdminRoomMessage,
    responseSerialize: serialize_EmptyMessage,
    responseDeserialize: deserialize_EmptyMessage,
  },
  sendWorldFullWarningToRoom: {
    path: '/RoomManager/sendWorldFullWarningToRoom',
    requestStream: false,
    responseStream: false,
    requestType: messages_pb.WorldFullWarningToRoomMessage,
    responseType: messages_pb.EmptyMessage,
    requestSerialize: serialize_WorldFullWarningToRoomMessage,
    requestDeserialize: deserialize_WorldFullWarningToRoomMessage,
    responseSerialize: serialize_EmptyMessage,
    responseDeserialize: deserialize_EmptyMessage,
  },
  sendRefreshRoomPrompt: {
    path: '/RoomManager/sendRefreshRoomPrompt',
    requestStream: false,
    responseStream: false,
    requestType: messages_pb.RefreshRoomPromptMessage,
    responseType: messages_pb.EmptyMessage,
    requestSerialize: serialize_RefreshRoomPromptMessage,
    requestDeserialize: deserialize_RefreshRoomPromptMessage,
    responseSerialize: serialize_EmptyMessage,
    responseDeserialize: deserialize_EmptyMessage,
  },
};

exports.RoomManagerClient = grpc.makeGenericClientConstructor(RoomManagerService);
