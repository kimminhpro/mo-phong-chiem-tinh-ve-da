"use client";

import { useEffect, useRef, useState } from "react";
import {
  getNakshatra,
  getMoonPhase,
  NAKSHATRAS,
  RASHIS,
  ROMAN_HOUSES,
  type Graha,
} from "./astro";

type ThreeSkyProps = {
  grahas: Graha[];
  lagnaLongitude: number;
  selected: string;
  showLabels: boolean;
  showNakshatras: boolean;
  onSelect: (id: string) => void;
  onUnavailable: () => void;
};

type PlanetNode = {
  group: import("three").Group;
  marker: import("three").Object3D;
  pickTarget: import("three").Object3D;
  label: import("three").Sprite;
  halo: import("three").Mesh;
  latitudeGuide: import("three").Line;
  moonMaterial?: import("three").MeshStandardMaterial;
};

type MoonOrbitLayer = {
  orbit: import("three").LineLoop;
  segments: number;
};

type CoordinateLayers = {
  rashiHighlights: import("three").Mesh[];
  rashiLabels: import("three").Sprite[];
  nakshatraHighlights: import("three").Mesh[];
  padaHighlights: import("three").Mesh[];
  nakshatraLabels: import("three").Sprite[];
  nakshatraRingLabels: import("three").Sprite[];
  padaGroup: import("three").Group;
  houseHighlights: import("three").Mesh[];
  houseLabels: import("three").Sprite[];
  selectionRay: import("three").Line;
};

const LOG_DISTANCE_MIN = -3;
const LOG_DISTANCE_MAX = 1.2;
const SCENE_RADIUS_MIN = 1.35;
const SCENE_RADIUS_MAX = 4.72;
const HOUSE_RING_INNER = 5.1;
const HOUSE_RING_OUTER = 5.72;
const RASHI_RING_INNER = 5.72;
const RASHI_RING_OUTER = 6.4;
const NAKSHATRA_RING_INNER = 6.4;
const NAKSHATRA_RING_OUTER = 6.8;
const PADA_RING_INNER = 6.8;
const PADA_RING_OUTER = 7.04;
const BODY_VISUAL_SIZE: Record<string, number> = {
  sun: 0.31,
  moon: 0.22,
  mars: 0.21,
  mercury: 0.18,
  jupiter: 0.3,
  venus: 0.22,
  saturn: 0.25,
};

const distanceToRadius = (distance: number) => {
  const safeDistance = Math.max(10 ** LOG_DISTANCE_MIN, distance);
  const value = Math.log10(safeDistance);
  const progress = Math.min(
    1,
    Math.max(
      0,
      (value - LOG_DISTANCE_MIN) / (LOG_DISTANCE_MAX - LOG_DISTANCE_MIN),
    ),
  );
  return (
    SCENE_RADIUS_MIN + progress * (SCENE_RADIUS_MAX - SCENE_RADIUS_MIN)
  );
};

export function ThreeSky({
  grahas,
  lagnaLongitude,
  selected,
  showLabels,
  showNakshatras,
  onSelect,
  onUnavailable,
}: ThreeSkyProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const planetNodesRef = useRef(new Map<string, PlanetNode>());
  const nakshatraGroupRef = useRef<import("three").Group | null>(null);
  const coordinateLayersRef = useRef<CoordinateLayers | null>(null);
  const moonOrbitRef = useRef<MoonOrbitLayer | null>(null);
  const onSelectRef = useRef(onSelect);
  const onUnavailableRef = useRef(onUnavailable);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onUnavailableRef.current = onUnavailable;
  }, [onUnavailable]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const planetNodes = planetNodesRef.current;

    let disposed = false;
    let animationFrame = 0;
    let resizeObserver: ResizeObserver | null = null;
    let cleanupControls = () => {};

    const initialise = async () => {
      try {
        const THREE = await import("three");
        const { OrbitControls } = await import(
          "three/examples/jsm/controls/OrbitControls.js"
        );
        if (disposed || !mountRef.current) return;

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x07101c, 0.038);

        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
        camera.position.set(0, 9.8, 13.2);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        });
        renderer.setClearColor(0x06101c, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.domElement.className = "three-canvas";
        renderer.domElement.setAttribute("aria-hidden", "true");
        mount.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.07;
        controls.enablePan = false;
        controls.minDistance = 8;
        controls.maxDistance = 24;
        controls.minPolarAngle = 0.28;
        controls.maxPolarAngle = Math.PI / 2.08;
        cleanupControls = () => controls.dispose();
        const applyDefaultView = (aspect = camera.aspect) => {
          let targetX = 0;
          const shortLandscape =
            window.innerHeight <= 600 && aspect > 1.7;
          if (aspect < 1.05) {
            camera.position.set(0, 21.5, 18.5);
          } else if (shortLandscape) {
            targetX = 1.35;
            camera.position.set(targetX, 7.8, 11.8);
          } else {
            camera.position.set(0, 10.5, 14.6);
          }
          controls.target.set(targetX, 0, 0);
          controls.update();
        };

        scene.add(new THREE.AmbientLight(0xc9e7ff, 1.25));
        const keyLight = new THREE.PointLight(0xffd59a, 24, 32);
        keyLight.position.set(-2, 7, 5);
        scene.add(keyLight);

        const ecliptic = new THREE.Group();
        scene.add(ecliptic);

        const surfaceTexture = (id: string) => {
          const canvas = document.createElement("canvas");
          canvas.width = 768;
          canvas.height = 384;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Canvas 2D unavailable");

          let seed = [...id].reduce(
            (value, character) => value + character.charCodeAt(0),
            41,
          );
          const random = () => {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 4294967296;
          };
          const fill = (color: string) => {
            context.fillStyle = color;
            context.fillRect(0, 0, canvas.width, canvas.height);
          };
          const noise = (
            colors: string[],
            count: number,
            maxRadius: number,
            opacity: number,
          ) => {
            context.globalAlpha = opacity;
            for (let index = 0; index < count; index += 1) {
              context.fillStyle =
                colors[Math.floor(random() * colors.length)] ?? colors[0];
              const radius = 0.4 + random() * maxRadius;
              context.beginPath();
              context.arc(
                random() * canvas.width,
                random() * canvas.height,
                radius,
                0,
                Math.PI * 2,
              );
              context.fill();
            }
            context.globalAlpha = 1;
          };
          const band = (
            y: number,
            height: number,
            color: string,
            alpha = 1,
          ) => {
            context.globalAlpha = alpha;
            context.fillStyle = color;
            context.fillRect(0, y, canvas.width, height);
            context.globalAlpha = 1;
          };
          const polygon = (
            points: Array<[number, number]>,
            color: string,
          ) => {
            context.fillStyle = color;
            context.beginPath();
            points.forEach(([x, y], index) => {
              const px = x * canvas.width;
              const py = y * canvas.height;
              if (index === 0) context.moveTo(px, py);
              else context.lineTo(px, py);
            });
            context.closePath();
            context.fill();
          };

          if (id === "earth") {
            fill("#143f78");
            const ocean = context.createLinearGradient(0, 0, 0, canvas.height);
            ocean.addColorStop(0, "rgba(56, 114, 160, .8)");
            ocean.addColorStop(0.5, "rgba(8, 51, 104, .15)");
            ocean.addColorStop(1, "rgba(42, 92, 141, .75)");
            context.fillStyle = ocean;
            context.fillRect(0, 0, canvas.width, canvas.height);
            polygon(
              [
                [0.08, 0.23],
                [0.2, 0.17],
                [0.29, 0.25],
                [0.25, 0.36],
                [0.31, 0.46],
                [0.27, 0.67],
                [0.18, 0.78],
                [0.15, 0.58],
                [0.09, 0.48],
              ],
              "#6f8750",
            );
            polygon(
              [
                [0.48, 0.19],
                [0.64, 0.14],
                [0.78, 0.25],
                [0.87, 0.38],
                [0.79, 0.53],
                [0.68, 0.49],
                [0.61, 0.63],
                [0.53, 0.55],
                [0.46, 0.4],
              ],
              "#8e9a5f",
            );
            polygon(
              [
                [0.8, 0.65],
                [0.9, 0.68],
                [0.94, 0.78],
                [0.86, 0.83],
                [0.78, 0.76],
              ],
              "#a79164",
            );
            band(0, 25, "rgba(233, 241, 239, .8)");
            band(canvas.height - 22, 22, "rgba(233, 241, 239, .82)");
            context.strokeStyle = "rgba(255,255,255,.48)";
            context.lineWidth = 8;
            for (let index = 0; index < 14; index += 1) {
              const y = 30 + random() * (canvas.height - 60);
              context.beginPath();
              context.moveTo(random() * 100, y);
              context.bezierCurveTo(
                220,
                y - 24 + random() * 48,
                500,
                y + 24 - random() * 48,
                660 + random() * 108,
                y,
              );
              context.stroke();
            }
            noise(["#d8e5ef", "#70a4c5"], 1000, 2.2, 0.18);
          } else if (id === "sun") {
            fill("#d7660a");
            noise(["#ffcf49", "#ff9c1a", "#9f2f08"], 9000, 3.2, 0.34);
            for (let index = 0; index < 26; index += 1) {
              const y = random() * canvas.height;
              band(y, 1 + random() * 4, "#ffbd32", 0.16 + random() * 0.18);
            }
          } else if (id === "moon" || id === "mercury") {
            fill(id === "moon" ? "#8d9496" : "#77736d");
            noise(
              id === "moon"
                ? ["#b9bec0", "#666c6f", "#989ea0"]
                : ["#a39d93", "#4f4b47", "#858078"],
              5200,
              2.8,
              0.3,
            );
            for (let index = 0; index < 115; index += 1) {
              const radius = 2 + random() * 14;
              context.fillStyle =
                id === "moon"
                  ? "rgba(60,66,69,.22)"
                  : "rgba(39,36,34,.24)";
              context.strokeStyle = "rgba(230,230,220,.14)";
              context.lineWidth = Math.max(1, radius * 0.16);
              context.beginPath();
              context.ellipse(
                random() * canvas.width,
                random() * canvas.height,
                radius,
                radius * (0.65 + random() * 0.35),
                0,
                0,
                Math.PI * 2,
              );
              context.fill();
              context.stroke();
            }
          } else if (id === "venus") {
            fill("#b96e24");
            for (let index = 0; index < 34; index += 1) {
              const y = index * 12 + random() * 8;
              band(
                y,
                5 + random() * 12,
                index % 3 === 0 ? "#e8ad4f" : "#c98734",
                0.45,
              );
            }
            noise(["#f2c66e", "#8f4c1f", "#dc9339"], 4200, 4.4, 0.22);
          } else if (id === "mars") {
            fill("#a74728");
            noise(["#d06a3f", "#7a2d1e", "#b65331"], 5600, 3.4, 0.3);
            for (let index = 0; index < 22; index += 1) {
              context.fillStyle = "rgba(62, 31, 25, .28)";
              context.beginPath();
              context.ellipse(
                random() * canvas.width,
                35 + random() * (canvas.height - 70),
                18 + random() * 62,
                7 + random() * 24,
                random() * Math.PI,
                0,
                Math.PI * 2,
              );
              context.fill();
            }
            band(0, 13, "rgba(236, 220, 196, .9)");
          } else if (id === "jupiter") {
            fill("#bfa27f");
            const stripes = [
              ["#e6d6bc", 28],
              ["#a96c4a", 18],
              ["#d8b990", 34],
              ["#7d4f3d", 13],
              ["#e7d7bd", 30],
              ["#b77955", 24],
            ] as const;
            let y = 0;
            while (y < canvas.height) {
              const [color, height] = stripes[
                Math.floor(random() * stripes.length)
              ] ?? ["#c7a987", 24];
              band(y, height, color, 0.92);
              y += height;
            }
            noise(["#f0dfc5", "#774332", "#ca9470"], 4800, 2.6, 0.16);
            context.fillStyle = "rgba(151, 57, 37, .82)";
            context.beginPath();
            context.ellipse(568, 255, 58, 22, -0.08, 0, Math.PI * 2);
            context.fill();
            context.strokeStyle = "rgba(241, 198, 161, .65)";
            context.lineWidth = 7;
            context.stroke();
          } else if (id === "saturn") {
            fill("#d8c493");
            for (let index = 0; index < 25; index += 1) {
              band(
                index * 16,
                7 + random() * 10,
                index % 2 === 0 ? "#eadbb4" : "#b79b6d",
                0.38,
              );
            }
            noise(["#f1e5c2", "#9d835d"], 2400, 2.2, 0.14);
          } else {
            fill("#929ba0");
            noise(["#c3c8ca", "#646b70"], 2800, 2.4, 0.2);
          }

          const texture = new THREE.CanvasTexture(canvas);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.wrapS = THREE.RepeatWrapping;
          texture.anisotropy = Math.min(
            8,
            renderer.capabilities.getMaxAnisotropy(),
          );
          return texture;
        };

        const createCoordinateLabel = (
          title: string,
          subtitle: string,
          {
            color = "#e6b568",
            width = 512,
            scaleX = 1.5,
            scaleY = 0.48,
            compact = false,
            framed = true,
          }: {
            color?: string;
            width?: number;
            scaleX?: number;
            scaleY?: number;
            compact?: boolean;
            framed?: boolean;
          } = {},
        ) => {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = compact ? 128 : 176;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Canvas 2D unavailable");
          context.clearRect(0, 0, canvas.width, canvas.height);
          if (!compact && framed) {
            context.fillStyle = "rgba(4, 15, 24, 0.72)";
            context.beginPath();
            context.roundRect(8, 10, canvas.width - 16, canvas.height - 20, 22);
            context.fill();
            context.strokeStyle = `${color}72`;
            context.lineWidth = 2;
            context.stroke();
          }
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.fillStyle = color;
          context.font = compact
            ? "600 50px system-ui, sans-serif"
            : "600 48px Georgia, serif";
          context.fillText(title, canvas.width / 2, compact ? 64 : 67);
          if (subtitle) {
            context.fillStyle = "rgba(220, 231, 232, .78)";
            context.font = "600 27px system-ui, sans-serif";
            context.fillText(subtitle, canvas.width / 2, 119);
          }
          const texture = new THREE.CanvasTexture(canvas);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: texture,
              transparent: true,
              depthTest: false,
            }),
          );
          sprite.scale.set(scaleX, scaleY, 1);
          sprite.renderOrder = 12;
          return sprite;
        };

        const makeSector = (
          index: number,
          count: number,
          inner: number,
          outer: number,
          material: import("three").Material,
          gap = 0.008,
          y = 0,
        ) => {
          const step = (Math.PI * 2) / count;
          const geometry = new THREE.RingGeometry(
            inner,
            outer,
            Math.max(8, Math.ceil(72 / count)),
            1,
            Math.PI / 2 - (index + 1) * step + gap / 2,
            step - gap,
          );
          const mesh = new THREE.Mesh(geometry, material);
          mesh.rotation.x = -Math.PI / 2;
          mesh.position.y = y;
          return mesh;
        };

        const pointAtLongitude = (
          longitude: number,
          radius: number,
          y = 0,
        ) => {
          const angle = (longitude * Math.PI) / 180;
          return new THREE.Vector3(
            Math.sin(angle) * radius,
            y,
            -Math.cos(angle) * radius,
          );
        };

        const baseDisc = new THREE.Mesh(
          new THREE.CircleGeometry(HOUSE_RING_INNER - 0.06, 128),
          new THREE.MeshBasicMaterial({
            color: 0x071827,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
          }),
        );
        baseDisc.rotation.x = -Math.PI / 2;
        baseDisc.position.y = -0.08;
        ecliptic.add(baseDisc);

        const rashiHighlights: import("three").Mesh[] = [];
        const rashiLabels: import("three").Sprite[] = [];
        const rashiHighlightMaterial = new THREE.MeshBasicMaterial({
          color: 0xf2b450,
          transparent: true,
          opacity: 0.42,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const rashiBoundaryPoints: import("three").Vector3[] = [];

        RASHIS.forEach(([sanskrit, , symbol], index) => {
          const sector = makeSector(
            index,
            12,
            RASHI_RING_INNER,
            RASHI_RING_OUTER,
            new THREE.MeshBasicMaterial({
              color: index % 2 === 0 ? 0x132f43 : 0x0c2436,
              transparent: true,
              opacity: 0.9,
              side: THREE.DoubleSide,
            }),
            0.012,
            -0.02,
          );
          ecliptic.add(sector);

          const highlight = makeSector(
            index,
            12,
            RASHI_RING_INNER - 0.02,
            RASHI_RING_OUTER + 0.02,
            rashiHighlightMaterial,
            0.02,
            0.012,
          );
          highlight.visible = false;
          highlight.renderOrder = 3;
          rashiHighlights.push(highlight);
          ecliptic.add(highlight);

          const start = pointAtLongitude(index * 30, RASHI_RING_INNER, 0.004);
          const end = pointAtLongitude(index * 30, RASHI_RING_OUTER, 0.004);
          rashiBoundaryPoints.push(start, end);

          const midpoint = index * 30 + 15;
          const label = createCoordinateLabel(symbol, "", {
            width: 128,
            scaleX: 0.54,
            scaleY: 0.54,
            compact: true,
            color: "#e8c27d",
            framed: false,
          });
          label.position.copy(
            pointAtLongitude(
              midpoint,
              (RASHI_RING_INNER + RASHI_RING_OUTER) / 2,
              0.18,
            ),
          );
          label.userData.rashiName = sanskrit;
          rashiLabels.push(label);
          ecliptic.add(label);
        });

        ecliptic.add(
          new THREE.LineSegments(
            new THREE.BufferGeometry().setFromPoints(rashiBoundaryPoints),
            new THREE.LineBasicMaterial({
              color: 0xa7bfd0,
              transparent: true,
              opacity: 0.42,
            }),
          ),
        );

        const makeCircle = (
          radius: number,
          color: number,
          opacity: number,
          y = 0,
        ) => {
          const points = Array.from({ length: 129 }, (_, index) => {
            const angle = (index / 128) * Math.PI * 2;
            return new THREE.Vector3(
              Math.sin(angle) * radius,
              y,
              -Math.cos(angle) * radius,
            );
          });
          return new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(points),
            new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
          );
        };

        [0.01, 0.1, 1, 10].forEach((distance) =>
          ecliptic.add(
            makeCircle(distanceToRadius(distance), 0x6d8ca2, 0.28),
          ),
        );
        ecliptic.add(makeCircle(HOUSE_RING_INNER, 0x65d4c7, 0.52));
        ecliptic.add(makeCircle(HOUSE_RING_OUTER, 0x65d4c7, 0.62));
        ecliptic.add(makeCircle(RASHI_RING_OUTER, 0xd3a95d, 0.64));
        ecliptic.add(makeCircle(NAKSHATRA_RING_OUTER, 0xd3a95d, 0.7));
        ecliptic.add(makeCircle(PADA_RING_OUTER + 0.01, 0xd3a95d, 0.74));

        const nakshatraGroup = new THREE.Group();
        const nakshatraHighlights: import("three").Mesh[] = [];
        const nakshatraLabels: import("three").Sprite[] = [];
        const nakshatraRingLabels: import("three").Sprite[] = [];
        const nakshatraBoundaryPoints: import("three").Vector3[] = [];
        const nakshatraHighlightMaterial = new THREE.MeshBasicMaterial({
          color: 0xe6b568,
          transparent: true,
          opacity: 0.42,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        NAKSHATRAS.forEach((name, index) => {
          nakshatraGroup.add(
            makeSector(
              index,
              27,
              NAKSHATRA_RING_INNER,
              NAKSHATRA_RING_OUTER,
              new THREE.MeshBasicMaterial({
                color: index % 2 === 0 ? 0x102839 : 0x0b2030,
                transparent: true,
                opacity: 0.86,
                side: THREE.DoubleSide,
              }),
              0.006,
              -0.006,
            ),
          );

          const angle = index * ((Math.PI * 2) / 27);
          nakshatraBoundaryPoints.push(
            new THREE.Vector3(
              Math.sin(angle) * NAKSHATRA_RING_INNER,
              0.024,
              -Math.cos(angle) * NAKSHATRA_RING_INNER,
            ),
            new THREE.Vector3(
              Math.sin(angle) * NAKSHATRA_RING_OUTER,
              0.024,
              -Math.cos(angle) * NAKSHATRA_RING_OUTER,
            ),
          );

          const highlight = makeSector(
            index,
            27,
            NAKSHATRA_RING_INNER,
            NAKSHATRA_RING_OUTER,
            nakshatraHighlightMaterial,
            0.008,
            0.032,
          );
          highlight.visible = false;
          highlight.renderOrder = 4;
          nakshatraHighlights.push(highlight);
          nakshatraGroup.add(highlight);

          const midpoint = (index + 0.5) * (360 / 27);
          const ringLabel = createCoordinateLabel(name, "", {
            width: 512,
            scaleX: 1.15,
            scaleY: 0.28,
            compact: true,
            color: "#d9b56f",
          });
          ringLabel.position.copy(
            pointAtLongitude(
              midpoint,
              (NAKSHATRA_RING_INNER + NAKSHATRA_RING_OUTER) / 2,
              0.1,
            ),
          );
          nakshatraRingLabels.push(ringLabel);
          nakshatraGroup.add(ringLabel);

          const nameLabel = createCoordinateLabel(name, `Nakshatra ${index + 1}`, {
            scaleX: 1.52,
            scaleY: 0.48,
          });
          nameLabel.position.copy(
            pointAtLongitude(midpoint, RASHI_RING_OUTER, 0.23),
          );
          nameLabel.visible = false;
          nakshatraLabels.push(nameLabel);
          nakshatraGroup.add(nameLabel);
        });
        nakshatraGroup.add(
          new THREE.LineSegments(
            new THREE.BufferGeometry().setFromPoints(nakshatraBoundaryPoints),
            new THREE.LineBasicMaterial({
              color: 0xd8b46c,
              transparent: true,
              opacity: 0.7,
            }),
          ),
        );
        nakshatraGroupRef.current = nakshatraGroup;
        ecliptic.add(nakshatraGroup);

        const padaGroup = new THREE.Group();
        const padaPoints: import("three").Vector3[] = [];
        const padaHighlights: import("three").Mesh[] = [];
        const padaBase = new THREE.Mesh(
          new THREE.RingGeometry(PADA_RING_INNER, PADA_RING_OUTER, 216),
          new THREE.MeshBasicMaterial({
            color: 0x0b2232,
            transparent: true,
            opacity: 0.92,
            side: THREE.DoubleSide,
          }),
        );
        padaBase.rotation.x = -Math.PI / 2;
        padaBase.position.y = -0.012;
        padaGroup.add(padaBase);
        const padaHighlightMaterial = new THREE.MeshBasicMaterial({
          color: 0xf3cf8e,
          transparent: true,
          opacity: 0.46,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        for (let index = 0; index < 108; index += 1) {
          const longitude = index * (360 / 108);
          const isNakshatraBoundary = index % 4 === 0;
          padaPoints.push(
            pointAtLongitude(
              longitude,
              isNakshatraBoundary
                ? PADA_RING_INNER
                : PADA_RING_INNER + 0.06,
              0.02,
            ),
            pointAtLongitude(longitude, PADA_RING_OUTER + 0.01, 0.02),
          );
          const highlight = makeSector(
            index,
            108,
            PADA_RING_INNER,
            PADA_RING_OUTER,
            padaHighlightMaterial,
            0.006,
            0.034,
          );
          highlight.visible = false;
          highlight.renderOrder = 5;
          padaHighlights.push(highlight);
          padaGroup.add(highlight);
        }
        padaGroup.add(
          new THREE.LineSegments(
            new THREE.BufferGeometry().setFromPoints(padaPoints),
            new THREE.LineBasicMaterial({
              color: 0xb8cbd0,
              transparent: true,
              opacity: 0.34,
            }),
          ),
        );
        ecliptic.add(padaGroup);

        const houseHighlights: import("three").Mesh[] = [];
        const houseLabels: import("three").Sprite[] = [];
        const houseBoundaryPoints: import("three").Vector3[] = [];
        const houseHighlightMaterial = new THREE.MeshBasicMaterial({
          color: 0x65d4c7,
          transparent: true,
          opacity: 0.36,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        ROMAN_HOUSES.forEach((roman, index) => {
          ecliptic.add(
            makeSector(
              index,
              12,
              HOUSE_RING_INNER,
              HOUSE_RING_OUTER,
              new THREE.MeshBasicMaterial({
                color: index % 2 === 0 ? 0x0b2832 : 0x081f2a,
                transparent: true,
                opacity: 0.92,
                side: THREE.DoubleSide,
              }),
              0.012,
              -0.014,
            ),
          );
          const highlight = makeSector(
            index,
            12,
            HOUSE_RING_INNER - 0.02,
            HOUSE_RING_OUTER + 0.02,
            houseHighlightMaterial,
            0.02,
            0.026,
          );
          highlight.visible = false;
          highlight.renderOrder = 4;
          houseHighlights.push(highlight);
          ecliptic.add(highlight);
          houseBoundaryPoints.push(
            pointAtLongitude(index * 30, HOUSE_RING_INNER, 0.008),
            pointAtLongitude(index * 30, HOUSE_RING_OUTER, 0.008),
          );
          const label = createCoordinateLabel(
            index === 0 ? "I · ASC" : roman,
            "",
            {
            width: index === 0 ? 256 : 128,
            scaleX: index === 0 ? 0.72 : roman.length > 3 ? 0.48 : 0.38,
            scaleY: 0.34,
            compact: true,
            color: index === 0 ? "#ffd183" : "#9fc1c9",
            },
          );
          label.renderOrder = 11;
          ecliptic.add(label);
          houseLabels.push(label);
        });
        ecliptic.add(
          new THREE.LineSegments(
            new THREE.BufferGeometry().setFromPoints(houseBoundaryPoints),
            new THREE.LineBasicMaterial({
              color: 0x65d4c7,
              transparent: true,
              opacity: 0.38,
            }),
          ),
        );

        const selectionRayGeometry = new THREE.BufferGeometry();
        selectionRayGeometry.setAttribute(
          "position",
          new THREE.BufferAttribute(new Float32Array(6), 3),
        );
        const selectionRay = new THREE.Line(
          selectionRayGeometry,
          new THREE.LineBasicMaterial({
            color: 0xf0b858,
            transparent: true,
            opacity: 0.78,
          }),
        );
        selectionRay.visible = false;
        selectionRay.renderOrder = 6;
        ecliptic.add(selectionRay);

        const orientationLabels = [
          ["0° Mesha", 0],
          ["90°", 90],
          ["180°", 180],
          ["270°", 270],
        ] as const;
        orientationLabels.forEach(([text, longitude]) => {
          const sprite = createCoordinateLabel(text, "", {
            scaleX: text.length > 4 ? 1.32 : 0.74,
            scaleY: 0.42,
            color: "#f0bd6c",
            framed: false,
          });
          sprite.position.copy(pointAtLongitude(longitude, 7.32, 0.18));
          ecliptic.add(sprite);
        });

        const directionCurve = new THREE.CatmullRomCurve3(
          Array.from({ length: 18 }, (_, index) =>
            pointAtLongitude(32 + index * 1.7, 7.24, 0.08),
          ),
        );
        const directionLine = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(
            directionCurve.getPoints(40),
          ),
          new THREE.LineBasicMaterial({
            color: 0xe6b568,
            transparent: true,
            opacity: 0.85,
          }),
        );
        ecliptic.add(directionLine);
        const directionArrow = new THREE.Mesh(
          new THREE.ConeGeometry(0.09, 0.28, 10),
          new THREE.MeshBasicMaterial({ color: 0xe6b568 }),
        );
        directionArrow.position.copy(pointAtLongitude(61, 7.24, 0.08));
        directionArrow.rotation.z = -Math.PI / 2;
        directionArrow.rotation.y = (-61 * Math.PI) / 180;
        ecliptic.add(directionArrow);

        const eclipticAxis = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-6.85, -0.78, 0),
            new THREE.Vector3(-6.85, 1.15, 0),
          ]),
          new THREE.LineBasicMaterial({
            color: 0x8fb4c0,
            transparent: true,
            opacity: 0.56,
          }),
        );
        ecliptic.add(eclipticAxis);
        const northLabel = createCoordinateLabel("Bắc hoàng đạo", "+β", {
          scaleX: 1.34,
          scaleY: 0.44,
          color: "#a9ccd5",
        });
        northLabel.position.set(-6.85, 1.35, 0);
        ecliptic.add(northLabel);
        const southLabel = createCoordinateLabel("Nam hoàng đạo", "−β", {
          scaleX: 1.34,
          scaleY: 0.44,
          color: "#789ca7",
        });
        southLabel.position.set(-6.85, -0.98, 0);
        ecliptic.add(southLabel);

        coordinateLayersRef.current = {
          rashiHighlights,
          rashiLabels,
          nakshatraHighlights,
          padaHighlights,
          nakshatraLabels,
          nakshatraRingLabels,
          padaGroup,
          houseHighlights,
          houseLabels,
          selectionRay,
        };

        const earthTexture = surfaceTexture("earth");
        const earth = new THREE.Mesh(
          new THREE.SphereGeometry(0.82, 36, 24),
          new THREE.MeshStandardMaterial({
            color: 0xffffff,
            map: earthTexture,
            bumpMap: earthTexture,
            bumpScale: 0.018,
            emissive: 0x071a27,
            roughness: 0.72,
            metalness: 0.08,
          }),
        );
        earth.position.y = 0.18;
        ecliptic.add(earth);
        const earthWire = new THREE.Mesh(
          new THREE.SphereGeometry(0.87, 18, 12),
          new THREE.MeshBasicMaterial({
            color: 0x7dc4cc,
            wireframe: true,
            transparent: true,
            opacity: 0.08,
          }),
        );
        earthWire.position.copy(earth.position);
        ecliptic.add(earthWire);

        const moonOrbitSegments = 160;
        const moonOrbitGeometry = new THREE.BufferGeometry();
        moonOrbitGeometry.setAttribute(
          "position",
          new THREE.BufferAttribute(new Float32Array(moonOrbitSegments * 3), 3),
        );
        const moonOrbit = new THREE.LineLoop(
          moonOrbitGeometry,
          new THREE.LineDashedMaterial({
            color: 0xaec8e8,
            dashSize: 0.13,
            gapSize: 0.09,
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
          }),
        );
        moonOrbit.position.y = 0.025;
        moonOrbit.visible = false;
        moonOrbit.renderOrder = 2;
        ecliptic.add(moonOrbit);
        moonOrbitRef.current = { orbit: moonOrbit, segments: moonOrbitSegments };

        const createLabel = (text: string, color: string) => {
          const canvas = document.createElement("canvas");
          canvas.width = 512;
          canvas.height = 128;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Canvas 2D unavailable");
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.fillStyle = "rgba(5, 15, 26, 0.88)";
          context.beginPath();
          context.roundRect(8, 12, 496, 96, 28);
          context.fill();
          context.strokeStyle = `${color}bb`;
          context.lineWidth = 3;
          context.stroke();
          context.fillStyle = "#f5f0e6";
          context.font = "600 42px system-ui, sans-serif";
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.fillText(text, 256, 62);
          const texture = new THREE.CanvasTexture(canvas);
          texture.colorSpace = THREE.SRGBColorSpace;
          const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: texture,
              transparent: true,
              depthTest: false,
            }),
          );
          sprite.scale.set(2.2, 0.55, 1);
          sprite.renderOrder = 10;
          return sprite;
        };

        const createNodeGlyph = (symbol: string, color: string) => {
          const canvas = document.createElement("canvas");
          canvas.width = 192;
          canvas.height = 192;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Canvas 2D unavailable");
          context.clearRect(0, 0, 192, 192);
          context.strokeStyle = color;
          context.lineWidth = 8;
          context.beginPath();
          context.arc(96, 96, 63, 0, Math.PI * 2);
          context.stroke();
          context.fillStyle = color;
          context.font = "76px Georgia, serif";
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.fillText(symbol, 96, 96);
          const texture = new THREE.CanvasTexture(canvas);
          texture.colorSpace = THREE.SRGBColorSpace;
          const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: texture,
              transparent: true,
              depthTest: false,
            }),
          );
          sprite.scale.set(0.78, 0.78, 1);
          sprite.renderOrder = 9;
          return sprite;
        };

        grahas.forEach((graha, index) => {
          const group = new THREE.Group();
          const isNode = graha.id === "rahu" || graha.id === "ketu";
          const bodySize = BODY_VISUAL_SIZE[graha.id] ?? 0.2;
          const bodyTexture = isNode ? null : surfaceTexture(graha.id);
          const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            map: bodyTexture,
            bumpMap: bodyTexture,
            bumpScale:
              graha.id === "moon" || graha.id === "mercury"
                ? 0.045
                : 0.015,
            emissive:
              graha.id === "sun"
                ? new THREE.Color(0xff7a12)
                : new THREE.Color(0x050708),
            ...(graha.id === "sun" ? { emissiveMap: bodyTexture } : {}),
            emissiveIntensity: graha.id === "sun" ? 0.88 : 0.06,
            roughness:
              graha.id === "jupiter" || graha.id === "venus" ? 0.7 : 0.82,
            metalness: 0.02,
          });
          const pickTarget = new THREE.Mesh(
            new THREE.SphereGeometry(
              isNode ? 0.21 : bodySize,
              isNode ? 20 : 40,
              isNode ? 14 : 28,
            ),
            isNode
              ? new THREE.MeshBasicMaterial({
                  transparent: true,
                  opacity: 0,
                  depthWrite: false,
                })
              : material,
          );
          pickTarget.userData.grahaId = graha.id;
          group.add(pickTarget);

          if (graha.id === "sun") {
            const glow = new THREE.Mesh(
              new THREE.SphereGeometry(bodySize * 1.42, 28, 20),
              new THREE.MeshBasicMaterial({
                color: 0xff9b2f,
                transparent: true,
                opacity: 0.14,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
              }),
            );
            pickTarget.add(glow);
          }

          if (graha.id === "saturn") {
            const outerRing = new THREE.Mesh(
              new THREE.RingGeometry(bodySize * 1.38, bodySize * 2.35, 96),
              new THREE.MeshBasicMaterial({
                color: 0xd9c59c,
                transparent: true,
                opacity: 0.78,
                side: THREE.DoubleSide,
                depthWrite: false,
              }),
            );
            outerRing.rotation.x = Math.PI / 2;
            outerRing.rotation.z = 0.47;
            pickTarget.add(outerRing);

            const cassiniBand = new THREE.Mesh(
              new THREE.RingGeometry(bodySize * 1.72, bodySize * 1.86, 96),
              new THREE.MeshBasicMaterial({
                color: 0x4a4035,
                transparent: true,
                opacity: 0.62,
                side: THREE.DoubleSide,
                depthWrite: false,
              }),
            );
            cassiniBand.rotation.copy(outerRing.rotation);
            cassiniBand.position.y = 0.002;
            pickTarget.add(cassiniBand);
          }

          const marker = isNode
            ? createNodeGlyph(graha.symbol, graha.color)
            : pickTarget;
          marker.userData.baseScale = isNode ? 0.78 : 1;
          if (isNode) group.add(marker);

          const halo = new THREE.Mesh(
            new THREE.TorusGeometry(
              isNode ? 0.42 : index < 2 ? 0.36 : 0.3,
              0.024,
              8,
              40,
            ),
            new THREE.MeshBasicMaterial({
              color: new THREE.Color(graha.color),
              transparent: true,
              opacity: 0.82,
            }),
          );
          halo.rotation.x = Math.PI / 2;
          group.add(halo);

          const guideGeometry = new THREE.BufferGeometry();
          guideGeometry.setAttribute(
            "position",
            new THREE.BufferAttribute(new Float32Array(6), 3),
          );
          const latitudeGuide = new THREE.Line(
            guideGeometry,
            new THREE.LineBasicMaterial({
              color: new THREE.Color(graha.color),
              transparent: true,
              opacity: 0.42,
            }),
          );
          group.add(latitudeGuide);

          const label = createLabel(
            `${graha.symbol} ${graha.name}`,
            graha.color,
          );
          label.position.set(0, 0.58, 0);
          group.add(label);
          ecliptic.add(group);
          planetNodes.set(graha.id, {
            group,
            marker,
            pickTarget,
            label,
            halo,
            latitudeGuide,
            moonMaterial: graha.id === "moon" ? material : undefined,
          });
        });

        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        let pointerStart = { x: 0, y: 0 };
        const handlePointerDown = (event: PointerEvent) => {
          pointerStart = { x: event.clientX, y: event.clientY };
        };
        const handlePointerUp = (event: PointerEvent) => {
          if (
            Math.hypot(
              event.clientX - pointerStart.x,
              event.clientY - pointerStart.y,
            ) > 7
          )
            return;
          const bounds = renderer.domElement.getBoundingClientRect();
          pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
          pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);
          const hits = raycaster.intersectObjects(
            [...planetNodes.values()].map(
              (node) => node.pickTarget,
            ),
            false,
          );
          const id = hits[0]?.object.userData.grahaId;
          if (typeof id === "string") onSelectRef.current(id);
        };
        renderer.domElement.addEventListener("pointerdown", handlePointerDown);
        renderer.domElement.addEventListener("pointerup", handlePointerUp);

        const resetView = () => {
          applyDefaultView();
        };
        mount.addEventListener("jyotish-reset-view", resetView);

        const resize = () => {
          const width = Math.max(mount.clientWidth, 1);
          const height = Math.max(mount.clientHeight, 1);
          const previousAspect = camera.aspect;
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height, false);
          if (
            previousAspect === 1 ||
            (previousAspect < 1.05) !== (camera.aspect < 1.05) ||
            (previousAspect > 1.7) !== (camera.aspect > 1.7)
          ) {
            applyDefaultView(camera.aspect);
          }
          const compactLabels = width < 560;
          rashiLabels.forEach((label) => {
            label.visible = !compactLabels;
          });
          nakshatraRingLabels.forEach((label) => {
            label.visible = !compactLabels;
          });
        };
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(mount);
        resize();

        const reducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        const render = () => {
          if (disposed) return;
          controls.update();
          if (!reducedMotion) earthWire.rotation.y += 0.0014;
          renderer.render(scene, camera);
          animationFrame = window.requestAnimationFrame(render);
        };
        render();
        setReady(true);

        cleanupControls = (() => {
          const disposeControls = cleanupControls;
          return () => {
            disposeControls();
            renderer.domElement.removeEventListener(
              "pointerdown",
              handlePointerDown,
            );
            renderer.domElement.removeEventListener(
              "pointerup",
              handlePointerUp,
            );
            mount.removeEventListener("jyotish-reset-view", resetView);
            scene.traverse((object) => {
              if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
                object.geometry?.dispose();
                const materials = Array.isArray(object.material)
                  ? object.material
                  : [object.material];
                materials.forEach((material) => material?.dispose());
              }
              if (object instanceof THREE.Sprite) {
                object.material.map?.dispose();
                object.material.dispose();
              }
            });
            renderer.dispose();
            renderer.domElement.remove();
          };
        })();
      } catch {
        if (!disposed) onUnavailableRef.current();
      }
    };

    initialise();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      cleanupControls();
      planetNodes.clear();
      nakshatraGroupRef.current = null;
      coordinateLayersRef.current = null;
      moonOrbitRef.current = null;
    };
    // The scene owns stable Graha objects; later ephemeris updates only move them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const moonPhase = getMoonPhase(grahas);
    const moonOrbitLayer = moonOrbitRef.current;
    const moon = grahas.find((graha) => graha.id === "moon");
    if (moonOrbitLayer && moon) {
      const radius = distanceToRadius(moon.distance);
      const positions = moonOrbitLayer.orbit.geometry.getAttribute(
        "position",
      ) as import("three").BufferAttribute;
      for (let index = 0; index < moonOrbitLayer.segments; index += 1) {
        const angle = (index / moonOrbitLayer.segments) * Math.PI * 2;
        positions.setXYZ(index, Math.sin(angle) * radius, 0, -Math.cos(angle) * radius);
      }
      positions.needsUpdate = true;
      moonOrbitLayer.orbit.computeLineDistances();
      moonOrbitLayer.orbit.visible = true;
    }
    grahas.forEach((graha) => {
      const node = planetNodesRef.current.get(graha.id);
      if (!node) return;
      const angle = (graha.longitude * Math.PI) / 180;
      const latitude = (graha.latitude * Math.PI) / 180;
      const radius = distanceToRadius(graha.distance);
      const projectedRadius = radius * Math.cos(latitude);
      const height = Math.sin(latitude) * radius;
      node.group.position.set(
        Math.sin(angle) * projectedRadius,
        height,
        -Math.cos(angle) * projectedRadius,
      );
      const guidePositions = node.latitudeGuide.geometry.getAttribute(
        "position",
      ) as import("three").BufferAttribute;
      guidePositions.setXYZ(0, 0, 0, 0);
      guidePositions.setXYZ(1, 0, -height, 0);
      guidePositions.needsUpdate = true;
      const active = graha.id === selected;
      const baseScale = node.marker.userData.baseScale ?? 1;
      node.marker.scale.setScalar(baseScale * (active ? 1.6 : 1));
      node.halo.visible = active;
      node.label.visible = showLabels || active;
      if (graha.id === "moon" && node.moonMaterial && moonPhase) {
        const brightness = Math.max(0.015, moonPhase.illumination);
        node.moonMaterial.color.setRGB(brightness, brightness, brightness);
        node.moonMaterial.emissive.setRGB(0.68, 0.78, 0.96);
        node.moonMaterial.emissiveIntensity = moonPhase.illumination * 0.95;
      }
    });
    if (nakshatraGroupRef.current) {
      nakshatraGroupRef.current.visible = showNakshatras;
    }
    const coordinateLayers = coordinateLayersRef.current;
    const chosen = grahas.find((graha) => graha.id === selected);
    if (coordinateLayers) {
      const normalizedLagna = ((lagnaLongitude % 360) + 360) % 360;
      const lagnaSign = Math.floor(normalizedLagna / 30);
      coordinateLayers.houseLabels.forEach((label, houseIndex) => {
        const signIndex = (lagnaSign + houseIndex) % 12;
        const midpoint = (signIndex * 30 + 15) * (Math.PI / 180);
        const houseLabelRadius = (HOUSE_RING_INNER + HOUSE_RING_OUTER) / 2;
        label.position.set(
          Math.sin(midpoint) * houseLabelRadius,
          0.13,
          -Math.cos(midpoint) * houseLabelRadius,
        );
        label.visible = true;
      });
      const longitude = chosen
        ? ((chosen.longitude % 360) + 360) % 360
        : 0;
      const rashiIndex = Math.floor(longitude / 30);
      const nakshatra = getNakshatra(longitude);
      const padaIndex = Math.min(
        107,
        Math.floor(longitude / (360 / 108)),
      );
      coordinateLayers.rashiHighlights.forEach((mesh, index) => {
        mesh.visible = Boolean(chosen) && index === rashiIndex;
      });
      coordinateLayers.houseHighlights.forEach((mesh, index) => {
        mesh.visible = Boolean(chosen) && index === rashiIndex;
      });
      coordinateLayers.nakshatraHighlights.forEach((mesh, index) => {
        mesh.visible =
          showNakshatras && Boolean(chosen) && index === nakshatra.index;
      });
      coordinateLayers.padaHighlights.forEach((mesh, index) => {
        mesh.visible =
          showNakshatras && Boolean(chosen) && index === padaIndex;
      });
      coordinateLayers.nakshatraLabels.forEach((label) => {
        label.visible = false;
      });
      coordinateLayers.padaGroup.visible = showNakshatras;

      if (chosen) {
        const node = planetNodesRef.current.get(chosen.id);
        const rayPositions =
          coordinateLayers.selectionRay.geometry.getAttribute(
            "position",
          ) as import("three").BufferAttribute;
        rayPositions.setXYZ(0, 0, 0.18, 0);
        rayPositions.setXYZ(
          1,
          node?.group.position.x ?? 0,
          node?.group.position.y ?? 0,
          node?.group.position.z ?? 0,
        );
        rayPositions.needsUpdate = true;
        coordinateLayers.selectionRay.visible = true;
      } else {
        coordinateLayers.selectionRay.visible = false;
      }
    }
  }, [
    grahas,
    lagnaLongitude,
    selected,
    showLabels,
    showNakshatras,
    ready,
  ]);

  const resetView = () => {
    mountRef.current?.dispatchEvent(new Event("jyotish-reset-view"));
  };
  const selectedGraha =
    grahas.find((graha) => graha.id === selected) ?? null;
  const selectedRashi = selectedGraha
    ? RASHIS[Math.floor(selectedGraha.longitude / 30)]
    : null;
  const selectedNakshatra = selectedGraha
    ? getNakshatra(selectedGraha.longitude)
    : null;
  const lagnaRashi = RASHIS[Math.floor(lagnaLongitude / 30)];

  return (
    <div className="three-sky-shell">
      <div
        ref={mountRef}
        className={`three-sky ${ready ? "ready" : ""}`}
        aria-label="Bầu trời Vệ Đà 3D tương tác"
      />
      {!ready && (
        <div className="three-loading" role="status">
          <span />
          Đang dựng không gian 3D
        </div>
      )}
      <div className="coordinate-key" aria-label="Chú giải hệ tọa độ Jyotish">
        <strong>Hệ tọa độ Jyotish</strong>
        <span>
          <i className="key-line key-pada" /> Pāda · 108 × 3°20′
        </span>
        <span>
          <i className="key-line key-nakshatra" /> Nakshatra · 27 × 13°20′
        </span>
        <span>
          <i className="key-line key-rashi" /> Rāśi · 12 ký hiệu
        </span>
        <span>
          <i className="key-line key-bhava" /> Bhāva · I–XII · Whole Sign
        </span>
        <small>ASC {lagnaRashi[2]} {lagnaRashi[1]} · bán kính log AU</small>
      </div>
      <button className="reset-view" type="button" onClick={resetView}>
        Đặt lại góc nhìn
      </button>
      {selectedGraha && selectedRashi && selectedNakshatra ? (
        <div className="coordinate-state" aria-live="polite">
          <span>
            <small>Graha</small>
            <strong>{selectedGraha.name}</strong>
          </span>
          <span>
            <small>Rāśi</small>
            <strong>
              {selectedRashi[2]} {selectedRashi[1]}
            </strong>
          </span>
          <span>
            <small>Nakshatra</small>
            <strong>
              {selectedNakshatra.index + 1}. {selectedNakshatra.name}
            </strong>
          </span>
          <span>
            <small>Pāda</small>
            <strong>P{selectedNakshatra.pada}</strong>
          </span>
          <span>
            <small>ASC</small>
            <strong>
              {lagnaRashi[2]} {lagnaRashi[1]}
            </strong>
          </span>
        </div>
      ) : null}
      <p className="coordinate-caveat">
        Phân vùng góc bằng nhau trên hoàng đạo · không phải ranh giới chòm sao
        vật lý
      </p>
      <p className="three-help">
        Kéo để xoay · cuộn hoặc chụm để thu phóng · chạm Graha để xem chi tiết
      </p>
      <p className="sr-only">
        Kinh độ quyết định góc quanh vòng hoàng đạo, vĩ độ quyết định độ cao
        trên hoặc dưới mặt phẳng hoàng đạo, và khoảng cách địa tâm được biểu
        diễn bằng bán kính logarithm theo đơn vị thiên văn. Rahu và Ketu là
        giao điểm trên mặt phẳng hoàng đạo, không phải hành tinh vật lý.
      </p>
    </div>
  );
}
