export const arrayIntersect = (array1: string[], array2: string[]): boolean => {
    return array1.filter((value) => array2.includes(value)).length > 0;
};
