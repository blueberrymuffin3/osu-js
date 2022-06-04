varying vec2 vTextureCoord;
uniform vec4 inputClamp;
uniform sampler2D uSampler;

const int triangleCount = __TRIANGLE_COUNT;
const float triangleHalfBase = 2.0 / sqrt(3.0);
const float slope = 2.0 / triangleHalfBase;
const float opacity = 4.0 / float(triangleCount);
const float ringSize = 9.0 / 128.0;
const float innerRadiusCutoff = (1.0 - ringSize) * (1.0 - ringSize) * 0.5;

uniform float AA;
uniform vec3 color;
uniform vec3 triangles[triangleCount];

float testTriangle(in vec3 triangle, in vec2 coord) {
  vec2 pos = triangle.xy;
  vec2 testPoint = (coord - pos);
  float test1 = testPoint.x + testPoint.y / slope;
  float test2 = testPoint.x - testPoint.y / slope;
  float halfBase = triangleHalfBase * triangle.z;

  float factor1 = smoothstep(triangle.z + AA, triangle.z - AA, testPoint.y);
  float factor2 = smoothstep(-halfBase - AA, -halfBase + AA, test1);
  float factor3 = smoothstep(halfBase + AA, halfBase - AA, test2);

  return factor1 * factor2 * factor3; 
}

void main() {
  vec4 sample = texture2D(uSampler, vTextureCoord);
  float value = sample.r / sample.a;

  vec2 pos = vTextureCoord / inputClamp.zw;

  for(int i = 0; i < triangleCount; i += 1) {
    value = mix(value, value + opacity, testTriangle(triangles[i], pos));
  }

  value = clamp(value, 0.0, 1.0);

  gl_FragColor = vec4(vec3(value, value, value) * color, 1.0) * sample.a;
}