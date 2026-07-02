import { CORE_PACKAGE_NAME } from "../src/index";

describe("core package smoke", () => {
  it("exports the package name", () => {
    expect(CORE_PACKAGE_NAME).toBe("@patternbank/core");
  });
});
