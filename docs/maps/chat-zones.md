---

sidebar_position: 100
title: Chat zones

---

# Working with chat

## Chat zones

It is possible to define special regions (zones) on the map that can allow any user who is inside to access a specified chat. We call them "chat zones". When player gets inside, a new room will be added in his chat :

<div class="px-5 card rounded d-inline-block">
    <video class="document-img" src="images/chat/zones/0_chat_zones.mp4" autoplay loop muted></video>
</div>

### Adding new **chat zone**

1. Make sure you are editing an **Object Layer**

    <div class="px-5 card rounded d-inline-block">
        <img class="document-img" src="images/camera/1_object_layer.png" alt="" />
    </div>

2. Select **Insert Rectangle** tool

    <div class="px-5 card rounded d-inline-block">
        <img class="document-img" src="images/camera/2_rectangle_zone.png" alt="" />
    </div>

3. Define new object wherever you want.

    <div class="px-5 card rounded d-inline-block">
        <img class="document-img" src="images/chat/zones/3_define_new_zone.png" alt="" />
    </div>

4. Make sure your object is of class "area" !

    <div class="px-5 card rounded d-inline-block">
        <img class="document-img" src="images/chat/zones/4_add_zone_type.png" alt="" />
    </div>

5. Edit this new object and click on **Add Property**, like this :

    <div class="px-5 card rounded d-inline-block">
        <img class="document-img" src="images/chat/zones/5_click_add_property.png" alt="" />
    </div>

6. Add a **string** property of name *chatName*

    <div class="px-5 card rounded d-inline-block">
        <img class="document-img" src="images/chat/zones/6_add_chatName_prop.png" alt="" />
    </div>

7. Make sure you defined a name for your Chat

    <div class="px-5 card rounded d-inline-block">
        <img class="document-img" src="images/chat/zones/7_make_sure_prop_defined.png" alt="" />
    </div>

8. Add a **string** property of name *chatDescription*

    <div class="px-5 card rounded d-inline-block">
        <img class="document-img" src="images/chat/zones/8_add_chatDescription_prop.png" alt="" />
    </div>

9. Make sure you defined a description for your Chat

    <div class="px-5 card rounded d-inline-block">
        <img class="document-img" src="images/chat/zones/9_make_sure_prop_defined.png" alt="" />
    </div>


All should be set up now and your new **chat zone** should be working fine!