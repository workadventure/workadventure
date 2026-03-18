# Workspace readability fix 01

Date: 2026-03-14

## Problem
Walking into nested rooms caused unreadable interaction behavior.
The workspace has containment:
- Windows host
- Ubuntu parent
- child docker

So entering a child area could also trigger parent areas at nearly the same time.
That made the popup interaction feel stacked, cramped, and effectively unclickable.

## Fix
- stopped using the in-world popup as the primary entry interaction
- track all currently entered areas
- resolve to exactly one active context using priority:
  - child docker > ubuntu parent > windows host > support lanes
- keep only one action message at a time
- if inspector is already open, retarget it to the most specific active zone

## Result
Now the workspace should behave like a layered container view instead of many overlapping triggers.
