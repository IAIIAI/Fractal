#version 300 es

in vec3 aVertexPosition;
in vec2 aVertexTexCoord;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

out vec2 TexCoord;

/* Main vertex shader function */
void main( void )
{
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    TexCoord = aVertexTexCoord;
} /* End of 'main' function */
