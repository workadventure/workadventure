{
  local env = std.extVar("env"),
  local namespace = env.GITHUB_REF_SLUG,
  local tag = namespace,
  local url = if namespace == "master" then "workadventu.re" else namespace+".workadventure.test.thecodingmachine.com",
  "$schema": "https://raw.githubusercontent.com/thecodingmachine/deeployer/master/deeployer.schema.json",
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
        "url": url,
        "https": "enable"
      },
      "ports": [80],
      "env": {
        "API_URL": "https://api."+url
      }
    }
  },
  "config": {
    "https": {
      "mail": "d.negrier@thecodingmachine.com"
    }
  }
}
