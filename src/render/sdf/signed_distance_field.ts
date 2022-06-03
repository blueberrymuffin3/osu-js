import { Vector2 } from "osu-classes";
import {
  Application,
  DRAW_MODES,
  Geometry,
  Matrix,
  Rectangle,
  Renderer,
  Shader,
  State,
} from "pixi.js";

import SDF_LINE_VERT from "./sdf_line.vert?raw";
import SDF_LINE_FRAG from "./sdf_line.frag?raw";
import { minMax, OSU_HIT_OBJECT_RADIUS } from "../../constants";

// https://www.shadertoy.com/view/lsdBDS Quadratic Bezier SDF
// https://gamedev.stackexchange.com/a/164816 Bezier AABB

const BORDER_PROP = 0.125;
const EXTRA_PADDING = 5;
const GL_STATE = new State();
GL_STATE.blend = false;
GL_STATE.depthTest = true;
GL_STATE.depthMask = true;

interface GlobalState {
  renderer: Renderer;
  gl: WebGL2RenderingContext;
  shader: Shader;
}

interface Uniforms {
  // Vertex Shader
  projectionMatrix: Matrix;

  // Fragment Shader
  radius: number;
  borderProp: number;
  colorFill: Float32Array;
  colorBorder: Float32Array;
}

function _setupGlobalState(app: Application): GlobalState {
  const renderer = app.renderer as Renderer;
  const gl = renderer.gl;

  const uniforms: Uniforms = {
    projectionMatrix: new Matrix(),
    radius: OSU_HIT_OBJECT_RADIUS,
    borderProp: BORDER_PROP,
    colorFill: new Float32Array([0.6, 0.8, 1, 1]),
    colorBorder: new Float32Array([1, 1, 1, 1]),
  };

  const shader = Shader.from(SDF_LINE_VERT, SDF_LINE_FRAG, uniforms);

  return { renderer, gl, shader, };
}

let _globalState: GlobalState | null = null;

function getGlobalState(app: Application): GlobalState {
  if (!_globalState) {
    _globalState = _setupGlobalState(app);
  }
  return _globalState;
}

function boundingBox(points: Vector2[]) {
  const [min, max] = minMax(points);
  const pad = OSU_HIT_OBJECT_RADIUS + EXTRA_PADDING;
  return new Rectangle(
    min.x - pad,
    min.y - pad,
    max.x - min.x + 2 * pad,
    max.y - min.y + 2 * pad
  );
}

function projectionMatrix(aabb: Rectangle) {
  const sx = 2 / aabb.width;
  const sy = -2 / aabb.height;
  const tx = -2 * (aabb.x / aabb.width) - 1;
  const ty = 2 * (aabb.y / aabb.height) + 1;

  return new Matrix(sx, 0, 0, sy, tx, ty);
}

function boundingBoxAngled(
  point1: Vector2,
  point2: Vector2
): [Vector2, Vector2, Vector2, Vector2] {
  const right = point2
    .subtract(point1)
    .normalize()
    .scale(OSU_HIT_OBJECT_RADIUS + EXTRA_PADDING);
  const up = new Vector2(-right.y, right.x);
  return [
    point1.subtract(right).subtract(up),
    point1.subtract(right).add(up),
    point2.add(right).add(up),
    point2.add(right).subtract(up),
  ];
}

export function renderSliderPath(app: Application, points: Vector2[]) {
  const { renderer, gl,  shader } = getGlobalState(app);

  const overallBoundingBox = boundingBox(points);

  interface LineData {
    quad: [Vector2, Vector2, Vector2, Vector2];
    point1: Vector2;
    point2: Vector2;
  }

  const lines: LineData[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const box = boundingBoxAngled(points[i], points[i + 1]);

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

  const geometry = new Geometry();
  geometry.addAttribute("a_position", position);
  geometry.addAttribute("a_data", data);
  geometry.addIndex(indices);

  const uniforms = shader.uniforms as Uniforms;
  uniforms.projectionMatrix = projectionMatrix(overallBoundingBox);

  gl.viewport(0, 0, overallBoundingBox.width, overallBoundingBox.height);

  renderer.state.set(GL_STATE);
  console.log(renderer.renderingToScreen);

  return () => {
    uniforms.colorFill[1] = Math.random();
    renderer.geometry.bind(geometry, shader)
    renderer.shader.bind(shader);
    renderer.geometry.draw(DRAW_MODES.TRIANGLES);
  };
}
