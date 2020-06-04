/***********************************************
 * JS + webGL fractal manager project main file
 ***********************************************/

/* CSS code import */
import './styles.css';

/* GL matrix library import */
import { mat4 } from 'gl-matrix/gl-matrix-min.js';

/* Shaders code import */
import vertShader from './main.vert';
import fragShader from './main.frag';

/* Fractal representation class */
class Fractal {
  constructor () {
    this.img = new window.Image();
    this.img.src = 'default_palette.png';

    this._centerX = this._centerY = 0;
    this._side = 2;
    this._type = true;
  }

  /* Fractal center x-coordinate setter */
  set centerX (value) {
    this._centerX = value ?? this._centerX;
  }

  /* Fractal center x-coordinate getter */
  get centerX () {
    return this._centerX;
  }

  /* Fractal center y-coordinate setter */
  set centerY (value) {
    this._centerY = value ?? this._centerY;
  }

  /* Fractal center y-coordinate getter */
  get centerY () {
    return this._centerY;
  }

  /* Fractal side setter */
  set side (value) {
    this._side = value ?? this._side;
  }

  /* Fractal side getter */
  get side () {
    return this._side;
  }

  /* Fractal type setter */
  set type (value) {
    this._type = value ?? this._type;
  }

  /* Fractal type getter */
  get type () {
    return this._type;
  }

  /* Handle loaded fractal texture method */
  handleTextureLoaded (gl, tex, shaderProgram) {
    gl.bindTexture(gl.TEXTURE_2D, tex);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(shaderProgram.Sampler, 0);
  }

  /* Init fractal texture method */
  initTexture (gl) {
    const tex = gl.createTexture();

    this.img.onload = () => {
      this.handleTextureLoaded(gl, tex, drawer.shaders.shaderProgram);
    };
    this.img.src = 'default_palette.png';
  }
}

/* Shaders representation class */
class Shaders {
  constructor (gl) {
    this.pMatrix = mat4.create();
    this.mvMatrix = mat4.create();
    this.vertexShader = vertShader;
    this.fragmentShader = fragShader;
    this.shaderProgram = gl.createProgram();
  }

  /* Get shader by its type and code utilitary static method */
  static getShader (gl, type, str) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      window.alert(gl.getShaderInfoLog(shader));
      return null;
    }

    return shader;
  }

  /* Init shaders method */
  init (gl) {
    const vertexShader = Shaders.getShader(gl, gl.VERTEX_SHADER, this.vertexShader);
    const fragmentShader = Shaders.getShader(gl, gl.FRAGMENT_SHADER, this.fragmentShader);

    gl.attachShader(this.shaderProgram, vertexShader);
    gl.attachShader(this.shaderProgram, fragmentShader);
    gl.linkProgram(this.shaderProgram);

    if (!gl.getProgramParameter(this.shaderProgram, gl.LINK_STATUS)) {
      window.alert('Shader link error');
    }

    gl.useProgram(this.shaderProgram);

    this.shaderProgram.vertexPositionAttribute = gl.getAttribLocation(this.shaderProgram, 'aVertexPosition');
    this.shaderProgram.vertexTexCoordAttribute = gl.getAttribLocation(this.shaderProgram, 'aVertexTexCoord');
    gl.enableVertexAttribArray(this.shaderProgram.vertexTexCoordAttribute);
    gl.enableVertexAttribArray(this.shaderProgram.vertexPositionAttribute);

    this.shaderProgram.pMatrixUniform = gl.getUniformLocation(this.shaderProgram, 'uPMatrix');
    this.shaderProgram.mvMatrixUniform = gl.getUniformLocation(this.shaderProgram, 'uMVMatrix');

    this.shaderProgram.FrameW = gl.getUniformLocation(this.shaderProgram, 'FrameW');
    this.shaderProgram.FrameH = gl.getUniformLocation(this.shaderProgram, 'FrameH');
    this.shaderProgram.Side = gl.getUniformLocation(this.shaderProgram, 'Side');
    this.shaderProgram.Center = gl.getUniformLocation(this.shaderProgram, 'Center');

    this.shaderProgram.Power = gl.getUniformLocation(this.shaderProgram, 'Power');
    this.shaderProgram.Type = gl.getUniformLocation(this.shaderProgram, 'Type');
    this.shaderProgram.Jul_Z = gl.getUniformLocation(this.shaderProgram, 'Z');

    this.shaderProgram.Sampler = gl.getUniformLocation(this.shaderProgram, 'uSampler');
  }

  /* Set default view matrix method */
  setDefaultView (gl) {
    mat4.perspective(this.pMatrix, 45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
  }

  /* Set default projection matrix method */
  setDefaultProj (gl) {
    mat4.identity(this.mvMatrix);
    mat4.translate(this.mvMatrix, this.mvMatrix, [0.0, 0.0, -1.0]);
  }

  /* Set shader unifroms method */
  setUniforms (gl, fractal) {
    gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, this.pMatrix);
    gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.mvMatrix);

    gl.uniform1f(this.shaderProgram.FrameW, gl.viewportWidth);
    gl.uniform1f(this.shaderProgram.FrameH, gl.viewportHeight);
    gl.uniform1f(this.shaderProgram.Side, fractal.side);
    gl.uniform2f(this.shaderProgram.Center, fractal.centerX, fractal.centerY);
    gl.uniform1i(this.shaderProgram.Type, fractal.type);
    gl.uniform1f(this.shaderProgram.Power, document.getElementById('slider_pow').value);
    if (!fractal.type) {
      gl.uniform2f(this.shaderProgram.Jul_Z, document.getElementById('slider_real').value, document.getElementById('slider_imag').value);
    }
  }
}

/* Buffers representation class */
class Buffers {
  constructor (noOfBuf, data) {
    this.buffs = new Array(noOfBuf);
    this.data = data;
  }

  /* Init buffers method */
  init (gl) {
    for (let i = 0; i < this.buffs.length; i++) {
      this.buffs[i] = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffs[i]);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.data[i]), gl.STATIC_DRAW);
      this.buffs[i].numItems = 4;
      this.buffs[i].itemSize = this.data[i].length / 4;
    }
  }
}

/* Main drawing context class */
class Drawer {
  constructor (canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2');
    this.shaders = new Shaders(this.gl);
    const bufferData = [
      [
        1.0, 1.0, 0.0,
        -1.0, 1.0, 0.0,
        1.0, -1.0, 0.0,
        -1.0, -1.0, 0.0
      ],
      [
        1.0, 1.0,
        0.0, 1.0,
        1.0, 0.0,
        0.0, 0.0
      ]
    ];
    this.buffers = new Buffers(2, bufferData);
    this.fractal = new Fractal();
  }

  /* Init drawing context method */
  init () {
    initGL(this.canvas, this.gl);
    initCanvasMouseMethods(this.canvas, this.gl, this.fractal);
    this.shaders.init(this.gl);
    this.buffers.init(this.gl);
    this.fractal.initTexture(this.gl);

    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.enable(this.gl.DEPTH_TEST);
  }

  /* Draw scene method */
  draw () {
    this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    this.shaders.setDefaultView(this.gl);
    this.shaders.setDefaultProj(this.gl);
    this.shaders.setUniforms(this.gl, this.fractal);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.buffs[1]);
    this.gl.vertexAttribPointer(this.shaders.shaderProgram.vertexTexCoordAttribute, this.buffers.buffs[1].itemSize, this.gl.FLOAT, false, 0, 0);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.buffs[0]);
    this.gl.vertexAttribPointer(this.shaders.shaderProgram.vertexPositionAttribute, this.buffers.buffs[0].itemSize, this.gl.FLOAT, false, 0, 0);

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.buffers.buffs[0].numItems);
  }
}

/* Main program drawing context */
let drawer;

/***
 * Drawing context initialization functions block
 ***/

/* Main WebGL initialization function */
function initGL (canvas, gl) {
  try {
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
  } catch (e) {
  }
  if (!gl) {
    window.alert('Could not initialize WebGL');
  }
}

/* Start mouse position global values (need for carthographic navigation) */
let StartX = 0; let StartY = 0;

/* Canvas mouse methods setup function */
function initCanvasMouseMethods (canvas, gl, fractal) {
  canvas.onmousedown = function (event) {
    const Unit = Math.min(gl.viewportWidth, gl.viewportHeight);
    StartX = (event.pageX - gl.viewportWidth / 2) / Unit * fractal.side * 2;
    StartY = (event.pageY - gl.viewportHeight / 2) / Unit * fractal.side * 2;

    document.addEventListener('mousemove', onMouseMove);
  };

  canvas.onmouseup = function () {
    document.removeEventListener('mousemove', onMouseMove);
  };

  canvas.onmouseout = function () {
    document.removeEventListener('mousemove', onMouseMove);
  };

  canvas.addEventListener('wheel', onMouseWheel);
}

/***
 * Mouse events handle functions block
 ***/

/* Mouse move event handle function */
function onMouseMove (event) {
  const Unit = Math.min(drawer.gl.viewportWidth, drawer.gl.viewportHeight);
  const dx = StartX - (event.pageX - drawer.gl.viewportWidth / 2) / Unit * drawer.fractal.side * 2;
  StartX = (event.pageX - drawer.gl.viewportWidth / 2) / Unit * drawer.fractal.side * 2;
  const dy = StartY - (event.pageY - drawer.gl.viewportHeight / 2) / Unit * drawer.fractal.side * 2;
  StartY = (event.pageY - drawer.gl.viewportHeight / 2) / Unit * drawer.fractal.side * 2;

  drawer.fractal.centerX += dx;
  drawer.fractal.centerY -= dy;
}

/* Mouse wheel event handle function */
function onMouseWheel (event) {
  const Unit = Math.min(drawer.gl.viewportWidth, drawer.gl.viewportHeight);
  const delta = (event.deltaY || event.detail || event.wheelDelta) / 125;
  if ((drawer.fractal.side > 0.00006 || delta > 0) &&
      (drawer.fractal.side < 10.0000 || delta < 0)) {
    const mouseX = -(event.offsetX - drawer.gl.viewportWidth / 2) / Unit * 2;
    const mouseY = ((event.offsetY - drawer.gl.viewportHeight / 2) / Unit * 2);
    drawer.fractal.centerX = drawer.fractal.centerX + mouseX * drawer.fractal.side / 10 * delta;
    drawer.fractal.centerY = drawer.fractal.centerY + mouseY * drawer.fractal.side / 10 * delta;
    drawer.fractal.side += drawer.fractal.side / 10 * delta;
  }
}

/***
 * Fractal parameters and realtive document elements update functions block
 ***/

/* Mandelbrot set parameters input HTML text */
const powParams = `
      <label for="slider_pow" id="output_pow" style="color:yellow"> Power: </label>
      <input name="slider" id="slider_pow" type="range" min="-10" max="10" step="0.01" value="2" />
      <input name="text_area" id="pow" type="text" value="2" />
`;

/* Julia set parameters input HTML text */
const julParams = `
      <br />
      <label for="slider_real" id="output_real" style="color:yellow"> Real part: </label>
      <input name="slider" id="slider_real" type="range" min="-1" max="1" step="0.01" value="0.0" />
      <input name="text_area" id="real" type="text" value="0.0" />
      <br />
      <label for="slider_imag" id="output_imag" style="color:yellow"> Imaginary part: </label>
      <input name="slider" id="slider_imag" type="range" min="-1" max="1" step="0.01" value="-0.67" />
      <input name="text_area" id="imag" type="text" value="-0.67" />
`;

/* Update fractal type (Mandelbrot or Julia) function */
function updateType () {
  drawer.fractal.type = !drawer.fractal.type;
  drawer.fractal.side = 2.0;
  drawer.fractal.centerX = drawer.fractal.centerY = 0.0;
  if (drawer.fractal.type) {
    document.getElementById('header').innerHTML = 'Mandelbrot Set';
    document.getElementById('params').innerHTML = powParams;
  } else {
    document.getElementById('header').innerHTML = 'Julia Set';
    document.getElementById('params').innerHTML = powParams + julParams;
  }
  document.getElementsByName('slider').forEach((item) => { item.oninput = updateTextAreas; });
  document.getElementsByName('text_area').forEach((item) => { item.oninput = updateSliders; });
}

/* Update text-areas values function */
function updateTextAreas () {
  document.getElementById('pow').value = document.getElementById('slider_pow').value;
  if (!drawer.fractal.type) {
    document.getElementById('real').value = document.getElementById('slider_real').value;
    document.getElementById('imag').value = document.getElementById('slider_imag').value;
  }
}

/* Update range sliders values function */
function updateSliders () {
  document.getElementById('slider_pow').value = document.getElementById('pow').value;
  if (!drawer.fractal.type) {
    document.getElementById('slider_real').value = document.getElementById('real').value;
    document.getElementById('slider_imag').value = document.getElementById('imag').value;
  }
}

/* Update texture image value function */
function getImage () {
  const file = document.getElementById('file').files[0] ?? null;
  if (file === null) {
    drawer.fractal.img.src = 'default_palette.png';
    return;
  }
  const tex = drawer.gl.createTexture();
  drawer.fractal.img.src = window.URL.createObjectURL(file);
  drawer.fractal.handleTextureLoaded(drawer.gl, tex, drawer.shaders.shaderProgram);
}

/* Every-frame animation response funcion */
function tick () {
  window.requestAnimationFrame(tick);
  drawer.draw();
}

/* WebGL start (entry point) function */
function webGLStart () {
  const canvas = document.getElementById('webglCanvas');

  drawer = new Drawer(canvas);
  drawer.init();
  tick();
}

/* Add event handle for dynamically updating objects */
document.addEventListener('DOMContentLoaded', webGLStart);
document.getElementsByName('type').forEach((item) => { item.onchange = updateType; });
document.getElementById('file').onchange = getImage;
document.getElementsByName('slider').forEach((item) => { item.oninput = updateTextAreas; });
document.getElementsByName('text_area').forEach((item) => { item.oninput = updateSliders; });
