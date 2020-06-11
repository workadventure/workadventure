# Test scenarios

We should run these tests scenarios **manually** before deploying to production.


## Test network error

Action | Expected result | Success
-------|-----------------|----------------
Connect to a WorkAdventure map on one tab (player 1) | |
Move to some place (player 1) | |
Connect to a WorkAdventure map on another tab (player 2) | |
Do not move player 2 | |
Cut your network connection (shut down wifi or disconnect cable) | The "Reconnection" page should appear (on both tabs) | [ ]
Resume your network connection | The game should resume (on both tabs), and your players should be where you left them (on bath tabs) | [ ]
Move players | You should see players moving on both tabs | [ ]

## Test suspend/resume

Action | Expected result | Success
-------|-----------------|----------------
Connect to a WorkAdventure map on one tab (player 1) | |
Move to some place (player 1) | |
Connect to a WorkAdventure map on another tab (player 2) | |
Do not move player 2 | |
Put your laptop in suspend mode |  |
Resume your laptop | The game should resume (on both tabs), and your players should be where you left them (on bath tabs) | [ ]
Move players | You should see players moving on both tabs | [ ]
