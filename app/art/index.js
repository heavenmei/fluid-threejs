"use strict";
import WrappedGL from "../lib/wrappedgl";
import Camera from "../lib/camera";
import Utilities, { normalize } from "../lib/utilities";
import * as THREE from "three";

// import Renderer from "./renderer.js";
// import Simulator from "./simulator.js";
import Box, { BOX_X, BOX_Y, BOX_Z, BORDER } from "./box.js";

import Stats from "stats.js";

const FOV = Math.PI / 3;
const PARTICLES_PER_CELL = 10;

const BOX = [
  [0, 0, 0],
  [BOX_X, BOX_Y, 2],
];

export default class Art {
  //using gridCellDensity ensures a linear relationship to particle count ，simulation grid cell density per world space unit volume
  // todo
  lastTime = 0.0;
  settings = {
    showBox: true,
    speed: 0,
    gridCellDensity: 20,
    dieSpeed: 0.015,
    radius: 0,
    curlSize: 0,
    attraction: 0,
    count: 0,
    specularColor: "#fff",
  };
  constructor(gui, image) {
    this.image = image;
    this.gui = gui;

    var canvas = (this.canvas = document.getElementById("canvas"));
    var wgl = (this.wgl = new WrappedGL(canvas));
    wgl ? console.log("=== WebGL init", wgl) : alert("WebGL not supported");

    window.wgl = wgl;

    this.projectionMatrix = Utilities.makePerspectiveMatrix(
      new Float32Array(16),
      FOV,
      this.canvas.width / this.canvas.height,
      0.1,
      100.0
    );
    this.camera = new Camera(
      this.canvas,
      // [BOX_X / 2, BOX_Y / 2, 0],
      [0, 0, 0],
      40.0,
      0,
      0
    );
    // * add lights
    // x = 0.5 光线是从右往左照，y = 0.7 光线从上方往下照， z = 1 说明光线从在场景前方。
    this.directionLight = normalize([0.5, 0.7, 1]);

    this.initGui();

    // this.gridDimensions = [BOX_X, BOX_Y, BOX_Z];

    this.quadVertexBuffer = wgl.createBuffer();
    wgl.bufferData(
      this.quadVertexBuffer,
      wgl.ARRAY_BUFFER,
      new Float32Array([-1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]),
      wgl.STATIC_DRAW
    );

    this.box = new Box(
      this.canvas,
      this.wgl,
      this.projectionMatrix,
      this.camera,
      this.directionLight
    );

    this.start();

    /** init */
    canvas.addEventListener("wheel", this.onWheel.bind(this));
    canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
    canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
    document.addEventListener("mouseup", this.onMouseUp.bind(this));
    window.addEventListener("resize", this.onResize.bind(this));
  }

  initGui() {
    const stats = new Stats();
    this.stats = stats;
    document.body.appendChild(stats.domElement);

    const settings = this.settings;
    const gui = this.gui;
    // gui.add(this, "reset").name("Reset");
    gui
      .add(
        {
          play: () => {
            this.settings.speed = this.settings.speed ? 0 : 0.9;
          },
        },
        "play"
      )
      .name("Play/Pause");

    const simulationFolder = gui.addFolder("Simulation");
    simulationFolder.add(settings, "speed", 0.0, 2.0, 0.1).name("speed");

    const renderingFolder = gui.addFolder("Rendering");
    renderingFolder.add(settings, "showBox").name("Box");
    renderingFolder
      .add(settings, "gridCellDensity", 10, 30.0, 1.0)
      .name("density")
      .listen();
    renderingFolder.add(settings, "count").name("Particles Count").listen();
    renderingFolder.addColor(settings, "specularColor").name("Specular Color");

    // this.settings.count = this.getParticleCount().toFixed(0);

    simulationFolder.open();
    renderingFolder.open();
  }

  start() {
    this.onResize();

    this.update();
  }

  // * start the update loop
  update(currentTime) {
    this.stats.begin();
    let deltaTime = (currentTime - this.lastTime) / 1000 || 0.0;
    this.lastTime = currentTime;

    // this.simulator.simulate(
    //   deltaTime,
    //   this.settings.speed,
    //   this.camera.getPosition()
    // );

    wgl.clear(
      wgl
        .createClearState()
        .bindFramebuffer(null)
        .clearColor(0.0, 0.0, 0.0, 0.1),
      wgl.COLOR_BUFFER_BIT | wgl.DEPTH_BUFFER_BIT
    );

    // this.renderer.draw();

    this.settings.showBox && this.box.draw();

    requestAnimationFrame(this.update.bind(this));

    this.stats.end();
  }

  onResize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    Utilities.makePerspectiveMatrix(
      this.projectionMatrix,
      FOV,
      this.canvas.width / this.canvas.height,
      0.1,
      100.0
    );

    // this.renderer.onResize();
  }

  onWheel(event) {
    event.preventDefault();
    this.camera.onWheel(event);
  }

  onMouseMove(event) {
    var position = Utilities.getMousePosition(event, this.canvas);
    var normalizedX = position.x / this.canvas.width;
    var normalizedY = position.y / this.canvas.height;

    this.mouseX = normalizedX * 2.0 - 1.0;
    this.mouseY = (1.0 - normalizedY) * 2.0 - 1.0;

    this.camera.onMouseMove(event);
  }

  onMouseDown(event) {
    this.camera.onMouseDown(event);
  }

  onMouseUp(event) {
    this.camera.onMouseUp(event);
  }
}

function computeVolume(min, max) {
  var volume = 1;
  for (var i = 0; i < 3; ++i) {
    volume *= max[i] - min[i];
  }
  return volume;
}

function randomPoint(min, max) {
  //random point in this AABB
  var point = [];
  for (var i = 0; i < 3; ++i) {
    point[i] = min[i] + Math.random() * (max[i] - min[i]);
  }
  return point;
}