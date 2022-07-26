import { Vector2 } from "osu-classes";
import {
  Container,
  DRAW_MODES,
  Geometry,
  IDestroyOptions,
  Rectangle,
  Renderer,
  RenderTexture,
  Shader,
  Sprite,
  State,
  UniformGroup,
  utils,
} from "pixi.js";

import SDF_LINE_VERT from "./slider_path.vert?raw";
import SDF_LINE_FRAG from "./slider_path.frag?raw";
import { minMax } from "../../constants";
import { Slider } from "osu-standard-stable";

// https://www.shadertoy.com/view/lsdBDS Quadratic Bezier SDF
// https://gamedev.stackexchange.com/a/164816 Bezier AABB
// https://www.shadertoy.com/view/tlSGzG Arc SDF

const BORDER_PROP = 0.125;
const PADDING = 5;
const AA_FACTOR = 0.5;
const GL_STATE = new State();
GL_STATE.blend = false;
GL_STATE.depthTest = true;
GL_STATE.depthMask = true;

const uniformGroup = new UniformGroup({
  AA: 0,
  radius: 0,
  borderProp: BORDER_PROP,
  range: [0, 0],
  colorFill: [0.6, 0.8, 1, 1],
  colorBorder: [1, 1, 1, 1],
});

interface RenderState {
  renderScale: number;
  startProp: number;
  endProp: number;
}

const shader = Shader.from(SDF_LINE_VERT, SDF_LINE_FRAG, uniformGroup);

export class SliderPathSprite extends Container {
  private points: Vector2[];
  private geometry: Geometry;
  private lastRenderState: RenderState | null = null;
  private texture: RenderTexture | null = null;
  private sprite: Sprite = new Sprite();
  private color: number[];

  private radius!: number;
  private padding!: number;
  private matricesValid = false;

  public startProp = 0;
  public endProp = 1;

  constructor(
    slider: Slider,
    color: number,
  ) {
    super();
    this.points = slider.path.path;
    this.radius = slider.radius;
    this.padding = this.radius + PADDING;
    this.color = [...utils.hex2rgb(color), 1];

    this.geometry = this.generateGeometry(this.points);

    this.addChild(this.sprite);
  }

  updateTransform(): void {
    super.updateTransform();
    this.matricesValid = true;
  }

  _render(renderer: Renderer): void {
    if (!this.matricesValid) {
      return;
    }

    const renderState: RenderState = {
      // prettier-ignore
      renderScale: (this.worldTransform.a + this.worldTransform.d) / 2 * renderer.resolution,
      startProp: this.startProp,
      endProp: this.endProp,
    };
    if (
      !this.lastRenderState ||
      this.lastRenderState.renderScale != renderState.renderScale ||
      this.lastRenderState.startProp != renderState.startProp ||
      this.lastRenderState.endProp != renderState.endProp
    ) {
      this.updateSpriteRender(renderer, renderState);
      // prettier-ignore
      // console.info(`Rendered slider path (${this.points.length} points, ${this.texture?.width}x${this.texture?.height}, scale=${renderState.renderScale.toFixed(2)}, ${renderState.startProp.toFixed(2)}-${renderState.endProp.toFixed(2)}) in ${(performance.now() - start).toFixed(2)} ms`);
      this.lastRenderState = renderState;
    }
  }

  updateSpriteRender(renderer: Renderer, state: RenderState) {
    // TODO: Why is this needed?
    renderer.batch.flush();

    const unscaledOverallBounds = this.boundingBox(this.points);
    const textureBounds = new Rectangle(
      0,
      0,
      unscaledOverallBounds.width * state.renderScale,
      unscaledOverallBounds.height * state.renderScale
    );
    uniformGroup.uniforms.AA = AA_FACTOR / state.renderScale;
    uniformGroup.uniforms.range = [state.startProp, state.endProp];
    uniformGroup.uniforms.radius = this.radius;
    uniformGroup.uniforms.colorFill = this.color;
    renderer.state.set(GL_STATE);
    renderer.shader.bind(shader);

    const newWidth = Math.ceil(textureBounds.width);
    const newHeight = Math.ceil(textureBounds.height);
    if (
      !this.texture ||
      this.texture.width != newWidth ||
      this.texture.height != newHeight
    ) {
      this.texture?.destroy(true);
      this.texture = RenderTexture.create({
        width: newWidth,
        height: newHeight,
      });
    }

    if (!this.texture.framebuffer.depthTexture) {
      this.texture.framebuffer.addDepthTexture();
    }
    renderer.renderTexture.bind(
      this.texture,
      unscaledOverallBounds,
      textureBounds
    );
    renderer.renderTexture.clear();

    renderer.geometry.bind(this.geometry, shader);
    renderer.geometry.draw(DRAW_MODES.TRIANGLES);

    renderer.renderTexture.bind();

    this.sprite.texture = this.texture;
    this.sprite.x = unscaledOverallBounds.x - this.points[0].x;
    this.sprite.y = unscaledOverallBounds.y - this.points[0].x;
    this.sprite.scale.set(1 / state.renderScale);
  }

  boundingBox(points: Vector2[]) {
    const [min, max] = minMax(points);
    return new Rectangle(
      min.x - this.padding,
      min.y - this.padding,
      max.x - min.x + 2 * this.padding,
      max.y - min.y + 2 * this.padding
    );
  }

  boundingBoxAngled(
    point1: Vector2,
    point2: Vector2
  ): [Vector2, Vector2, Vector2, Vector2] {
    const right = point2.subtract(point1).normalize().scale(this.padding);
    const up = new Vector2(-right.y, right.x);
    return [
      point1.subtract(right).subtract(up),
      point1.subtract(right).add(up),
      point2.add(right).add(up),
      point2.add(right).subtract(up),
    ];
  }

  generateGeometry(points: Vector2[]) {
    interface LineData {
      quad: [Vector2, Vector2, Vector2, Vector2];
      point1: Vector2;
      point2: Vector2;
      start: number;
      end: number;
    }

    const lengthCDF = new Float32Array(points.length);
    lengthCDF[0] = 0;
    for (let i = 1; i < points.length; i++) {
      lengthCDF[i] = lengthCDF[i - 1] + points[i - 1].distance(points[i]);
    }
    const maxLength = lengthCDF[lengthCDF.length - 1];
    for (let i = 0; i < lengthCDF.length; i++) {
      lengthCDF[i] /= maxLength;
    }

    const lines: LineData[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const box = this.boundingBoxAngled(points[i], points[i + 1]);

      lines.push({
        quad: box,
        point1: points[i],
        point2: points[i + 1],
        start: lengthCDF[i],
        end: lengthCDF[i + 1],
      });
    }

    const position = new Float32Array(lines.length * 8);
    const data = new Float32Array(lines.length * 16);
    const range = new Float32Array(lines.length * 8);
    const indices = new Uint32Array(lines.length * 6);

    for (let i = 0; i < lines.length; i += 1) {
      let { quad, point1, point2, start, end } = lines[i];

      indices[i * 6 + 0] = i * 4 + 0;
      indices[i * 6 + 1] = i * 4 + 1;
      indices[i * 6 + 2] = i * 4 + 2;

      indices[i * 6 + 3] = i * 4 + 0;
      indices[i * 6 + 4] = i * 4 + 2;
      indices[i * 6 + 5] = i * 4 + 3;

      position[i * 8 + 0] = quad[0].x;
      position[i * 8 + 1] = quad[0].y;

      position[i * 8 + 2] = quad[1].x;
      position[i * 8 + 3] = quad[1].y;

      position[i * 8 + 4] = quad[2].x;
      position[i * 8 + 5] = quad[2].y;

      position[i * 8 + 6] = quad[3].x;
      position[i * 8 + 7] = quad[3].y;

      for (let j = i * 4; j < (i + 1) * 4; j++) {
        const dataI = j * 4;
        data[dataI + 0] = point1.x;
        data[dataI + 1] = point1.y;
        data[dataI + 2] = point2.x;
        data[dataI + 3] = point2.y;

        const rangeI = j * 2;
        range[rangeI + 0] = start;
        range[rangeI + 1] = end;
      }

      for (let j = i * 16; j < i * 16 + 16; j += 4) {
        data[j + 0] = point1.x;
        data[j + 1] = point1.y;
        data[j + 2] = point2.x;
        data[j + 3] = point2.y;
      }
    }

    return new Geometry()
      .addAttribute("a_position", position, 2)
      .addAttribute("a_data", data, 4)
      .addAttribute("a_range", range, 2)
      .addIndex(indices);
  }

  destroy(_options?: boolean | IDestroyOptions): void {
    super.destroy({
      children: true,
      texture: true,
      baseTexture: true,
    });
  }
}
