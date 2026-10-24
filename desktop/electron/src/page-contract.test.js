import { expect, test } from "vitest";
import { DESKTOP_CONTRACT, forgetPage, pageSaidHello, recordHello } from "./page-contract";

const page = (id) => ({ id });

test("a page is of contract 1 until it says hello, and again after a new load", () => {
    const tab = page(1);
    expect(pageSaidHello(tab)).toBe(false);
    recordHello(tab, 2);
    expect(pageSaidHello(tab)).toBe(true);
    forgetPage(tab);
    expect(pageSaidHello(tab)).toBe(false);
});

test("ignores a malformed hello", () => {
    const tab = page(2);
    for (const contract of [undefined, "2", 1, 2.5, null]) {
        recordHello(tab, contract);
    }
    expect(pageSaidHello(tab)).toBe(false);
});

test("keeps the contract per page", () => {
    recordHello(page(3), DESKTOP_CONTRACT);
    expect(pageSaidHello(page(3))).toBe(true);
    expect(pageSaidHello(page(4))).toBe(false);
});
