import {StorageProvider} from "./StorageProvider.ts";
import {s3StorageProvider} from "./S3StorageProvider.ts";
import {redisStorageProvider} from "./RedisStorageProvider.ts";
import {NullStorageProvider} from "./NullStorageProvider.ts";

export const storageProviderService: StorageProvider =
    s3StorageProvider || redisStorageProvider || new NullStorageProvider()

export const tempProviderService = redisStorageProvider || new NullStorageProvider()
