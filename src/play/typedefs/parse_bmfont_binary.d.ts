declare module "parse-bmfont-binary" {
  declare interface BMFontJson {
    pages: string[];
    chars: BMFontChar[];
    kernings: BMFontKerning[];
    info: BMFontInfo;
    common: BMFontCommon;
  }

  declare interface BMFontChar {
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    xoffset: number;
    yoffset: number;
    xadvance: number;
    page: number;
    chnl: number;
  }

  declare interface BMFontKerning {
    first: number;
    second: number;
    amount: number;
  }

  declare type Flag = 0 | 1;
  declare interface BMFontInfo {
    face: string;
    size: number;
    bold: Flag;
    italic: Flag;
    charset: string;
    unicode: Flag;
    stretchH: number;
    smooth: Flag;
    aa: number;
    padding: [number, number, number, number];
    spacing: [number, number];
  }

  declare interface BMFontCommon {
    lineHeight: number;
    base: number;
    scaleW: number;
    scaleH: number;
    pages: number;
    packed: number;
    alphaChnl: number;
    redChnl: number;
    greenChnl: number;
    blueChnl: number;
  }

  function readBMFontBinary(buf: import("buffer").Buffer): BMFontJson;
  export default readBMFontBinary;
}
