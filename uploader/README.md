# Uploader

The uploader component is in charge of accepting incoming files that can be downloaded by other users.
It is currently used by administrators of maps to send sounds/recordings to everyone on a map.

To support chat uploads, you need to configure one of the storage providers. There are two supported providers, S3 and Redis.

## S3 Storage

When using S3 Storage, attachments will be links to uploader that will in turn generate S3 pre signed URLS
to let you perform the actual download. These URLs will be used automatically (via redirection) by the client,
therefore it can have a short expiration time. By default, the expiration time is 60 seconds, but you can 
adjust setting the `UPLOADER_AWS_SIGNED_URL_EXPIRATION` environment variable.

The following environment variables must be set:
- AWS_BUCKET
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- AWS_DEFAULT_REGION

The user above should have at least the following permissions in its policy
```
 {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": [
                "arn:aws:s3:::<AWS_BUCKET>",
                "arn:aws:s3:::<AWS_BUCKET>/*"
            ]
        }
    ]
}
```

To avoid manual work, it is recommended to also give the following permissions:
```
    s3:PutBucketCORS
```
The bucket can be private (and that is recommended), but it must allow cors. Uploader will try to set up thes CORSs header,
but it will fail if the provided credentials does not include permissions (s3:PutBucketCORS). If you really don't want to 
provide this permission, you can try setting the configuration by yourself:
  
- Go to the bucket configuration
- Click on the "Permissions" tab
- Scroll down until you find "Cross-origin resource sharing (CORS)"
- Setup CORS to allow incoming from your WA instance, for example:
```json
[
    {
        "AllowedHeaders": [
            "Authorization"
        ],
        "AllowedMethods": [
            "GET",
            "HEAD"
        ],
        "AllowedOrigins": [
            "*"
        ],
        "ExposeHeaders": [
            "Access-Control-Allow-Origin"
        ]
    }
]
```

Notice that "AllowedOrigins" **must** be a wildcard, because to download files, uploader will generate 
a redirection to a presigned URL to the S3 bucket file and upon redirection `Origin` is set to `null`. 
The generated presigned URLs are set to be valid only for 60 seconds, that ensures security of your assets.

## Redis Storage

You must set up the following variables:
- REDIS_HOST 
- REDIS_PORT

Optionally, you can set the instance password:
- REDIS_PASSWORD

## A note on temporary files

As of now, only Redis storage support "temporary files" (for example, audio files). You can have both AWS
and Redis setup and the uploader will favor AWS for permanent files and Redis for temporary files.

# A note on tests

The tests run in separate node instances because Redis and S3 provider configurations conflict in a global way.

