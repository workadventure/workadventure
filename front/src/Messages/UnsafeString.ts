/**
 * The UnsafeString interface is like a real string.... except it should be considered "unsafe" to use without prior sanitization.
 */
export interface UnsafeString {
    /** Removes whitespace from the left end of a string. */
    trimLeft(): UnsafeString;
    /** Removes whitespace from the right end of a string. */
    trimRight(): UnsafeString;

    /** Returns a copy with leading whitespace removed. */
    trimStart(): UnsafeString;
    /** Returns a copy with trailing whitespace removed. */
    trimEnd(): UnsafeString;


    /**
     * Returns a nonnegative integer Number less than 1114112 (0x110000) that is the code point
     * value of the UTF-16 encoded code point starting at the string element at position pos in
     * the String resulting from converting this object to a String.
     * If there is no element at that position, the result is undefined.
     * If a valid UTF-16 surrogate pair does not begin at pos, the result is the code unit at pos.
     */
    codePointAt(pos: number): number | undefined;

    /**
     * Returns true if searchString appears as a substring of the result of converting this
     * object to a String, at one or more positions that are
     * greater than or equal to position; otherwise, returns false.
     * @param searchString search string
     * @param position If position is undefined, 0 is assumed, so as to search all of the String.
     */
    includes(searchString: string, position?: number): boolean;

    /**
     * Returns true if the sequence of elements of searchString converted to a String is the
     * same as the corresponding elements of this object (converted to a String) starting at
     * endPosition – length(this). Otherwise returns false.
     */
    endsWith(searchString: string, endPosition?: number): boolean;

    /**
     * Returns the String value result of normalizing the string into the normalization form
     * named by form as specified in Unicode Standard Annex #15, Unicode Normalization Forms.
     * @param form Applicable values: "NFC", "NFD", "NFKC", or "NFKD", If not specified default
     * is "NFC"
     */
    normalize(form: "NFC" | "NFD" | "NFKC" | "NFKD"): UnsafeString;

    /**
     * Returns the String value result of normalizing the string into the normalization form
     * named by form as specified in Unicode Standard Annex #15, Unicode Normalization Forms.
     * @param form Applicable values: "NFC", "NFD", "NFKC", or "NFKD", If not specified default
     * is "NFC"
     */
    normalize(form?: string): UnsafeString;

    /**
     * Returns a String value that is made from count copies appended together. If count is 0,
     * the empty string is returned.
     * @param count number of copies to append
     */
    repeat(count: number): UnsafeString;

    /**
     * Returns true if the sequence of elements of searchString converted to a String is the
     * same as the corresponding elements of this object (converted to a String) starting at
     * position. Otherwise returns false.
     */
    startsWith(searchString: string, position?: number): boolean;

    /**
     * Returns an `<a>` HTML anchor element and sets the name attribute to the text value
     * @param name
     */
    anchor(name: string): UnsafeString;

    /** Returns a `<big>` HTML element */
    big(): UnsafeString;

    /** Returns a `<blink>` HTML element */
    blink(): UnsafeString;

    /** Returns a `<b>` HTML element */
    bold(): UnsafeString;

    /** Returns a `<tt>` HTML element */
    fixed(): UnsafeString;

    /** Returns a `<font>` HTML element and sets the color attribute value */
    fontcolor(color: string): UnsafeString;

    /** Returns a `<font>` HTML element and sets the size attribute value */
    fontsize(size: number): UnsafeString;

    /** Returns a `<font>` HTML element and sets the size attribute value */
    fontsize(size: string): UnsafeString;

    /** Returns an `<i>` HTML element */
    italics(): UnsafeString;

    /** Returns an `<a>` HTML element and sets the href attribute value */
    link(url: string): UnsafeString;

    /** Returns a `<small>` HTML element */
    small(): UnsafeString;

    /** Returns a `<strike>` HTML element */
    strike(): UnsafeString;

    /** Returns a `<sub>` HTML element */
    sub(): UnsafeString;

    /** Returns a `<sup>` HTML element */
    sup(): UnsafeString;

    [Symbol.iterator](): IterableIterator<UnsafeString>;


    /**
     * Matches a string or an object that supports being matched against, and returns an array
     * containing the results of that search, or null if no matches are found.
     * @param matcher An object that supports being matched against.
     */
    match(matcher: { [Symbol.match](string: string): RegExpMatchArray | null; }): RegExpMatchArray | null;

    /**
     * Replaces text in a string, using an object that supports replacement within a string.
     * @param searchValue A object can search for and replace matches within a string.
     * @param replaceValue A string containing the text to replace for every successful match of searchValue in this string.
     */
    replace(searchValue: { [Symbol.replace](string: string, replaceValue: string): string; }, replaceValue: string): UnsafeString;

    /**
     * Finds the first substring match in a regular expression search.
     * @param searcher An object which supports searching within a string.
     */
    search(searcher: { [Symbol.search](string: string): number; }): number;

    /**
     * Split a string into substrings using the specified separator and return them as an array.
     * @param splitter An object that can split a string.
     * @param limit A value used to limit the number of elements returned in the array.
     */
    split(splitter: { [Symbol.split](string: string, limit?: number): string[]; }, limit?: number): UnsafeString[];
    /**
     * Pads the current string with a given string (possibly repeated) so that the resulting string reaches a given length.
     * The padding is applied from the start (left) of the current string.
     *
     * @param maxLength The length of the resulting string once the current string has been padded.
     *        If this parameter is smaller than the current string's length, the current string will be returned as it is.
     *
     * @param fillString The string to pad the current string with.
     *        If this string is too long, it will be truncated and the left-most part will be applied.
     *        The default value for this parameter is " " (U+0020).
     */
    padStart(maxLength: number, fillString?: string): UnsafeString;

    /**
     * Pads the current string with a given string (possibly repeated) so that the resulting string reaches a given length.
     * The padding is applied from the end (right) of the current string.
     *
     * @param maxLength The length of the resulting string once the current string has been padded.
     *        If this parameter is smaller than the current string's length, the current string will be returned as it is.
     *
     * @param fillString The string to pad the current string with.
     *        If this string is too long, it will be truncated and the left-most part will be applied.
     *        The default value for this parameter is " " (U+0020).
     */
    padEnd(maxLength: number, fillString?: string): UnsafeString;


    /** Returns a string representation of a string. */
    toString(): UnsafeString;

    /**
     * Returns the character at the specified index.
     * @param pos The zero-based index of the desired character.
     */
    charAt(pos: number): UnsafeString;

    /**
     * Returns the Unicode value of the character at the specified location.
     * @param index The zero-based index of the desired character. If there is no character at the specified index, NaN is returned.
     */
    charCodeAt(index: number): number;

    /**
     * Returns a string that contains the concatenation of two or more strings.
     * @param strings The strings to append to the end of the string.
     */
    concat(...strings: string[]): UnsafeString;

    /**
     * Returns the position of the first occurrence of a substring.
     * @param searchString The substring to search for in the string
     * @param position The index at which to begin searching the String object. If omitted, search starts at the beginning of the string.
     */
    indexOf(searchString: string, position?: number): number;

    /**
     * Returns the last occurrence of a substring in the string.
     * @param searchString The substring to search for.
     * @param position The index at which to begin searching. If omitted, the search begins at the end of the string.
     */
    lastIndexOf(searchString: string, position?: number): number;

    /**
     * Determines whether two strings are equivalent in the current locale.
     * @param that String to compare to target string
     */
    localeCompare(that: string): number;

    /**
     * Returns a section of a string.
     * @param start The index to the beginning of the specified portion of stringObj.
     * @param end The index to the end of the specified portion of stringObj. The substring includes the characters up to, but not including, the character indicated by end.
     * If this value is not specified, the substring continues to the end of stringObj.
     */
    slice(start?: number, end?: number): UnsafeString;

    /**
     * Returns the substring at the specified location within a String object.
     * @param start The zero-based index number indicating the beginning of the substring.
     * @param end Zero-based index number indicating the end of the substring. The substring includes the characters up to, but not including, the character indicated by end.
     * If end is omitted, the characters from start through the end of the original string are returned.
     */
    substring(start: number, end?: number): UnsafeString;

    /** Converts all the alphabetic characters in a string to lowercase. */
    toLowerCase(): UnsafeString;

    /** Converts all alphabetic characters to lowercase, taking into account the host environment's current locale. */
    toLocaleLowerCase(locales?: string | string[]): UnsafeString;

    /** Converts all the alphabetic characters in a string to uppercase. */
    toUpperCase(): UnsafeString;

    /** Returns a string where all alphabetic characters have been converted to uppercase, taking into account the host environment's current locale. */
    toLocaleUpperCase(locales?: string | string[]): UnsafeString;

    /** Removes the leading and trailing white space and line terminator characters from a string. */
    trim(): UnsafeString;

    /** Returns the length of a String object. */
    readonly length: number;

    // IE extensions
    /**
     * Gets a substring beginning at the specified location and having the specified length.
     * @param from The starting position of the desired substring. The index of the first character in the string is zero.
     * @param length The number of characters to include in the returned substring.
     */
    substr(from: number, length?: number): UnsafeString;

    /** Returns the primitive value of the specified object. */
    valueOf(): UnsafeString;

    readonly [index: number]: UnsafeString;
}
