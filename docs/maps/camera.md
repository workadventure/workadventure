{.section-title.accent.text-primary}
# Working with camera

## Focusable Zones

It is possible to define special regions on the map that can make the camera zoom and center on themselves. We call them "Focusable Zones". When player gets inside, his camera view will be altered - focused, zoomed and locked on defined zone, like this:

<div class="px-5 card rounded d-inline-block">
    <img class="document-img" src="images/camera/0_focusable_zone.png" alt="" />
</div>

### Adding new **Focusable Zone**:

1. Make sure you are editing an **Object Layer**

    <div class="px-5 card rounded d-inline-block">
        <img class="document-img" src="images/camera/1_object_layer.png" alt="" />
    </div>

2. Select **Insert Rectangle** tool

    <div class="px-5 card rounded d-inline-block">
        <img class="document-img" src="images/camera/2_rectangle_zone.png" alt="" />
    </div>

3. Define new object wherever you want. For example, you can make your chilling room event cosier!

    <div class="px-5 card rounded d-inline-block">
        <img class="document-img" src="images/camera/3_define_new_zone.png" alt="" />
    </div>

4. Make sure your object is of type "zone"!

    <div class="px-5 card rounded d-inline-block">
        <img class="document-img" src="images/camera/4_add_zone_type.png" alt="" />
    </div>

5. Edit this new object and click on **Add Property**, like this:

    <div class="px-5 card rounded d-inline-block">
        <img class="document-img" src="images/camera/5_click_add_property.png" alt="" />
    </div>

6. Add a **bool** property of name *focusable*:

    <div class="px-5 card rounded d-inline-block">
        <img class="document-img" src="images/camera/6_add_focusable_prop.png" alt="" />
    </div>

7. Make sure it's checked! :)

    <div class="px-5 card rounded d-inline-block">
        <img class="document-img" src="images/camera/7_make_sure_checked.png" alt="" />
    </div>

All should be set up now and your new **Focusable Zone** should be working fine!

### Defining custom zoom margin:

If you want, you can add an additional property to control how much should the camera zoom onto focusable zone.

1. Like before, click on **Add Property**

    <div class="px-5 card rounded d-inline-block">
        <img class="document-img" src="images/camera/5_click_add_property.png" alt="" />
    </div>

2. Add a **float** property of name *zoom_margin*:

    <div class="px-5 card rounded d-inline-block">
        <img class="document-img" src="images/camera/8_add_zoom_margin.png" alt="" />
    </div>

2. Define how much (in percentage value) should the zoom be decreased:

    <div class="px-5 card rounded d-inline-block">
        <img class="document-img" src="images/camera/9_optional_zoom_margin_defined.png" alt="" />
    </div>

    For example, if you define your zone as a 300x200 rectangle, setting this property to 0.5 *(50%)* means the camera will try to fit within the viewport the entire zone + margin of 50% of its dimensions, so 450x300.

    - No margin defined

        <div class="px-5 card rounded d-inline-block">
            <img class="document-img" src="images/camera/no_margin.png" alt="" />
        </div>

    - Margin set to **0.35**

        <div class="px-5 card rounded d-inline-block">
            <img class="document-img" src="images/camera/with_margin.png" alt="" />
        </div>