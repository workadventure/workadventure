---
sidebar_position: 20
---

# Getting messages on your phone


WorkAdventure's chat system runs on the Matrix protocol. Matrix is a decentralized protocol that allows users to communicate
in real-time. It is similar to other chat systems like Slack or Discord, but it is decentralized and open-source.

This means you can use any Matrix client to connect to WorkAdventure's chat system. There are many Matrix clients available
for different platforms, including web, desktop, and mobile.

In this section, we will see how you can install "Element", a popular Matrix client, on your phone and connect it to
your WorkAdventure account.

When this is done, you will be able to get notifications when someone sends you a message in WorkAdventure, even if you
are not currently connected to your world.

## Installing Element on your phone

Element is a popular Matrix client that is available on many platforms, including Android and iOS.

To install Element on your phone, follow these steps:

1. Open the Google Play Store (Android) or the App Store (iOS) on your phone.
2. Search for "Element" in the search bar.
3. Click on the "Install" button to install the app on your phone.

## Connecting Element to your WorkAdventure account

Once you have installed Element on your phone, follow these steps to connect it to your WorkAdventure account:

import image1 from './images/element/1-welcome.jpg';
import image2 from './images/element/2-login.jpg';
import image3 from './images/element/3-url.jpg';
import image4 from './images/element/4-connect.jpg';
import image5 from './images/element/5-email.jpg';
import image6 from './images/element/6-password.jpg';
import image7 from './images/element/7-agree.jpg';
import image8 from './images/element/8-sync.jpg';

<table>
    <tr>
        <td><img src={image1} alt="" /></td>
        <td><img src={image2} alt="" /></td>
        <td><img src={image3} alt="" /></td>
    </tr>
</table>

1. Open Element on your phone.
2. Click on the "Sign in" button.
3. On the login page, **do not try to enter your email and password**. Instead, in the "Where your conversations live" 
   section, click the "Edit" button.
4. On the "Select your server screen", be sure to type: **"chat.workadventu.re"**

<table>
    <tr>
        <td><img src={image4} alt="" /></td>
        <td><img src={image5} alt="" /></td>
        <td><img src={image6} alt="" /></td>
    </tr>
</table>

5. Now, once more, **do not try to enter your email and password**. Instead, click on the "Continue with WorkAdventure" button.
6. You will be redirected to the WorkAdventure login page. Enter your email.
7. In the rare case where your email might be associated with multiple worlds, you will be prompted to select the world you want to connect to.
8. Then, you can enter your password. If a Single Sign-On (SSO) is enabled for your world, you will be redirected to your SSO provider to authenticate.

<table>
    <tr>
        <td><img src={image7} alt="" /></td>
        <td><img src={image8} alt="" /></td>
    </tr>
</table>

9. Finally, you will be redirected to the WorkAdventure chat system that will ask for confirmation. Simply click "Continue".
10. Hooray! You are now connected to your WorkAdventure chat system on your phone.

## Using another Matrix client to connect to WorkAdventure

Element is not the only Matrix client available. There are many other clients available for different platforms.
If you are looking to connect to WorkAdventure's chat system using another Matrix client, here are the 2 things you
need to know:

1. **Server**: The server you need to connect to is `chat.workadventu.re`.
2. **Login method**: You need to use the "Single Sign-On" (SSO) method to connect to WorkAdventure. Your client must
   be compatible with the OIDC-Aware login method.
