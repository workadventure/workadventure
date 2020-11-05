{
  local env = std.extVar("env"),
  local namespace = env.GITHUB_REF_SLUG,
  local tag = namespace,
  local url = if namespace == "master" then "workadventu.re" else namespace+".workadventure.test.thecodingmachine.com",
  local adminUrl = if namespace == "master" || namespace == "develop" || std.startsWith(namespace, "admin") then "https://admin."+url else null,
  "$schema": "https://raw.githubusercontent.com/thecodingmachine/deeployer/master/deeployer.schema.json",
  "version": "1.0",
  "containers": {
     "back": {
       "image": "thecodingmachine/workadventure-back:"+tag,
       "host": {
         "url": "api."+url,
         "https": "enable"
       },
       "ports": [8080],
       "env": {
         "SECRET_KEY": "tempSecretKeyNeedsToChange",
         "ADMIN_API_TOKEN": env.ADMIN_API_TOKEN,
         "JITSI_ISS": env.JITSI_ISS,
         "JITSI_URL": env.JITSI_URL,
         "SECRET_JITSI_KEY": env.SECRET_JITSI_KEY,
       } + if adminUrl != null then {
         "ADMIN_API_URL": adminUrl,
       } else {}
     },
    "front": {
      "image": "thecodingmachine/workadventure-front:"+tag,
      "host": {
        "url": "play."+url,
        "https": "enable"
      },
      "ports": [80],
      "env": {
        "API_URL": "api."+url,
        "JITSI_URL": env.JITSI_URL,
        "SECRET_JITSI_KEY": env.SECRET_JITSI_KEY,
        "TURN_SERVER": "turn:coturn.workadventu.re:443,turns:coturn.workadventu.re:443",
        "TURN_USER": "workadventure",
        "TURN_PASSWORD": "WorkAdventure123",
        "JITSI_PRIVATE_MODE": if env.SECRET_JITSI_KEY != '' then "true" else "false"
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
    "website": {
      "image": "thecodingmachine/workadventure-website:"+tag,
      "host": {
        "url": url,
        "https": "enable"
      },
      "ports": [80],
      "env": {
        "GAME_URL": "https://play."+url
      }
    }
  },
  "config": {
    "https": {
      "mail": "d.negrier@thecodingmachine.com"
    },
    k8sextension(k8sConf)::
        k8sConf + {
          back+: {
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
