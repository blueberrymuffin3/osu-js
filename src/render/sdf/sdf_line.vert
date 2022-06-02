#version 300 es
precision mediump float;

in vec2 a_position;
in vec4 a_data;

uniform mat3 projectionMatrix;

out vec2 v_position;
flat out vec4 v_data;

void main(void) {
    gl_Position = vec4((projectionMatrix * vec3(a_position, 1.0)).xy, 0.0, 1.0);
    v_position = a_position;
    v_data = a_data;
}
