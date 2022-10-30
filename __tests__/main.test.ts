import { expect, test } from "@jest/globals";

test("noop", async () => {
    expect([]).toEqual([]);
});
