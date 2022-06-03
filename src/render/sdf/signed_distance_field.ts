import { SliderPath, Vector2 } from "osu-classes";
import {
  Application,
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
} from "pixi.js";

import SDF_LINE_VERT from "./sdf_line.vert?raw";
import SDF_LINE_FRAG from "./sdf_line.frag?raw";
import { diameterFromCs, minMax } from "../../constants";

// https://www.shadertoy.com/view/lsdBDS Quadratic Bezier SDF
// https://gamedev.stackexchange.com/a/164816 Bezier AABB
// https://www.shadertoy.com/view/tlSGzG Arc SDF

const BORDER_PROP = 0.125;
const PADDING = 5;
const GL_STATE = new State();
GL_STATE.blend = false;
GL_STATE.depthTest = true;
GL_STATE.depthMask = true;

const uniformGroup = new UniformGroup({
  radius: 0,
  borderProp: BORDER_PROP,
  colorFill: [0.6, 0.8, 1, 1],
  colorBorder: [1, 1, 1, 1],
});

const shader = Shader.from(SDF_LINE_VERT, SDF_LINE_FRAG);

export class SliderPathSprite extends Container {
  private app: Application;
  private unscaledPoints: Vector2[];
  private points!: Vector2[];
  private renderScale: number = NaN;
  private texture: RenderTexture | null = null;
  private sprite: Sprite = new Sprite();
  private CS: number;
  private radius!: number;
  private padding!: number;

  constructor(app: Application, sliderPath: SliderPath, CS: number) {
    super();
    this.app = app;
    this.unscaledPoints = sliderPath.path;
    this.CS = CS;

    this.addChild(this.sprite);
    app.ticker.add(this.tick, this)
  }

  tick(): void {
    const start = performance.now();
    const renderScale = (this.worldTransform.a + this.worldTransform.d) / 2;
    if (!this.texture || renderScale != this.renderScale) {
      this.renderScale = renderScale;
      this.points = this.unscaledPoints.map((p) => p.scale(renderScale));
      this.radius = diameterFromCs(this.CS) * renderScale;
      this.padding = this.radius + PADDING;
      this.updateSpriteRender(this.app.renderer as Renderer);
      console.log(
        `Rendered slider path (${this.points.length} points, ${
          this.texture?.width
        }x${this.texture?.height}) in ${performance.now() - start} ms`
      );
    }
  }

  updateSpriteRender(renderer: Renderer) {
    const overallBounds = this.boundingBox(this.points);
    uniformGroup.uniforms.radius = this.radius;
    uniformGroup.uniforms.colorFill = [0.6, 0.8, 1, 1];
    renderer.state.set(GL_STATE);
    renderer.shader.bind(shader);
    renderer.shader.syncUniformGroup(uniformGroup);

    if (this.texture) {
      this.texture.destroy(true);
    }
    this.texture = RenderTexture.create({
      width: overallBounds.width,
      height: overallBounds.height,
    });
    this.texture.framebuffer.addDepthTexture();
    renderer.renderTexture.bind(this.texture, overallBounds);

    const geometry = this.generateGeometry(this.points);
    renderer.geometry.bind(geometry, shader);
    renderer.geometry.draw(DRAW_MODES.TRIANGLES);

    renderer.renderTexture.bind();

    this.sprite.texture = this.texture;
    this.sprite.x = (overallBounds.x - this.points[0].x) / this.renderScale;
    this.sprite.y = (overallBounds.y - this.points[0].x) / this.renderScale;
    this.sprite.scale.set(1 / this.renderScale);
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
    }

    const lines: LineData[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const box = this.boundingBoxAngled(points[i], points[i + 1]);

      lines.push({
        quad: box,
        point1: points[i],
        point2: points[i + 1],
      });
    }

    const position = new Float32Array(lines.length * 8);
    const data = new Float32Array(lines.length * 16);
    const indices = new Uint32Array(lines.length * 6);

    for (let i = 0; i < lines.length; i += 1) {
      let { quad, point1, point2 } = lines[i];

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
      .addIndex(indices);
  }

  destroy(options?: boolean | IDestroyOptions): void {
    super.destroy(options);
    this.texture?.destroy(true);
    this.app.ticker.remove(this.tick, this);
  }
}
