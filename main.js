'use strict';

const vxShaderStr =
`#version 300 es
in vec3 aVertexPosition;
in vec2 aVertexTexCoord;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

out vec2 TexCoord;

void main(void)
{
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    TexCoord = aVertexTexCoord;
}
`;

const fsShaderStr =
`#version 300 es
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

float Arg(vec2 Z)
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
}

vec2 Pow(vec2 Z, float power)
{
  float phi = Arg(Z);

  return pow(length(Z), power) * vec2(cos(power * phi), sin(power * phi));
}

float Mandelbrot(vec2 Z, float power)
{
  vec2 Z0 = Z;
  float iter;

  for (iter = 0.0; iter < 256.0 && length(Z) <= 2.0; iter++)
    Z = Pow(Z, power) + Z0;
  return iter / 256.0;
}

float Julia(vec2 Z, float power, vec2 Z1)
{
  float iter;

  for (iter = 0.0; iter < 256.0 && length(Z) <= 2.0; iter++)
    Z = Pow(Z, power) + Z1;
  return iter / 256.0;
}

void main(void)
{
    float Unit = min(FrameW, FrameH) / 2.0,
          real = Center.x + ((gl_FragCoord.x - FrameW / 2.0) / Unit) * Side,
          imag = Center.y + ((gl_FragCoord.y - FrameH / 2.0) / Unit) * Side,
          value = bool(Type) ? Mandelbrot(vec2(real, imag), Power) : Julia(vec2(real, imag), Power, Z);

    if (value == 0.0 || value == 1.0)
      oColor = vec4(0, 0, 0, 1);
    else
      oColor = texture(uSampler, vec2(value, 0.0));
}`;

let gl;
function initGL (canvas) {
  try {
    gl = canvas.getContext('webgl2');
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
  } catch (e) {
  }
  if (!gl) {
    window.alert('Could not initialize WebGL');
  }
}

function getShader (gl, type, str) {
  const shader = gl.createShader(type);

  gl.shaderSource(shader, str);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    window.alert(gl.getShaderInfoLog(shader));
    return null;
  }

  return shader;
}

let shaderProgram;

function initShaders () {
  const fragmentShader = getShader(gl, gl.FRAGMENT_SHADER, fsShaderStr);
  const vertexShader = getShader(gl, gl.VERTEX_SHADER, vxShaderStr);

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    window.alert('Shader link error :(');
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
  shaderProgram.vertexTexCoordAttribute = gl.getAttribLocation(shaderProgram, 'aVertexTexCoord');
  gl.enableVertexAttribArray(shaderProgram.vertexTexCoordAttribute);
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, 'uPMatrix');
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, 'uMVMatrix');

  shaderProgram.FrameW = gl.getUniformLocation(shaderProgram, 'FrameW');
  shaderProgram.FrameH = gl.getUniformLocation(shaderProgram, 'FrameH');
  shaderProgram.Side = gl.getUniformLocation(shaderProgram, 'Side');
  shaderProgram.Center = gl.getUniformLocation(shaderProgram, 'Center');

  shaderProgram.Power = gl.getUniformLocation(shaderProgram, 'Power');
  shaderProgram.Type = gl.getUniformLocation(shaderProgram, 'Type');
  shaderProgram.Jul_Z = gl.getUniformLocation(shaderProgram, 'Z');

  shaderProgram.Sampler = gl.getUniformLocation(shaderProgram, 'uSampler');
}

const mvMatrix = mat4.create();
const pMatrix = mat4.create();

let CX = 0; let CY = 0;
let StartX = 0; let StartY = 0;
let Side = 2.0;
let type = true;

const mandParams = `
      <input id="input_pow" type="range" min="-10" max="10" step="0.01" value="2" oninput="updateValues()" />
      <label for="input_pow" id = "output_pow"> Power: <input id="pow" type="text" value="2" oninput="updateSliders()" /></label>
`;
const julParams = `
      <br />
      <input id="input_real" type="range" min="-1" max="1" step="0.01" value="0.39" oninput="updateValues()" />
      <label for="input_real" id = "output_real"> Real part: <input id="real" type="text" value="0.39" oninput="updateSliders()" /></label>
      <br />
      <input id="input_imag" type="range" min="-1" max="1" step="0.01" value="-0.16" oninput="updateValues()" />
      <label for="input_imag" id = "output_imag"> Imaginary part: <input id="imag" type="text" value="-0.16" oninput="updateSliders()" /></label>
`;

function updateType () {
  type = !type;
  Side = 2.0;
  CX = CY = 0;
  if (type) {
    document.getElementById('header').innerHTML = 'Mandelbrot Set';
    document.getElementById('params').innerHTML = mandParams;
  } else {
    document.getElementById('header').innerHTML = 'Julia Set';
    document.getElementById('params').innerHTML = mandParams + julParams;
  }
}

function updateValues () {
  document.getElementById('pow').value = document.getElementById('input_pow').value;
  if (!type) {
    document.getElementById('real').value = document.getElementById('input_real').value;
    document.getElementById('imag').value = document.getElementById('input_imag').value;
  }
}

function updateSliders () {
  document.getElementById('input_pow').value = document.getElementById('pow').value;
  if (!type) {
    document.getElementById('input_real').value = document.getElementById('real').value;
    document.getElementById('input_imag').value = document.getElementById('imag').value;
  }
}

function onMouseMove (event) {
  const Unit = Math.min(gl.viewportWidth, gl.viewportHeight);
  const dx = StartX - (event.pageX - gl.viewportWidth / 2) / Unit * Side * 2;
  StartX = (event.pageX - gl.viewportWidth / 2) / Unit * Side * 2;
  const dy = StartY - (event.pageY - gl.viewportHeight / 2) / Unit * Side * 2;
  StartY = (event.pageY - gl.viewportHeight / 2) / Unit * Side * 2;

  CX += dx;
  CY -= dy;
}

function onMouseWheel (event) {
  const delta = (event.deltaY || event.detail || event.wheelDelta) / 125;
  const Unit = Math.min(gl.viewportWidth, gl.viewportHeight);
  if (Side > 0.00006 || delta > 0) {
    Side += Side / 10 * delta;
  }
}

function initCanvasMouseMethods (canvas) {
  canvas.onmousedown = function (event) {
    const Unit = Math.min(gl.viewportWidth, gl.viewportHeight);
    StartX = (event.pageX - gl.viewportWidth / 2) / Unit * Side * 2;
    StartY = (event.pageY - gl.viewportHeight / 2) / Unit * Side * 2;

    document.addEventListener('mousemove', onMouseMove);
  };

  canvas.onmouseup = function () {
    document.removeEventListener('mousemove', onMouseMove);
  };

  canvas.addEventListener('wheel', onMouseWheel);
}

function setUniforms () {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

  gl.uniform1f(shaderProgram.FrameW, gl.viewportWidth);
  gl.uniform1f(shaderProgram.FrameH, gl.viewportHeight);
  gl.uniform1f(shaderProgram.Side, Side);
  gl.uniform2f(shaderProgram.Center, CX, CY);
  gl.uniform1i(shaderProgram.Type, type);
  gl.uniform1f(shaderProgram.Power, document.getElementById('input_pow').value);
  if (!type) {
    gl.uniform2f(shaderProgram.Jul_Z, document.getElementById('input_real').value, document.getElementById('input_imag').value);
  }
}

let squareVertexPositionBuffer;
let squareVertexTexCoordBuffer;

function initBuffers () {
  squareVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
  const vertices = [
    1.0, 1.0, 0.0,
    -1.0, 1.0, 0.0,
    1.0, -1.0, 0.0,
    -1.0, -1.0, 0.0
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  squareVertexPositionBuffer.itemSize = 3;
  squareVertexPositionBuffer.numItems = 4;

  squareVertexTexCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexTexCoordBuffer);
  const texCoords = [
    1.0, 1.0,
    0.0, 1.0,
    1.0, 0.0,
    0.0, 0.0
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
  squareVertexTexCoordBuffer.itemSize = 2;
  squareVertexTexCoordBuffer.numItems = 4;
}

function drawScene () {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

  mat4.identity(mvMatrix);
  mat4.translate(mvMatrix, [0.0, 0.0, -1.0]);

  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexTexCoordBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexTexCoordAttribute, squareVertexTexCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
  setUniforms();
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems);
}

const img = new Image();
img.src = 'default_palette.png';
function handleTextureLoaded (tex) {
  gl.bindTexture(gl.TEXTURE_2D, tex);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.uniform1i(shaderProgram.Sampler, 0);
}

function getImage () {
  const file = document.getElementById('file').files[0];
  if (file === null || file === undefined) {
    img.src = 'default_palette.png';
    return;
  }
  const tex = gl.createTexture();
  img.src = window.URL.createObjectURL(file);
  handleTextureLoaded(tex);
}

function loadTexture () {
  const tex = gl.createTexture();

  img.onload = function () {
    handleTextureLoaded(tex);
  };
  getImage();
}

function tick () {
  window.requestAnimationFrame(tick);
  drawScene();
}

function webGLStart () {
  const canvas = document.getElementById('webglCanvas');

  initGL(canvas);
  initCanvasMouseMethods(canvas);
  initShaders();
  initBuffers();
  loadTexture();

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  tick();
}
