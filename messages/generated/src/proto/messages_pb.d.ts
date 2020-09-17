// package: 
// file: src/proto/messages.proto

import * as jspb from "google-protobuf";

export class SetPlayerDetailsMessage extends jspb.Message {
  getName(): string;
  setName(value: string): void;

  clearCharacterlayersList(): void;
  getCharacterlayersList(): Array<string>;
  setCharacterlayersList(value: Array<string>): void;
  addCharacterlayers(value: string, index?: number): string;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SetPlayerDetailsMessage.AsObject;
  static toObject(includeInstance: boolean, msg: SetPlayerDetailsMessage): SetPlayerDetailsMessage.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SetPlayerDetailsMessage, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SetPlayerDetailsMessage;
  static deserializeBinaryFromReader(message: SetPlayerDetailsMessage, reader: jspb.BinaryReader): SetPlayerDetailsMessage;
}

export namespace SetPlayerDetailsMessage {
  export type AsObject = {
    name: string,
    characterlayersList: Array<string>,
  }
}

