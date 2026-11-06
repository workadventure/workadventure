# Rehearsal banner-1

Date: 2026-10-17 09:13:28 CEST  |  host: Darwin arm64  |  minikube v1.34.0, Kubernetes v1.31.0, helm v3.16.4+g7877b45

## Versions

| Component | Version |
|---|---|
| dev-socle (this rehearsal) | a79cbf1c7 + uncommitted changes in dev/rehearsal |
| TypeScript images (play, back, map-storage, uploader, maps) | `master-6f4d02319eddbf46a51cb99ffd38e2d75273593c` |
| &nbsp;&nbsp;ghcr.io/workadventure/play | sha256:9ad1fd72d970 |
| &nbsp;&nbsp;ghcr.io/workadventure/back | sha256:2ab9d535a329 |
| &nbsp;&nbsp;ghcr.io/workadventure/map-storage | sha256:3a0a93c04eaf |
| &nbsp;&nbsp;ghcr.io/workadventure/uploader | sha256:5bb8e117cbc8 |
| &nbsp;&nbsp;ghcr.io/workadventure/maps | sha256:b4d269e55a01 |
| Front (assets, template) | wa-socle-front:master-6f4d02319eddbf46a51cb99ffd38e2d75273593c, sha256:c30e17584916 |
| Go server | `wa-server-go:rehearsal` sha256:8f8b2711adfe, built from lang-go `04713cbdc` (0 uncommitted file(s) at build time), API_VERSION `b82fc568`, built 2026-10-17T07:06:21Z |
| lang-go worktree now | de6512ec3, 0 uncommitted file(s) |
| Helm chart | name: workadventure version: 0.0.9-dev1  |
| Playwright / browser | 1.63.0 / Chromium 153.0.8010.12 |

Setup: one node, one play replica, Redis of the chart, ingress nginx, self-signed certificate, map-storage volume (PVC) mounted by the Go pod at /maps.

## Measures

| Measure | -> go | -> ts |
|---|---|---|
| helm upgrade --wait | 4 s | 14 s |
| /ping through the ingress | 8 s after the start | 18 s after the start |
| first failed probe | 9.076 s | 13.357 s |
| both see each other moving | 10.295 s | 20.529 s |
| outage (first failed probe -> recovered) | 1.219 s | 7.172 s |
| after the end of deploy.sh | 2.019 s | 2.013 s |
| 'Connection to server lost' banner | never seen | never seen |
| manual reload needed | no | no |
| rejoin from scratch needed | no | no |

## Results

| Check | Result | Detail |
|---|---|---|
| ts: the two see each other moving (baseline) | OK |  |
| ts: bubble formed again | OK | after 0.015 s |
| ts: Alice sees Bob, Carol | OK |  |
| ts: Bob sees Alice, Carol | OK |  |
| ts: Carol (new) sees Alice, Bob | OK |  |
| ts: Alice's document never reloaded | OK | marker kept, main-frame navigations (pushState included): 2 |
| ts: Bob's document never reloaded | OK | marker kept, main-frame navigations (pushState included): 2 |
| ts: new variable written by ts | OK | Bob reads "ts-banner-1" |
| ts: ... a fresh user reads it | OK | got "ts-banner-1" |
| ts: map ts written | OK | WRITE map ts rehearsal-banner-1-ts.wam HTTP 200 |
| ts: shared-map ts written | OK | WRITE shared-map ts rehearsal-banner-1-shared.wam HTTP 200 |
| ts: file ts written | OK | WRITE file ts id=f7793807-317d-45df-b727-e9a5bbda7560.txt |
| ts: map written by ts read back | OK | OK |
| ts: file written by ts read back | OK | OK |
| ts: shared map edited by ts (last writer) | OK | OK |
| go: the tabs recovered | OK | reload needed: false, rejoin needed: false |
| go: bubble formed again | OK | after 0.009 s |
| go: Alice sees Bob, Carol | OK |  |
| go: Bob sees Alice, Carol | OK |  |
| go: Carol (new) sees Alice, Bob | OK |  |
| go: Alice's document never reloaded | OK | marker kept, main-frame navigations (pushState included): 3 |
| go: Bob's document never reloaded | OK | marker kept, main-frame navigations (pushState included): 3 |
| go: variable written by ts read by a fresh user | OK | got "ts-banner-1", expected "ts-banner-1" |
| go: ... and by Alice's tab | OK | got "ts-banner-1" |
| go: new variable written by go | OK | Bob reads "go-banner-1" |
| go: ... a fresh user reads it | OK | got "go-banner-1" |
| go: map written by ts read back | OK | OK |
| go: file written by ts read back | OK | OK |
| go: shared map edited by ts (last writer) | OK | OK |
| go: map go written | OK | WRITE map go rehearsal-banner-1-go.wam HTTP 200 |
| go: shared-map go written | OK | WRITE shared-map go rehearsal-banner-1-shared.wam HTTP 200 |
| go: file go written | OK | WRITE file go id=a544b16b-3c4a-406d-be0c-36383903feac.txt |
| ts again: the tabs recovered | OK | reload needed: false, rejoin needed: false |
| ts2: bubble formed again | OK | after 0.519 s |
| ts2: Alice sees Bob, Carol | OK |  |
| ts2: Bob sees Alice, Carol | OK |  |
| ts2: Carol (new) sees Alice, Bob | OK |  |
| ts2: Alice's document never reloaded | OK | marker kept, main-frame navigations (pushState included): 4 |
| ts2: Bob's document never reloaded | OK | marker kept, main-frame navigations (pushState included): 4 |
| ts2: variable written by go read by a fresh user | OK | got "go-banner-1", expected "go-banner-1" |
| ts2: ... and by Alice's tab | OK | got "go-banner-1" |
| ts2: new variable written by ts2 | OK | Bob reads "ts2-banner-1" |
| ts2: ... a fresh user reads it | OK | got "ts2-banner-1" |
| ts2: map written by ts read back | OK | OK |
| ts2: file written by ts read back | OK | OK |
| ts2: map written by go read back | OK | OK |
| ts2: file written by go read back | OK | OK |
| ts2: shared map edited by go (last writer) | OK | OK |
| ts2: map ts2 written | OK | WRITE map ts2 rehearsal-banner-1-ts2.wam HTTP 200 |
| ts2: shared-map ts2 written | OK | WRITE shared-map ts2 rehearsal-banner-1-shared.wam HTTP 200 |
| ts2: file ts2 written | OK | WRITE file ts2 id=77faed58-3b86-4480-8b5e-13317702a798.txt |

## Timeline

- +0.1s room https://play-rehearsal.localhost/_/rhbanner-1/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json
- +9.0s Alice and Bob joined on TypeScript
- +22.8s redis (ts):
    KEY https://play-rehearsal.localhost/_/rh20261017-0906/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-20261017-0906"
    KEY https://play-rehearsal.localhost/_/rhbanner-1/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts-banner-1"
    KEY https://play-rehearsal.localhost/_/rh20261017-0902/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-20261017-0902"
    KEY https://play-rehearsal.localhost/_/rh20261017-0910/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-20261017-0910"
    DBSIZE 5
- +23.1s data.sh write ts:
    WRITE map ts rehearsal-banner-1-ts.wam HTTP 200
    WRITE shared-map ts rehearsal-banner-1-shared.wam HTTP 200
    WRITE file ts id=f7793807-317d-45df-b727-e9a5bbda7560.txt
- +23.3s deploy.sh go: start
- +31.6s deploy.sh go: finished (exit 0)
- +32.4s first failed probe (go)
- +33.6s both see each other moving again (no reload)
- +33.6s trace (go): 0.516s:ok 1.029s:ok 1.54s:ok 2.049s:ok 2.562s:ok 9.076s:ko 9.77s:ok 10.295s:ok
- +33.6s deploy.sh go output:
    09:13:53 start go
    Release "rehearsal" has been upgraded. Happy Helming!
    NAME: rehearsal
    LAST DEPLOYED: Sat Oct 17 09:13:53 2026
    NAMESPACE: wa
    STATUS: deployed
    REVISION: 20
    TEST SUITE: None
    == go: helm --wait 4s, /ping through the ingress 8s after start
    NAME                                             IMAGE                                                                        READY
    rehearsal-redis-master-0                         docker.io/bitnamilegacy/redis:7.0.11-debian-11-r20                           true
    rehearsal-workadventure-front-5c6f9fbb7c-b8kd4   wa-socle-front:master-6f4d02319eddbf46a51cb99ffd38e2d75273593c               true
    rehearsal-workadventure-icon-6f9bb75f8b-xjf4g    
    matthiasluedtke/iconserver:v3.21.0                                           true
    rehearsal-workadventure-maps-58cdc54cdc-xqt96    ghcr.io/workadventure/maps:master-6f4d02319eddbf46a51cb99ffd38e2d75273593c   true
    rehearsal-workadventure-play-588ffd9445-s7wlt    wa-server-go:rehearsal                                                       true
- +46.9s redis (go):
    KEY https://play-rehearsal.localhost/_/rh20261017-0906/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-20261017-0906"
    KEY https://play-rehearsal.localhost/_/rhbanner-1/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "go-banner-1"
    KEY https://play-rehearsal.localhost/_/rh20261017-0902/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-20261017-0902"
    KEY https://play-rehearsal.localhost/_/rh20261017-0910/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-20261017-0910"
    DBSIZE 5
- +47.4s data.sh write go:
    WRITE map go rehearsal-banner-1-go.wam HTTP 200
    WRITE shared-map go rehearsal-banner-1-shared.wam HTTP 200
    WRITE file go id=a544b16b-3c4a-406d-be0c-36383903feac.txt
- +47.4s deploy.sh ts: start
- +60.7s first failed probe (ts)
- +65.9s deploy.sh ts: finished (exit 0)
- +67.9s both see each other moving again (no reload)
- +67.9s trace (ts): 0.51s:ok 1.023s:ok 1.543s:ok 2.056s:ok 2.568s:ok 3.089s:ok 3.614s:ok 4.13s:ok 4.645s:ok 5.157s:ok 5.676s:ok 6.194s:ok 6.704s:ok 7.217s:ok 7.73s:ok 8.24s:ok 8.751s:ok 9.263s:ok 9.774s:ok 10.287s:ok 10.797s:ok 11.31s:ok 11.821s:ok 12.334s:ok 12.845s:ok 13.357s:ko 13.87s:ok 14.38s:ko 14.892s:ok 15.403s:ko 15.916s:ok 16.429s:ko 16.941s:ok 17.454s:ko 17.967s:ok 18.476s:ko 18.987s:ok 19.498s:ko 20.012s:ok 20.529s:ok
- +67.9s deploy.sh ts output:
    09:14:17 start ts
    Release "rehearsal" has been upgraded. Happy Helming!
    NAME: rehearsal
    LAST DEPLOYED: Sat Oct 17 09:14:18 2026
    NAMESPACE: wa
    STATUS: deployed
    REVISION: 21
    TEST SUITE: None
    == ts: helm --wait 14s, /ping through the ingress 18s after start
    NAME                                                  IMAGE                                                                               READY
    rehearsal-redis-master-0                              docker.io/bitnamilegacy/redis:7.0.11-debian-11-r20                                  true
    rehearsal-workadventure-back-0                        ghcr.io/workadventure/back:master-6f4d02319eddbf46a51cb99ffd38e2d75273593c          true
    rehearsal-workadventure-front-5c6f9fbb7c-b8kd4        wa-socle-front:master-6f4d02319eddbf46a51cb99ffd38e2d75273593c                      true
    rehearsal-workadventure-icon-6f9bb75f8b-xjf4g         matthiasluedtke/iconserver:v3.21.0                                                  true
    rehearsal-workadventure-maps-58cdc54cdc-xqt96         ghcr.io/workadventure/maps:master-6f4d02319eddbf46a51cb99ffd38e2d75273593c          true
    rehearsal-workadventure-mapstorage-79dd6f6777-k4scw   ghcr.io/workadventure/map-storage:master-6f4d02319eddbf46a51cb99ffd38e2d75273593c   true
    rehearsal-workadventure-play-7f968b974b-prd6r         ghcr.io/workadventure/play:master-6f4d02319eddbf46a51cb99ffd38e2d75273593c          true
    rehearsal-workadventure-uploader-6b7456fdb-st8hq      ghcr.io/workadventure/uploader:master-6f4d02319eddbf46a51cb99ffd38e2d75273593c      true
- +81.6s redis (ts2):
    KEY https://play-rehearsal.localhost/_/rh20261017-0906/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-20261017-0906"
    KEY https://play-rehearsal.localhost/_/rhbanner-1/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-banner-1"
    KEY https://play-rehearsal.localhost/_/rh20261017-0902/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-20261017-0902"
    KEY https://play-rehearsal.localhost/_/rh20261017-0910/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-20261017-0910"
    DBSIZE 5
- +82.2s data.sh write ts2:
    WRITE map ts2 rehearsal-banner-1-ts2.wam HTTP 200
    WRITE shared-map ts2 rehearsal-banner-1-shared.wam HTTP 200
    WRITE file ts2 id=77faed58-3b86-4480-8b5e-13317702a798.txt
- +82.2s Alice: socket pusher-rehearsal.localhost open +4.123s, closed +25.88s
- +82.2s Alice: socket pusher-rehearsal.localhost open +25.968s, closed +25.995s
- +82.2s Alice: socket pusher-rehearsal.localhost open +27.197s, closed +59.822s
- +82.2s Alice: socket pusher-rehearsal.localhost open +60.346s, closed +67.384s
- +82.2s Bob: socket pusher-rehearsal.localhost open +8.354s, closed +25.884s
- +82.2s Bob: socket pusher-rehearsal.localhost open +25.968s, closed +25.994s
- +82.2s Bob: socket pusher-rehearsal.localhost open +27.503s, closed +59.82s
- +82.2s Bob: socket pusher-rehearsal.localhost open +60.348s, closed +67.383s
