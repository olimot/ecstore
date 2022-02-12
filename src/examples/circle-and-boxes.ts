/* eslint-disable no-plusplus */
import observeCanvasResize from './observeCanvasResize';
import ECStore from '../ECStore';

const NUM_ELEMENTS = 5000;
const SPEED_MULTIPLIER = 0.1;
const SHAPE_SIZE = 20;
const SHAPE_HALF_SIZE = SHAPE_SIZE / 2;

// Initialize canvas
const canvas = document.createElement('canvas');
canvas.style.cssText = 'width:100%;height:100%';
observeCanvasResize(canvas, (size) => Object.assign(canvas, { width: size.x, height: size.y }));
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('canvas 2d context not initialized');

const root = document.getElementById('root');
if (!root) throw new Error('element #root not found');
root.append(canvas);

//----------------------
// Components
//----------------------

interface Entity {
  id: string;
  velocity: { x: number; y: number };
  position: { x: number; y: number };
  shape: string;
  renderable: true;
}

//----------------------
// Systems
//----------------------

type System = (store: ECStore<Entity>, delta: number, time: number) => void;

// MovableSystem

const MovableSystem: System = (store, delta) => {
  // Define a query of entities that have "Velocity" and "Position" components
  if (!store.components.velocity) return;
  let i = store.components.velocity.length;
  while (i--) {
    const moving = store.components.velocity[i];
    if (moving.position && moving.velocity) {
      const { velocity, position } = moving;
      position.x += velocity.x * delta;
      position.y += velocity.y * delta;
      if (position.x > canvas.width + SHAPE_HALF_SIZE) position.x = -SHAPE_HALF_SIZE;
      if (position.x < -SHAPE_HALF_SIZE) position.x = canvas.width + SHAPE_HALF_SIZE;
      if (position.y > canvas.height + SHAPE_HALF_SIZE) position.y = -SHAPE_HALF_SIZE;
      if (position.y < -SHAPE_HALF_SIZE) position.y = canvas.height + SHAPE_HALF_SIZE;
    }
  }
};

// RendererSystem
// This method will get called on every frame by default
const RendererSystem: System = (store) => {
  const drawCircle = (position: { x: number; y: number }) => {
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(position.x, position.y, SHAPE_HALF_SIZE, 0, 2 * Math.PI, false);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#222';
    ctx.stroke();
  };

  const drawBox = (position: { x: number; y: number }) => {
    ctx.beginPath();
    ctx.rect(position.x - SHAPE_HALF_SIZE, position.y - SHAPE_HALF_SIZE, SHAPE_SIZE, SHAPE_SIZE);
    ctx.fillStyle = '#f28d89';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#800904';
    ctx.stroke();
  };

  // ctx.globalAlpha = 0.6;
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Iterate through all the entities on the query
  if (!store.components.renderable) return;
  let i = store.components.renderable.length;
  while (i--) {
    const entity = store.components.renderable[i];
    if (entity.shape && entity.position) {
      const { shape, position } = entity;
      if (shape === 'box') {
        drawBox(position);
      } else {
        drawCircle(position);
      }
    }
  }
};

// Create world and register the systems on it
const world = new ECStore<Entity>();

// Some helper functions when creating the components
function getRandomVelocity() {
  return {
    x: SPEED_MULTIPLIER * (2 * Math.random() - 1),
    y: SPEED_MULTIPLIER * (2 * Math.random() - 1),
  };
}

function getRandomPosition() {
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
  };
}

function getRandomShape() {
  return Math.random() >= 0.5 ? 'circle' : 'box';
}

let i = NUM_ELEMENTS;
while (i--) {
  world.add({
    velocity: getRandomVelocity(),
    shape: getRandomShape(),
    position: getRandomPosition(),
    renderable: true,
  });
}

let lastTime = performance.now();

// Run!
function run() {
  // Compute delta and elapsed time
  const time = performance.now();
  const delta = time - lastTime;

  // Run all the systems
  MovableSystem(world, delta, time);
  RendererSystem(world, delta, time);

  lastTime = time;
  requestAnimationFrame(run);
}

run();
