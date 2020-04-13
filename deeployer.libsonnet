{
  local env = std.extVar("env"),
  # FIXME: namespace does not work if the branch contains a "/"
  local namespace = std.split(env.GITHUB_REF, "/")[2]
  "$schema": "https://raw.githubusercontent.com/thecodingmachine/deeployer/master/deeployer.schema.json",
  "containers": {
     "back": {
       "image": "thecodingmachine/workadventure-back:"+namespace,
       "host": "api."+namespace+".workadventure.test.thecodingmachine.com",
       "ports": [8080],
       "env": {
         "SECRET_KEY": "tempSecretKeyNeedsToChange"
       }
     },
    "front": {
      "image": "thecodingmachine/workadventure-front:"+namespace,
      "host": namespace+".workadventure.test.thecodingmachine.com",
      "ports": [80],
      "env": {
        "API_URL": "http://api."+namespace+".workadventure.test.thecodingmachine.com"
      }
    }
  }
}
