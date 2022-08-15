{
  local env = std.extVar("env"),
  local namespace = env.DEPLOY_REF,
  local tag = namespace,
  local url = namespace+".test.workadventu.re",
  // develop branch does not use admin because of issue with SSL certificate of admin as of now.
  local adminUrl = if std.objectHas(env, 'ADMIN_API_URL') then env.ADMIN_API_URL else null,
  "$schema": "https://raw.githubusercontent.com/thecodingmachine/deeployer/master/deeployer.schema.json",
  "version": "1.0",
  "containers": {
     "back1": {
       "image": "thecodingmachine/workadventure-back:"+tag,
       "host": {
         "url": "api1-"+url,
         "containerPort": 8080
       },
       "ports": [8080, 50051],
       "env": {
         "SECRET_KEY": "tempSecretKeyNeedsToChange",
         "JITSI_ISS": env.JITSI_ISS,
         "JITSI_URL": env.JITSI_URL,
         "SECRET_JITSI_KEY": env.SECRET_JITSI_KEY,
         "TURN_STATIC_AUTH_SECRET": env.TURN_STATIC_AUTH_SECRET,
         "REDIS_HOST": "redis",
         "PROMETHEUS_AUTHORIZATION_TOKEN": "promToken",
         "BBB_URL": "https://test-install.blindsidenetworks.com/bigbluebutton/",
         "MAP_STORAGE_URL": "map-storage:50053",
         "PUBLIC_MAP_STORAGE_URL": "https://map-storage-"+url,
         "BBB_SECRET": "8cd8ef52e8e101574e400365b55e11a6",
       } + (if adminUrl != null then {
         "ADMIN_API_URL": adminUrl,
         "ADMIN_API_TOKEN": env.ADMIN_API_TOKEN,
       } else {})
     },
     "back2": {
            "image": "thecodingmachine/workadventure-back:"+tag,
            "host": {
              "url": "api2-"+url,
              "containerPort": 8080
            },
            "ports": [8080, 50051],
            "env": {
              "SECRET_KEY": "tempSecretKeyNeedsToChange",
              "JITSI_ISS": env.JITSI_ISS,
              "JITSI_URL": env.JITSI_URL,
              "SECRET_JITSI_KEY": env.SECRET_JITSI_KEY,
              "TURN_STATIC_AUTH_SECRET": env.TURN_STATIC_AUTH_SECRET,
              "REDIS_HOST": "redis",
              "PROMETHEUS_AUTHORIZATION_TOKEN": "promToken",
              "BBB_URL": "https://test-install.blindsidenetworks.com/bigbluebutton/",
              "BBB_SECRET": "8cd8ef52e8e101574e400365b55e11a6",
              "MAP_STORAGE_URL": "map-storage:50053",
              "PUBLIC_MAP_STORAGE_URL": "https://map-storage-"+url,
            } + (if adminUrl != null then {
              "ADMIN_API_URL": adminUrl,
              "ADMIN_API_TOKEN": env.ADMIN_API_TOKEN,
            } else {})
          },
     "pusher": {
            "replicas": 2,
            "image": "thecodingmachine/workadventure-pusher:"+tag,
            "host": {
              "url": "pusher-"+url,
            },
            "ports": [8080],
            "env": {
              "SECRET_KEY": "tempSecretKeyNeedsToChange",
              "JITSI_ISS": env.JITSI_ISS,
              "JITSI_URL": env.JITSI_URL,
              "API_URL": "back1:50051,back2:50051",
              "SECRET_JITSI_KEY": env.SECRET_JITSI_KEY,
              "FRONT_URL": "https://play-"+url,
              "PUSHER_URL": "https://pusher-"+url,
              "PUBLIC_MAP_STORAGE_URL": "https://map-storage-"+url,
              "ENABLE_OPENAPI_ENDPOINT": "true",
              "PROMETHEUS_AUTHORIZATION_TOKEN": "promToken",
            } + (if adminUrl != null then {
              # Admin
              "ADMIN_URL": adminUrl,
              "ADMIN_API_URL": adminUrl,
              "ADMIN_API_TOKEN": env.ADMIN_API_TOKEN,
              "ADMIN_SOCKETS_TOKEN": env.ADMIN_SOCKETS_TOKEN,
              # Opid client
              "OPID_CLIENT_ID": "auth-code-client",
              "OPID_CLIENT_SECRET": env.ADMIN_API_TOKEN,
              "OPID_CLIENT_ISSUER": "https://publichydra-"+url,
              "START_ROOM_URL": "/_/global/maps-"+url+"/starter/map.json",
              # Ejabberd
              "EJABBERD_DOMAIN": "xmpp-admin-"+url,
              "EJABBERD_URI": "adminxmpp-"+url,
              "EJABBERD_JWT_SECRET": "tempSecretKeyNeedsToChange",
            } else {})
          },
    "front": {
      "image": "thecodingmachine/workadventure-front:"+tag,
      "host": {
        "url": "play-"+url,
      },
      "ports": [80],
      "env": {
        "PUSHER_URL": "//pusher-"+url,
        "UPLOADER_URL": "//uploader-"+url,
        "JITSI_URL": env.JITSI_URL,
        #POSTHOG
        "POSTHOG_API_KEY": if namespace == "master" then env.POSTHOG_API_KEY else "",
        "POSTHOG_URL": if namespace == "master" then env.POSTHOG_URL else "",
        "SECRET_JITSI_KEY": env.SECRET_JITSI_KEY,
        "TURN_SERVER": "turn:coturn.workadventu.re:443,turns:coturn.workadventu.re:443",
        "JITSI_PRIVATE_MODE": if env.SECRET_JITSI_KEY != '' then "true" else "false",
        "ENABLE_FEATURE_MAP_EDITOR":"true",
        "ICON_URL": "//icon-"+url,
        "CHAT_URL": "//chat-"+url,
      } + (if adminUrl != null then {
         # Admin
         "ADMIN_URL": "//"+url,
         "ENABLE_OPENID": "1",
       } else {})
    },
    "chat": {
      "image": "thecodingmachine/workadventure-chat:"+tag,
      "host": {
        "url": "chat-"+url,
      },
      "ports": [80],
      "env": {
        "PUSHER_URL": "//pusher-"+url,
        "UPLOADER_URL": "//uploader-"+url,
        "CHAT_EMBEDLY_KEY": if std.objectHas(env, 'CHAT_EMBEDLY_KEY') then env.CHAT_EMBEDLY_KEY else "",
      }
    },
    "map-storage": {
           "image": "thecodingmachine/workadventure-map-storage:"+tag,
           "host": {
             "url": "map-storage-"+url,
             "containerPort": 3000
           },
           "ports": [3000],
           "env": {
             "PROMETHEUS_AUTHORIZATION_TOKEN": "promToken",
           }
         },
    "uploaderredis":{
      "image": "redis:7",
      "ports": [6379],
    },
    "uploader": {
           "image": "thecodingmachine/workadventure-uploader:"+tag,
           "replicas": 2,
           "host": {
             "url": "uploader-"+url,
             "containerPort": 8080
           },
           "ports": [8080],
           "env": {
             "UPLOADER_URL": "//uploader-"+url,
             # AWS
             "AWS_ACCESS_KEY_ID": if std.objectHas(env, 'AWS_ACCESS_KEY_ID') then env.AWS_ACCESS_KEY_ID else "",
             "AWS_SECRET_ACCESS_KEY": if std.objectHas(env, 'AWS_SECRET_ACCESS_KEY') then env.AWS_SECRET_ACCESS_KEY else "",
             "AWS_DEFAULT_REGION": if std.objectHas(env, 'AWS_DEFAULT_REGION') then env.AWS_DEFAULT_REGION else "",
             "AWS_BUCKET": if std.objectHas(env, 'AWS_BUCKET') then env.AWS_BUCKET else "",
             "AWS_URL": if std.objectHas(env, 'AWS_URL') then env.AWS_URL else "",
             "AWS_ENDPOINT": if std.objectHas(env, 'AWS_ENDPOINT') then env.AWS_ENDPOINT else "",
             #REDIS
             "REDIS_HOST": "uploaderredis",
             "REDIS_PORT": "6379",
           }
         },
    "maps": {
      "image": "thecodingmachine/workadventure-maps:"+tag,
      "host": {
        "url": "maps-"+url
      },
      "ports": [80],
      "env": {
          "FRONT_URL": "https://play-"+url
      }
    },
    "redis": {
      "image": "redis:6",
      "ports": [6379]
    },
    "iconserver": {
      "image": "matthiasluedtke/iconserver:v3.13.0",
      "host": {
        "url": "icon-"+url,
        "containerPort": 8080,
      },
      "ports": [8080]
    },
  },
  "config": {
    k8sextension(k8sConf)::
        k8sConf + {
          back1+: {
            deployment+: {
              spec+: {
                template+: {
                  metadata+: {
                    annotations+: {
                      "prometheus.io/port": "8080",
                      "prometheus.io/scrape": "true"
                    }
                  }
                }
              }
            },
            ingress+: {
              spec+: {
                tls+: [{
                  hosts: ["api1-"+url],
                  secretName: "certificate-tls"
                }]
              }
            }
          },
          back2+: {
            deployment+: {
              spec+: {
                template+: {
                  metadata+: {
                    annotations+: {
                      "prometheus.io/port": "8080",
                      "prometheus.io/scrape": "true"
                    }
                  }
                }
              }
            },
            ingress+: {
              spec+: {
                tls+: [{
                  hosts: ["api2-"+url],
                  secretName: "certificate-tls"
                }]
              }
            }
          },
          pusher+: {
            deployment+: {
              spec+: {
                template+: {
                  metadata+: {
                    annotations+: {
                      "prometheus.io/port": "8080",
                      "prometheus.io/scrape": "true"
                    }
                  }
                }
              }
            },
            ingress+: {
              spec+: {
                tls+: [{
                  hosts: ["pusher-"+url],
                  secretName: "certificate-tls"
                }]
              }
             }
          },
          front+: {
            ingress+: {
              spec+: {
                tls+: [{
                  hosts: ["play-"+url],
                  secretName: "certificate-tls"
                }]
              }
             }
          },
          uploader+: {
            ingress+: {
              spec+: {
                tls+: [{
                  hosts: ["uploader-"+url],
                  secretName: "certificate-tls"
                }]
              }
             }
          },
          maps+: {
            ingress+: {
              spec+: {
                tls+: [{
                  hosts: ["maps-"+url],
                  secretName: "certificate-tls"
                }]
              }
             }
          },
          iconserver+: {
            ingress+: {
              spec+: {
                tls+: [{
                  hosts: ["icon-"+url],
                  secretName: "certificate-tls"
                }]
              }
             }
          },
        }
  }
}
