import {redisStorageProvider} from "./RedisStorageProvider";
import {NullStorageProvider} from "./NullStorageProvider";

export const tempProviderService = redisStorageProvider || new NullStorageProvider()
