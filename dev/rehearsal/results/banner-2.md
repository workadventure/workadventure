# Rehearsal banner-2

Date: 2026-10-17 09:14:55 CEST  |  host: Darwin arm64  |  minikube v1.34.0, Kubernetes v1.31.0, helm v3.16.4+g7877b45

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
| first failed probe | 8.567 s | 13.366 s |
| both see each other moving | 10.066 s | 20.575 s |
| outage (first failed probe -> recovered) | 1.499 s | 7.209 s |
| after the end of deploy.sh | 1.835 s | 2.12 s |
| 'Connection to server lost' banner | never seen | never seen |
| manual reload needed | no | no |
| rejoin from scratch needed | no | no |

## Results

| Check | Result | Detail |
|---|---|---|
| ts: the two see each other moving (baseline) | OK |  |
| ts: bubble formed again | OK | after 0.008 s |
| ts: Alice sees Bob, Carol | OK |  |
| ts: Bob sees Alice, Carol | OK |  |
| ts: Carol (new) sees Alice, Bob | OK |  |
| ts: Alice's document never reloaded | OK | marker kept, main-frame navigations (pushState included): 2 |
| ts: Bob's document never reloaded | OK | marker kept, main-frame navigations (pushState included): 2 |
| ts: new variable written by ts | OK | Bob reads "ts-banner-2" |
| ts: ... a fresh user reads it | OK | got "ts-banner-2" |
| ts: map ts written | OK | WRITE map ts rehearsal-banner-2-ts.wam HTTP 200 |
| ts: shared-map ts written | OK | WRITE shared-map ts rehearsal-banner-2-shared.wam HTTP 200 |
| ts: file ts written | OK | WRITE file ts id=41ffca77-c037-440d-b6d1-4aea23a03606.txt |
| ts: map written by ts read back | OK | OK |
| ts: file written by ts read back | OK | OK |
| ts: shared map edited by ts (last writer) | OK | OK |
| go: the tabs recovered | OK | reload needed: false, rejoin needed: false |
| go: bubble formed again | OK | after 0.006 s |
| go: Alice sees Bob, Carol | OK |  |
| go: Bob sees Alice, Carol | OK |  |
| go: Carol (new) sees Alice, Bob | OK |  |
| go: Alice's document never reloaded | OK | marker kept, main-frame navigations (pushState included): 3 |
| go: Bob's document never reloaded | OK | marker kept, main-frame navigations (pushState included): 3 |
| go: variable written by ts read by a fresh user | OK | got "ts-banner-2", expected "ts-banner-2" |
| go: ... and by Alice's tab | OK | got "ts-banner-2" |
| go: new variable written by go | OK | Bob reads "go-banner-2" |
| go: ... a fresh user reads it | OK | got "go-banner-2" |
| go: map written by ts read back | OK | OK |
| go: file written by ts read back | OK | OK |
| go: shared map edited by ts (last writer) | OK | OK |
| go: map go written | OK | WRITE map go rehearsal-banner-2-go.wam HTTP 200 |
| go: shared-map go written | OK | WRITE shared-map go rehearsal-banner-2-shared.wam HTTP 200 |
| go: file go written | OK | WRITE file go id=c0b6167a-7553-4bfd-82f5-85c06ebd8e41.txt |
| ts again: the tabs recovered | OK | reload needed: false, rejoin needed: false |
| ts2: bubble formed again | OK | after 0.008 s |
| ts2: Alice sees Bob, Carol | OK |  |
| ts2: Bob sees Alice, Carol | OK |  |
| ts2: Carol (new) sees Alice, Bob | OK |  |
| ts2: Alice's document never reloaded | OK | marker kept, main-frame navigations (pushState included): 4 |
| ts2: Bob's document never reloaded | OK | marker kept, main-frame navigations (pushState included): 4 |
| ts2: variable written by go read by a fresh user | OK | got "go-banner-2", expected "go-banner-2" |
| ts2: ... and by Alice's tab | OK | got "go-banner-2" |
| ts2: new variable written by ts2 | OK | Bob reads "ts2-banner-2" |
| ts2: ... a fresh user reads it | OK | got "ts2-banner-2" |
| ts2: map written by ts read back | OK | OK |
| ts2: file written by ts read back | OK | OK |
| ts2: map written by go read back | OK | OK |
| ts2: file written by go read back | OK | OK |
| ts2: shared map edited by go (last writer) | OK | OK |
| ts2: map ts2 written | OK | WRITE map ts2 rehearsal-banner-2-ts2.wam HTTP 200 |
| ts2: shared-map ts2 written | OK | WRITE shared-map ts2 rehearsal-banner-2-shared.wam HTTP 200 |
| ts2: file ts2 written | OK | WRITE file ts2 id=02e93f88-1e17-4505-9cf1-5922361dafc1.txt |

## Timeline

- +0.1s room https://play-rehearsal.localhost/_/rhbanner-2/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json
- +8.7s Alice and Bob joined on TypeScript
- +22.5s redis (ts):
    KEY https://play-rehearsal.localhost/_/rh20261017-0906/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-20261017-0906"
    KEY https://play-rehearsal.localhost/_/rhbanner-1/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-banner-1"
    KEY https://play-rehearsal.localhost/_/rhbanner-2/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts-banner-2"
    KEY https://play-rehearsal.localhost/_/rh20261017-0902/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-20261017-0902"
    KEY https://play-rehearsal.localhost/_/rh20261017-0910/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-20261017-0910"
    DBSIZE 6
- +22.7s data.sh write ts:
    WRITE map ts rehearsal-banner-2-ts.wam HTTP 200
    WRITE shared-map ts rehearsal-banner-2-shared.wam HTTP 200
    WRITE file ts id=41ffca77-c037-440d-b6d1-4aea23a03606.txt
- +23.0s deploy.sh go: start
- +31.2s deploy.sh go: finished (exit 0)
- +31.6s first failed probe (go)
- +33.0s both see each other moving again (no reload)
- +33.0s trace (go): 0.517s:ok 1.03s:ok 1.543s:ok 2.057s:ok 8.567s:ko 9.529s:ok 10.066s:ok
- +33.0s deploy.sh go output:
    09:15:20 start go
    Release "rehearsal" has been upgraded. Happy Helming!
    NAME: rehearsal
    LAST DEPLOYED: Sat Oct 17 09:15:21 2026
    NAMESPACE: wa
    STATUS: deployed
    REVISION: 23
    TEST SUITE: None
    == go: helm --wait 4s, /ping through the ingress 8s after start
    NAME                                             IMAGE                                                                        READY
    rehearsal-redis-master-0                         docker.io/bitnamilegacy/redis:7.0.11-debian-11-r20                           true
    rehearsal-workadventure-front-5c6f9fbb7c-b8kd4   wa-socle-front:master-6f4d02319eddbf46a51cb99ffd38e2d75273593c               true
    rehearsal-workadventure-icon-6f9bb75f8b-xjf4g    matthiasluedtke/iconserver:v3.21.0                                           true
    rehearsal-workadventure-maps-58cdc54cdc-xqt96    ghcr.io/workadventure/maps:master-6f4d02319eddbf46a51cb99ffd38e2d75273593c   true
    rehearsal-workadventure-play-588ffd9445-nsdkb    wa-server-go:rehearsal                                
                           true
- +46.2s redis (go):
    KEY https://play-rehearsal.localhost/_/rh20261017-0906/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-20261017-0906"
    KEY https://play-rehearsal.localhost/_/rhbanner-1/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-banner-1"
    KEY https://play-rehearsal.localhost/_/rhbanner-2/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "go-banner-2"
    KEY https://play-rehearsal.localhost/_/rh20261017-0902/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-20261017-0902"
    KEY https://play-rehearsal.localhost/_/rh20261017-0910/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-20261017-0910"
    DBSIZE 6
- +46.7s data.sh write go:
    WRITE map go rehearsal-banner-2-go.wam HTTP 200
    WRITE shared-map go rehearsal-banner-2-shared.wam HTTP 200
    WRITE file go id=c0b6167a-7553-4bfd-82f5-85c06ebd8e41.txt
- +46.7s deploy.sh ts: start
- +60.0s first failed probe (ts)
- +65.1s deploy.sh ts: finished (exit 0)
- +67.2s both see each other moving again (no reload)
- +67.2s trace (ts): 0.516s:ok 1.029s:ok 1.538s:ok 2.049s:ok 2.561s:ok 3.077s:ok 3.592s:ok 4.111s:ok 4.637s:ok 5.15s:ok 5.668s:ok 6.185s:ok 6.699s:ok 7.21s:ok 7.723s:ok 8.235s:ok 8.749s:ok 9.262s:ok 9.779s:ok 10.291s:ok 10.805s:ok 11.316s:ok 11.827s:ok 12.339s:ok 12.85s:ok 13.366s:ko 13.881s:ok 14.401s:ko 14.914s:ok 15.426s:ko 15.939s:ok 16.452s:ko 16.963s:ok 17.478s:ko 17.992s:ok 18.504s:ko 19.014s:ok 19.528s:ko 20.043s:ok 20.575s:ok
- +67.2s deploy.sh ts output:
    09:15:44 start ts
    Release "rehearsal" has been upgraded. Happy Helming!
    NAME: rehearsal
    LAST DEPLOYED: Sat Oct 17 09:15:44 2026
    NAMESPACE: wa
    STATUS: deployed
    REVISION: 24
    TEST SUITE: None
    == ts: helm --wait 14s, /ping through the ingress 18s after start
    NAME                                                  IMAGE                                                                               READY
    rehearsal-redis-master-0                              docker.io/bitnamilegacy/redis:7.0.11-debian-11-r20                                  true
    rehearsal-workadventure-back-0                        ghcr.io/workadventure/back:master-6f4d02319eddbf46a51cb99ffd38e2d75273593c        
      true
    rehearsal-workadventure-front-5c6f9fbb7c-b8kd4        wa-socle-front:master-6f4d02319eddbf46a51cb99ffd38e2d75273593c                      true
    rehearsal-workadventure-icon-6f9bb75f8b-xjf4g         matthiasluedtke/iconserver:v3.21.0                                                  true
    rehearsal-workadventure-maps-58cdc54cdc-xqt96         ghcr.io/workadventure/maps:master-6f4d02319eddbf46a51cb99ffd38e2d75273593c          true
    rehearsal-workadventure-mapstorage-79dd6f6777-gsgbp   ghcr.io/workadventure/map-storage:master-6f4d02319eddbf46a51cb99ffd38e2d75273593c   true
    rehearsal-workadventure-play-7f968b974b-fnprv         ghcr.io/workadventure/play:master-6f4d02319eddbf46a51cb99ffd38e2d75273593c          true
    rehearsal-workadventure-uploader-6b7456fdb-vl4h8      ghcr.io/workadventure/uploader:master-6f4d02319eddbf46a51cb99ffd38e2d75273593c      true
- +80.7s redis (ts2):
    KEY https://play-rehearsal.localhost/_/rh20261017-0906/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-20261017-0906"
    KEY https://play-rehearsal.localhost/_/rhbanner-1/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-banner-1"
    KEY https://play-rehearsal.localhost/_/rhbanner-2/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-banner-2"
    KEY https://play-rehearsal.localhost/_/rh20261017-0902/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-20261017-0902"
    KEY https://play-rehearsal.localhost/_/rh20261017-0910/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-20261017-0910"
    DBSIZE 6
- +81.4s data.sh write ts2:
    WRITE map ts2 rehearsal-banner-2-ts2.wam HTTP 200
    WRITE shared-map ts2 rehearsal-banner-2-shared.wam HTTP 200
    WRITE file ts2 id=02e93f88-1e17-4505-9cf1-5922361dafc1.txt
- +81.4s Alice: socket pusher-rehearsal.localhost open +3.823s, closed +25.52s
- +81.4s Alice: socket pusher-rehearsal.localhost open +25.604s, closed +25.619s
- +81.4s Alice: socket pusher-rehearsal.localhost open +26.962s, closed +59.17s
- +81.4s Alice: socket pusher-rehearsal.localhost open +59.691s, closed +66.723s
- +81.4s Bob: socket pusher-rehearsal.localhost open +8s, closed +25.52s
- +81.4s Bob: socket pusher-rehearsal.localhost open +25.604s, closed +25.623s
- +81.4s Bob: socket pusher-rehearsal.localhost open +26.666s, closed +26.673s
- +81.4s Bob: socket pusher-rehearsal.localhost open +28.958s, closed +59.17s
- +81.4s Bob: socket pusher-rehearsal.localhost open +59.69s, closed +66.723s
