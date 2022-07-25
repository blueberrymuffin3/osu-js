import pack from "bin-pack";
import { BaseTexture, Rectangle, SCALE_MODES, Texture } from "pixi.js";

const padding = 1;

export async function generateSpriteSheet(
  input: Map<string, Blob>
): Promise<Map<string, Texture>> {
  const sprites = await Promise.all(
    Array.from(input.entries(), async ([name, blob]) => {
      const bitmap = await createImageBitmap(blob);

      return {
        name,
        bitmap,
        width: bitmap.width + padding * 2,
        height: bitmap.height + padding * 2,
      };
    })
  );

  const packed = pack(sprites);

  const canvas = document.createElement("canvas");
  canvas.width = packed.width;
  canvas.height = packed.height;
  const ctx = canvas.getContext("2d")!;

  for (const result of packed.items) {
    const bitmap = result.item.bitmap;
    // Draw image
    ctx.drawImage(bitmap, result.x + padding, result.y + padding);

    // "extend" image borders to get sharp edges?
    // prettier-ignore
    {
      ctx.drawImage(
        bitmap,
        0, 0, 1, 1,
        result.x, result.y, padding, padding
      ); // Top Left
      ctx.drawImage(
        bitmap,
        bitmap.width - 1, 0, 1, 1,
        result.x + result.width - padding, result.y, padding, padding
      ); // Top Right
      ctx.drawImage(
        bitmap,
        0, bitmap.height - 1,1,1,
        result.x, result.y + bitmap.height + padding, padding, padding
      ); // Bottom Left
      ctx.drawImage(
        bitmap,
        bitmap.width - 1, bitmap.height - 1, 1, 1,
        result.x + result.width - padding, result.y + bitmap.height + padding, padding, padding
      ); // Bottom Right

      ctx.drawImage(
        bitmap,
        0, 0, 1, bitmap.height,
        result.x, result.y + padding, padding, bitmap.height
      ); // Left
      ctx.drawImage(
        bitmap,
        bitmap.width - 1, 0, 1, bitmap.height,
        result.x + result.width - padding, result.y + padding, padding, bitmap.height
      ); // Right
      ctx.drawImage(
        bitmap,
        0, 0, bitmap.width, 1,
        result.x + padding, result.y, bitmap.width, padding
      ); // Top
      ctx.drawImage(
        bitmap,
        0, bitmap.height - 1, bitmap.width, 1,
        result.x + padding, result.y + bitmap.height + padding, bitmap.width, padding
      ); // Bottom
    }
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const baseTexture = BaseTexture.fromBuffer(
    new Uint8Array(imageData.data.buffer),
    canvas.width,
    canvas.height,
    {
      scaleMode: SCALE_MODES.LINEAR,
    }
  );

  const map = new Map<string, Texture>();
  for (const result of packed.items) {
    const texture = new Texture(
      baseTexture,
      new Rectangle(
        result.x + padding,
        result.y + padding,
        result.width - 2 * padding,
        result.height - 2 * padding
      )
    );
    map.set(result.item.name, texture);
  }
  return map;
}
