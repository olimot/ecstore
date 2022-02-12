/* eslint-disable no-plusplus,@typescript-eslint/no-non-null-assertion */
/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
import * as THREE from 'three';
import { Matrix4 } from 'three';
import ECStore from '../ECStore';

export default interface Entity {
  id: string;
  collidable: true;
  collider: true;
  recovering: true;
  moving: number;
  pulsatingScale: 0 | number;
  object3d: THREE.Object3D;
  instance: { mesh: THREE.InstancedMesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>; index: number };
  timeout: { timer: number; assignee: Partial<Entity> };
  pulsatingColor: number;
  colliding: boolean;
  rotating: number;
  tag: true;
}

type System = (store: ECStore<Entity>, delta: number, time: number) => void;

export const RotatingSystem: System = (store, delta) => {
  if (!store.components.rotating) return;
  let i = store.components.rotating.length;
  while (i--) {
    const entity = store.components.rotating[i];
    if (entity.object3d) {
      const rotatingSpeed = entity.rotating!;
      const object = entity.object3d;
      object.rotation.x += rotatingSpeed * delta;
      object.rotation.y += rotatingSpeed * delta * 2;
      object.rotation.z += rotatingSpeed * delta * 3;
    }
  }
};

const TIMER_TIME = 1;

export const PulsatingColorSystem: System = (store, _delta, time) => {
  if (!store.components.pulsatingColor) return;
  let i = store.components.pulsatingColor.length;
  while (i--) {
    const entity = store.components.pulsatingColor[i];
    if (entity.instance) {
      const pulsatingColor = entity.pulsatingColor!;
      const { mesh, index } = entity.instance;
      if (entity.colliding) {
        mesh.setColorAt(index, new THREE.Color(1, 1, 0));
      } else if (entity.recovering && entity.timeout) {
        const r0 = Math.sin((time * 1000) / 500 + pulsatingColor * 12) / 2 + 0.5;
        const r = r0 * (1 - entity.timeout.timer / TIMER_TIME) + entity.timeout.timer / TIMER_TIME;
        const g = entity.timeout.timer / TIMER_TIME;
        mesh.setColorAt(index, new THREE.Color(r, g, 0));
      } else {
        const r = Math.sin((time * 1000) / 500 + pulsatingColor * 12) / 2 + 0.5;
        mesh.setColorAt(index, new THREE.Color(r, 0, 0));
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      mesh.instanceColor!.needsUpdate = true;
    }
  }
};

export const PulsatingScaleSystem: System = (store, _delta, time) => {
  if (!store.components.pulsatingScale) return;
  let i = store.components.pulsatingScale.length;
  while (i--) {
    const entity = store.components.pulsatingScale[i];
    if (entity.instance) {
      let mul = 0.8;
      if (entity.colliding) mul = 2;
      else if (entity.recovering && entity.timeout) {
        mul = 0.8 * (1 - entity.timeout.timer / TIMER_TIME) + 1.2 * (entity.timeout.timer / TIMER_TIME);
      }
      const sca = mul * (Math.cos(time + entity.pulsatingScale!) / 2 + 1) + 0.2;
      const [mat, trns, rtt, scale] = [new Matrix4(), new THREE.Vector3(), new THREE.Quaternion(), new THREE.Vector3()];
      entity.instance.mesh.getMatrixAt(entity.instance.index, mat);
      mat.decompose(trns, rtt, scale);
      scale.set(sca, sca, sca);
      mat.compose(trns, rtt, scale);
      entity.instance.mesh.setMatrixAt(entity.instance.index, mat);
      entity.instance.mesh.instanceMatrix.needsUpdate = true;
    }
  }
};

export const MovingSystem: System = (store, _delta, time) => {
  if (!store.components.moving) return;
  let i = store.components.moving.length;
  while (i--) {
    const entity = store.components.moving[i];
    const moving = entity.moving!;
    const radius = 4;
    const maxRadius = 4;
    if (entity.object3d) {
      entity.object3d.position.z = Math.cos(time + 3 * moving) * maxRadius + radius;
    } else if (entity.instance) {
      const [mat, trns, rtt, scale] = [new Matrix4(), new THREE.Vector3(), new THREE.Quaternion(), new THREE.Vector3()];
      entity.instance.mesh.getMatrixAt(entity.instance.index, mat);
      mat.decompose(trns, rtt, scale);
      trns.z = Math.cos(time + 3 * moving) * maxRadius + radius;
      mat.compose(trns, rtt, scale);
      entity.instance.mesh.setMatrixAt(entity.instance.index, mat);
      entity.instance.mesh.instanceMatrix.needsUpdate = true;
    }
  }
};

export const TimeoutSystem: System = (store, delta) => {
  if (!store.components.timeout) return;
  let i = store.components.timeout.length;
  while (i--) {
    const entity = store.components.timeout[i];
    const timeout = entity.timeout!;
    timeout.timer -= delta;
    if (timeout.timer < 0) {
      timeout.timer = 0;
      Object.assign(entity, timeout.assignee);
      delete entity.timeout;
    }
  }
};

const ballWorldPos = new THREE.Vector3();

export const ColliderSystem: System = (store) => {
  if (!store.components.collider) return;
  let i = store.components.collider.length;
  while (i--) {
    const ball = store.components.collider[i];
    const ballObject = ball.object3d as THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshStandardMaterial>;
    ballObject.getWorldPosition(ballWorldPos);
    if (!ballObject.geometry.boundingSphere) ballObject.geometry.computeBoundingSphere();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const radiusBall = ballObject.geometry.boundingSphere!.radius;
    if (!store.components.collidable) return;
    let j = store.components.collidable.length;
    while (j--) {
      const box = store.components.collidable[j];
      const { mesh, index } = box.instance!;
      const mat = new Matrix4();
      const [translation, rotation, scale] = [new THREE.Vector3(), new THREE.Quaternion(), new THREE.Vector3()];
      mesh.getMatrixAt(index, mat);
      mat.decompose(translation, rotation, scale);
      const prevColliding = box.colliding;
      if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
      const radiusBox = mesh.geometry.boundingSphere!.radius;
      const radiusSum = radiusBox + radiusBall;
      if (!prevColliding && translation.distanceToSquared(ballWorldPos) <= radiusSum * radiusSum) {
        box.colliding = true;
      } else if (prevColliding) {
        delete box.colliding;
        box.recovering = true;
        box.timeout = { timer: TIMER_TIME, assignee: { recovering: undefined } };
      }
    }
  }
};

// Main

// Initialize canvas
const renderer = new THREE.WebGLRenderer();
renderer.setClearColor(0x333333);
renderer.setPixelRatio(window.devicePixelRatio);

const root = document.getElementById('root');
if (!root) throw new Error('Error: Element #root not found');
renderer.setSize(window.innerWidth - 20, window.innerHeight - 20);
renderer.domElement.style.imageRendering = 'auto';
root.append(renderer.domElement);
//

const store = new ECStore<Entity>();

const numObjects = 10000;
const size = 0.2;
const radius = 8;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.005, 10000);
camera.position.z = 20;

const onResize = () => {
  camera.aspect = root.clientWidth / root.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(root.clientWidth, root.clientHeight);
};
window.addEventListener('resize', onResize, false);

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const { elapsedTime } = clock;
  RotatingSystem(store, delta, elapsedTime);
  PulsatingColorSystem(store, delta, elapsedTime);
  PulsatingScaleSystem(store, delta, elapsedTime);
  TimeoutSystem(store, delta, elapsedTime);
  ColliderSystem(store, delta, elapsedTime);
  MovingSystem(store, delta, elapsedTime);
  renderer.render(scene, camera);
});

const parent = new THREE.Object3D();

const objMoving = new THREE.Mesh(new THREE.IcosahedronGeometry(1), new THREE.MeshStandardMaterial({ color: '#ff0' }));
objMoving.position.set(0, 0, radius);
const objMovingParent = new THREE.Object3D().add(objMoving);
parent.add(objMovingParent);
store.add({ collider: true, object3d: objMoving }, { rotating: 0.5, object3d: objMovingParent });

const boxes = new THREE.InstancedMesh(
  new THREE.BoxBufferGeometry(size, size, size),
  new THREE.MeshStandardMaterial(),
  numObjects,
);
for (let i = 0; i < numObjects; i++) {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.sin(phi) * Math.sin(theta);
  const z = radius * Math.cos(phi);
  boxes.setMatrixAt(i, new THREE.Matrix4().setPosition(new THREE.Vector3(x, y, z)));
  boxes.instanceMatrix.needsUpdate = true;

  const [id] = store.add({
    instance: { mesh: boxes, index: i },
    pulsatingColor: i,
    pulsatingScale: i,
    collidable: true,
  });
  if (Math.random() > 0.5) {
    store.entities[id].moving = i;
  }
}
parent.add(boxes);
scene.add(parent);

const ambientLight = new THREE.AmbientLight(0xcccccc);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(1, 1, 0.5).normalize();
scene.add(directionalLight);

Object.assign(window, { store });
