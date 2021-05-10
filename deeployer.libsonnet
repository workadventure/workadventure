{
  local env = std.extVar("env"),
  local namespace = env.DEPLOY_REF,
  local tag = namespace,
  local url = namespace+".test.workadventu.re",
  // develop branch does not use admin because of issue with SSL certificate of admin as of now.
  local adminUrl = if namespace == "master" || namespace == "develop" || std.startsWith(namespace, "admin") then "https://"+url else null,
  "$schema": "https://raw.githubusercontent.com/thecodingmachine/deeployer/master/deeployer.schema.json",
  "version": "1.0",
  "containers": {
     "back1": {
       "image": "thecodingmachine/workadventure-back:"+tag,
       "host": {
         "url": "api1."+url,
         "https": "enable",
         "containerPort": 8080
       },
       "ports": [8080, 50051],
       "env": {
         "SECRET_KEY": "tempSecretKeyNeedsToChange",
         "ADMIN_API_TOKEN": env.ADMIN_API_TOKEN,
         "JITSI_ISS": env.JITSI_ISS,
         "JITSI_URL": env.JITSI_URL,
         "SECRET_JITSI_KEY": env.SECRET_JITSI_KEY,
         "TURN_STATIC_AUTH_SECRET": env.TURN_STATIC_AUTH_SECRET,
       } + (if adminUrl != null then {
         "ADMIN_API_URL": adminUrl,
       } else {})
     },
     "back2": {
            "image": "thecodingmachine/workadventure-back:"+tag,
            "host": {
              "url": "api2."+url,
              "https": "enable",
              "containerPort": 8080
            },
            "ports": [8080, 50051],
            "env": {
              "SECRET_KEY": "tempSecretKeyNeedsToChange",
              "ADMIN_API_TOKEN": env.ADMIN_API_TOKEN,
              "JITSI_ISS": env.JITSI_ISS,
              "JITSI_URL": env.JITSI_URL,
              "SECRET_JITSI_KEY": env.SECRET_JITSI_KEY,
              "TURN_STATIC_AUTH_SECRET": env.TURN_STATIC_AUTH_SECRET,
            } + (if adminUrl != null then {
              "ADMIN_API_URL": adminUrl,
            } else {})
          },
     "pusher": {
            "replicas": 2,
            "image": "thecodingmachine/workadventure-pusher:"+tag,
            "host": {
              "url": "pusher."+url,
              "https": "enable"
            },
            "ports": [8080],
            "env": {
              "SECRET_KEY": "tempSecretKeyNeedsToChange",
              "ADMIN_API_TOKEN": env.ADMIN_API_TOKEN,
              "JITSI_ISS": env.JITSI_ISS,
              "JITSI_URL": env.JITSI_URL,
              "API_URL": "back1:50051,back2:50051",
              "SECRET_JITSI_KEY": env.SECRET_JITSI_KEY,
            } + (if adminUrl != null then {
              "ADMIN_API_URL": adminUrl,
            } else {})
          },
    "front": {
      "image": "thecodingmachine/workadventure-front:"+tag,
      "host": {
        "url": "play."+url,
        "https": "enable"
      },
      "ports": [80],
      "env": {
        "PUSHER_URL": "//pusher."+url,
        "UPLOADER_URL": "//uploader."+url,
        "ADMIN_URL": "//"+url,
        "JITSI_URL": env.JITSI_URL,
        "SECRET_JITSI_KEY": env.SECRET_JITSI_KEY,
        "TURN_SERVER": "turn:coturn.workadventu.re:443,turns:coturn.workadventu.re:443",
        "JITSI_PRIVATE_MODE": if env.SECRET_JITSI_KEY != '' then "true" else "false",
        "START_ROOM_URL": "/_/global/maps."+url+"/Floor0/floor0.json"
        //"GA_TRACKING_ID": "UA-10196481-11"
      }
    },
    "uploader": {
           "image": "thecodingmachine/workadventure-uploader:"+tag,
           "host": {
             "url": "uploader."+url,
             "https": "enable",
             "containerPort": 8080
           },
           "ports": [8080],
           "env": {
           }
         },
    "maps": {
      "image": "thecodingmachine/workadventure-maps:"+tag,
      "host": {
        "url": "maps."+url,
        "https": "enable"
      },
      "ports": [80]
    },
  },
  "config": {
    "https": {
      "mail": "d.negrier@thecodingmachine.com"
    },
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
            }
          }
        }
  }
}
