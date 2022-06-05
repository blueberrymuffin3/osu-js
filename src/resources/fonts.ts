import {
  BitmapFont,
  BitmapFontData,
  IAddOptions,
  ILoaderPlugin,
  Loader,
  LoaderResource,
  Resource,
  Texture,
} from "pixi.js";
import { Buffer } from "buffer";
import readBMFontBinary from "parse-bmfont-binary";
import FONT_VENERA_BOLD from "./osu/osu.Game.Resources/Fonts/Venera/Venera-Bold.bin?url";
import FONT_VENERA_BOLD_0 from "./osu/osu.Game.Resources/Fonts/Venera/Venera-Bold_0.png";

export const FONT_VENERA_FACE = "Venera";

const FONT_PREFIX_BINARY = "font_bin_";

export const preloadFonts: IAddOptions[] = [
  {
    name: FONT_PREFIX_BINARY + "venera",
    url: FONT_VENERA_BOLD,
  },
  {
    name: "Venera-Bold_0.png",
    url: FONT_VENERA_BOLD_0,
  },
];

export class BinaryFontLoader implements ILoaderPlugin {
  static MAGIC_BYTES = new Uint8Array([66, 77, 70, 3]);

  static add() {
    LoaderResource.setExtensionXhrType(
      "bin",
      LoaderResource.XHR_RESPONSE_TYPE.BUFFER
    );
  }

  static async use?(
    this: Loader,
    resource: LoaderResource,
    next: () => void
  ): Promise<void> {
    if (!resource.name.startsWith(FONT_PREFIX_BINARY)) {
      next();
      return;
    }

    if (!(resource.data instanceof ArrayBuffer)) {
      next();
      return;
    }

    const parsed = readBMFontBinary(Buffer.from(resource.data));
    const data = new BitmapFontData();
    data.char = parsed.chars;
    data.common = [parsed.common];
    data.info = [parsed.info];
    data.kerning = parsed.kernings;
    data.page = parsed.pages.map((file, id) => ({ file, id }));

    const textures = await Promise.all(
      data.page.map(
        ({ file }): Promise<Texture<Resource>> | Texture<Resource> => {
          const bitmapResource = this.resources[file];
          if (bitmapResource.texture) {
            return bitmapResource.texture;
          } else {
            return new Promise((resolve) =>
              bitmapResource.onAfterMiddleware.add(
                (bitmapResource: LoaderResource) =>
                  resolve(bitmapResource.texture!)
              )
            );
          }
        }
      )
    );

    console.log(data);

    resource.bitmapFont = BitmapFont.install(data, textures, true);
    next();
  }
}
