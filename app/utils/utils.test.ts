import { undefinedToFalse } from "./utils";

describe("undefinedToFalse", () => {
  test("primitive", () => {
    expect(undefinedToFalse(undefined)).toEqual(false);
  });
  test("simple object", () => {
    expect(undefinedToFalse({ a: undefined })).toEqual({ a: false });
  });
  test("array property", () => {
    expect(undefinedToFalse({ a: [false, undefined] })).toEqual({
      a: [false, false],
    });
  });
  test("nested object", () => {
    expect(
      undefinedToFalse({
        a: {
          b: undefined,
        },
      })
    ).toEqual({
      a: {
        b: false,
      },
    });
  });
});
