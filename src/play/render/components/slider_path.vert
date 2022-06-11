#version 300 es
precision mediump float;

in vec2 a_position;
in vec4 a_data;
in vec2 a_range;

uniform mat3 projectionMatrix;
uniform float renderScale;
uniform vec2 range;

out vec2 v_position;
flat out vec4 v_data;

float scaleIntoRange(float endpoint) {
    return clamp((endpoint - a_range.x) / (a_range.y - a_range.x), 0.0, 1.0);
}

void main(void) {
    gl_Position = vec4((projectionMatrix * vec3(a_position, 1.0)).xy, 0.0, 1.0);
    v_position = a_position;

    bool hidden = (range.x > a_range.y) || (range.y < a_range.x);
    if (hidden) {
        gl_Position.z = 0.0 / 0.0;
    }

    vec2 pos1 = mix(a_data.xy, a_data.zw, scaleIntoRange(range.x));
    vec2 pos2 = mix(a_data.xy, a_data.zw, scaleIntoRange(range.y));
    v_data = vec4(pos1, pos2);
}
