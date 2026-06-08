import { describe, expect, it } from "vitest";
import { readTextWithByteLimit } from "@/lib/bounded-response";

describe("readTextWithByteLimit", () => {
  it("reads a response within the byte limit", async () => {
    const response = new Response("LaBolita");

    await expect(readTextWithByteLimit(response, 8)).resolves.toBe("LaBolita");
  });

  it("rejects a declared response that exceeds the limit", async () => {
    const response = new Response("ok", {
      headers: { "content-length": "100" },
    });

    await expect(readTextWithByteLimit(response, 10)).rejects.toThrow(
      "Response exceeded 10 bytes.",
    );
  });

  it("rejects a streamed response as soon as its bytes exceed the limit", async () => {
    const response = new Response("123456");

    await expect(readTextWithByteLimit(response, 5)).rejects.toThrow(
      "Response exceeded 5 bytes.",
    );
  });

  it("counts UTF-8 bytes instead of JavaScript characters", async () => {
    const response = new Response("á");

    await expect(readTextWithByteLimit(response, 1)).rejects.toThrow(
      "Response exceeded 1 bytes.",
    );
  });
});
