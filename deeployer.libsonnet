{
  local env = std.extVar("env"),
  local namespace = env.GITHUB_REF_SLUG,
  local tag = namespace,
  "$schema": "https://raw.githubusercontent.com/thecodingmachine/deeployer/master/deeployer.schema.json",
  "containers": {
     "back": {
       "image": "thecodingmachine/workadventure-back:"+tag,
       "host": {
         "url": "api."+namespace+".workadventure.test.thecodingmachine.com",
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
        "url": namespace+".workadventure.test.thecodingmachine.com",
        "https": "enable"
      },
      "ports": [80],
      "env": {
        "API_URL": "https://api."+namespace+".workadventure.test.thecodingmachine.com"
      }
    }
  },
  "config": {
    "https": {
      "mail": "d.negrier@thecodingmachine.com"
    }
  }
}
