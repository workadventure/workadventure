---
sidebar_position: 90
title: Camera
---

# Working with camera

## Focusable Area

It is possible to define special regions on the map that can make the camera zoom and center on themselves. We call them "Focusable Area". When player gets inside, his camera view will be altered - focused, zoomed and locked on defined area, like this:

![](../images/camera/0_focusable_zone.png)

### Adding new **Focusable Area**:

1. Make sure you are editing an **Object Layer**

   ![Object Layer](../images/camera/1_object_layer.png)

2. Select **Insert Rectangle** tool

   ![Insert Rectangle](../images/camera/2_rectangle_zone.png)

3. Define new object wherever you want. For example, you can make your chilling room event cosier!

   ![Define new zone](../images/camera/3_define_new_zone.png)

4. Make sure your object is of class "area"!

   ![Define new zone](../images/camera/4_add_zone_type.png)

5. Edit this new object and click on **Add Property**, like this:

   ![Add Property](../images/camera/5_click_add_property.png)

6. Add a **bool** property of name _focusable_:

   ![Add focusable property](../images/camera/6_add_focusable_prop.png)

7. Make sure it's checked! :)

   ![Make sure it's checked](../images/camera/7_make_sure_checked.png)

All should be set up now and your new **Focusable Area** should be working fine!

### Defining custom zoom margin:

If you want, you can add an additional property to control how much should the camera zoom onto focusable area.

1. Like before, click on **Add Property**

   ![Add Property](../images/camera/5_click_add_property.png)

2. Add a **float** property of name _zoomMargin_:

   ![Add zoomMargin property](../images/camera/8_add_zoom_margin.png)

3. Define how much (in percentage value) should the zoom be decreased:

   ![Define zoomMargin property](../images/camera/9_optional_zoom_margin_defined.png)

   For example, if you define your area as a 300x200 rectangle, setting this property to 0.5 _(50%)_ means the camera will try to fit within the viewport the entire area + margin of 50% of its dimensions, so 450x300.

   - No margin defined

     ![No margin defined](../images/camera/no_margin.png)

   - Margin set to **0.35**

     ![Margin set to 0.35](../images/camera/with_margin.png)
