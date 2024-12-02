import * as THREE from "three";

import { TEXTURE_WIDTH, TEXTURE_HEIGHT, AMOUNT, BOX } from "./config";

import vertexSphere from "./shader/sphere.vert";
import fragmentSphere from "./shader/sphere.frag";
import vertexBillboard from "./shader/particles.vert";
import fragmentBillboard from "./shader/particles.frag";
import circleImage from "../images/circle.png";
import targetImage from "../images/art.jpg";

export default class Renderer {
  particleCount = AMOUNT;

  constructor(wgl, scene, simulator, box, camera, img, onload) {
    this.wgl = wgl;
    this.scene = scene;
    this.box = box;
    this.simulator = simulator;
    this.camera = camera;
    this.img = img;
    this.container = new THREE.Object3D();

    this.imgTexture = new THREE.Texture(this.img);

    // * fill particle vertex buffer containing the relevant texture coordinates
    var particleTextureCoordinates = new Float32Array(AMOUNT * 2);
    for (var y = 0; y < TEXTURE_HEIGHT; ++y) {
      for (var x = 0; x < TEXTURE_WIDTH; ++x) {
        particleTextureCoordinates[(y * TEXTURE_WIDTH + x) * 2] =
          (x + 0.5) / TEXTURE_WIDTH;
        particleTextureCoordinates[(y * TEXTURE_WIDTH + x) * 2 + 1] =
          (y + 0.5) / TEXTURE_HEIGHT;
      }
    }
    this.particleTextureCoordinates = particleTextureCoordinates;

    // this.drawInstance();
    this.drawParticles();
  }

  drawInstance() {
    const geometry = new THREE.IcosahedronGeometry(0.1, 3);

    const material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.shadowmap,
        {
          map: {
            value: new THREE.TextureLoader().load(circleImage),
          },
          u_image: {
            type: "t",
            value: new THREE.TextureLoader().load(targetImage),
          },
          u_box2img: {
            value: new THREE.Vector2(
              BOX[0] / this.img.width,
              BOX[1] / this.img.height
            ),
          },

          u_positionsTexture: {
            type: "t",
            value: this.simulator.particlePositionTextureDefault,
          },
          u_positionsDefaultTexture: {
            type: "t",
            value: this.simulator.particlePositionTextureDefault,
          },
        },
      ]),
      vertexShader: vertexSphere,
      fragmentShader: fragmentSphere,
      blending: THREE.NoBlending,
    });

    material.needsUpdate = true;
    const instancedMesh = new THREE.InstancedMesh(geometry, material, AMOUNT);

    instancedMesh.geometry.setAttribute(
      "a_textureCoordinates",
      new THREE.InstancedBufferAttribute(
        new Float32Array(this.particleTextureCoordinates),
        2
      )
    );

    this.instancedMesh = instancedMesh;
    this.container.add(this.instancedMesh);
  }

  drawParticles() {
    const circleGeometry = new THREE.CircleGeometry(0.1, 6);

    let geometry = new THREE.InstancedBufferGeometry();
    geometry.index = circleGeometry.index;
    geometry.attributes = circleGeometry.attributes;

    geometry.setAttribute(
      "textureCoordinates",
      new THREE.InstancedBufferAttribute(this.particleTextureCoordinates, 2)
    );

    const material = new THREE.RawShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        map: {
          value: new THREE.TextureLoader().load(circleImage),
        },
        u_box2img: {
          value: new THREE.Vector2(
            BOX[0] / this.img.width,
            BOX[1] / this.img.height
          ),
        },
        u_image: {
          type: "t",
          value: new THREE.TextureLoader().load(targetImage),
        },
        u_imageSize: {
          type: "t",
          value: new THREE.Vector2(this.img.width, this.img.height),
        },
        u_positionsTexture: {
          type: "t",
          value: undefined,
        },
        u_positionsDefaultTexture: {
          type: "t",
          value: this.simulator.particlePositionTextureDefault,
        },
      },
      vertexShader: vertexBillboard,
      fragmentShader: fragmentBillboard,
      // blending: THREE.NoBlending,
      depthTest: true,
      depthWrite: true,
    });

    let mesh = new THREE.Mesh(geometry, material);
    mesh.material.uniforms.needsUpdate = true;

    this.scene.add(mesh);
    this.billboardMesh = mesh;
  }

  render(time) {
    if (this.billboardMesh) {
      let material = this.billboardMesh.material;

      // material.uniforms.u_positionsTexture.value =
      //   this.simulator.particlePositionTexture;

      material.uniforms.u_positionsTexture.value =
        this.simulator.positionRenderTarget.texture;
    }
  }
}
