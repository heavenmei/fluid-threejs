"use strict";
import Utilities from "./utilities";

export default class Camera {
  static SENSITIVITY = 0.005;
  static MIN_DISTANCE = 1.0;
  static MAX_DISTANCE = 80.0;

  constructor(
    element,
    orbitPoint,
    distance = 40.0,
    azimuth = 0,
    elevation = 1.5
  ) {
    this.element = element;
    this.distance = distance;
    this.orbitPoint = orbitPoint;

    this.azimuth = azimuth; // 左右角度
    this.elevation = elevation; // 上下角度

    this.minElevation = -Math.PI / 2;
    this.maxElevation = Math.PI / 2;

    this.currentMouseX = 0;
    this.currentMouseY = 0;

    this.lastMouseX = 0;
    this.lastMouseY = 0;

    this.mouseDown = false;

    this.viewMatrix = new Float32Array(16);

    this.recomputeViewMatrix();
  }

  recomputeViewMatrix() {
    const xRotationMatrix = new Float32Array(16);
    const yRotationMatrix = new Float32Array(16);
    const distanceTranslationMatrix = Utilities.makeIdentityMatrix(
      new Float32Array(16)
    );
    const orbitTranslationMatrix = Utilities.makeIdentityMatrix(
      new Float32Array(16)
    );

    Utilities.makeIdentityMatrix(this.viewMatrix);

    Utilities.makeXRotationMatrix(xRotationMatrix, this.elevation);
    Utilities.makeYRotationMatrix(yRotationMatrix, this.azimuth);
    distanceTranslationMatrix[14] = -this.distance;
    orbitTranslationMatrix[12] = -this.orbitPoint[0];
    orbitTranslationMatrix[13] = -this.orbitPoint[1];
    orbitTranslationMatrix[14] = -this.orbitPoint[2];

    Utilities.premultiplyMatrix(
      this.viewMatrix,
      this.viewMatrix,
      orbitTranslationMatrix
    );
    Utilities.premultiplyMatrix(
      this.viewMatrix,
      this.viewMatrix,
      yRotationMatrix
    );
    Utilities.premultiplyMatrix(
      this.viewMatrix,
      this.viewMatrix,
      xRotationMatrix
    );
    Utilities.premultiplyMatrix(
      this.viewMatrix,
      this.viewMatrix,
      distanceTranslationMatrix
    );
  }

  getPosition() {
    const position = [
      this.distance *
        Math.sin(Math.PI / 2 - this.elevation) *
        Math.sin(-this.azimuth) +
        this.orbitPoint[0],
      this.distance * Math.cos(Math.PI / 2 - this.elevation) +
        this.orbitPoint[1],
      this.distance *
        Math.sin(Math.PI / 2 - this.elevation) *
        Math.cos(-this.azimuth) +
        this.orbitPoint[2],
    ];

    return position;
  }

  // for flow
  getViewDirection = function () {
    var viewDirection = new Float32Array(3);
    viewDirection[0] =
      -Math.sin(Math.PI / 2 - this.elevation) * Math.sin(-this.azimuth);
    viewDirection[1] = -Math.cos(Math.PI / 2 - this.elevation);
    viewDirection[2] =
      -Math.sin(Math.PI / 2 - this.elevation) * Math.cos(-this.azimuth);

    return viewDirection;
  };

  isMouseDown() {
    return this.mouseDown;
  }

  getViewMatrix() {
    return this.viewMatrix;
  }

  setBounds(minElevation, maxElevation) {
    this.minElevation = minElevation;
    this.maxElevation = maxElevation;

    if (this.elevation > this.maxElevation) this.elevation = this.maxElevation;
    if (this.elevation < this.minElevation) this.elevation = this.minElevation;

    this.recomputeViewMatrix();
  }

  onMouseDown(event) {
    event.preventDefault();

    const x = Utilities.getMousePosition(event, this.element).x;
    const y = Utilities.getMousePosition(event, this.element).y;

    this.mouseDown = true;
    this.lastMouseX = x;
    this.lastMouseY = y;
  }

  onMouseUp(event) {
    event.preventDefault();

    this.mouseDown = false;
  }

  onMouseMove(event) {
    event.preventDefault();

    const x = Utilities.getMousePosition(event, this.element).x;
    const y = Utilities.getMousePosition(event, this.element).y;

    if (this.mouseDown) {
      this.currentMouseX = x;
      this.currentMouseY = y;

      const deltaAzimuth =
        (this.currentMouseX - this.lastMouseX) * Camera.SENSITIVITY;
      const deltaElevation =
        (this.currentMouseY - this.lastMouseY) * Camera.SENSITIVITY;

      this.azimuth += deltaAzimuth;
      this.elevation += deltaElevation;

      if (this.elevation > this.maxElevation)
        this.elevation = this.maxElevation;
      if (this.elevation < this.minElevation)
        this.elevation = this.minElevation;

      this.recomputeViewMatrix();

      this.lastMouseX = this.currentMouseX;
      this.lastMouseY = this.currentMouseY;
    }
  }

  onWheel(event) {
    const scrollDelta = event.deltaY;
    this.distance += (scrollDelta > 0 ? 1 : -1) * 2.0;

    if (this.distance < Camera.MIN_DISTANCE)
      this.distance = Camera.MIN_DISTANCE;
    if (this.distance > Camera.MAX_DISTANCE)
      this.distance = Camera.MAX_DISTANCE;

    this.recomputeViewMatrix();
  }
}
