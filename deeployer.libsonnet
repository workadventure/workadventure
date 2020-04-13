{
  local env = std.extVar("env"),
  # FIXME: namespace does not work if the branch contains a "/"
  local namespace = env.GITHUB_REF_SLUG,
  local tag = if namespace == "master" then "latest" else namespace,
  "$schema": "https://raw.githubusercontent.com/thecodingmachine/deeployer/master/deeployer.schema.json",
  "containers": {
     "back": {
       "image": "thecodingmachine/workadventure-back:"+tag,
       "host": "api."+namespace+".workadventure.test.thecodingmachine.com",
       "ports": [8080],
       "env": {
         "SECRET_KEY": "tempSecretKeyNeedsToChange"
       }
     },
    "front": {
      "image": "thecodingmachine/workadventure-front:"+tag,
      "host": namespace+".workadventure.test.thecodingmachine.com",
      "ports": [80],
      "env": {
        "API_URL": "http://api."+namespace+".workadventure.test.thecodingmachine.com"
      }
    }
  }
}
