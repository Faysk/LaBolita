import { describe, expect, it } from "vitest";
import { playerStickerAsset } from "@/lib/player-sticker-assets";

describe("player sticker assets", () => {
  it("maps ambiguous first-name sticker files with explicit aliases", () => {
    expect(playerStickerAsset("player:COL:10:james-david-rodriguez-rubio")).toMatchObject({
      src: "/stickers/players/col-10-james.webp",
      width: 512,
      height: 768,
    });
  });
});
