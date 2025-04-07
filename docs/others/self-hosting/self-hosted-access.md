# Accessing the map editor on a self-hosted WorkAdventure

The way you access the map editor depends on the way you host WorkAdventure.

If you have an "Admin API" defined, then the admin you use is in charge of granting or denying rights to the map 
editor. Check your own admin documentation.

If you are not using an "Admin API", then you can use the following procedure.

First, you need to be able to log into WorkAdventure. Out of the box, WorkAdventure does not provide an authentication
mechanism, but you can plug it into any "OpenID connect" compatible back end. Be sure to set up some kind of 
[OpenID connect authentication](openid.md).

When OpenID connect authentication is set up, you should modify the value of the `MAP_EDITOR_ALLOWED_USERS` environment
variable (typically defined in your `.env` file) to add the list of users that are allowed to use the map editor.
The list of users is a comma-separated list of email addresses.
Then, set the `MAP_EDITOR_ALLOW_ALL_USERS` environment variable to `false`. This will ensure that only the users
defined in `MAP_EDITOR_ALLOWED_USERS` will be able to access the map editor.
