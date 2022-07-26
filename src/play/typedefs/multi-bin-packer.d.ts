declare module "multi-bin-packer" {
  export interface Rect<T> {
    width: number;
    height: number;
    data: T;
  }

  export interface PackedRect<T> {
    x: number;
    y: number;
    width: number;
    height: number;
    data: T;
    oversized?: true;
  }

  export interface Bin<T> {
    width: number;
    height: number;
    rects: PackedRect<T>[]
  }

  export default class MultiBinPacker<T> {
    constructor(maxWidth: number, maxHeight: number);
    constructor(maxWidth: number, maxHeight: number, padding?: number);

    add(width: number, height: number, data: T);
    addArray(rects: Rect<T>[]);
    readonly bins: Bin<T>[];
  }
}
