import LoaderPlugin = Phaser.Loader.LoaderPlugin;
import {PLAYER_RESOURCES, PlayerResourceDescriptionInterface} from "./Character";
import {CharacterTexture} from "../../Connexion/LocalUser";

export interface BodyResourceDescriptionInterface {
    name: string,
    img: string
}

export const COLOR_RESOURCES: Array<BodyResourceDescriptionInterface> = [
    {name:"color_1", img: "resources/customisation/character_color/character_color0.png"},
    {name:"color_2", img: "resources/customisation/character_color/character_color1.png"},
    {name:"color_3", img: "resources/customisation/character_color/character_color2.png"},
    {name:"color_4", img: "resources/customisation/character_color/character_color3.png"},
    {name:"color_5", img: "resources/customisation/character_color/character_color4.png"},
    {name:"color_6", img: "resources/customisation/character_color/character_color5.png"},
    {name:"color_7", img: "resources/customisation/character_color/character_color6.png"},
    {name:"color_8", img: "resources/customisation/character_color/character_color7.png"},
    {name:"color_9", img: "resources/customisation/character_color/character_color8.png"},
    {name:"color_10",img: "resources/customisation/character_color/character_color9.png"},
    {name:"color_11",img: "resources/customisation/character_color/character_color10.png"},
    {name:"color_12",img: "resources/customisation/character_color/character_color11.png"},
    {name:"color_13",img: "resources/customisation/character_color/character_color12.png"},
    {name:"color_14",img: "resources/customisation/character_color/character_color13.png"},
    {name:"color_15",img: "resources/customisation/character_color/character_color14.png"},
    {name:"color_16",img: "resources/customisation/character_color/character_color15.png"},
    {name:"color_17",img: "resources/customisation/character_color/character_color16.png"},
    {name:"color_18",img: "resources/customisation/character_color/character_color17.png"},
    {name:"color_19",img: "resources/customisation/character_color/character_color18.png"},
    {name:"color_20",img: "resources/customisation/character_color/character_color19.png"},
    {name:"color_21",img: "resources/customisation/character_color/character_color20.png"},
    {name:"color_22",img: "resources/customisation/character_color/character_color21.png"},
    {name:"color_23",img: "resources/customisation/character_color/character_color22.png"},
    {name:"color_24",img: "resources/customisation/character_color/character_color23.png"},
    {name:"color_25",img: "resources/customisation/character_color/character_color24.png"},
    {name:"color_26",img: "resources/customisation/character_color/character_color25.png"},
    {name:"color_27",img: "resources/customisation/character_color/character_color26.png"},
    {name:"color_28",img: "resources/customisation/character_color/character_color27.png"},
    {name:"color_29",img: "resources/customisation/character_color/character_color28.png"},
    {name:"color_30",img: "resources/customisation/character_color/character_color29.png"},
    {name:"color_31",img: "resources/customisation/character_color/character_color30.png"},
    {name:"color_32",img: "resources/customisation/character_color/character_color31.png"},
    {name:"color_33",img: "resources/customisation/character_color/character_color32.png"}
];

export const EYES_RESOURCES: Array<BodyResourceDescriptionInterface> = [
    {name: "eyes_1", img: "resources/customisation/character_eyes/character_eyes1.png"},
    {name: "eyes_2", img: "resources/customisation/character_eyes/character_eyes2.png"},
    {name: "eyes_3", img: "resources/customisation/character_eyes/character_eyes3.png"},
    {name: "eyes_4", img: "resources/customisation/character_eyes/character_eyes4.png"},
    {name: "eyes_5", img: "resources/customisation/character_eyes/character_eyes5.png"},
    {name: "eyes_6", img: "resources/customisation/character_eyes/character_eyes6.png"},
    {name: "eyes_7", img: "resources/customisation/character_eyes/character_eyes7.png"},
    {name: "eyes_8", img: "resources/customisation/character_eyes/character_eyes8.png"},
    {name: "eyes_9", img: "resources/customisation/character_eyes/character_eyes9.png"},
    {name: "eyes_10", img: "resources/customisation/character_eyes/character_eyes10.png"},
    {name: "eyes_11", img: "resources/customisation/character_eyes/character_eyes11.png"},
    {name: "eyes_12", img: "resources/customisation/character_eyes/character_eyes12.png"},
    {name: "eyes_13", img: "resources/customisation/character_eyes/character_eyes13.png"},
    {name: "eyes_14", img: "resources/customisation/character_eyes/character_eyes14.png"},
    {name: "eyes_15", img: "resources/customisation/character_eyes/character_eyes15.png"},
    {name: "eyes_16", img: "resources/customisation/character_eyes/character_eyes16.png"},
    {name: "eyes_17", img: "resources/customisation/character_eyes/character_eyes17.png"},
    {name: "eyes_18", img: "resources/customisation/character_eyes/character_eyes18.png"},
    {name: "eyes_19", img: "resources/customisation/character_eyes/character_eyes19.png"},
    {name: "eyes_20", img: "resources/customisation/character_eyes/character_eyes20.png"},
    {name: "eyes_21", img: "resources/customisation/character_eyes/character_eyes21.png"},
    {name: "eyes_22", img: "resources/customisation/character_eyes/character_eyes22.png"},
    {name: "eyes_23", img: "resources/customisation/character_eyes/character_eyes23.png"},
    {name: "eyes_24", img: "resources/customisation/character_eyes/character_eyes24.png"},
    {name: "eyes_25", img: "resources/customisation/character_eyes/character_eyes25.png"},
    {name: "eyes_26", img: "resources/customisation/character_eyes/character_eyes26.png"},
    {name: "eyes_27", img: "resources/customisation/character_eyes/character_eyes27.png"},
    {name: "eyes_28", img: "resources/customisation/character_eyes/character_eyes28.png"},
    {name: "eyes_29", img: "resources/customisation/character_eyes/character_eyes29.png"},
    {name: "eyes_30", img: "resources/customisation/character_eyes/character_eyes30.png"}

]

export const HAIR_RESOURCES: Array<BodyResourceDescriptionInterface> = [
    {name:"hair_1", img: "resources/customisation/character_hairs/character_hairs0.png"},
    {name:"hair_2", img: "resources/customisation/character_hairs/character_hairs1.png"},
    {name:"hair_3", img: "resources/customisation/character_hairs/character_hairs2.png"},
    {name:"hair_4", img: "resources/customisation/character_hairs/character_hairs3.png"},
    {name:"hair_5", img: "resources/customisation/character_hairs/character_hairs4.png"},
    {name:"hair_6", img: "resources/customisation/character_hairs/character_hairs5.png"},
    {name:"hair_7", img: "resources/customisation/character_hairs/character_hairs6.png"},
    {name:"hair_8", img: "resources/customisation/character_hairs/character_hairs7.png"},
    {name:"hair_9", img: "resources/customisation/character_hairs/character_hairs8.png"},
    {name:"hair_10",img: "resources/customisation/character_hairs/character_hairs9.png"},
    {name:"hair_11",img: "resources/customisation/character_hairs/character_hairs10.png"},
    {name:"hair_12",img: "resources/customisation/character_hairs/character_hairs11.png"},
    {name:"hair_13",img: "resources/customisation/character_hairs/character_hairs12.png"},
    {name:"hair_14",img: "resources/customisation/character_hairs/character_hairs13.png"},
    {name:"hair_15",img: "resources/customisation/character_hairs/character_hairs14.png"},
    {name:"hair_16",img: "resources/customisation/character_hairs/character_hairs15.png"},
    {name:"hair_17",img: "resources/customisation/character_hairs/character_hairs16.png"},
    {name:"hair_18",img: "resources/customisation/character_hairs/character_hairs17.png"},
    {name:"hair_19",img: "resources/customisation/character_hairs/character_hairs18.png"},
    {name:"hair_20",img: "resources/customisation/character_hairs/character_hairs19.png"},
    {name:"hair_21",img: "resources/customisation/character_hairs/character_hairs20.png"},
    {name:"hair_22",img: "resources/customisation/character_hairs/character_hairs21.png"},
    {name:"hair_23",img: "resources/customisation/character_hairs/character_hairs22.png"},
    {name:"hair_24",img: "resources/customisation/character_hairs/character_hairs23.png"},
    {name:"hair_25",img: "resources/customisation/character_hairs/character_hairs24.png"},
    {name:"hair_26",img: "resources/customisation/character_hairs/character_hairs25.png"},
    {name:"hair_27",img: "resources/customisation/character_hairs/character_hairs26.png"},
    {name:"hair_28",img: "resources/customisation/character_hairs/character_hairs27.png"},
    {name:"hair_29",img: "resources/customisation/character_hairs/character_hairs28.png"},
    {name:"hair_30",img: "resources/customisation/character_hairs/character_hairs29.png"},
    {name:"hair_31",img: "resources/customisation/character_hairs/character_hairs30.png"},
    {name:"hair_32",img: "resources/customisation/character_hairs/character_hairs31.png"},
    {name:"hair_33",img: "resources/customisation/character_hairs/character_hairs32.png"},
    {name:"hair_34",img: "resources/customisation/character_hairs/character_hairs33.png"},
    {name:"hair_35",img: "resources/customisation/character_hairs/character_hairs34.png"},
    {name:"hair_36",img: "resources/customisation/character_hairs/character_hairs35.png"},
    {name:"hair_37",img: "resources/customisation/character_hairs/character_hairs36.png"},
    {name:"hair_38",img: "resources/customisation/character_hairs/character_hairs37.png"},
    {name:"hair_39",img: "resources/customisation/character_hairs/character_hairs38.png"},
    {name:"hair_40",img: "resources/customisation/character_hairs/character_hairs39.png"},
    {name:"hair_41",img: "resources/customisation/character_hairs/character_hairs40.png"},
    {name:"hair_42",img: "resources/customisation/character_hairs/character_hairs41.png"},
    {name:"hair_43",img: "resources/customisation/character_hairs/character_hairs42.png"},
    {name:"hair_44",img: "resources/customisation/character_hairs/character_hairs43.png"},
    {name:"hair_45",img: "resources/customisation/character_hairs/character_hairs44.png"},
    {name:"hair_46",img: "resources/customisation/character_hairs/character_hairs45.png"},
    {name:"hair_47",img: "resources/customisation/character_hairs/character_hairs46.png"},
    {name:"hair_48",img: "resources/customisation/character_hairs/character_hairs47.png"},
    {name:"hair_49",img: "resources/customisation/character_hairs/character_hairs48.png"},
    {name:"hair_50",img: "resources/customisation/character_hairs/character_hairs49.png"},
    {name:"hair_51",img: "resources/customisation/character_hairs/character_hairs50.png"},
    {name:"hair_52",img: "resources/customisation/character_hairs/character_hairs51.png"},
    {name:"hair_53",img: "resources/customisation/character_hairs/character_hairs52.png"},
    {name:"hair_54",img: "resources/customisation/character_hairs/character_hairs53.png"},
    {name:"hair_55",img: "resources/customisation/character_hairs/character_hairs54.png"},
    {name:"hair_56",img: "resources/customisation/character_hairs/character_hairs55.png"},
    {name:"hair_57",img: "resources/customisation/character_hairs/character_hairs56.png"},
    {name:"hair_58",img: "resources/customisation/character_hairs/character_hairs57.png"},
    {name:"hair_59",img: "resources/customisation/character_hairs/character_hairs58.png"},
    {name:"hair_60",img: "resources/customisation/character_hairs/character_hairs59.png"},
    {name:"hair_61",img: "resources/customisation/character_hairs/character_hairs60.png"},
    {name:"hair_62",img: "resources/customisation/character_hairs/character_hairs61.png"},
    {name:"hair_63",img: "resources/customisation/character_hairs/character_hairs62.png"},
    {name:"hair_64",img: "resources/customisation/character_hairs/character_hairs63.png"},
    {name:"hair_65",img: "resources/customisation/character_hairs/character_hairs64.png"},
    {name:"hair_66",img: "resources/customisation/character_hairs/character_hairs65.png"},
    {name:"hair_67",img: "resources/customisation/character_hairs/character_hairs66.png"},
    {name:"hair_68",img: "resources/customisation/character_hairs/character_hairs67.png"},
    {name:"hair_69",img: "resources/customisation/character_hairs/character_hairs68.png"},
    {name:"hair_70",img: "resources/customisation/character_hairs/character_hairs69.png"},
    {name:"hair_71",img: "resources/customisation/character_hairs/character_hairs70.png"},
    {name:"hair_72",img: "resources/customisation/character_hairs/character_hairs71.png"},
    {name:"hair_73",img: "resources/customisation/character_hairs/character_hairs72.png"},
    {name:"hair_74",img: "resources/customisation/character_hairs/character_hairs73.png"}
];


export const CLOTHES_RESOURCES: Array<BodyResourceDescriptionInterface> = [
    {name:"clothes_1", img: "resources/customisation/character_clothes/character_clothes0.png"},
    {name:"clothes_2", img: "resources/customisation/character_clothes/character_clothes1.png"},
    {name:"clothes_3", img: "resources/customisation/character_clothes/character_clothes2.png"},
    {name:"clothes_4", img: "resources/customisation/character_clothes/character_clothes3.png"},
    {name:"clothes_5", img: "resources/customisation/character_clothes/character_clothes4.png"},
    {name:"clothes_6", img: "resources/customisation/character_clothes/character_clothes5.png"},
    {name:"clothes_7", img: "resources/customisation/character_clothes/character_clothes6.png"},
    {name:"clothes_8", img: "resources/customisation/character_clothes/character_clothes7.png"},
    {name:"clothes_9", img: "resources/customisation/character_clothes/character_clothes8.png"},
    {name:"clothes_10",img: "resources/customisation/character_clothes/character_clothes9.png"},
    {name:"clothes_11",img: "resources/customisation/character_clothes/character_clothes10.png"},
    {name:"clothes_12",img: "resources/customisation/character_clothes/character_clothes11.png"},
    {name:"clothes_13",img: "resources/customisation/character_clothes/character_clothes12.png"},
    {name:"clothes_14",img: "resources/customisation/character_clothes/character_clothes13.png"},
    {name:"clothes_15",img: "resources/customisation/character_clothes/character_clothes14.png"},
    {name:"clothes_16",img: "resources/customisation/character_clothes/character_clothes15.png"},
    {name:"clothes_17",img: "resources/customisation/character_clothes/character_clothes16.png"},
    {name:"clothes_18",img: "resources/customisation/character_clothes/character_clothes17.png"},
    {name:"clothes_19",img: "resources/customisation/character_clothes/character_clothes18.png"},
    {name:"clothes_20",img: "resources/customisation/character_clothes/character_clothes19.png"},
    {name:"clothes_21",img: "resources/customisation/character_clothes/character_clothes20.png"},
    {name:"clothes_22",img: "resources/customisation/character_clothes/character_clothes21.png"},
    {name:"clothes_23",img: "resources/customisation/character_clothes/character_clothes22.png"},
    {name:"clothes_24",img: "resources/customisation/character_clothes/character_clothes23.png"},
    {name:"clothes_25",img: "resources/customisation/character_clothes/character_clothes24.png"},
    {name:"clothes_26",img: "resources/customisation/character_clothes/character_clothes25.png"},
    {name:"clothes_27",img: "resources/customisation/character_clothes/character_clothes26.png"},
    {name:"clothes_28",img: "resources/customisation/character_clothes/character_clothes27.png"},
    {name:"clothes_29",img: "resources/customisation/character_clothes/character_clothes28.png"},
    {name:"clothes_30",img: "resources/customisation/character_clothes/character_clothes29.png"},
    {name:"clothes_31",img: "resources/customisation/character_clothes/character_clothes30.png"},
    {name:"clothes_32",img: "resources/customisation/character_clothes/character_clothes31.png"},
    {name:"clothes_33",img: "resources/customisation/character_clothes/character_clothes32.png"},
    {name:"clothes_34",img: "resources/customisation/character_clothes/character_clothes33.png"},
    {name:"clothes_35",img: "resources/customisation/character_clothes/character_clothes34.png"},
    {name:"clothes_36",img: "resources/customisation/character_clothes/character_clothes35.png"},
    {name:"clothes_37",img: "resources/customisation/character_clothes/character_clothes36.png"},
    {name:"clothes_38",img: "resources/customisation/character_clothes/character_clothes37.png"},
    {name:"clothes_39",img: "resources/customisation/character_clothes/character_clothes38.png"},
    {name:"clothes_40",img: "resources/customisation/character_clothes/character_clothes39.png"},
    {name:"clothes_41",img: "resources/customisation/character_clothes/character_clothes40.png"},
    {name:"clothes_42",img: "resources/customisation/character_clothes/character_clothes41.png"},
    {name:"clothes_43",img: "resources/customisation/character_clothes/character_clothes42.png"},
    {name:"clothes_44",img: "resources/customisation/character_clothes/character_clothes43.png"},
    {name:"clothes_45",img: "resources/customisation/character_clothes/character_clothes44.png"},
    {name:"clothes_46",img: "resources/customisation/character_clothes/character_clothes45.png"},
    {name:"clothes_47",img: "resources/customisation/character_clothes/character_clothes46.png"},
    {name:"clothes_48",img: "resources/customisation/character_clothes/character_clothes47.png"},
    {name:"clothes_49",img: "resources/customisation/character_clothes/character_clothes48.png"},
    {name:"clothes_50",img: "resources/customisation/character_clothes/character_clothes49.png"},
    {name:"clothes_51",img: "resources/customisation/character_clothes/character_clothes50.png"},
    {name:"clothes_52",img: "resources/customisation/character_clothes/character_clothes51.png"},
    {name:"clothes_53",img: "resources/customisation/character_clothes/character_clothes52.png"},
    {name:"clothes_54",img: "resources/customisation/character_clothes/character_clothes53.png"},
    {name:"clothes_55",img: "resources/customisation/character_clothes/character_clothes54.png"},
    {name:"clothes_56",img: "resources/customisation/character_clothes/character_clothes55.png"},
    {name:"clothes_57",img: "resources/customisation/character_clothes/character_clothes56.png"},
    {name:"clothes_58",img: "resources/customisation/character_clothes/character_clothes57.png"},
    {name:"clothes_59",img: "resources/customisation/character_clothes/character_clothes58.png"},
    {name:"clothes_60",img: "resources/customisation/character_clothes/character_clothes59.png"},
    {name:"clothes_61",img: "resources/customisation/character_clothes/character_clothes60.png"},
    {name:"clothes_62",img: "resources/customisation/character_clothes/character_clothes61.png"},
    {name:"clothes_63",img: "resources/customisation/character_clothes/character_clothes62.png"},
    {name:"clothes_64",img: "resources/customisation/character_clothes/character_clothes63.png"},
    {name:"clothes_65",img: "resources/customisation/character_clothes/character_clothes64.png"},
    {name:"clothes_66",img: "resources/customisation/character_clothes/character_clothes65.png"},
    {name:"clothes_67",img: "resources/customisation/character_clothes/character_clothes66.png"},
    {name:"clothes_68",img: "resources/customisation/character_clothes/character_clothes67.png"},
    {name:"clothes_69",img: "resources/customisation/character_clothes/character_clothes68.png"},
    {name:"clothes_70",img: "resources/customisation/character_clothes/character_clothes69.png"},
    {name:"clothes_pride_shirt",img: "resources/customisation/character_clothes/pride_shirt.png"},
    {name:"clothes_black_hoodie",img: "resources/customisation/character_clothes/black_hoodie.png"},
    {name:"clothes_white_hoodie",img: "resources/customisation/character_clothes/white_hoodie.png"}
];

export const HATS_RESOURCES: Array<BodyResourceDescriptionInterface> = [
    {name: "hats_1", img: "resources/customisation/character_hats/character_hats1.png"},
    {name: "hats_2", img: "resources/customisation/character_hats/character_hats2.png"},
    {name: "hats_3", img: "resources/customisation/character_hats/character_hats3.png"},
    {name: "hats_4", img: "resources/customisation/character_hats/character_hats4.png"},
    {name: "hats_5", img: "resources/customisation/character_hats/character_hats5.png"},
    {name: "hats_6", img: "resources/customisation/character_hats/character_hats6.png"},
    {name: "hats_7", img: "resources/customisation/character_hats/character_hats7.png"},
    {name: "hats_8", img: "resources/customisation/character_hats/character_hats8.png"},
    {name: "hats_9", img: "resources/customisation/character_hats/character_hats9.png"},
    {name: "hats_10", img: "resources/customisation/character_hats/character_hats10.png"},
    {name: "hats_11", img: "resources/customisation/character_hats/character_hats11.png"},
    {name: "hats_12", img: "resources/customisation/character_hats/character_hats12.png"},
    {name: "hats_13", img: "resources/customisation/character_hats/character_hats13.png"},
    {name: "hats_14", img: "resources/customisation/character_hats/character_hats14.png"},
    {name: "hats_15", img: "resources/customisation/character_hats/character_hats15.png"},
    {name: "hats_16", img: "resources/customisation/character_hats/character_hats16.png"},
    {name: "hats_17", img: "resources/customisation/character_hats/character_hats17.png"},
    {name: "hats_18", img: "resources/customisation/character_hats/character_hats18.png"},
    {name: "hats_19", img: "resources/customisation/character_hats/character_hats19.png"},
    {name: "hats_20", img: "resources/customisation/character_hats/character_hats20.png"},
    {name: "hats_21", img: "resources/customisation/character_hats/character_hats21.png"},
    {name: "hats_22", img: "resources/customisation/character_hats/character_hats22.png"},
    {name: "hats_23", img: "resources/customisation/character_hats/character_hats23.png"},
    {name: "hats_24", img: "resources/customisation/character_hats/character_hats24.png"},
    {name: "hats_25", img: "resources/customisation/character_hats/character_hats25.png"},
    {name: "hats_26", img: "resources/customisation/character_hats/character_hats26.png"},
    {name: "tinfoil_hat1", img: "resources/customisation/character_hats/tinfoil_hat1.png"}
];

export const ACCESSORIES_RESOURCES: Array<BodyResourceDescriptionInterface> = [
    {name: "accessory_1", img: "resources/customisation/character_accessories/character_accessories1.png"},
    {name: "accessory_2", img: "resources/customisation/character_accessories/character_accessories2.png"},
    {name: "accessory_3", img: "resources/customisation/character_accessories/character_accessories3.png"},
    {name: "accessory_4", img: "resources/customisation/character_accessories/character_accessories4.png"},
    {name: "accessory_5", img: "resources/customisation/character_accessories/character_accessories5.png"},
    {name: "accessory_6", img: "resources/customisation/character_accessories/character_accessories6.png"},
    {name: "accessory_7", img: "resources/customisation/character_accessories/character_accessories7.png"},
    {name: "accessory_8", img: "resources/customisation/character_accessories/character_accessories8.png"},
    {name: "accessory_9", img: "resources/customisation/character_accessories/character_accessories9.png"},
    {name: "accessory_10", img: "resources/customisation/character_accessories/character_accessories10.png"},
    {name: "accessory_11", img: "resources/customisation/character_accessories/character_accessories11.png"},
    {name: "accessory_12", img: "resources/customisation/character_accessories/character_accessories12.png"},
    {name: "accessory_13", img: "resources/customisation/character_accessories/character_accessories13.png"},
    {name: "accessory_14", img: "resources/customisation/character_accessories/character_accessories14.png"},
    {name: "accessory_15", img: "resources/customisation/character_accessories/character_accessories15.png"},
    {name: "accessory_16", img: "resources/customisation/character_accessories/character_accessories16.png"},
    {name: "accessory_17", img: "resources/customisation/character_accessories/character_accessories17.png"},
    {name: "accessory_18", img: "resources/customisation/character_accessories/character_accessories18.png"},
    {name: "accessory_19", img: "resources/customisation/character_accessories/character_accessories19.png"},
    {name: "accessory_20", img: "resources/customisation/character_accessories/character_accessories20.png"},
    {name: "accessory_21", img: "resources/customisation/character_accessories/character_accessories21.png"},
    {name: "accessory_22", img: "resources/customisation/character_accessories/character_accessories22.png"},
    {name: "accessory_23", img: "resources/customisation/character_accessories/character_accessories23.png"},
    {name: "accessory_24", img: "resources/customisation/character_accessories/character_accessories24.png"},
    {name: "accessory_25", img: "resources/customisation/character_accessories/character_accessories25.png"},
    {name: "accessory_26", img: "resources/customisation/character_accessories/character_accessories26.png"},
    {name: "accessory_27", img: "resources/customisation/character_accessories/character_accessories27.png"},
    {name: "accessory_28", img: "resources/customisation/character_accessories/character_accessories28.png"},
    {name: "accessory_29", img: "resources/customisation/character_accessories/character_accessories29.png"},
    {name: "accessory_30", img: "resources/customisation/character_accessories/character_accessories30.png"},
    {name: "accessory_31", img: "resources/customisation/character_accessories/character_accessories31.png"},
    {name: "accessory_32", img: "resources/customisation/character_accessories/character_accessories32.png"},
    {name: "accessory_mate_bottle", img: "resources/customisation/character_accessories/mate_bottle1.png"}
];

export const LAYERS: Array<Array<BodyResourceDescriptionInterface>> = [
    COLOR_RESOURCES,
    EYES_RESOURCES,
    HAIR_RESOURCES,
    CLOTHES_RESOURCES,
    HATS_RESOURCES,
    ACCESSORIES_RESOURCES
];

export const loadAllLayers = (load: LoaderPlugin) => {
    for (let j = 0; j < LAYERS.length; j++) {
        for (let i = 0; i < LAYERS[j].length; i++) {
            load.spritesheet(
                LAYERS[j][i].name,
                LAYERS[j][i].img,
                {frameWidth: 32, frameHeight: 32}
            )
        }
    }
}

export const loadCustomTexture = (load: LoaderPlugin, texture: CharacterTexture) => {
    const name = 'customCharacterTexture'+texture.id;
    load.spritesheet(
        name,
        texture.url,
        {frameWidth: 32, frameHeight: 32}
    );
}

export const OBJECTS: Array<PlayerResourceDescriptionInterface> = [
    {name:'layout_modes', img:'resources/objects/layout_modes.png'},
    {name:'teleportation', img:'resources/objects/teleportation.png'},
];

export const loadObject = (load: LoaderPlugin) => {
    for (let j = 0; j < OBJECTS.length; j++) {
        load.spritesheet(
            OBJECTS[j].name,
            OBJECTS[j].img,
            {frameWidth: 32, frameHeight: 32}
        )
    }
}

export const loadPlayerCharacters = (load: LoaderPlugin) => {
    PLAYER_RESOURCES.forEach((playerResource: PlayerResourceDescriptionInterface) => {
        load.spritesheet(
            playerResource.name,
            playerResource.img,
            {frameWidth: 32, frameHeight: 32}
        );
    });
}
