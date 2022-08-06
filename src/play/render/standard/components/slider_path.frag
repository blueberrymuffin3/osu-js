#version 300 es
// precision highp float;
precision mediump float;

#define OPACITY_CENTER 0.3
#define OPACITY_EDGE 0.8
#define PRECISION_SCALE_INV 128.0
#define PRECISION_SCALE (1.0 / PRECISION_SCALE_INV)

in vec2 v_position;
flat in vec4 v_data;

uniform float AA;
uniform float radius;
uniform float borderProp;
uniform vec4 trackColor;
uniform vec4 borderColor;

out vec4 color;

float lineSegmentSDF(in vec2 p, in vec2 a, in vec2 b) {
  // Some calculations for long paths can overflow mediump floats
  // Scaling them down helps with that
  p *= PRECISION_SCALE;
  a *= PRECISION_SCALE;
  b *= PRECISION_SCALE;

  vec2 ba = b - a;
  vec2 pa = p - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.);
  return length(pa - h * ba) * PRECISION_SCALE_INV;
}

void main() {
  vec2 v1 = v_data.xy;
  vec2 v2 = v_data.zw;

  float dist = lineSegmentSDF(v_position, v1, v2);
  gl_FragDepth = dist / (radius + 2. * AA);

  float borderDist = radius * (1.-borderProp);
  float opacity = smoothstep(radius + AA, radius - AA, dist);
  float border = smoothstep(borderDist - AA, borderDist + AA, dist);
  float edge = clamp(dist / borderDist, 0.0, 1.0);

  color = trackColor * mix(OPACITY_CENTER, OPACITY_EDGE, edge);
  color = mix(color, borderColor, border);
  color = color * opacity;
}
