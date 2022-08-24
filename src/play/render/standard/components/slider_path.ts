import { Vector2 } from "osu-classes";
import {
  Bounds,
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
import { Slider } from "osu-standard-stable";
import { VIRTUAL_SCREEN_MASK } from "../../../constants";

// https://www.shadertoy.com/view/lsdBDS Quadratic Bezier SDF
// https://gamedev.stackexchange.com/a/164816 Bezier AABB
// https://www.shadertoy.com/view/tlSGzG Arc SDF

const BORDER_PROP = 0.125;
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
  trackColor: [1, 1, 1, 1],
  borderColor: [1, 1, 1, 1],
});

interface RenderState {
  resolution: number;
  startProgress: number;
  endProgress: number;
}

const shader = Shader.from(SDF_LINE_VERT, SDF_LINE_FRAG, uniformGroup);

export class SliderPathSprite extends Container {
  private points: Vector2[];
  private geometry: Geometry;
  private lastRenderState: RenderState | null = null;
  private texture: RenderTexture | null = null;
  private sprite: Sprite = new Sprite();
  private trackColor: number[];
  private borderColor: number[];

  private radius!: number;

  private overallBounds!: Rectangle;
  private textureBounds!: Rectangle;

  public startProgress = 0;
  public endProgress = 1;

  constructor(slider: Slider, trackColor: number, borderColor: number) {
    super();
    this.points = slider.path.path;
    this.radius = slider.radius;
    this.trackColor = [...utils.hex2rgb(trackColor), 1];
    this.borderColor = [...utils.hex2rgb(borderColor), 1];

    this.geometry = this.generateGeometry(this.points);

    this.addChild(this.sprite);
  }

  updateTransform(): void {
    const mask = new Bounds();
    const virtualScreenRect = VIRTUAL_SCREEN_MASK.getBounds(true);

    mask.addFrameMatrix(
      this.worldTransform.clone().invert(),
      virtualScreenRect.left,
      virtualScreenRect.top,
      virtualScreenRect.right,
      virtualScreenRect.bottom
    );

    const overallBoundsUnclipped = this.boundingBox(this.points);

    const overallBoundsClipped = new Bounds();
    overallBoundsClipped.addBoundsMask(overallBoundsUnclipped, mask);

    this.overallBounds = overallBoundsClipped.getRectangle();
    this.textureBounds = new Rectangle(
      0,
      0,
      this.overallBounds.width,
      this.overallBounds.height
    );

    this.sprite.x = this.overallBounds.x - this.points[0].x;
    this.sprite.y = this.overallBounds.y - this.points[0].x;

    super.updateTransform();
  }

  _render(renderer: Renderer): void {
    const scaleXY = this.worldTransform.a + this.worldTransform.d;

    const renderState: RenderState = {
      resolution: scaleXY / 2 * renderer.resolution,
      startProgress: this.startProgress,
      endProgress: this.endProgress,
    };
    
    if (
      !this.lastRenderState ||
      this.lastRenderState.resolution !== renderState.resolution ||
      this.lastRenderState.startProgress !== renderState.startProgress ||
      this.lastRenderState.endProgress !== renderState.endProgress
    ) {
      this.updateSpriteRender(renderer, renderState);
      // prettier-ignore
      this.lastRenderState = renderState;
    }
  }

  updateSpriteRender(renderer: Renderer, state: RenderState) {
    // TODO: Why is this needed?
    renderer.batch.flush();

    uniformGroup.uniforms.AA = AA_FACTOR / state.resolution;
    uniformGroup.uniforms.range = [state.startProgress, state.endProgress];
    uniformGroup.uniforms.radius = this.radius;
    uniformGroup.uniforms.trackColor = this.trackColor;
    uniformGroup.uniforms.borderColor = this.borderColor;
    renderer.state.set(GL_STATE);
    renderer.shader.bind(shader);

    if (!this.texture) {
      this.texture = RenderTexture.create({
        width: this.textureBounds.width,
        height: this.textureBounds.height,
        resolution: state.resolution,
      });
    } else {
      if (this.texture.resolution != state.resolution) {
        this.texture.setResolution(state.resolution);
      }
      if (
        this.texture.width != this.textureBounds.width ||
        this.texture.height != this.textureBounds.height
      )
        this.texture.resize(
          this.textureBounds.width,
          this.textureBounds.height,
          true
        );
    }

    if (!this.texture.framebuffer.depthTexture) {
      this.texture.framebuffer.addDepthTexture();
    }
    renderer.renderTexture.bind(
      this.texture,
      this.overallBounds,
      this.textureBounds
    );
    renderer.renderTexture.clear();

    renderer.geometry.bind(this.geometry, shader);
    renderer.geometry.draw(DRAW_MODES.TRIANGLES);

    renderer.renderTexture.bind();

    this.sprite.texture = this.texture;
  }

  boundingBox(points: Vector2[]) {
    const bounds = new Bounds();
    points.forEach((point) => bounds.addPoint(point));
    bounds.pad(this.radius);
    return bounds;
  }

  boundingBoxAngled(
    point1: Vector2,
    point2: Vector2
  ): [Vector2, Vector2, Vector2, Vector2] {
    const right = point2.subtract(point1).normalize().scale(this.radius);
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
