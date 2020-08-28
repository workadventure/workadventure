{
  local env = std.extVar("env"),
  local namespace = env.GITHUB_REF_SLUG,
  local tag = namespace,
  local url = if namespace == "master" then "workadventu.re" else namespace+".workadventure.test.thecodingmachine.com",
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
         "SECRET_KEY": "tempSecretKeyNeedsToChange"
       }
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
        "JITSI_URL": "meet.jit.si",
        "TURN_SERVER": "coturn.workadventu.re:443",
        "TURN_USER": "workadventure",
        "TURN_PASSWORD": "WorkAdventure123"
      }
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
