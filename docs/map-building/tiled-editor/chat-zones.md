---

sidebar_position: 100
title: Chat zones

---

# Working with chat

## Chat zones

It is possible to define special regions (zones) on the map that can allow any user who is inside to access a specified chat. We call them "chat zones". When player gets inside, a new room will be added in his chat :

import ReactPlayer from 'react-player'

<ReactPlayer width="100%" loop={true} playing controls url='/docs/map-building/images/chat/zones/0_chat_zones.mp4' />

### Adding new **chat zone**

1. Make sure you are editing an **Object Layer**

![Object Layer](../images/camera/1_object_layer.png)

2. Select **Insert Rectangle** tool

![Rectangle Zone](../images/camera/2_rectangle_zone.png)

3. Define new object wherever you want.

![Define new zone](../images/chat/zones/3_define_new_zone.png)

4. Make sure your object is of class "area" !

![Define new zone](../images/chat/zones/4_add_zone_type.png)

5. Edit this new object and click on **Add Property**, like this :

![Define new zone](../images/chat/zones/5_click_add_property.png)

6. Add a **string** property of name *chatName*

![Define new zone](../images/chat/zones/6_add_chatName_prop.png)

7. Make sure you defined a name for your Chat

![Define new zone](../images/chat/zones/7_make_sure_prop_defined.png)

8. Add a **string** property of name *chatDescription*

![Define new zone](../images/chat/zones/8_add_chatDescription_prop.png)

9. Make sure you defined a description for your Chat

![Define new zone](../images/chat/zones/9_make_sure_prop_defined.png)

All should be set up now and your new **chat zone** should be working fine!