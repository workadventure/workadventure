import {StorageProvider} from "./StorageProvider";
import {s3StorageProvider} from "./S3StorageProvider";
import {redisStorageProvider} from "./RedisStorageProvider";
import {NullStorageProvider} from "./NullStorageProvider";

export const storageProviderService: StorageProvider =
    s3StorageProvider || redisStorageProvider || new NullStorageProvider()

export const tempProviderService = redisStorageProvider || new NullStorageProvider()
