import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RotateCcw, Hand, Sparkles, Compass, Eye } from 'lucide-react';
import { AnnaMascotState, AnnaMouthState } from './AnnaMascot';
import { playTactileTone } from '../data/kanglishData';

export type Anna3DAction = 'none' | 'wave' | 'jump' | 'spin' | 'namaskara';
export type Anna3DCameraPreset = 'front' | 'angle' | 'closeup';

export interface Anna3DAvatarProps {
  state: AnnaMascotState;
  mouthState: AnnaMouthState;
  prefersReducedMotion?: boolean;
  onInteractReaction?: (label: string) => void;
}

// Pre-allocated math helpers at module scope (zero GC in render loop)
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _rayMouse = new THREE.Vector2();

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createTigerStripeTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Rich warm tiger fur base
    ctx.fillStyle = '#FF9424';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle fur gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#FFA940');
    grad.addColorStop(0.5, '#FF8F1F');
    grad.addColorStop(1, '#E67300');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Stylized dark espresso tiger stripes
    ctx.fillStyle = '#2B1810';
    const stripes = [
      { y: 70, w: 180, h: 22 },
      { y: 135, w: 230, h: 26 },
      { y: 210, w: 195, h: 24 },
      { y: 285, w: 240, h: 26 },
      { y: 360, w: 200, h: 22 },
      { y: 430, w: 170, h: 20 },
    ];
    for (const s of stripes) {
      // Left stripe
      ctx.beginPath();
      ctx.ellipse(60, s.y, s.w * 0.45, s.h * 0.5, 0.12, 0, Math.PI * 2);
      ctx.fill();
      // Right stripe
      ctx.beginPath();
      ctx.ellipse(452, s.y, s.w * 0.45, s.h * 0.5, -0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 120);
    grad.addColorStop(0, 'rgba(38, 28, 74, 0.55)');
    grad.addColorStop(0.5, 'rgba(83, 65, 205, 0.24)');
    grad.addColorStop(1, 'rgba(83, 65, 205, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const Anna3DAvatar: React.FC<Anna3DAvatarProps> = ({
  state,
  mouthState,
  prefersReducedMotion = false,
  onInteractReaction,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  const [activeAction, setActiveAction] = useState<Anna3DAction>('none');
  const [cameraPreset, setCameraPreset] = useState<Anna3DCameraPreset>('front');
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [interactionToast, setInteractionToast] = useState<string | null>(null);

  // Mutable refs read inside the WebGL animation loop so React state updates never recreate the scene
  const stateRef = useRef<AnnaMascotState>(state);
  const mouthStateRef = useRef<AnnaMouthState>(mouthState);
  const reducedMotionRef = useRef<boolean>(prefersReducedMotion);
  const actionRef = useRef<{ type: Anna3DAction; startTime: number }>({
    type: 'none',
    startTime: 0,
  });
  const pointerNdcRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraPresetTargetRef = useRef<{
    active: boolean;
    pos: THREE.Vector3;
    lookAt: THREE.Vector3;
  }>({
    active: false,
    pos: new THREE.Vector3(0, 1.35, 3.85),
    lookAt: new THREE.Vector3(0, 1.15, 0),
  });
  const autoRotateRef = useRef<boolean>(autoRotate);
  const toastTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    mouthStateRef.current = mouthState;
  }, [mouthState]);

  useEffect(() => {
    reducedMotionRef.current = prefersReducedMotion;
  }, [prefersReducedMotion]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  const showToast = useCallback(
    (text: string) => {
      setInteractionToast(text);
      onInteractReaction?.(text);
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
      toastTimeoutRef.current = window.setTimeout(() => {
        setInteractionToast(null);
      }, 1800);
    },
    [onInteractReaction]
  );

  const triggerAction = useCallback(
    (action: Anna3DAction, toastLabel?: string) => {
      playTactileTone('tap');
      setActiveAction(action);
      actionRef.current = {
        type: action,
        startTime: performance.now() * 0.001,
      };
      if (toastLabel) {
        showToast(toastLabel);
      }
    },
    [showToast]
  );

  const applyCameraPreset = useCallback((preset: Anna3DCameraPreset) => {
    playTactileTone('tap');
    setCameraPreset(preset);
    if (preset === 'front') {
      cameraPresetTargetRef.current = {
        active: true,
        pos: new THREE.Vector3(0, 1.35, 3.85),
        lookAt: new THREE.Vector3(0, 1.15, 0),
      };
    } else if (preset === 'angle') {
      cameraPresetTargetRef.current = {
        active: true,
        pos: new THREE.Vector3(2.25, 1.6, 3.2),
        lookAt: new THREE.Vector3(0, 1.12, 0),
      };
    } else if (preset === 'closeup') {
      cameraPresetTargetRef.current = {
        active: true,
        pos: new THREE.Vector3(0, 1.58, 2.55),
        lookAt: new THREE.Vector3(0, 1.48, 0),
      };
    }
  }, []);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();

    // 1. Renderer setup with ACES Filmic & sRGB color space
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const initialW = container.clientWidth || 480;
    const initialH = container.clientHeight || 260;
    renderer.setSize(initialW, initialH);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Scene, Studio Environment & Camera
    const scene = new THREE.Scene();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      36,
      initialW / Math.max(1, initialH),
      0.1,
      50
    );
    camera.position.set(0, 1.35, 3.85);

    // 3. OrbitControls for 360° user rotation & zoom
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.15, 0);
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = 2.1;
    controls.maxDistance = 5.4;
    // Prevent camera from going below the stage floor so Anna always looks grounded
    controls.minPolarAngle = Math.PI * 0.16;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.rotateSpeed = 0.85;
    controls.update();

    const onControlsStart = () => {
      cameraPresetTargetRef.current.active = false;
    };
    controls.addEventListener('start', onControlsStart);

    // 4. Balanced 3-Point Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xf6f3ff, 0xd8d0f5, 0.95);
    hemiLight.position.set(0, 6, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff6e8, 1.65);
    keyLight.position.set(3.2, 5.2, 4.0);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 15;
    const d = 2.4;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xc4b5fd, 0.75);
    fillLight.position.set(-3.2, 2.6, 2.2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x22d3ee, 0.65);
    rimLight.position.set(0, 3.4, -3.5);
    scene.add(rimLight);

    // 5. PBR Materials & Procedural Textures
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const tigerFurTex = createTigerStripeTexture(maxAnisotropy);
    const contactShadowTex = createContactShadowTexture();

    const furMat = new THREE.MeshStandardMaterial({
      map: tigerFurTex,
      roughness: 0.62,
      metalness: 0.05,
    });

    const orangeSolidMat = new THREE.MeshStandardMaterial({
      color: 0xff9424,
      roughness: 0.58,
      metalness: 0.05,
    });

    const creamFurMat = new THREE.MeshStandardMaterial({
      color: 0xfff5e0,
      roughness: 0.68,
      metalness: 0.02,
    });

    const stripeDarkMat = new THREE.MeshStandardMaterial({
      color: 0x26150e,
      roughness: 0.72,
      metalness: 0.04,
    });

    const vestPurpleMat = new THREE.MeshStandardMaterial({
      color: 0x6c5ce7,
      roughness: 0.42,
      metalness: 0.18,
    });

    const vestTrimMat = new THREE.MeshStandardMaterial({
      color: 0x5341cd,
      roughness: 0.35,
      metalness: 0.25,
    });

    const goldBadgeMat = new THREE.MeshPhysicalMaterial({
      color: 0xfacc15,
      roughness: 0.18,
      metalness: 0.9,
      clearcoat: 0.6,
    });

    const pinkNoseMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      roughness: 0.35,
      metalness: 0.05,
    });

    const eyeWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.15,
      metalness: 0.02,
    });

    const pupilMat = new THREE.MeshPhysicalMaterial({
      color: 0x161224,
      roughness: 0.08,
      metalness: 0.1,
      clearcoat: 1.0,
    });

    const mouthInsideMat = new THREE.MeshStandardMaterial({
      color: 0x881337,
      roughness: 0.65,
      metalness: 0.02,
    });

    const tongueMat = new THREE.MeshStandardMaterial({
      color: 0xfb7185,
      roughness: 0.48,
      metalness: 0.02,
    });

    const sneakerWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.38,
      metalness: 0.08,
    });

    const stageTopMat = new THREE.MeshStandardMaterial({
      color: 0xf2effe,
      roughness: 0.45,
      metalness: 0.08,
    });

    const stageRimMat = new THREE.MeshStandardMaterial({
      color: 0x6c5ce7,
      roughness: 0.32,
      metalness: 0.35,
    });

    const stageBaseMat = new THREE.MeshStandardMaterial({
      color: 0xded8f8,
      roughness: 0.55,
      metalness: 0.12,
    });

    // =========================================================================
    // 6. GROUNDED 3D STAGE PEDESTAL (Top surface exactly at y = 0.0)
    // =========================================================================
    const stageGroup = new THREE.Group();
    scene.add(stageGroup);

    // Main platform cylinder: height 0.18, centered at y = -0.09 so top face is y = 0.0
    const pedestalGeo = new THREE.CylinderGeometry(1.12, 1.24, 0.18, 48);
    const pedestalMesh = new THREE.Mesh(pedestalGeo, stageBaseMat);
    pedestalMesh.position.y = -0.09;
    pedestalMesh.receiveShadow = true;
    stageGroup.add(pedestalMesh);

    // Top inlay disc flush at y = 0.0
    const stageTopGeo = new THREE.CylinderGeometry(1.04, 1.04, 0.02, 48);
    const stageTopMesh = new THREE.Mesh(stageTopGeo, stageTopMat);
    stageTopMesh.position.y = -0.008;
    stageTopMesh.receiveShadow = true;
    stageGroup.add(stageTopMesh);

    // Decorative Kaliyona purple bevel ring around pedestal top
    const rimTorusGeo = new THREE.TorusGeometry(1.08, 0.032, 16, 64);
    const rimTorusMesh = new THREE.Mesh(rimTorusGeo, stageRimMat);
    rimTorusMesh.rotation.x = Math.PI / 2;
    rimTorusMesh.position.y = -0.01;
    stageGroup.add(rimTorusMesh);

    // Gold accent ring on pedestal
    const innerRingGeo = new THREE.TorusGeometry(0.88, 0.012, 12, 64);
    const innerRingMesh = new THREE.Mesh(innerRingGeo, goldBadgeMat);
    innerRingMesh.rotation.x = Math.PI / 2;
    innerRingMesh.position.y = 0.003;
    stageGroup.add(innerRingMesh);

    // Soft radial Contact Shadow directly under Anna's feet (y = 0.004, polygonOffset prevents Z-fighting)
    const shadowPlaneGeo = new THREE.PlaneGeometry(1.45, 1.45);
    const shadowPlaneMat = new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.9,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const contactShadowMesh = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    contactShadowMesh.rotation.x = -Math.PI / 2;
    contactShadowMesh.position.y = 0.004;
    stageGroup.add(contactShadowMesh);

    // =========================================================================
    // 7. COMPOSITE MULTI-PART 3D ANNA TIGER CHARACTER (Pivot at y = 0.0)
    // =========================================================================
    const annaRoot = new THREE.Group();
    // Bottom of shoes sits at y = 0.0 (directly touching stageTopMesh!)
    annaRoot.position.set(0, 0, 0);
    scene.add(annaRoot);

    const interactiveMeshes: THREE.Object3D[] = [];

    // --- LEGS & SNEAKER PAWS (y = 0.0 to y = 0.46) ---
    function createLeg(side: -1 | 1): THREE.Group {
      const legGroup = new THREE.Group();
      legGroup.position.set(side * 0.23, 0, 0);

      // Sneaker sole (bottom at y = 0.0, height = 0.06 -> center y = 0.03)
      const soleGeo = new THREE.CylinderGeometry(0.16, 0.175, 0.06, 20);
      soleGeo.scale(1, 1, 1.32);
      const soleMesh = new THREE.Mesh(soleGeo, sneakerWhiteMat);
      soleMesh.position.set(0, 0.03, 0.04);
      soleMesh.castShadow = true;
      soleMesh.receiveShadow = true;
      legGroup.add(soleMesh);

      // Purple sneaker upper trim
      const shoeUpperGeo = new THREE.SphereGeometry(0.155, 20, 16);
      shoeUpperGeo.scale(1.0, 0.68, 1.3);
      const shoeUpperMesh = new THREE.Mesh(shoeUpperGeo, vestPurpleMat);
      shoeUpperMesh.position.set(0, 0.09, 0.035);
      shoeUpperMesh.castShadow = true;
      legGroup.add(shoeUpperMesh);

      // Cream paw toe cap
      const toeCapGeo = new THREE.SphereGeometry(0.125, 16, 12);
      toeCapGeo.scale(1.02, 0.55, 0.9);
      const toeCapMesh = new THREE.Mesh(toeCapGeo, creamFurMat);
      toeCapMesh.position.set(0, 0.08, 0.12);
      legGroup.add(toeCapMesh);

      // Tiger leg cylinder (y = 0.14 to y = 0.48)
      const legCylGeo = new THREE.CapsuleGeometry(0.125, 0.22, 12, 18);
      const legCylMesh = new THREE.Mesh(legCylGeo, furMat);
      legCylMesh.position.set(0, 0.28, 0);
      legCylMesh.castShadow = true;
      legCylMesh.userData = { part: 'body' };
      interactiveMeshes.push(legCylMesh);
      legGroup.add(legCylMesh);

      return legGroup;
    }

    const leftLeg = createLeg(-1);
    const rightLeg = createLeg(1);
    annaRoot.add(leftLeg);
    annaRoot.add(rightLeg);

    // --- BODY / TORSO GROUP (y = 0.42 to y = 1.15) ---
    const bodyGroup = new THREE.Group();
    bodyGroup.position.set(0, 0.76, 0);
    annaRoot.add(bodyGroup);

    // Main Tiger Torso
    const torsoGeo = new THREE.SphereGeometry(0.42, 28, 24);
    torsoGeo.scale(1.0, 1.12, 0.88);
    const torsoMesh = new THREE.Mesh(torsoGeo, furMat);
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    torsoMesh.userData = { part: 'body' };
    interactiveMeshes.push(torsoMesh);
    bodyGroup.add(torsoMesh);

    // Cream Belly Patch
    const bellyGeo = new THREE.SphereGeometry(0.33, 24, 20);
    bellyGeo.scale(0.88, 0.98, 0.52);
    const bellyMesh = new THREE.Mesh(bellyGeo, creamFurMat);
    bellyMesh.position.set(0, -0.02, 0.23);
    bellyMesh.userData = { part: 'body' };
    interactiveMeshes.push(bellyMesh);
    bodyGroup.add(bellyMesh);

    // Kaliyona Purple Buddy Jacket / Vest Side Panels
    const vestShellGeo = new THREE.CylinderGeometry(0.39, 0.43, 0.48, 28, 1, true, Math.PI * 0.22, Math.PI * 1.56);
    vestShellGeo.scale(1.04, 1, 0.92);
    const vestShellMesh = new THREE.Mesh(vestShellGeo, vestPurpleMat);
    vestShellMesh.rotation.y = Math.PI * 0.22;
    vestShellMesh.position.set(0, 0.04, 0);
    vestShellMesh.castShadow = true;
    vestShellMesh.userData = { part: 'body' };
    interactiveMeshes.push(vestShellMesh);
    bodyGroup.add(vestShellMesh);

    // Vest Collar Torus
    const collarGeo = new THREE.TorusGeometry(0.28, 0.055, 14, 32);
    collarGeo.scale(1.05, 0.92, 1);
    const collarMesh = new THREE.Mesh(collarGeo, vestTrimMat);
    collarMesh.rotation.x = Math.PI * 0.52;
    collarMesh.position.set(0, 0.34, 0.02);
    bodyGroup.add(collarMesh);

    // Golden Kaliyona Star / Badge on Left Chest
    const badgeGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.025, 20);
    const badgeMesh = new THREE.Mesh(badgeGeo, goldBadgeMat);
    badgeMesh.rotation.x = Math.PI / 2;
    badgeMesh.rotation.z = -0.2;
    badgeMesh.position.set(0.21, 0.14, 0.35);
    bodyGroup.add(badgeMesh);

    // --- ARTICULATED ARMS (Pivoted at shoulders inside bodyGroup) ---
    function createArm(side: -1 | 1): THREE.Group {
      const shoulderPivot = new THREE.Group();
      shoulderPivot.position.set(side * 0.41, 0.22, 0.02);

      // Upper/forearm capsule
      const armGeo = new THREE.CapsuleGeometry(0.105, 0.26, 12, 16);
      const armMesh = new THREE.Mesh(armGeo, furMat);
      armMesh.position.set(side * 0.06, -0.15, 0.04);
      armMesh.rotation.z = side * 0.22;
      armMesh.castShadow = true;
      armMesh.userData = { part: 'arm' };
      interactiveMeshes.push(armMesh);
      shoulderPivot.add(armMesh);

      // Shoulder sleeve cuff
      const cuffGeo = new THREE.CylinderGeometry(0.125, 0.13, 0.12, 18);
      const cuffMesh = new THREE.Mesh(cuffGeo, vestPurpleMat);
      cuffMesh.position.set(side * 0.02, -0.03, 0.02);
      cuffMesh.rotation.z = side * 0.25;
      shoulderPivot.add(cuffMesh);

      // Cream Tiger Paw Hand
      const pawGeo = new THREE.SphereGeometry(0.12, 18, 16);
      pawGeo.scale(1.0, 0.95, 0.85);
      const pawMesh = new THREE.Mesh(pawGeo, creamFurMat);
      pawMesh.position.set(side * 0.11, -0.32, 0.08);
      pawMesh.castShadow = true;
      pawMesh.userData = { part: 'arm' };
      interactiveMeshes.push(pawMesh);
      shoulderPivot.add(pawMesh);

      // Pink paw pad
      const padGeo = new THREE.SphereGeometry(0.055, 12, 10);
      padGeo.scale(1, 1, 0.4);
      const padMesh = new THREE.Mesh(padGeo, pinkNoseMat);
      padMesh.position.set(side * 0.11, -0.32, 0.16);
      shoulderPivot.add(padMesh);

      return shoulderPivot;
    }

    const leftArm = createArm(-1);
    const rightArm = createArm(1);
    bodyGroup.add(leftArm);
    bodyGroup.add(rightArm);

    // --- CURVED TIGER TAIL (Pivoted at lower back) ---
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, -0.18, -0.34);
    bodyGroup.add(tailPivot);

    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0.06, -0.24),
      new THREE.Vector3(0.08, 0.26, -0.38),
      new THREE.Vector3(0.14, 0.44, -0.28),
    ]);
    const tailGeo = new THREE.TubeGeometry(tailCurve, 20, 0.068, 12, false);
    const tailMesh = new THREE.Mesh(tailGeo, furMat);
    tailMesh.castShadow = true;
    tailPivot.add(tailMesh);

    const tailTipGeo = new THREE.SphereGeometry(0.078, 14, 14);
    const tailTipMesh = new THREE.Mesh(tailTipGeo, stripeDarkMat);
    tailTipMesh.position.set(0.14, 0.44, -0.28);
    tailPivot.add(tailTipMesh);

    // --- EXPRESSIVE CHIBI TIGER HEAD (Pivoted at neck y = 0.42 in bodyGroup) ---
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.72, 0.04);
    bodyGroup.add(headGroup);

    // Main Head Sphere (slightly wider for cute chibi tiger proportions)
    const headGeo = new THREE.SphereGeometry(0.52, 32, 28);
    headGeo.scale(1.08, 0.96, 0.95);
    const headMesh = new THREE.Mesh(headGeo, orangeSolidMat);
    headMesh.castShadow = true;
    headMesh.receiveShadow = true;
    headMesh.userData = { part: 'head' };
    interactiveMeshes.push(headMesh);
    headGroup.add(headMesh);

    // Fluffy White/Cream Cheek Tufts (Left & Right)
    for (const side of [-1, 1] as const) {
      const cheekGeo = new THREE.SphereGeometry(0.24, 20, 16);
      cheekGeo.scale(1.15, 0.78, 0.75);
      const cheekMesh = new THREE.Mesh(cheekGeo, creamFurMat);
      cheekMesh.position.set(side * 0.42, -0.1, 0.14);
      cheekMesh.rotation.z = side * -0.18;
      cheekMesh.userData = { part: 'head' };
      interactiveMeshes.push(cheekMesh);
      headGroup.add(cheekMesh);

      // Cheek stripes (2 per side)
      for (let s = 0; s < 2; s++) {
        const cStripeGeo = new THREE.CapsuleGeometry(0.018, 0.14, 6, 10);
        const cStripeMesh = new THREE.Mesh(cStripeGeo, stripeDarkMat);
        cStripeMesh.position.set(
          side * 0.48,
          -0.05 - s * 0.08,
          0.25 - s * 0.02
        );
        cStripeMesh.rotation.z = Math.PI * 0.5 + side * (0.12 - s * 0.08);
        cStripeMesh.rotation.y = side * 0.45;
        headGroup.add(cStripeMesh);
      }
    }

    // Forehead "Royal Bengaluru Tiger" Stripes (3 vertical/curved markings)
    for (const offset of [-0.14, 0, 0.14]) {
      const fStripeGeo = new THREE.CapsuleGeometry(0.022, 0.16, 8, 12);
      const fStripeMesh = new THREE.Mesh(fStripeGeo, stripeDarkMat);
      fStripeMesh.position.set(
        offset,
        0.31,
        offset === 0 ? 0.44 : 0.41
      );
      fStripeMesh.rotation.x = -0.38;
      fStripeMesh.rotation.z = offset * -0.9;
      headGroup.add(fStripeMesh);
    }

    // Horizontal king mark stripe on forehead
    const hStripeGeo = new THREE.CapsuleGeometry(0.02, 0.22, 8, 12);
    const hStripeMesh = new THREE.Mesh(hStripeGeo, stripeDarkMat);
    hStripeMesh.position.set(0, 0.34, 0.43);
    hStripeMesh.rotation.z = Math.PI / 2;
    headGroup.add(hStripeMesh);

    // --- EARS (Left & Right Pivots for ear twitches) ---
    function createEar(side: -1 | 1): THREE.Group {
      const earPivot = new THREE.Group();
      earPivot.position.set(side * 0.4, 0.42, -0.02);
      earPivot.rotation.z = side * -0.42;

      const outerEarGeo = new THREE.SphereGeometry(0.17, 20, 16);
      outerEarGeo.scale(1.0, 1.05, 0.48);
      const outerEarMesh = new THREE.Mesh(outerEarGeo, orangeSolidMat);
      outerEarMesh.castShadow = true;
      outerEarMesh.userData = { part: 'head' };
      interactiveMeshes.push(outerEarMesh);
      earPivot.add(outerEarMesh);

      // Dark tip on back/top rim of ear
      const earRimGeo = new THREE.SphereGeometry(0.14, 16, 12);
      earRimGeo.scale(1.02, 0.7, 0.42);
      const earRimMesh = new THREE.Mesh(earRimGeo, stripeDarkMat);
      earRimMesh.position.set(0, 0.06, -0.02);
      earPivot.add(earRimMesh);

      // Pink inner ear hollow
      const innerEarGeo = new THREE.SphereGeometry(0.105, 16, 12);
      innerEarGeo.scale(0.9, 0.92, 0.35);
      const innerEarMesh = new THREE.Mesh(innerEarGeo, pinkNoseMat);
      innerEarMesh.position.set(0, -0.01, 0.055);
      earPivot.add(innerEarMesh);

      return earPivot;
    }

    const leftEar = createEar(-1);
    const rightEar = createEar(1);
    headGroup.add(leftEar);
    headGroup.add(rightEar);

    // --- CREAM SNOUT / MUZZLE & NOSE ---
    const muzzleGroup = new THREE.Group();
    muzzleGroup.position.set(0, -0.09, 0.44);
    headGroup.add(muzzleGroup);

    // Left & right puffy muzzle pads
    for (const side of [-1, 1] as const) {
      const padGeo = new THREE.SphereGeometry(0.135, 18, 16);
      padGeo.scale(1.12, 0.85, 0.72);
      const padMesh = new THREE.Mesh(padGeo, creamFurMat);
      padMesh.position.set(side * 0.095, 0.01, 0.04);
      muzzleGroup.add(padMesh);
    }

    // Cute Triangle-Rounded Pink Tiger Nose
    const noseGeo = new THREE.ConeGeometry(0.075, 0.065, 4);
    noseGeo.rotateX(Math.PI);
    noseGeo.rotateY(Math.PI / 4);
    noseGeo.scale(1.25, 0.8, 0.9);
    const noseMesh = new THREE.Mesh(noseGeo, pinkNoseMat);
    noseMesh.position.set(0, 0.085, 0.12);
    muzzleGroup.add(noseMesh);

    // --- ARTICULATED MOUTH / JAW (Synced with speech & mouthState) ---
    const jawGroup = new THREE.Group();
    jawGroup.position.set(0, -0.05, 0.02);
    muzzleGroup.add(jawGroup);

    // Lower chin cream puff
    const chinGeo = new THREE.SphereGeometry(0.11, 16, 12);
    chinGeo.scale(1.15, 0.7, 0.75);
    const chinMesh = new THREE.Mesh(chinGeo, creamFurMat);
    chinMesh.position.set(0, -0.04, 0.01);
    jawGroup.add(chinMesh);

    // Mouth cavity & cute pink tongue (scales vertically when mouth opens)
    const mouthCavityGroup = new THREE.Group();
    mouthCavityGroup.position.set(0, -0.035, 0.095);
    muzzleGroup.add(mouthCavityGroup);

    const cavityGeo = new THREE.SphereGeometry(0.085, 18, 14);
    cavityGeo.scale(1.15, 0.85, 0.45);
    const cavityMesh = new THREE.Mesh(cavityGeo, mouthInsideMat);
    mouthCavityGroup.add(cavityMesh);

    const tongueGeo = new THREE.SphereGeometry(0.058, 14, 12);
    tongueGeo.scale(1.1, 0.65, 0.55);
    const tongueMesh = new THREE.Mesh(tongueGeo, tongueMat);
    tongueMesh.position.set(0, -0.025, 0.02);
    mouthCavityGroup.add(tongueMesh);

    // --- EYES, PUPILS, SHINE & EYEBROWS ---
    function createEye(side: -1 | 1) {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(side * 0.21, 0.08, 0.44);
      eyeGroup.rotation.y = side * 0.18;

      const scleraGeo = new THREE.SphereGeometry(0.095, 20, 18);
      scleraGeo.scale(0.95, 1.08, 0.55);
      const scleraMesh = new THREE.Mesh(scleraGeo, eyeWhiteMat);
      eyeGroup.add(scleraMesh);

      const pupilGroup = new THREE.Group();
      pupilGroup.position.set(0, 0, 0.032);
      eyeGroup.add(pupilGroup);

      const pupilGeo = new THREE.SphereGeometry(0.068, 18, 16);
      pupilGeo.scale(0.92, 1.05, 0.45);
      const pupilMesh = new THREE.Mesh(pupilGeo, pupilMat);
      pupilGroup.add(pupilMesh);

      // Glossy catchlight highlight
      const shineGeo = new THREE.SphereGeometry(0.022, 10, 10);
      const shineMesh = new THREE.Mesh(shineGeo, eyeWhiteMat);
      shineMesh.position.set(0.022, 0.028, 0.026);
      pupilGroup.add(shineMesh);

      // Secondary tiny catchlight
      const shineSmallGeo = new THREE.SphereGeometry(0.011, 8, 8);
      const shineSmallMesh = new THREE.Mesh(shineSmallGeo, eyeWhiteMat);
      shineSmallMesh.position.set(-0.02, -0.022, 0.025);
      pupilGroup.add(shineSmallMesh);

      // Expressive Eyebrow
      const browGeo = new THREE.CapsuleGeometry(0.018, 0.11, 8, 12);
      const browMesh = new THREE.Mesh(browGeo, stripeDarkMat);
      browMesh.rotation.z = Math.PI / 2 + side * -0.12;
      browMesh.position.set(0, 0.135, 0.02);
      eyeGroup.add(browMesh);

      return { eyeGroup, pupilGroup, browMesh };
    }

    const leftEye = createEye(-1);
    const rightEye = createEye(1);
    headGroup.add(leftEye.eyeGroup);
    headGroup.add(rightEye.eyeGroup);

    // --- FLOATING 3D CELEBRATION / INTERACTION SPARKLE STARS ---
    const sparklesGroup = new THREE.Group();
    sparklesGroup.position.set(0, 1.5, 0);
    annaRoot.add(sparklesGroup);

    const sparkleMeshes: THREE.Mesh[] = [];
    const starGeo = new THREE.OctahedronGeometry(0.055, 0);
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(
        starGeo,
        i % 2 === 0 ? goldBadgeMat : vestPurpleMat
      );
      const angle = (i / 6) * Math.PI * 2;
      m.position.set(Math.cos(angle) * 0.68, (i % 3) * 0.14, Math.sin(angle) * 0.45);
      m.scale.setScalar(0);
      sparklesGroup.add(m);
      sparkleMeshes.push(m);
    }

    // Pre-compile shaders on hardware GPUs
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // =========================================================================
    // 8. RAYCASTING INTERACTION (Tap Head = Ear Perk/Happy, Tap Body = Wave)
    // =========================================================================
    const raycaster = new THREE.Raycaster();
    let downX = 0;
    let downY = 0;
    let downTime = 0;

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
      downTime = performance.now();
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointerNdcRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdcRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      const elapsed = performance.now() - downTime;
      // Treat as a click/tap if pointer moved < 8px and < 400ms
      if (dist > 8 || elapsed > 400) return;

      const rect = renderer.domElement.getBoundingClientRect();
      _rayMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _rayMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(_rayMouse, camera);
      const hits = raycaster.intersectObjects(interactiveMeshes, false);
      if (hits.length > 0) {
        const part = hits[0].object.userData?.part;
        if (part === 'head') {
          triggerAction('jump', 'Anna purrs! "Namaskara guru!"');
        } else {
          triggerAction('wave', 'Anna waves! "Banni matanadona!"');
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // =========================================================================
    // 9. RESIZE OBSERVER
    // =========================================================================
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 480;
      const h = container.clientHeight || 260;
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // =========================================================================
    // 10. ANIMATION LOOP (With Software-WebGL fenceSync guard & smooth damping)
    // =========================================================================
    const clock = new THREE.Clock();
    let frameId = 0;
    let isDisposed = false;

    // Animated scalar states
    let jawOpenAmount = 0;
    let jumpOffsetY = 0;
    let spinAngleY = 0;
    let blinkTimer = 0;
    let nextBlinkAt = 2.6;

    function afterDraw(cb: () => void) {
      if (isDisposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (isDisposed) return;
        const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (isDisposed) return;

      const dt = Math.min(clock.getDelta(), 0.1);
      const t = clock.getElapsedTime();
      const currentState = stateRef.current;
      const currentMouth = mouthStateRef.current;
      const reducedMotion = reducedMotionRef.current;

      // 1. Camera preset transition damping
      if (cameraPresetTargetRef.current.active) {
        _targetCamPos.copy(cameraPresetTargetRef.current.pos);
        _targetLookAt.copy(cameraPresetTargetRef.current.lookAt);
        camera.position.lerp(_targetCamPos, 1 - Math.exp(-7 * dt));
        controls.target.lerp(_targetLookAt, 1 - Math.exp(-7 * dt));
        if (
          camera.position.distanceTo(_targetCamPos) < 0.015 &&
          controls.target.distanceTo(_targetLookAt) < 0.015
        ) {
          cameraPresetTargetRef.current.active = false;
        }
      }

      controls.autoRotate = !isSoftwareGl && autoRotateRef.current;
      controls.autoRotateSpeed = 1.8;
      controls.update();

      // 2. Evaluate one-shot interactive action (wave, jump, spin, namaskara)
      const act = actionRef.current;
      const actElapsed = performance.now() * 0.001 - act.startTime;
      const isActionActive = act.type !== 'none' && actElapsed < 1.65;
      if (act.type !== 'none' && actElapsed >= 1.65) {
        actionRef.current.type = 'none';
        setActiveAction('none');
      }

      // 3. Grounded Breathing & Jump Offset (Base is ALWAYS y = 0.0 on the stage!)
      let targetJumpY = 0;
      if (isActionActive && act.type === 'jump' && !reducedMotion) {
        // Double happy hop that lands solidly back at y = 0.0
        targetJumpY = Math.max(0, Math.sin(actElapsed * Math.PI * 2.4)) * 0.26;
      }
      jumpOffsetY = THREE.MathUtils.damp(jumpOffsetY, targetJumpY, 14, dt);
      annaRoot.position.y = jumpOffsetY;

      // Scale contact shadow naturally as Anna jumps so he always feels physically grounded
      const shadowScale = THREE.MathUtils.clamp(1 - jumpOffsetY * 0.85, 0.65, 1);
      contactShadowMesh.scale.set(shadowScale, shadowScale, 1);
      shadowPlaneMat.opacity = 0.9 * shadowScale;

      // 4. Spin action
      if (isActionActive && act.type === 'spin' && !reducedMotion) {
        const progress = Math.min(1, actElapsed / 1.1);
        const eased = 1 - Math.pow(1 - progress, 3);
        spinAngleY = eased * Math.PI * 2;
      } else {
        spinAngleY = THREE.MathUtils.damp(spinAngleY, 0, 10, dt);
      }
      annaRoot.rotation.y = spinAngleY;

      // 5. Subtle Torso Breathing (feet stay planted at y=0, only upper body breathes)
      const breathWave = reducedMotion ? 0 : Math.sin(t * 2.6) * 0.015;
      bodyGroup.position.y = 0.76 + breathWave;
      const swayZ =
        reducedMotion
          ? 0
          : currentState === 'speaking'
          ? Math.sin(t * 6.5) * 0.035
          : currentState === 'thinking'
          ? Math.sin(t * 2.2) * 0.045
          : Math.sin(t * 1.6) * 0.015;
      bodyGroup.rotation.z = THREE.MathUtils.damp(bodyGroup.rotation.z, swayZ, 8, dt);

      // 6. Pointer-Tracking Head + State Tilt
      const ptrX = pointerNdcRef.current.x;
      const ptrY = pointerNdcRef.current.y;
      let targetHeadY = ptrX * 0.28;
      let targetHeadX = -ptrY * 0.16;
      let targetHeadZ = 0;

      if (currentState === 'listening') {
        targetHeadZ = 0.12;
        targetHeadY += 0.12;
      } else if (currentState === 'thinking') {
        targetHeadZ = -0.14;
        targetHeadX = -0.12;
      } else if (currentState === 'speaking' && !reducedMotion) {
        targetHeadX += Math.sin(t * 9.0) * 0.045;
        targetHeadY += Math.cos(t * 4.5) * 0.05;
      }

      headGroup.rotation.y = THREE.MathUtils.damp(
        headGroup.rotation.y,
        targetHeadY,
        8,
        dt
      );
      headGroup.rotation.x = THREE.MathUtils.damp(
        headGroup.rotation.x,
        targetHeadX,
        8,
        dt
      );
      headGroup.rotation.z = THREE.MathUtils.damp(
        headGroup.rotation.z,
        targetHeadZ,
        8,
        dt
      );

      // 7. Ear Twitches
      const earTwitch =
        currentState === 'listening'
          ? Math.sin(t * 8) * 0.08
          : isActionActive
          ? Math.sin(t * 14) * 0.1
          : Math.sin(t * 2.1) * 0.025;
      leftEar.rotation.z = 0.42 + earTwitch;
      rightEar.rotation.z = -0.42 - earTwitch;

      // 8. Articulated Arm Poses (Wave, Namaskara, Speaking gestures, Listening, Thinking)
      let targetLeftArmX = 0;
      let targetLeftArmZ = -0.15;
      let targetRightArmX = 0;
      let targetRightArmZ = 0.15;

      if (isActionActive && act.type === 'wave') {
        targetRightArmZ = -2.35 + Math.sin(t * 16) * 0.28;
        targetRightArmX = -0.35;
      } else if (isActionActive && act.type === 'namaskara') {
        targetLeftArmX = -0.85;
        targetLeftArmZ = 0.55;
        targetRightArmX = -0.85;
        targetRightArmZ = -0.55;
      } else if (
        isActionActive &&
        (act.type === 'jump' || act.type === 'spin')
      ) {
        targetLeftArmZ = 2.1;
        targetRightArmZ = -2.1;
      } else if (currentState === 'speaking') {
        targetRightArmX = -0.55 + Math.sin(t * 7.5) * 0.22;
        targetRightArmZ = -0.45 + Math.cos(t * 7.5) * 0.15;
        targetLeftArmX = -0.35 + Math.cos(t * 6.5) * 0.18;
      } else if (currentState === 'listening') {
        targetRightArmX = -1.15;
        targetRightArmZ = -0.75;
      } else if (currentState === 'thinking') {
        targetRightArmX = -1.05;
        targetRightArmZ = 0.32;
      } else if (currentState === 'celebrate') {
        targetLeftArmZ = 2.0 + Math.sin(t * 10) * 0.2;
        targetRightArmZ = -2.0 - Math.sin(t * 10) * 0.2;
      }

      leftArm.rotation.x = THREE.MathUtils.damp(
        leftArm.rotation.x,
        targetLeftArmX,
        10,
        dt
      );
      leftArm.rotation.z = THREE.MathUtils.damp(
        leftArm.rotation.z,
        targetLeftArmZ,
        10,
        dt
      );
      rightArm.rotation.x = THREE.MathUtils.damp(
        rightArm.rotation.x,
        targetRightArmX,
        10,
        dt
      );
      rightArm.rotation.z = THREE.MathUtils.damp(
        rightArm.rotation.z,
        targetRightArmZ,
        10,
        dt
      );

      // 9. Expressive Tail Wag
      const tailSpeed =
        isActionActive || currentState === 'speaking' || currentState === 'celebrate'
          ? 7.5
          : 2.8;
      const tailAmp = reducedMotion ? 0.05 : isActionActive ? 0.35 : 0.18;
      tailPivot.rotation.y = Math.sin(t * tailSpeed) * tailAmp;

      // 10. Real-Time 3D Lip-Sync Jaw & Mouth Cavity
      let targetMouthOpen = 0.08;
      if (currentState === 'speaking') {
        if (currentMouth === 'open') {
          targetMouthOpen = 1.0;
        } else if (currentMouth === 'half') {
          targetMouthOpen = 0.55;
        } else {
          targetMouthOpen = 0.18;
        }
      } else if (
        currentState === 'happy' ||
        currentState === 'celebrate' ||
        isActionActive
      ) {
        targetMouthOpen = 0.65;
      } else {
        targetMouthOpen = 0.08;
      }

      jawOpenAmount = THREE.MathUtils.damp(
        jawOpenAmount,
        targetMouthOpen,
        18,
        dt
      );
      jawGroup.position.y = -0.05 - jawOpenAmount * 0.055;
      mouthCavityGroup.scale.set(
        0.85 + jawOpenAmount * 0.35,
        Math.max(0.18, jawOpenAmount * 1.15),
        1
      );

      // 11. Natural Eye Blinking & Pupil Tracking
      blinkTimer += dt;
      let eyeScaleY = 1.08;
      if (blinkTimer >= nextBlinkAt) {
        const blinkPhase = (blinkTimer - nextBlinkAt) / 0.15;
        if (blinkPhase < 1) {
          eyeScaleY = Math.max(0.1, Math.abs(Math.cos(blinkPhase * Math.PI)));
        } else {
          blinkTimer = 0;
          nextBlinkAt = 2.4 + Math.random() * 2.5;
        }
      }
      leftEye.eyeGroup.scale.y = eyeScaleY;
      rightEye.eyeGroup.scale.y = eyeScaleY;

      leftEye.pupilGroup.position.x = THREE.MathUtils.clamp(ptrX * 0.018, -0.02, 0.02);
      leftEye.pupilGroup.position.y = THREE.MathUtils.clamp(ptrY * 0.018, -0.02, 0.02);
      rightEye.pupilGroup.position.x = leftEye.pupilGroup.position.x;
      rightEye.pupilGroup.position.y = leftEye.pupilGroup.position.y;

      // 12. Floating Sparkles when celebrating or interacting
      const showSparkles =
        isActionActive ||
        currentState === 'celebrate' ||
        currentState === 'speaking';
      sparklesGroup.rotation.y = t * 1.4;
      for (let i = 0; i < sparkleMeshes.length; i++) {
        const mesh = sparkleMeshes[i];
        const targetScale = showSparkles
          ? 0.75 + Math.sin(t * 5 + i) * 0.25
          : 0;
        const nextScale = THREE.MathUtils.damp(
          mesh.scale.x,
          targetScale,
          10,
          dt
        );
        mesh.scale.setScalar(nextScale);
        mesh.position.y =
          0.12 + (i % 3) * 0.14 + Math.sin(t * 3.5 + i) * 0.06;
        mesh.rotation.x = t * 2;
        mesh.rotation.z = t * 1.5;
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlsStart);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
      tigerFurTex.dispose();
      contactShadowTex.dispose();
      envTarget.dispose();
      renderer.dispose();
    };
  }, [triggerAction]);

  return (
    <div className="relative w-full h-[252px] sm:h-[296px] flex flex-col items-center justify-between select-none overflow-hidden rounded-2xl bg-gradient-to-b from-[#ebe6ff] via-[#f4f2fc] to-[#e8e4f8] border border-outline-variant/60">
      {/* Top-Left Minimal 3D Interactive Hint Pill */}
      <div className="relative z-10 w-full px-3 pt-2 flex items-center justify-between gap-2 pointer-events-none">
        <span className="px-2.5 py-1 rounded-full bg-surface-container-lowest border border-outline-variant/80 text-[10px] font-mono-accent font-semibold text-on-surface-variant shadow-2xs">
          3D INTERACTIVE · DRAG TO ROTATE · TAP ANNA
        </span>

        {interactionToast && (
          <span className="px-2.5 py-1 rounded-full bg-primary-container text-on-primary text-[10px] font-mono-accent font-semibold shadow-xs">
            {interactionToast}
          </span>
        )}
      </div>

      {/* Dedicated Isolated WebGL Canvas Mount Container */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
        aria-label="Interactive 3D Anna tiger buddy — drag to rotate 360 degrees or tap to interact"
      />

      {/* Unified Bottom Interactive Control Dock (Solid surface, no backdrop-filter over WebGL) */}
      <div className="relative z-10 mb-2 px-2.5 py-1.5 rounded-full bg-surface-container-lowest border border-outline-variant shadow-sm flex items-center gap-1 sm:gap-1.5 max-w-[96%] overflow-x-auto">
        <button
          type="button"
          onClick={() => triggerAction('wave', 'Anna waves! "Namaskara guru!"')}
          className={`px-2.5 py-1 rounded-full text-[11px] font-mono-accent font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
            activeAction === 'wave'
              ? 'bg-primary-container text-on-primary'
              : 'bg-surface-container-low text-on-surface hover:bg-primary-fixed'
          }`}
          title="Make Anna wave"
        >
          <Hand className="w-3 h-3" />
          <span>Wave</span>
        </button>

        <button
          type="button"
          onClick={() => triggerAction('jump', 'Anna jumps with joy! "Sakkath!"')}
          className={`px-2.5 py-1 rounded-full text-[11px] font-mono-accent font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
            activeAction === 'jump'
              ? 'bg-primary-container text-on-primary'
              : 'bg-surface-container-low text-on-surface hover:bg-primary-fixed'
          }`}
          title="Make Anna jump"
        >
          <Sparkles className="w-3 h-3" />
          <span>Jump</span>
        </button>

        <button
          type="button"
          onClick={() => triggerAction('spin', '360° Bengaluru Tiger Spin!')}
          className={`px-2.5 py-1 rounded-full text-[11px] font-mono-accent font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
            activeAction === 'spin'
              ? 'bg-primary-container text-on-primary'
              : 'bg-surface-container-low text-on-surface hover:bg-primary-fixed'
          }`}
          title="Spin Anna 360 degrees"
        >
          <Compass className="w-3 h-3" />
          <span>Spin</span>
        </button>

        <button
          type="button"
          onClick={() =>
            triggerAction('namaskara', 'Anna folds paws: "Namaskara saar!"')
          }
          className={`px-2.5 py-1 rounded-full text-[11px] font-mono-accent font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
            activeAction === 'namaskara'
              ? 'bg-primary-container text-on-primary'
              : 'bg-surface-container-low text-on-surface hover:bg-primary-fixed'
          }`}
          title="Namaskara greeting pose"
        >
          <span>Namaskara</span>
        </button>

        <span className="h-3.5 w-[1px] bg-outline-variant mx-0.5 shrink-0" />

        <button
          type="button"
          onClick={() =>
            applyCameraPreset(
              cameraPreset === 'front'
                ? 'angle'
                : cameraPreset === 'angle'
                ? 'closeup'
                : 'front'
            )
          }
          className="px-2.5 py-1 rounded-full bg-surface-container-low hover:bg-primary-fixed text-[11px] font-mono-accent font-semibold text-on-surface inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
          title="Cycle camera angle (Front / Side Angle / Closeup)"
        >
          <Eye className="w-3 h-3 text-primary" />
          <span className="capitalize">{cameraPreset}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setAutoRotate((prev) => !prev);
            playTactileTone('tap');
          }}
          className={`px-2.5 py-1 rounded-full text-[11px] font-mono-accent font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
            autoRotate
              ? 'bg-primary-container text-on-primary'
              : 'bg-surface-container-low text-on-surface hover:bg-primary-fixed'
          }`}
          title="Toggle turntable auto-rotation"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Turn</span>
        </button>
      </div>
    </div>
  );
};

export default Anna3DAvatar;
