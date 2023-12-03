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
         "PLAY_URL": "https://play-"+url,
         "SECRET_KEY": "tempSecretKeyNeedsToChange",
         "JITSI_ISS": env.JITSI_ISS,
         "JITSI_URL": env.JITSI_URL,
         "SECRET_JITSI_KEY": env.SECRET_JITSI_KEY,
         "TURN_STATIC_AUTH_SECRET": env.TURN_STATIC_AUTH_SECRET,
         "REDIS_HOST": "redis",
         "REDIS_PORT": "6379",
         "PROMETHEUS_AUTHORIZATION_TOKEN": "promToken",
         "BBB_URL": "https://test-install.blindsidenetworks.com/bigbluebutton/",
         "MAP_STORAGE_URL": "map-storage:50053",
         "PUBLIC_MAP_STORAGE_URL": "https://map-storage-"+url,
         "INTERNAL_MAP_STORAGE_URL": "http://map-storage:3000",
         "BBB_SECRET": "8cd8ef52e8e101574e400365b55e11a6",
         "EJABBERD_USER": "admin",
         "EJABBERD_PASSWORD": "apideo",
         "ENABLE_MAP_EDITOR":"true",
         "DEBUG": "*",
       } + (if adminUrl != null then {
         "ADMIN_API_URL": adminUrl,
         "ADMIN_API_TOKEN": env.ADMIN_API_TOKEN,
         "EJABBERD_API_URI": "http://xmpp-"+std.strReplace(adminUrl, "https://", "")+"/api/",
         "TELEMETRY_URL": adminUrl,
       } else {
         "EJABBERD_API_URI": "http://ejabberd:5443/api/",
         "TELEMETRY_URL": "https://staging.workadventu.re",
       })
     },
     "back2": {
            "image": "thecodingmachine/workadventure-back:"+tag,
            "host": {
              "url": "api2-"+url,
              "containerPort": 8080
            },
            "ports": [8080, 50051],
            "env": {
              "PLAY_URL": "https://play-"+url,
              "SECRET_KEY": "tempSecretKeyNeedsToChange",
              "JITSI_ISS": env.JITSI_ISS,
              "JITSI_URL": env.JITSI_URL,
              "SECRET_JITSI_KEY": env.SECRET_JITSI_KEY,
              "TURN_STATIC_AUTH_SECRET": env.TURN_STATIC_AUTH_SECRET,
              "REDIS_HOST": "redis",
              "REDIS_PORT": "6379",
              "PROMETHEUS_AUTHORIZATION_TOKEN": "promToken",
              "BBB_URL": "https://test-install.blindsidenetworks.com/bigbluebutton/",
              "BBB_SECRET": "8cd8ef52e8e101574e400365b55e11a6",
              "MAP_STORAGE_URL": "map-storage:50053",
              "PUBLIC_MAP_STORAGE_URL": "https://map-storage-"+url,
              "INTERNAL_MAP_STORAGE_URL": "http://map-storage:3000",
              "EJABBERD_USER": "admin",
              "EJABBERD_PASSWORD": "apideo",
              "ENABLE_MAP_EDITOR":"true",
              "DEBUG": "*",
            } + (if adminUrl != null then {
              "ADMIN_API_URL": adminUrl,
              "ADMIN_API_TOKEN": env.ADMIN_API_TOKEN,
              "EJABBERD_API_URI": "http://xmpp-"+std.strReplace(adminUrl, "https://", "")+"/api/",
              "TELEMETRY_URL": adminUrl,
            } else {
              "EJABBERD_API_URI": "http://ejabberd:5443/api/",
              "TELEMETRY_URL": "https://staging.workadventu.re",
            })
     },
     "play": {
        "replicas": 2,
        "image": "thecodingmachine/workadventure-play:"+tag,
        "host": {
          "url": "play-"+url,
          "containerPort": 3000
        },
        "ports": [3000],
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
          "UPLOADER_URL": "https://uploader-"+url,
          #POSTHOG
          "POSTHOG_API_KEY": if namespace == "master" then env.POSTHOG_API_KEY else "",
          "POSTHOG_URL": if namespace == "master" then env.POSTHOG_URL else "",
          "TURN_SERVER": "turn:coturn.workadventure.fr:443,turns:coturn.workadventure.fr:443",
          "JITSI_PRIVATE_MODE": if env.SECRET_JITSI_KEY != '' then "true" else "false",
          "ENABLE_MAP_EDITOR":"true",
          "FEATURE_FLAG_BROADCAST_AREAS":"true",
          "ICON_URL": "https://icon-"+url,
          "CHAT_URL": "https://chat-"+url,
          "LOGROCKET_ID": env.LOGROCKET_ID,
          "ROOM_API_PORT": "50051",
          "DEBUG": "*",
          "PEER_VIDEO_LOW_BANDWIDTH": "150",
          "PEER_VIDEO_RECOMMENDED_BANDWIDTH": "600",
          "PEER_SCREEN_SHARE_LOW_BANDWIDTH": "250",
          "PEER_SCREEN_SHARE_RECOMMENDED_BANDWIDTH":"1000",
          "JITSI_DOMAIN": "coremeet.workadventu.re",
          "JITSI_XMPP_DOMAIN": "prosody.workadventu.re",
          "JITSI_MUC_DOMAIN": "muc.prosody.workadventu.re",
          # Integration tools
          "KLAXOON_ENABLED": "true",
          "KLAXOON_CLIENT_ID": env.KLAXOON_CLIENT_ID,
          "YOUTUBE_ENABLED": "true",
          "GOOGLE_DOCS_ENABLED": "true",
          "GOOGLE_SHEETS_ENABLED": "true",
          "GOOGLE_SLIDES_ENABLED": "true",
          "ERASER_ENABLED": "true",
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
          "START_ROOM_URL": "/~/maps/map.wam",
        } else {
          # Ejabberd
          "EJABBERD_DOMAIN": "xmpp-"+url,
          "EJABBERD_JWT_SECRET": env.EJABBERD_JWT_SECRET,
          # Room API
          "ROOM_API_SECRET_KEY": "ROOM_API_SECRET_KEY",
        })
      },
    "chat": {
      "image": "thecodingmachine/workadventure-chat:"+tag,
      "host": {
        "url": "chat-"+url,
      },
      "ports": [80],
      "env": {
        "PUSHER_URL": "//play-"+url,
        "UPLOADER_URL": "//uploader-"+url,
        "EMBEDLY_KEY": if std.objectHas(env, 'EMBEDLY_KEY') then env.EMBEDLY_KEY else "",
        "ICON_URL": "//icon-"+url,
        "EJABBERD_WS_URI": "wss://xmpp-"+url+"/ws",
        "EJABBERD_DOMAIN": "xmpp-"+url,
      } + (if adminUrl != null then {
        # Admin
        "ENABLE_OPENID": "1",
      } else {})
    },
    "map-storage": {
           "image": "thecodingmachine/workadventure-map-storage:"+tag,
           "host": {
             "url": "map-storage-"+url,
             "containerPort": 3000
           },
           "ports": [3000, 50053],
           "env": {
             "API_URL": "back1:50051,back2:50051",
             "PROMETHEUS_AUTHORIZATION_TOKEN": "promToken",
             "AUTHENTICATION_STRATEGY": if (adminUrl == null) then "Basic" else "Bearer",
             "AUTHENTICATION_USER": "john.doe",
             "AUTHENTICATION_PASSWORD": "password",
             "AUTHENTICATION_TOKEN": "SomeSecretToken",
             "USE_DOMAIN_NAME_IN_PATH": if (adminUrl == null) then "false" else "true",
             "DEBUG": "*",
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
      "image": "matthiasluedtke/iconserver:v3.15.0",
      "host": {
        "url": "icon-"+url,
        "containerPort": 8080,
      },
      "ports": [8080]
    },
  }+ (if (adminUrl == null) then {
    "ejabberd": {
      "image": "thecodingmachine/workadventure-ejabberd:"+tag,
      "ports": [5222, 5269, 5443, 5280, 5380, 1883],
      "host": {
          "url": "xmpp-"+url,
          "containerPort": 5443
      },
      "env": {
        "JWT_SECRET": env.EJABBERD_JWT_SECRET,
        "EJABBERD_DOMAIN": "xmpp-"+url,
        "EJABBERD_USER": "admin",
        "EJABBERD_PASSWORD": "apideo",
      }
    }
  } else {
  }),
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
          play+: {
            deployment+: {
              spec+: {
                template+: {
                  metadata+: {
                    annotations+: {
                      "prometheus.io/port": "3000",
                      "prometheus.io/scrape": "true"
                    }
                  }
                }
              }
            },
            serviceroomapi: {
                "apiVersion": "v1",
                "kind": "Service",
                "metadata": {
                    "annotations": {
                        "traefik.ingress.kubernetes.io/service.serversscheme": "h2c"
                    },
                    "name": "room-api"
                },
                "spec": {
                    "ports": [
                        {
                            "name": "room-api-p50051",
                            "port": 50051,
                            "protocol": "TCP",
                            "targetPort": 50051
                        }
                    ],
                    "selector": {
                        "name": "play"
                    },
                    "type": "ClusterIP"
                }
            },
            ingress+: {
              spec+: {
                rules+:[
                  {
                    host: "room-api-"+url,
                    http: {
                      paths: [
                        {
                          backend: {
                            service: {
                              name: "room-api",
                              port: {
                                number: 50051
                              }
                            }
                          },
                          pathType: "ImplementationSpecific"
                        }
                      ]
                    }
                  }
                ],
                tls+: [{
                  hosts: ["play-"+url, "room-api-"+url],
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
          "map-storage"+: {
            ingress+: {
              spec+: {
                tls+: [{
                  hosts: ["map-storage-"+url],
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
        } + (if (adminUrl == null) then {
             ejabberd+: {
                 ingress+: {
                   spec+: {
                     tls+: [{
                       hosts: ["xmpp-"+url],
                       secretName: "certificate-tls"
                     }]
                   }
                 }
               },
        } else {
        }),
  }
}
