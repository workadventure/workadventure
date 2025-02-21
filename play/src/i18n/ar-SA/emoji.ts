import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const emoji: DeepPartial<Translation["emoji"]> = {
    search: "ابحث عن الرموز التعبيرية...", // search for emojis
    categories: {
        recents: "الرموز التعبيرية الأخيرة", // recent emojis
        smileys: "الابتسامات والمشاعر", // smileys & emotions
        people: "الناس", // people
        animals: "الحيوانات والطبيعة", // animals & nature
        food: "الطعام والشراب", // food & drink
        activities: "الأنشطة", // activities
        travel: "السفر والأماكن", // travel & places
        objects: "الأشياء", // objects
        symbols: "الرموز", // symbols
        flags: "الأعلام", // flags
        custom: "مخصص", // custom
    },
    notFound: "لم يتم العثور على رموز تعبيرية", // no emojis found
};

export default emoji;
