import MultiBinPacker, { Bin, Rect } from "multi-bin-packer";
import { BaseTexture, Rectangle, Texture } from "pixi.js";
import { executeSteps, LoadCallback } from "./executor";

const MAX_ATLAS_SIZE = Math.min(2048, getMaxWebGlTextureSize());
const MARGIN = 2;

interface AtlasItemMeta {
  name: String;
  bitmap: ImageBitmap;
}

function getMaxWebGlTextureSize() {
  const context = document.createElement("canvas").getContext("webgl2");
  return context!.MAX_TEXTURE_SIZE;
}

export async function generateAtlases(
  input: Map<string, Blob>,
  cb: LoadCallback
): Promise<Map<string, Texture>> {
  const sprites: Rect<AtlasItemMeta>[] = [];

  const packer = new MultiBinPacker<AtlasItemMeta>(
    MAX_ATLAS_SIZE,
    MAX_ATLAS_SIZE,
    MARGIN * 2
  );

  const map = new Map<string, Texture>();

  await executeSteps(cb, [
    {
      weight: 5,
      async execute(cb) {
        let decoded = 0;
        for (const [name, blob] of input.entries()) {
          cb(
            decoded / input.size,
            `Decoding Sprites (${decoded + 1} / ${input.size})`
          );

          const bitmap = await createImageBitmap(blob);

          sprites.push({
            width: bitmap.width,
            height: bitmap.height,
            data: {
              name,
              bitmap,
            },
          });
          decoded++;
        }
      },
    },
    {
      weight: 1,
      async execute(cb) {
        cb(0, "Generating Atlases");
        // Update UI
        await new Promise((resolve) => setTimeout(resolve));

        packer.addArray(sprites);

        console.log(
          `Packed ${sprites.length} sprites into ${
            packer.bins.filter((bin) => !bin.rects[0].oversized).length
          } normal and ${
            packer.bins.filter((bin) => bin.rects[0].oversized).length
          } oversized bins`
        );
      },
    },
    {
      weight: 4,
      async execute(cb) {
        let rendered = 0;

        for (const bin of packer.bins) {
          cb(
            rendered / packer.bins.length,
            `Rendering Atlas (${rendered + 1} / ${packer.bins.length})`
          );

          renderBin(map, bin);
          rendered++;
        }
      },
    },
  ]);

  return map;
}

function renderBin(map: Map<String, Texture>, bin: Bin<AtlasItemMeta>) {
  const canvas = document.createElement("canvas");
  canvas.width = bin.width;
  canvas.height = bin.height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  for (const result of bin.rects) {
    const bitmap = result.data.bitmap;
    // Draw image
    ctx.drawImage(bitmap, result.x, result.y);

    // "extend" image borders to get sharp edges?
    // Top Left
    ctx.drawImage(
      bitmap,
      0,
      0,
      1,
      1,
      result.x - MARGIN,
      result.y - MARGIN,
      MARGIN,
      MARGIN
    );
    // Top Right
    ctx.drawImage(
      bitmap,
      bitmap.width - 1,
      0,
      1,
      1,
      result.x + result.width,
      result.y - MARGIN,
      MARGIN,
      MARGIN
    );
    // Bottom Left
    ctx.drawImage(
      bitmap,
      0,
      bitmap.height - 1,
      1,
      1,
      result.x - MARGIN,
      result.y + result.height,
      MARGIN,
      MARGIN
    );
    // Bottom Right
    ctx.drawImage(
      bitmap,
      bitmap.width - 1,
      bitmap.height - 1,
      1,
      1,
      result.x + result.width,
      result.y + result.height,
      MARGIN,
      MARGIN
    );
    // Left
    ctx.drawImage(
      bitmap,
      0,
      0,
      1,
      bitmap.height,
      result.x - MARGIN,
      result.y,
      MARGIN,
      result.height
    );
    // Right
    ctx.drawImage(
      bitmap,
      bitmap.width - 1,
      0,
      1,
      bitmap.height,
      result.x + result.width,
      result.y,
      MARGIN,
      result.height
    );
    // Top
    ctx.drawImage(
      bitmap,
      0,
      0,
      bitmap.width,
      1,
      result.x,
      result.y - MARGIN,
      result.width,
      MARGIN
    );
    ctx.drawImage(
      bitmap,
      0,
      bitmap.height - 1,
      bitmap.width,
      1,
      result.x,
      result.y + result.height,
      result.width,
      MARGIN
    ); // Bottom
  }

  const baseTexture = BaseTexture.from(canvas);

  for (const result of bin.rects) {
    const texture = new Texture(
      baseTexture,
      new Rectangle(result.x, result.y, result.width, result.height)
    );
    map.set(result.data.name, texture);
  }
}
