#version 300 es

precision highp float;

in vec2 TexCoord;

uniform float FrameW;
uniform float FrameH;

uniform float Side;
uniform vec2 Center;
uniform float Power;
uniform int Type;
uniform vec2 Z;

uniform sampler2D uSampler;

out vec4 oColor;

/* Complex number argument evaluation function */
float Arg( vec2 Z )
{
  if (Z.x > 0.0)
    return atan(Z.y / Z.x);
  else if (Z.x < 0.0 && Z.y >= 0.0)
    return atan(Z.y / Z.x) + acos(-1.0);
  else if (Z.x < 0.0 && Z.y < 0.0)
    return atan(Z.y / Z.x) - acos(-1.0);
  else if (Z.x == 0.0 && Z.y > 0.0)
    return acos(-1.0) / 2.0;
  else if (Z.x == 0.0 && Z.y < 0.0)
    return -acos(-1.0) / 2.0;
  else
    return 0.0;
} /* End of 'Arg' function */

/* Complex number power function */
vec2 Pow( vec2 Z, float power )
{
  float phi = Arg(Z);
  return pow(length(Z), power) * vec2(cos(power * phi), sin(power * phi));
} /* End of 'Pow' function */

/* Mandelbrot set check function */
float Mandelbrot( vec2 Z, float power )
{
  vec2 Z0 = Z;
  float iter;
  for (iter = 0.0; iter < 256.0 && length(Z) <= 2.0; iter++)
    Z = Pow(Z, power) + Z0;
  return iter / 256.0;
} /* End of 'Mandelbrot' function */

/* Julia set check function */
float Julia( vec2 Z, float power, vec2 Z1 )
{
  float iter;
  for (iter = 0.0; iter < 256.0 && length(Z) <= 2.0; iter++)
    Z = Pow(Z, power) + Z1;
  return iter / 256.0;
} /* End of 'Julia' function */

/* Main fragment shader function */
void main( void )
{
  float Unit = min(FrameW, FrameH) / 2.0,
        real = Center.x + ((gl_FragCoord.x - FrameW / 2.0) / Unit) * Side,
        imag = Center.y + ((gl_FragCoord.y - FrameH / 2.0) / Unit) * Side,
        value = bool(Type) ? Mandelbrot(vec2(real, imag), Power) : Julia(vec2(real, imag), Power, Z);
  if (value == 0.0 || value == 1.0)
    oColor = vec4(0, 0, 0, 1);
  else
    oColor = texture(uSampler, vec2(value, 0.0));
} /* End of 'main' function */
