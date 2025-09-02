/**
 * Protobuf does not allow "required" objects in messages. As a result, all TS interfaces generated from protobuf messages
 * have all fields pointing to objects as potentially undefined. This is a problem for us because we need to add
 * unnecessary checks for undefined fields in our code. Those transformers cast the generated interfaces to interfaces
 * with object fields being required.
 */
import {
  AddSpaceUserMessage,
  UpdateSpaceUserMessage,
} from "../ts-proto-generated/messages";
import { noUndefinedForKeys, type RequiredFields } from "./undefinedChecker";
