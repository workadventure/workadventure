# Uploader

The uploader component stores the global audio messages that admins send to everyone on a map.
Messages are kept for 60 seconds, in Redis.

## Redis Storage

You must set up the following variables:
- REDIS_HOST
- REDIS_PORT

Optionally:
- REDIS_DB_NUMBER
- REDIS_PASSWORD
- UPLOAD_MAX_FILESIZE: the maximum size of an audio message, in bytes (100 MB by default)
