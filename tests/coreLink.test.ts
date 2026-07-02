import { CORE_PACKAGE_NAME } from "@patternbank/core";

describe("workspace link", () => {
  it("resolves @patternbank/core from web code", () => {
    expect(CORE_PACKAGE_NAME).toBe("@patternbank/core");
  });
});
