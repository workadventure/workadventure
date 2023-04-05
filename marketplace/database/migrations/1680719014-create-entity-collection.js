// Check if the "marketplace" collection already exists
if (!db.getCollectionNames().includes("entities")) {
    // Create the "marketplace" collection
    db.createCollection("entities");
    // Insert the default data
    db.entities.insert([
        {
            "name":"Basic Chair",
            "tags":["seat","basic"],
            "imagePath":"Furniture/Chair/ChairGreyDown.png",
            "direction":"Down",
            "color":"grey"
        },
        {
            "name":"Basic Chair",
            "tags":["seat","basic"],
            "imagePath":"Furniture/Chair/ChairBlueDown.png",
            "direction":"Down",
            "color":"blue"
        },
        {
            "name":"Basic Chair",
            "tags":["seat","basic"],
            "imagePath":"Furniture/Chair/ChairGreenDown.png",
            "direction":"Down",
            "color":"green"
        },
        {
            "name":"Basic Chair",
            "tags":["seat","basic"],
            "imagePath":"Furniture/Chair/ChairLightRedDown.png",
            "direction":"Down",
            "color":"pink"
        },
        {
            "name":"Basic Chair",
            "tags":["seat","basic"],
            "imagePath":"Furniture/Chair/ChairRedDown.png",
            "direction":"Down",
            "color":"red"
        },
        {
            "name":"Basic Chair",
            "tags":["seat","basic"],
            "imagePath":"Furniture/Chair/ChairBlueUp.png",
            "direction":"Up",
            "color":"blue"
        },
        {
            "name":"Basic Chair",
            "tags":["seat","basic"],
            "imagePath":"Furniture/Chair/ChairGreenUp.png",
            "direction":"Up",
            "color":"green"
        },
        {
            "name":"Basic Chair",
            "tags":["seat","basic"],
            "imagePath":"Furniture/Chair/ChairGreyUp.png",
            "direction":"Up",
            "color":"grey"
        },
        {
            "name":"Basic Chair",
            "tags":["seat","basic"],
            "imagePath":"Furniture/Chair/ChairLightRedUp.png",
            "direction":"Up",
            "color":"pink"
        },
        {
            "name":"Basic Chair",
            "tags":["seat","basic"],
            "imagePath":"Furniture/Chair/ChairRedUp.png",
            "direction":"Up",
            "color":"red"
        },
        {
            "name":"Basic Chair",
            "tags":["seat","basic"],
            "imagePath":"Furniture/Chair/ChairBlueLeft.png",
            "direction":"Left",
            "color":"blue"
        },
        {
            "name":"Basic Chair",
            "tags":["seat","basic"],
            "imagePath":"Furniture/Chair/ChairGreenLeft.png",
            "direction":"Left",
            "color":"green"
        },
        {
            "name":"Basic Chair",
            "tags":["seat","basic"],
            "imagePath":"Furniture/Chair/ChairGreyLeft.png",
            "direction":"Left",
            "color":"grey"
        },
        {
            "name":"Basic Chair",
            "tags":["seat","basic"],
            "imagePath":"Furniture/Chair/ChairLightRedLeft.png",
            "direction":"Left",
            "color":"pink"
        },
        {
            "name":"Basic Chair",
            "tags":["seat","basic"],
            "imagePath":"Furniture/Chair/ChairRedLeft.png",
            "direction":"Left",
            "color":"red"
        },
        {
            "name":"Basic Chair",
            "tags":["seat","basic"],
            "imagePath":"Furniture/Chair/ChairBlueRight.png",
            "direction":"Right",
            "color":"blue"
        },
        {
            "name":"Basic Chair",
            "tags":["seat","basic"],
            "imagePath":"Furniture/Chair/ChairGreenRight.png",
            "direction":"Right",
            "color":"green"
        },
        {
            "name":"Basic Chair",
            "tags":["seat","basic"],
            "imagePath":"Furniture/Chair/ChairGreyRight.png",
            "direction":"Right",
            "color":"grey"
        },
        {
            "name":"Basic Chair",
            "tags":["seat","basic"],
            "imagePath":"Furniture/Chair/ChairLightRedRight.png",
            "direction":"Right",
            "color":"pink"
        },
        {
            "name":"Basic Chair",
            "tags":["seat","basic"],
            "imagePath":"Furniture/Chair/ChairRedRight.png",
            "direction":"Right",
            "color":"red"
        },
        {
            "name":"Pouf",
            "tags":["seat"],
            "imagePath":"Furniture/PoufBrown.png",
            "direction":"Down",
            "color":"brown"
        },
                {
            "name":"Pouf",
            "tags":["seat"],
            "imagePath":"Furniture/PoufOrange.png",
            "direction":"Down",
            "color":"orange"
        },
        {
            "name":"Basic Wood Table",
            "tags":["basic", "table"],
            "collisionGrid": [
                [ 0, 0 ],
                [ 1, 1 ],
                [ 1, 1 ]
            ],
            "depthOffset": -64,
            "imagePath":"Furniture/Table/TableBrown.png",
            "direction":"Down",
            "color":"orange"
        },
        {
            "name":"Basic Wood Table",
            "tags":["basic", "table"],
            "collisionGrid": [
                [ 0, 0 ],
                [ 1, 1 ],
                [ 1, 1 ]
            ],
            "depthOffset": -64,
            "imagePath":"Furniture/Table/TableDarkBrown.png",
            "direction":"Down",
            "color":"brown"
        },
        {
            "name":"Basic Narrow Wood Table",
            "tags":["basic", "table"],
            "depthOffset": -64,
            "imagePath":"Furniture/Table/TableNarrowBrown.png",
            "collisionGrid": [
                [ 0],
                [ 1],
                [ 1]
            ],
            "direction":"Down",
            "color":"orange"
        },
        {
            "name":"Basic Narrow Wood Table",
            "tags":["basic", "table"],
            "depthOffset": -64,
            "imagePath":"Furniture/Table/TableNarrowDarkBrown.png",
            "collisionGrid": [
                [ 0],
                [ 1],
                [ 1]
            ],
            "direction":"Down",
            "color":"brown"
        },
        {
            "name":"Basic Small Table",
            "tags":["basic", "table"],
            "depthOffset": -32,
            "imagePath":"Furniture/Table/TableSmallGrey.png",
            "collisionGrid": [
                [ 0],
                [ 1]
            ],
            "direction":"Down",
            "color":"grey"
        },
        {
            "name":"Basic Small Table",
            "tags":["basic", "table"],
            "depthOffset": -32,
            "imagePath":"Furniture/Table/TableSmallWhite.png",
            "collisionGrid": [
                [ 0],
                [ 1]
            ],
            "direction":"Down",
            "color":"white"
        },
        {
            "name":"Armchair",
            "tags":["seat" ],
            "imagePath":"Furniture/Armchair/ArmchairGreyDown.png",
            "direction":"Down",
            "color":"grey"
        },
        {
            "name":"Armchair",
            "tags":["seat" ],
            "imagePath":"Furniture/Armchair/ArmchairBlackDown.png",
            "direction":"Down",
            "color":"black"
        },
        {
            "name":"Armchair",
            "tags":["seat" ],
            "imagePath":"Furniture/Armchair/ArmchairBlueDown.png",
            "direction":"Down",
            "color":"blue"
        },
        {
            "name":"Armchair",
            "tags":["seat" ],
            "imagePath":"Furniture/Armchair/ArmchairGreenDown.png",
            "direction":"Down",
            "color":"green"
        },
        {
            "name":"Armchair",
            "tags":["seat" ],
            "imagePath":"Furniture/Armchair/ArmchairRedDown.png",
            "direction":"Down",
            "color":"red"
        },
        {
            "name":"Armchair",
            "tags":["seat"],
            "imagePath":"Furniture/Armchair/ArmchairBlackLeft.png",
            "direction":"Left",
            "color":"black"
        },
        {
            "name":"Armchair",
            "tags":["seat"],
            "imagePath":"Furniture/Armchair/ArmchairBlueLeft.png",
            "direction":"Left",
            "color":"blue"
        },
        {
            "name":"Armchair",
            "tags":["seat"],
            "imagePath":"Furniture/Armchair/ArmchairGreenLeft.png",
            "direction":"Left",
            "color":"green"
        },
        {
            "name":"Armchair",
            "tags":["seat"],
            "imagePath":"Furniture/Armchair/ArmchairGreyLeft.png",
            "direction":"Left",
            "color":"grey"
        },
        {
            "name":"Armchair",
            "tags":["seat"],
            "imagePath":"Furniture/Armchair/ArmchairRedLeft.png",
            "direction":"Left",
            "color":"red"
        },
        {
            "name":"Armchair",
            "tags":["seat"],
            "imagePath":"Furniture/Armchair/ArmchairBlackRight.png",
            "direction":"Right",
            "color":"black"
        },
        {
            "name":"Armchair",
            "tags":["seat"],
            "imagePath":"Furniture/Armchair/ArmchairBlueRight.png",
            "direction":"Right",
            "color":"blue"
        },
        {
            "name":"Armchair",
            "tags":["seat"],
            "imagePath":"Furniture/Armchair/ArmchairGreenRight.png",
            "direction":"Right",
            "color":"green"
        },
        {
            "name":"Armchair",
            "tags":["seat"],
            "imagePath":"Furniture/Armchair/ArmchairGreyRight.png",
            "direction":"Right",
            "color":"grey"
        },
        {
            "name":"Armchair",
            "tags":["seat"],
            "imagePath":"Furniture/Armchair/ArmchairRedRight.png",
            "direction":"Right",
            "color":"red"
        },
        {
            "name":"Armchair",
            "tags":["seat"],
            "imagePath":"Furniture/Armchair/ArmchairBlackUp.png",
            "direction":"Up",
            "color":"black"
        },
        {
            "name":"Armchair",
            "tags":["seat"],
            "imagePath":"Furniture/Armchair/ArmchairBlueUp.png",
            "direction":"Up",
            "color":"blue"
        },
        {
            "name":"Armchair",
            "tags":["seat"],
            "imagePath":"Furniture/Armchair/ArmchairGreenUp.png",
            "direction":"Up",
            "color":"green"
        },
        {
            "name":"Armchair",
            "tags":["seat"],
            "imagePath":"Furniture/Armchair/ArmchairGreyUp.png",
            "direction":"Up",
            "color":"grey"
        },
        {
            "name":"Armchair",
            "tags":["seat"],
            "imagePath":"Furniture/Armchair/ArmchairRedUp.png",
            "direction":"Up",
            "color":"red"
        },
        {
            "name":"Couch",
            "tags":["seat"],
            "imagePath":"Furniture/Couch/CouchGreyDown.png",
            "direction":"Down",
            "color":"grey"
        },
        {
            "name":"Couch",
            "tags":["seat"],
            "imagePath":"Furniture/Couch/CouchGreenDown.png",
            "direction":"Down",
            "color":"green"
        },
        {
            "name":"Couch",
            "tags":["seat"],
            "imagePath":"Furniture/Couch/CouchBrownDown.png",
            "direction":"Down",
            "color":"saddlebrown"
        },
        {
            "name":"Couch",
            "tags":["seat"],
            "imagePath":"Furniture/Couch/CouchRedDown.png",
            "direction":"Down",
            "color":"red"
        },
        {
            "name":"Couch",
            "tags":["seat"],
            "imagePath":"Furniture/Couch/CouchBlueDown.png",
            "direction":"Down",
            "color":"blue"
        },
        {
            "name":"Couch",
            "tags":["seat"],
            "imagePath":"Furniture/Couch/CouchGreyRight.png",
            "direction":"Right",
            "color":"grey"
        },
        {
            "name":"Couch",
            "tags":["seat"],
            "imagePath":"Furniture/Couch/CouchGreenRight.png",
            "direction":"Right",
            "color":"green"
        },
        {
            "name":"Couch",
            "tags":["seat"],
            "imagePath":"Furniture/Couch/CouchBrownRight.png",
            "direction":"Right",
            "color":"saddlebrown"
        },
        {
            "name":"Couch",
            "tags":["seat"],
            "imagePath":"Furniture/Couch/CouchRedRight.png",
            "direction":"Right",
            "color":"red"
        },
        {
            "name":"Couch",
            "tags":["seat"],
            "imagePath":"Furniture/Couch/CouchBlueRight.png",
            "direction":"Right",
            "color":"blue"
        },
        {
            "name":"Couch",
            "tags":["seat"],
            "imagePath":"Furniture/Couch/CouchGreyUp.png",
            "direction":"Up",
            "color":"grey"
        },
        {
            "name":"Couch",
            "tags":["seat"],
            "imagePath":"Furniture/Couch/CouchGreenUp.png",
            "direction":"Up",
            "color":"green"
        },
        {
            "name":"Couch",
            "tags":["seat"],
            "imagePath":"Furniture/Couch/CouchBrownUp.png",
            "direction":"Up",
            "color":"saddlebrown"
        },
        {
            "name":"Couch",
            "tags":["seat"],
            "imagePath":"Furniture/Couch/CouchRedUp.png",
            "direction":"Up",
            "color":"red"
        },
        {
            "name":"Couch",
            "tags":["seat"],
            "imagePath":"Furniture/Couch/CouchBlueUp.png",
            "direction":"Up",
            "color":"blue"
        },
        {
            "name":"Couch",
            "tags":["seat"],
            "imagePath":"Furniture/Couch/CouchGreyLeft.png",
            "direction":"Left",
            "color":"grey"
        },
        {
            "name":"Couch",
            "tags":["seat"],
            "imagePath":"Furniture/Couch/CouchGreenLeft.png",
            "direction":"Left",
            "color":"green"
        },
        {
            "name":"Couch",
            "tags":["seat"],
            "imagePath":"Furniture/Couch/CouchBrownLeft.png",
            "direction":"Left",
            "color":"saddlebrown"
        },
        {
            "name":"Couch",
            "tags":["seat"],
            "imagePath":"Furniture/Couch/CouchRedLeft.png",
            "direction":"Left",
            "color":"red"
        },
        {
            "name":"Couch",
            "tags":["seat"],
            "imagePath":"Furniture/Couch/CouchBlueLeft.png",
            "direction":"Left",
            "color":"blue"
        },
        {
            "name":"Mural Shelf",
            "tags":["mural","shelf"],
            "depthOffset": -64,
            "imagePath":"Furniture/Shelf/MuralShelf.png",
            "direction":"Down",
            "color":"saddlebrown"
        },
        {
            "name":"Shelf",
            "tags":["basic", "shelf"],
            "depthOffset": -96,
            "imagePath":"Furniture/Shelf/Shelf.png",
            "direction":"Down",
            "color":"saddlebrown"
        },
        {
            "name":"Big Shelf",
            "tags":["basic", "shelf"],
            "depthOffset": -96,
            "imagePath":"Furniture/Shelf/ShelfBig.png",
            "direction":"Down",
            "color":"saddlebrown"
        },
        {
            "name":"Bathroom Sink",
            "tags":["basic", "bathroom"],
            "imagePath":"Furniture/Bathroom/Sink.png",
            "direction":"Down",
            "color":"brown"
        },
        {
            "name":"Toilet",
            "tags":["basic", "bathroom"],
            "imagePath":"Furniture/Bathroom/Toilet.png",
            "direction":"Down",
            "color":"white"
        },
        {
            "name":"Plant",
            "tags":["ornament","plant","natural", "basic"],
            "imagePath":"Office/Plant/Plant.png",
            "direction":"Down",
            "color":"green"
        },
        {
            "name":"Plant",
            "tags":["ornament","plant","natural", "basic"],
            "imagePath":"Office/Plant/PlantBlue.png",
            "direction":"Down",
            "color":"blue"
        },
        {
            "name":"Plant",
            "tags":["ornament","plant","natural", "basic"],
            "imagePath":"Office/Plant/PlantCyan.png",
            "direction":"Down",
            "color":"cyan"
        },
        {
            "name":"Plant",
            "tags":["ornament","plant","natural", "basic"],
            "imagePath":"Office/Plant/PlantRed.png",
            "direction":"Down",
            "color":"red"
        },
        {
            "name":"Small Plant",
            "tags":["ornament","plant","natural", "basic"],
            "imagePath":"Office/Plant/PlantSmall.png",
            "direction":"Down",
            "color":"green"
        },
        {
            "name":"Small Plant",
            "tags":["ornament","plant","natural", "basic"],
            "imagePath":"Office/Plant/PlantSmallBlue.png",
            "direction":"Down",
            "color":"blue"
        },
        {
            "name":"Small Plant",
            "tags":["ornament","plant","natural", "basic"],
            "imagePath":"Office/Plant/PlantSmallCyan.png",
            "direction":"Down",
            "color":"cyan"
        },
        {
            "name":"Small Plant",
            "tags":["ornament","plant","natural", "basic"],
            "imagePath":"Office/Plant/PlantSmallRed.png",
            "direction":"Down",
            "color":"red"
        },
        {
            "name":"Suspended Plant",
            "tags":["ornament","plant","mural", "basic"],
            "imagePath":"Office/Plant/MuralPlant.png",
            "direction":"Down",
            "color":"green"
        },
        {
            "name":"Large Plant",
            "tags":["ornament","plant", "basic"],
            "imagePath":"Office/Plant/PlantLarge.png",
            "direction":"Down",
            "color":"green"
        },
        {
            "name":"Computer Screen",
            "tags":["equipment", "electronic"],
            "imagePath":"Office/Computer/ScreenBlackDown.png",
            "direction":"Down",
            "color":"black"
        },
        {
            "name":"Computer Screen",
            "tags":["equipment", "electronic"],
            "imagePath":"Office/Computer/ScreenBlackUp.png",
            "direction":"Down",
            "color":"black"
        },
        {
            "name":"Computer Screen",
            "tags":["equipment", "electronic"],
            "imagePath":"Office/Computer/ScreenWhiteDown.png",
            "direction":"Down",
            "color":"white"
        },
        {
            "name":"Computer Screen",
            "tags":["equipment", "electronic"],
            "imagePath":"Office/Computer/ScreenWhiteUp.png",
            "direction":"Down",
            "color":"white"
        },
        {
            "name":"Computer Screen (Big)",
            "tags":["equipment", "electronic"],
            "imagePath":"Office/Computer/BigScreenBlackDown.png",
            "direction":"Down",
            "color":"black"
        },
        {
            "name":"Computer Screen (Big)",
            "tags":["equipment", "electronic"],
            "imagePath":"Office/Computer/BigScreenBlackUp.png",
            "direction":"Down",
            "color":"black"
        },
        {
            "name":"Computer Screen (Big)",
            "tags":["equipment", "electronic"],
            "imagePath":"Office/Computer/BigScreenWhiteDown.png",
            "direction":"Down",
            "color":"white"
        },
        {
            "name":"Computer Screen (Big)",
            "tags":["equipment", "electronic"],
            "imagePath":"Office/Computer/BigScreenWhiteUp.png",
            "direction":"Upv",
            "color":"white"
        },
        {
            "name":"Laptop",
            "tags":["equipment", "electronic"],
            "imagePath":"Office/Computer/LaptopBlackDown.png",
            "direction":"Down",
            "color":"black"
        },
        {
            "name":"Laptop",
            "tags":["equipment", "electronic"],
            "imagePath":"Office/Computer/LaptopBlackRight.png",
            "direction":"Right",
            "color":"black"
        },
        {
            "name":"Printer",
            "tags":["equipment", "electronic"],
            "imagePath":"Office/Computer/Printer.png",
            "direction":"Down",
            "color":"white"
        },
        {
            "name":"Bin",
            "tags":["container"],
            "imagePath":"Office/Props/Bin.png",
            "direction":"Down",
            "color":"grey"
        },
        {
            "name":"Basket",
            "tags":["props", "container"],
            "imagePath":"Office/Props/Basket.png",
            "direction":"Down",
            "color":"saddlebrown"
        },
        {
            "name":"Books (Variant 1)",
            "tags":["props", "book"],
            "imagePath":"Office/Props/Book1.png",
            "direction":"Down",
            "color":"black"
        },
        {
            "name":"Books (Variant 2)",
            "tags":["props", "book"],
            "imagePath":"Office/Props/Book2.png",
            "direction":"Down",
            "color":"black"
        },
        {
            "name":"Books (Variant 3)",
            "tags":["props", "book"],
            "imagePath":"Office/Props/Book3.png",
            "direction":"Down",
            "color":"black"
        },
        {
            "name":"Books (Variant 4)",
            "tags":["props", "book"],
            "imagePath":"Office/Props/Book4.png",
            "direction":"Down",
            "color":"black"
        },
        {
            "name":"Books (Variant 5)",
            "tags":["props", "book"],
            "imagePath":"Office/Props/Book5.png",
            "direction":"Down",
            "color":"black"
        },
        {
            "name":"Round Mural Clock",
            "tags":["props", "mural", "clock"],
            "imagePath":"Office/Props/Clock.png",
            "direction":"Down",
            "color":"white"
        },
        {
            "name":"Coffee Dispenser",
            "tags":["props"],
            "imagePath":"Office/Props/CoffeeDispenser.png",
            "direction":"Down",
            "color":"black"
        },
        {
            "name":"Folders",
            "tags":["props", "book"],
            "imagePath":"Office/Props/Folders.png",
            "direction":"Down",
            "color":"black"
        },
        {
            "name":"Mural Mirror",
            "tags":["props", "mural"],
            "imagePath":"Office/Props/Mirror.png",
            "direction":"Down",
            "color":"black"
        },
        {
            "name":"Mugs",
            "tags":["props"],
            "imagePath":"Office/Props/Mugs.png",
            "direction":"Down",
            "color":"white"
        },
        {
            "name":"Toilet Brush",
            "tags":["props", "bathroom"],
            "imagePath":"Office/Props/ToiletBrush.png",
            "direction":"Down",
            "color":"white"
        },
        {
            "name":"Toilet Paper",
            "tags":["props", "bathroom", "mural"],
            "imagePath":"Office/Props/ToiletPaper.png",
            "direction":"Down",
            "color":"white"
        }
    ]);
}
