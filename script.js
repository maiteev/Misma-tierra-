(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const NAMES = ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
  const SCALES = { pmaj: [0, 2, 4, 7, 9], pmin: [0, 3, 5, 7, 10], maj: [0, 2, 4, 5, 7, 9, 11], chr: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const noteName = (m) => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);

  const S = { src: "plant", view: "mix", soundMode: "harp", cols: 5, rows: 3, scale: "pmaj", root: 48, thr: 32, sens: 0.035, cool: 260,
    sndType: "catalog", catPreset: "scale", wave: "triangle", atk: 0.008, rel: 0.7, cut: 3200, rev: 0.3, vol: 0.6, mapVel: true, mapPan: true, mirror: true,
    tint: 0.22, veil: 0, lines: true, notes: true, parts: true };

  const PHRASES = [
    "I trace the places I escape.",
    "Luma fades like memory,",
    "You saw the light bend,",
    "Tracking what we'll never be.",
    "I saw the break.",
    "Fading lines you can't replace.",
    "All that moves isn't alive,",
    "I'm just a signal in your space,",
    "But I still follow like it's mine.",
    "Lost between the black and white.",
    "We move, but never meet,",
    "Flicker through the static noise,",
    "Not touch, just detection, never really here.",
    "Just echoes under heat.",
    "Your silence in projection.",
    "Glitched out like we never happened.",
    "Heartbeat lost...",
    "Trace me like..."
  ];
  const CODES = ["909", "EDY", "808", "SIG", "404", "TRC", "0x4F", "LUM", "WAV", "λ-02"];

  let toastT = 0;
  function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600); }

  // ================= dock =================
  document.querySelectorAll(".trigger").forEach((tr) => tr.addEventListener("click", () => {
    const id = tr.dataset.panel, open = tr.getAttribute("aria-expanded") === "true";
    document.querySelectorAll(".trigger").forEach((t) => { t.setAttribute("aria-expanded", "false"); $(t.dataset.panel).hidden = true; });
    if (!open) { tr.setAttribute("aria-expanded", "true"); $(id).hidden = false; }
  }));
  document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => {
    const p = b.closest(".panel"); p.hidden = true; document.querySelector('[data-panel="' + p.id + '"]').setAttribute("aria-expanded", "false");
  }));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") document.querySelectorAll("[data-close]").forEach((b) => { if (!b.closest(".panel").hidden) b.click(); }); });

  // ================= fuentes =================
  const video = document.createElement("video");
  video.muted = true; video.loop = true; video.playsInline = true;
  let stream = null;
  const demo = document.createElement("canvas"); demo.width = 640; demo.height = 360;
  const dctx = demo.getContext("2d");
  const lanes = [0.22, 0.5, 0.78], cars = [];
  for (let i = 0; i < 7; i++) {
    const lane = i % 3;
    cars.push({ lane, x: Math.random() * 640, v: (lane === 1 ? -1 : 1) * (90 + Math.random() * 160), w: 60 + Math.random() * 70, c: ["#E2FF3B", "#EEF0FF", "#6A6AFF", "#9A7BFF"][i % 4] });
  }
  let birdT = 0;
  function drawDemo(dt) {
    dctx.fillStyle = "#0B0C2C"; dctx.fillRect(0, 0, 640, 360);
    dctx.fillStyle = "#16184E"; lanes.forEach((y) => dctx.fillRect(0, y * 360 - 34, 640, 68));
    dctx.strokeStyle = "rgba(238,240,255,.18)"; dctx.setLineDash([18, 16]); dctx.lineWidth = 2;
    [0.36, 0.64].forEach((y) => { dctx.beginPath(); dctx.moveTo(0, y * 360); dctx.lineTo(640, y * 360); dctx.stroke(); });
    dctx.setLineDash([]);
    for (const c of cars) {
      c.x += c.v * dt;
      if (c.v > 0 && c.x > 700) { c.x = -c.w - Math.random() * 200; c.v = 90 + Math.random() * 160; }
      if (c.v < 0 && c.x < -c.w - 60) { c.x = 640 + Math.random() * 200; c.v = -(90 + Math.random() * 160); }
      dctx.fillStyle = c.c; dctx.fillRect(c.x, lanes[c.lane] * 360 - 24, c.w, 48);
    }
    birdT += dt;
    dctx.fillStyle = "#EEF0FF"; dctx.beginPath(); dctx.arc((birdT * 70) % 760 - 60, 40 + Math.sin(birdT * 2.2) * 18, 7, 0, Math.PI * 2); dctx.fill();
  }

  // ================= planta interactiva (escultura 3D STL) =================
  const plantCanvas = document.createElement("canvas"); plantCanvas.width = 640; plantCanvas.height = 360;
  const plantCtx = plantCanvas.getContext("2d");

  // Iluminación direccional para sombreado plano (Flat-Shading STL)
  const STL_L = [-0.55, -0.65, 0.52];
  const lLen = Math.hypot(...STL_L);
  STL_L[0] /= lLen; STL_L[1] /= lLen; STL_L[2] /= lLen;

  function drawTriSTL(ctx, p0, p1, p2, baseRGB, ambient = 0.40, wireAlpha = 0.22) {
    const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2];
    const bx = p2[0] - p0[0], by = p2[1] - p0[1], bz = p2[2] - p0[2];
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;

    const diff = Math.max(0, nx * STL_L[0] + ny * STL_L[1] + nz * STL_L[2]);
    const shade = ambient + (1 - ambient) * diff;

    const r = Math.min(255, Math.round(baseRGB[0] * shade));
    const g = Math.min(255, Math.round(baseRGB[1] * shade));
    const b = Math.min(255, Math.round(baseRGB[2] * shade));

    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.lineTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.closePath();
    ctx.fill();

    if (wireAlpha > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${wireAlpha})`;
      ctx.lineWidth = 0.75;
      ctx.stroke();
    }
  }

  // ================= ÁRBOL 3D STL INTERACTIVO =================
  // Estructura de tronco, ramas y masas de follaje en verde inspirada en la armadura 3D y árbol de referencia

  const treeCanopy = [
    // 0: Cúspide de la corona (Ápice superior central - notas agudas)
    { id: "apex", bough: "center", baseX: 320, baseY: 75, z: 6, rx: 56, ry: 42, restAngle: 0.0, freq: 1.15, phase: 0.0, color: [168, 240, 112] },
    // 1: Corona Cúspide Izquierda
    { id: "crownL", bough: "center", baseX: 270, baseY: 98, z: -4, rx: 50, ry: 38, restAngle: -0.12, freq: 1.30, phase: 1.0, color: [158, 232, 105] },
    // 2: Corona Cúspide Derecha
    { id: "crownR", bough: "center", baseX: 370, baseY: 98, z: -4, rx: 50, ry: 38, restAngle: 0.12, freq: 1.25, phase: 2.2, color: [158, 232, 105] },
    // 3: Cúpula Superior Izquierda
    { id: "upperL", bough: "left", baseX: 210, baseY: 122, z: 8, rx: 58, ry: 44, restAngle: -0.25, freq: 1.40, phase: 1.5, color: [150, 225, 98] },
    // 4: Cúpula Superior Derecha
    { id: "upperR", bough: "right", baseX: 430, baseY: 125, z: 8, rx: 58, ry: 44, restAngle: 0.25, freq: 1.35, phase: 3.3, color: [150, 225, 98] },
    // 5: Flanco Exterior Izquierdo (rama extendida a la izquierda)
    { id: "outerL", bough: "left", baseX: 155, baseY: 170, z: 14, rx: 52, ry: 40, restAngle: -0.38, freq: 1.55, phase: 0.6, color: [142, 216, 92] },
    // 6: Flanco Exterior Derecho (rama extendida a la derecha)
    { id: "outerR", bough: "right", baseX: 485, baseY: 175, z: 14, rx: 52, ry: 40, restAngle: 0.38, freq: 1.50, phase: 2.8, color: [142, 216, 92] },
    // 7: Masa Media Izquierda Frontal
    { id: "midFrontL", bough: "left", baseX: 245, baseY: 172, z: 18, rx: 54, ry: 40, restAngle: -0.18, freq: 1.65, phase: 1.1, color: [146, 220, 96] },
    // 8: Masa Media Derecha Frontal
    { id: "midFrontR", bough: "right", baseX: 395, baseY: 176, z: 18, rx: 54, ry: 40, restAngle: 0.18, freq: 1.60, phase: 3.8, color: [146, 220, 96] },
    // 9: Masa Central Interior
    { id: "midC", bough: "center", baseX: 320, baseY: 148, z: 10, rx: 52, ry: 38, restAngle: 0.0, freq: 1.45, phase: 2.1, color: [152, 226, 100] },
    // 10: Follaje Inferior Izquierdo
    { id: "lowL", bough: "left", baseX: 185, baseY: 220, z: 20, rx: 46, ry: 35, restAngle: -0.42, freq: 1.80, phase: 0.9, color: [136, 208, 88] },
    // 11: Follaje Inferior Derecho
    { id: "lowR", bough: "right", baseX: 455, baseY: 225, z: 20, rx: 46, ry: 35, restAngle: 0.42, freq: 1.75, phase: 4.0, color: [136, 208, 88] },
    // 12: Fondo Profundidad Posterior (verde bosque más profundo)
    { id: "depthBack", bough: "center", baseX: 320, baseY: 115, z: -18, rx: 76, ry: 54, restAngle: 0.0, freq: 1.10, phase: 1.4, color: [116, 182, 72] }
  ];

  for (const c of treeCanopy) {
    c.angle = c.restAngle;
    c.angVel = 0;
    c.offsetX = 0;
    c.offsetY = 0;
    c.velX = 0;
    c.velY = 0;
    c.curX = c.baseX;
    c.curY = c.baseY;
  }

  let treeTime = 0;
  let trunkAngle = 0, trunkAngVel = 0, trunkImpulse = 0;
  let plantMouseX = -1000, plantMouseY = -1000, prevPlantMX = -1000, prevPlantMY = -1000;
  let plantMouseVX = 0, plantMouseVY = 0, plantMouseSpeed = 0;

  function updateTree(dt) {
    treeTime += dt;

    // Amortiguación gradual de velocidad del cursor
    plantMouseSpeed *= Math.exp(-dt * 5);
    plantMouseVX *= Math.exp(-dt * 5);
    plantMouseVY *= Math.exp(-dt * 5);

    // Física orgánica del tronco principal (inercia profunda y pesada)
    const trunkTarget = Math.sin(treeTime * 1.0) * 0.018;
    const trunkSpring = (trunkTarget - trunkAngle) * 16;
    trunkAngVel = (trunkAngVel + (trunkSpring + trunkImpulse * 32) * dt) * 0.86;
    trunkAngle += trunkAngVel * dt;
    trunkImpulse *= Math.exp(-dt * 4.5);

    for (const c of treeCanopy) {
      // Onda espacial de viento que recorre horizontalmente la copa
      const windWave = Math.sin(treeTime * 1.5 - c.baseX * 0.009) * 0.052;
      const gust = Math.sin(treeTime * 0.7 + c.phase) * 0.024;
      const targetAngle = c.restAngle + windWave + gust;

      // Desplazamiento heredado de la flexión del tronco y ramas
      const boughMult = c.bough === "left" ? 1.3 : c.bough === "right" ? 1.3 : 1.0;
      const boughShiftX = Math.sin(trunkAngle * boughMult) * (325 - c.baseY) * 0.65;
      const boughShiftY = -Math.abs(Math.sin(trunkAngle)) * 8;

      const currentX = c.baseX + boughShiftX + c.offsetX;
      const currentY = c.baseY + boughShiftY + c.offsetY;
      c.curX = currentX;
      c.curY = currentY;

      // Interacción táctil con el mouse
      if (plantMouseX > -500) {
        const d = Math.hypot(currentX - plantMouseX, currentY - plantMouseY);
        // Radio generoso de interacción
        if (d < 145) {
          const prox = (145 - d) / 145;
          const dx = currentX - plantMouseX, dy = currentY - plantMouseY;
          const dist = Math.hypot(dx, dy) || 1;

          // Separación física / empuje al paso del cursor
          const pushX = (dx / dist) * Math.pow(prox, 1.3) * 210;
          const pushY = (dy / dist) * Math.pow(prox, 1.3) * 130;

          // Estela de aire por la velocidad del cursor (desplaza en dirección del movimiento)
          const wakeX = plantMouseVX * prox * 3.4;
          const wakeY = plantMouseVY * prox * 2.2;

          c.velX += (pushX + wakeX) * dt;
          c.velY += (pushY + wakeY) * dt;
          c.angVel += ((dx > 0 ? 1 : -1) * prox * 4.2 + plantMouseVX * 0.035) * 22 * dt;

          // El tronco también reacciona ligeramente a los movimientos rápidos sobre el árbol
          trunkImpulse += plantMouseVX * prox * 0.00035;
        }
      }

      // Física de resortes multi-eje (X, Y y angular)
      c.velX = (c.velX - c.offsetX * 32 * dt) * 0.89;
      c.velY = (c.velY - c.offsetY * 32 * dt) * 0.89;
      c.offsetX += c.velX * dt;
      c.offsetY += c.velY * dt;

      const angSpring = (targetAngle - c.angle) * 34;
      c.angVel = (c.angVel + angSpring * dt) * 0.88;
      c.angle += c.angVel * dt;

      // Límites físicos elásticos
      c.angle = Math.max(c.restAngle - 0.65, Math.min(c.restAngle + 0.65, c.angle));
      c.offsetX = Math.max(-45, Math.min(45, c.offsetX));
      c.offsetY = Math.max(-30, Math.min(30, c.offsetY));
    }
  }

  // Renderiza una masa/cúpula de follaje 3D facetada STL en verde
  function renderFoliageCluster(ctx, c) {
    const cx = c.curX, cy = c.curY, cz = c.z;
    const cosA = Math.cos(c.angle), sinA = Math.sin(c.angle);
    const sides = 8;
    const pts = [];

    // Vértice cima central elevado en Z (crea volumen 3D)
    const pSummit = [cx, cy, cz + 18];

    // Vértices del contorno elíptico con perturbaciones orgánicas
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const wobble = 1 + 0.12 * Math.sin(a * 3) + 0.07 * Math.cos(a * 5);
      const lx = Math.cos(a) * c.rx * wobble;
      const ly = Math.sin(a) * c.ry * wobble;
      // Rotación por el ángulo de balanceo
      const rx = lx * cosA - ly * sinA;
      const ry = lx * sinA + ly * cosA;
      const rz = cz + Math.sin(a * 2) * 5;
      pts.push([cx + rx, cy + ry, rz]);
    }

    // 8 facetas triangulares STL que van desde la cima central hacia el perímetro
    for (let i = 0; i < sides; i++) {
      const p0 = pts[i];
      const p1 = pts[(i + 1) % sides];
      drawTriSTL(ctx, pSummit, p0, p1, c.color, 0.40, 0.22);
    }

    // 4 crestas / hojas secundarias que sobresalen del borde para mayor silueta botánica
    for (let i = 0; i < 4; i++) {
      const idx = i * 2;
      const p0 = pts[idx], p1 = pts[(idx + 1) % sides];
      const midEdge = [(p0[0] + p1[0]) * 0.5, (p0[1] + p1[1]) * 0.5, (p0[2] + p1[2]) * 0.5];
      const outDir = [(midEdge[0] - cx) * 0.35, (midEdge[1] - cy) * 0.35];
      const pTip = [midEdge[0] + outDir[0], midEdge[1] + outDir[1], midEdge[2] + 4];
      drawTriSTL(ctx, p0, pTip, p1, c.color, 0.44, 0.20);
    }

    // Líneas centrales de textura / nervaduras sutiles estilo CAD
    ctx.strokeStyle = "rgba(255,255,255,0.32)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(pts[0][0], pts[0][1]);
    ctx.moveTo(cx, cy);
    ctx.lineTo(pts[4][0], pts[4][1]);
    ctx.stroke();
  }

  // Dibuja una sección tubular 3D facetada de rama / tronco
  function drawBranchSegment(ctx, pA, pB, rA, rB, woodColor) {
    const dx = pB[0] - pA[0], dy = pB[1] - pA[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;

    const pA_L = [pA[0] - nx * rA, pA[1] - ny * rA, pA[2] - 3];
    const pA_R = [pA[0] + nx * rA, pA[1] + ny * rA, pA[2] - 3];
    const pA_C = [pA[0], pA[1], pA[2] + rA * 0.8];

    const pB_L = [pB[0] - nx * rB, pB[1] - ny * rB, pB[2] - 3];
    const pB_R = [pB[0] + nx * rB, pB[1] + ny * rB, pB[2] - 3];
    const pB_C = [pB[0], pB[1], pB[2] + rB * 0.8];

    // Caras facetadas frontales (izquierda y derecha con cresta central)
    drawTriSTL(ctx, pA_L, pB_L, pB_C, woodColor, 0.38, 0.18);
    drawTriSTL(ctx, pA_L, pB_C, pA_C, woodColor, 0.42, 0.18);
    drawTriSTL(ctx, pA_C, pB_C, pB_R, woodColor, 0.44, 0.18);
    drawTriSTL(ctx, pA_C, pB_R, pA_R, woodColor, 0.40, 0.18);
  }

  function drawPlant(dt) {
    updateTree(dt);
    plantCtx.fillStyle = "#060f04";
    plantCtx.fillRect(0, 0, 640, 360);

    const woodColor = [135, 105, 80]; // Tono madera / corteza 3D STL
    const baseColor = [68, 74, 82];   // Tono pedestal CAD circular

    // 1. DIBUJAR MASAS DE FOLLAJE POSTERIORES (Z < 0)
    const backClusters = treeCanopy.filter((c) => c.z < 0).sort((a, b) => a.z - b.z);
    for (const c of backClusters) {
      renderFoliageCluster(plantCtx, c);
    }

    // 2. BASE / PEDESTAL CIRCULAR CAD STL (inspirado en la foto de referencia)
    const baseCx = 320, baseCy = 328, baseR = 70, baseSides = 16;
    for (let i = 0; i < baseSides; i++) {
      const a0 = (i / baseSides) * Math.PI * 2;
      const a1 = ((i + 1) / baseSides) * Math.PI * 2;
      const t0 = [baseCx + Math.cos(a0) * baseR, baseCy, Math.sin(a0) * baseR * 0.32];
      const t1 = [baseCx + Math.cos(a1) * baseR, baseCy, Math.sin(a1) * baseR * 0.32];
      const b0 = [baseCx + Math.cos(a0) * baseR, baseCy + 10, Math.sin(a0) * baseR * 0.32];
      const b1 = [baseCx + Math.cos(a1) * baseR, baseCy + 10, Math.sin(a1) * baseR * 0.32];

      if (t0[2] + t1[2] >= -15) {
        drawTriSTL(plantCtx, t0, t1, b1, baseColor, 0.36, 0.15);
        drawTriSTL(plantCtx, t0, b1, b0, baseColor, 0.36, 0.15);
      }
    }
    // Superficie superior del pedestal con relieve de tierra
    const baseCenter = [baseCx, baseCy, 6];
    for (let i = 0; i < baseSides; i++) {
      const a0 = (i / baseSides) * Math.PI * 2;
      const a1 = ((i + 1) / baseSides) * Math.PI * 2;
      const s0 = [baseCx + Math.cos(a0) * (baseR - 3), baseCy, Math.sin(a0) * (baseR - 3) * 0.32];
      const s1 = [baseCx + Math.cos(a1) * (baseR - 3), baseCy, Math.sin(a1) * (baseR - 3) * 0.32];
      drawTriSTL(plantCtx, baseCenter, s0, s1, [52, 58, 64], 0.30, 0.12);
    }

    // 3. ESTRUCTURA DE TRONCO Y RAMAS FACETADAS (Armadura STL)
    // Coordenadas calculadas según el balanceo del tronco
    const tBase = [320, 328, 0];
    const tMid = [320 + Math.sin(trunkAngle) * 45, 285, 4];
    const tFork = [320 + Math.sin(trunkAngle) * 90, 240, 2];

    drawBranchSegment(plantCtx, tBase, tMid, 12, 10, woodColor);
    drawBranchSegment(plantCtx, tMid, tFork, 10, 8.5, woodColor);

    // RAMA IZQUIERDA
    const bL1 = [tFork[0] - 70, 195, 10];
    const bL_low = [bL1[0] - 55, 210, 18];
    const bL_outer = [bL_low[0] - 35, 205, 14];
    const bL_high = [bL1[0] - 25, 150, 6];

    drawBranchSegment(plantCtx, tFork, bL1, 8, 6, woodColor);
    drawBranchSegment(plantCtx, bL1, bL_low, 5.5, 4, woodColor);
    drawBranchSegment(plantCtx, bL_low, bL_outer, 4, 2.5, woodColor);
    drawBranchSegment(plantCtx, bL1, bL_high, 5.5, 3.5, woodColor);

    // RAMA CENTRAL / CORONA
    const bC1 = [tFork[0] + Math.sin(trunkAngle) * 15, 180, 4];
    const bC_apex = [bC1[0] + Math.sin(trunkAngle) * 20, 115, 2];
    const bC_left = [bC1[0] - 40, 130, -6];
    const bC_right = [bC1[0] + 40, 130, -6];

    drawBranchSegment(plantCtx, tFork, bC1, 8, 6.5, woodColor);
    drawBranchSegment(plantCtx, bC1, bC_apex, 6, 4, woodColor);
    drawBranchSegment(plantCtx, bC1, bC_left, 5, 3, woodColor);
    drawBranchSegment(plantCtx, bC1, bC_right, 5, 3, woodColor);

    // RAMA DERECHA
    const bR1 = [tFork[0] + 75, 200, 10];
    const bR_low = [bR1[0] + 55, 215, 18];
    const bR_outer = [bR_low[0] + 35, 210, 14];
    const bR_high = [bR1[0] + 25, 155, 6];

    drawBranchSegment(plantCtx, tFork, bR1, 8, 6, woodColor);
    drawBranchSegment(plantCtx, bR1, bR_low, 5.5, 4, woodColor);
    drawBranchSegment(plantCtx, bR_low, bR_outer, 4, 2.5, woodColor);
    drawBranchSegment(plantCtx, bR1, bR_high, 5.5, 3.5, woodColor);

    // 4. DIBUJAR MASAS DE FOLLAJE FRONTALES (Z >= 0), ordenadas por Z
    const frontClusters = treeCanopy.filter((c) => c.z >= 0).sort((a, b) => a.z - b.z);
    for (const c of frontClusters) {
      renderFoliageCluster(plantCtx, c);
    }
  }

  function setSrc(src, status) {
    S.src = src; prev = null;
    if ($("srcDemo")) $("srcDemo").setAttribute("aria-pressed", String(src === "demo"));
    if ($("srcPlant")) $("srcPlant").setAttribute("aria-pressed", String(src === "plant"));
    $("srcCam").setAttribute("aria-pressed", String(src === "cam" || src === "camoff"));
    $("srcFile").setAttribute("aria-pressed", String(src === "file"));
    $("camCtx").hidden = !(src === "cam" || src === "camoff");
    $("vidCtx").hidden = src !== "file";
    $("camOff").textContent = src === "camoff" ? "Encender cámara" : "Apagar cámara";
    $("status").textContent = status;
  }
  function stopStream() { if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; } }
  async function startCam() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("sin API");
      stopStream(); video.pause(); video.removeAttribute("src");
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360 }, audio: false });
      video.srcObject = stream; await video.play();
      setSrc("cam", "Fuente: cámara");
    } catch (e) {
      toast("Esta vista no permite usar la cámara: abre la versión local o la de GitHub Pages");
      $("status").textContent = "Cámara bloqueada en esta vista · versión local (localhost) o GitHub Pages";
    }
  }
  if ($("srcDemo")) $("srcDemo").addEventListener("click", () => { stopStream(); video.pause(); setSrc("demo", "Fuente: ejemplo · calle sintética"); });
  if ($("srcPlant")) $("srcPlant").addEventListener("click", () => { stopStream(); video.pause(); setSrc("plant", "Fuente: planta interactiva (escultura STL)"); });
  $("srcCam").addEventListener("click", startCam);
  $("camOff").addEventListener("click", () => {
    if (S.src === "cam") { stopStream(); video.srcObject = null; setSrc("camoff", "Cámara apagada"); }
    else startCam();
  });
  $("srcFile").addEventListener("click", () => $("fileInput").click());
  $("vChange").addEventListener("click", () => $("fileInput").click());
  $("fileInput").addEventListener("change", async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    stopStream(); video.srcObject = null; video.src = URL.createObjectURL(f); video.loop = $("vLoop").getAttribute("aria-pressed") === "true";
    try { await video.play(); } catch (_) {}
    setSrc("file", "Fuente: " + f.name);
    e.target.value = "";
  });
  $("vPlay").addEventListener("click", () => { video.play().catch(() => {}); });
  $("vPause").addEventListener("click", () => video.pause());
  $("vLoop").addEventListener("click", (e) => {
    video.loop = !video.loop; e.currentTarget.setAttribute("aria-pressed", String(video.loop));
    toast(video.loop ? "Loop activado" : "Loop desactivado");
  });

  // ================= capas =================
  function bindToggle(id, key, after) {
    $(id).addEventListener("click", (e) => { S[key] = !S[key]; e.currentTarget.setAttribute("aria-pressed", String(S[key])); if (after) after(); updVisState(); });
  }
  function updVisState() {
    const on = [S.lines && "líneas", S.notes && "notas", S.parts && "partíc."].filter(Boolean);
    $("stVis").textContent = S.view === "mask" ? "máquina" : on.length ? on.length + " capas" : "solo video";
  }
  bindToggle("tLines", "lines"); bindToggle("tNotes", "notes"); bindToggle("tParts", "parts", () => { parts.length = 0; });
  $("tSignal").addEventListener("click", (e) => { const on = $("signal").hidden; $("signal").hidden = !on; e.currentTarget.setAttribute("aria-pressed", String(on)); });
  $("sigHide").addEventListener("click", () => { $("signal").hidden = true; $("tSignal").setAttribute("aria-pressed", "false"); });

  // ================= audio =================
  let ac = null, main = null, master, analyser, recDest, shape;
  const impulses = new WeakMap();
  function impulse(ctx) {
    if (impulses.has(ctx)) return impulses.get(ctx);
    const len = Math.floor(ctx.sampleRate * 2.6), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    impulses.set(ctx, buf); return buf;
  }
  function buildChain(ctx) {
    const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = S.cut; filter.Q.value = 0.8;
    const dry = ctx.createGain(), wet = ctx.createGain(), conv = ctx.createConvolver(), out = ctx.createGain();
    conv.buffer = impulse(ctx);
    filter.connect(dry); filter.connect(conv); conv.connect(wet); dry.connect(out); wet.connect(out);
    const ch = { input: filter, filter, dry, wet, out }; setRev(ch); return ch;
  }
  function setRev(ch) { ch.dry.gain.value = 1 - S.rev * 0.6; ch.wet.gain.value = S.rev * 0.9; }
  // ================= catálogo de sonidos =================
  const CATALOG_SAMPLES = [
    { id: "campana_grave_do2", name: "Campana Grave Do2", category: "grave", start: 48.00, dur: 2.2, rootMidi: 36, rootFreq: 65, file: "sonidos/campana_grave_do2.wav" },
    { id: "campana_grave_sol2", name: "Campana Grave Sol2", category: "grave", start: 25.25, dur: 3.0, rootMidi: 43, rootFreq: 98, file: "sonidos/campana_grave_sol2.wav" },
    { id: "campana_baja_do3", name: "Campana Baja Do3", category: "media", start: 50.15, dur: 2.2, rootMidi: 48, rootFreq: 130, file: "sonidos/campana_baja_do3.wav" },
    { id: "campana_media_mi3", name: "Campana Media Mi3", category: "media", start: 67.00, dur: 2.5, rootMidi: 52, rootFreq: 168, file: "sonidos/campana_media_mi3.wav" },
    { id: "campana_media_sol3", name: "Campana Media Sol3", category: "media", start: 49.50, dur: 2.0, rootMidi: 55, rootFreq: 196, file: "sonidos/campana_media_sol3.wav" },
    { id: "campana_media_do4", name: "Campana Media Do4", category: "media", start: 44.00, dur: 2.2, rootMidi: 60, rootFreq: 260, file: "sonidos/campana_media_do4.wav" },
    { id: "campanilla_aguda_si4", name: "Campanilla Si4", category: "aguda", start: 0.82, dur: 2.4, rootMidi: 71, rootFreq: 490, file: "sonidos/campanilla_aguda_si4.wav" },
    { id: "campanilla_aguda_do5", name: "Campanilla Do5", category: "aguda", start: 5.25, dur: 2.8, rootMidi: 72, rootFreq: 511, file: "sonidos/campanilla_aguda_do5.wav" },
    { id: "campanilla_aguda_re5", name: "Campanilla Re5", category: "aguda", start: 30.30, dur: 2.6, rootMidi: 74, rootFreq: 527, file: "sonidos/campanilla_aguda_re5.wav" },
    { id: "rafaga_viento_01", name: "Ráfaga de Viento 1", category: "viento", start: 3.35, dur: 2.8, rootMidi: 72, rootFreq: 511, file: "sonidos/rafaga_viento_01.wav" },
    { id: "rafaga_viento_02", name: "Ráfaga de Viento 2", category: "viento", start: 33.75, dur: 3.2, rootMidi: 71, rootFreq: 505, file: "sonidos/rafaga_viento_02.wav" },
    { id: "rafaga_viento_03", name: "Ráfaga de Viento 3", category: "viento", start: 70.50, dur: 3.5, rootMidi: 71, rootFreq: 505, file: "sonidos/rafaga_viento_03.wav" },
    { id: "resonancia_zen", name: "Resonancia Zen", category: "grave", start: 74.70, dur: 3.4, rootMidi: 36, rootFreq: 65, file: "sonidos/resonancia_zen.wav" }
  ];

  const BANCO = {};
  let catalogLoaded = false;
  let catalogLoadingPromise = null;
  let catalogPlayIndex = 0;

  async function loadCatalog(ctx) {
    if (catalogLoaded) return;
    if (catalogLoadingPromise) return catalogLoadingPromise;

    catalogLoadingPromise = (async () => {
      try {
        let masterAudio = null;
        for (const url of ["sonidos/catalogo_sonidos.mp3", "catalogo_sonidos.mp3", "leaves_wind_chimes.m4a"]) {
          try {
            const resp = await fetch(url);
            if (resp.ok) {
              const buf = await resp.arrayBuffer();
              masterAudio = await ctx.decodeAudioData(buf);
              break;
            }
          } catch (_) {}
        }

        for (const item of CATALOG_SAMPLES) {
          if (masterAudio && masterAudio.duration >= (item.start + item.dur * 0.4)) {
            const startSamp = Math.floor(item.start * masterAudio.sampleRate);
            const numSamp = Math.floor(item.dur * masterAudio.sampleRate);
            const subBuf = ctx.createBuffer(masterAudio.numberOfChannels, numSamp, masterAudio.sampleRate);
            for (let ch = 0; ch < masterAudio.numberOfChannels; ch++) {
              const srcData = masterAudio.getChannelData(ch);
              const dstData = subBuf.getChannelData(ch);
              for (let i = 0; i < numSamp; i++) {
                let s = (startSamp + i < srcData.length) ? srcData[startSamp + i] : 0;
                if (i < 200) s *= (i / 200);
                const rem = numSamp - i;
                if (rem < masterAudio.sampleRate * 0.22) s *= (rem / (masterAudio.sampleRate * 0.22));
                dstData[i] = s;
              }
            }
            BANCO[item.id] = subBuf;
          } else {
            try {
              const wResp = await fetch(item.file);
              if (wResp.ok) {
                const wBuf = await wResp.arrayBuffer();
                BANCO[item.id] = await ctx.decodeAudioData(wBuf);
              }
            } catch (_) {}
          }
        }
        catalogLoaded = Object.keys(BANCO).length > 0;
      } catch (err) {
        console.warn("Error cargando catálogo de sonidos:", err);
      } finally {
        catalogLoadingPromise = null;
      }
    })();
    return catalogLoadingPromise;
  }

  function initAudio() {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    main = buildChain(ac);
    master = ac.createGain(); master.gain.value = S.vol;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    analyser = ac.createAnalyser(); analyser.fftSize = 1024;
    shape = ac.createAnalyser(); shape.fftSize = 2048; main.filter.connect(shape);
    recDest = ac.createMediaStreamDestination();
    main.out.connect(master); master.connect(comp); comp.connect(analyser); analyser.connect(ac.destination); comp.connect(recDest);
    loadCatalog(ac);
  }

  function voice(ctx, inputs, midi, vel, pan) {
    const t = ctx.currentTime + 0.005;
    loadCatalog(ctx);

    const g = ctx.createGain();
    const peak = Math.max(0.04, Math.min(1.2, vel * 0.90));
    const atk = Math.max(0.003, S.atk);
    const rel = Math.max(0.1, S.rel);
    const totalDur = atk + rel * 1.5;

    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + totalDur);

    let node = g;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-0.95, Math.min(0.95, pan));
      g.connect(p);
      node = p;
    }
    inputs.forEach((i) => node.connect(i));

    if (S.sndType === "catalog" && catalogLoaded) {
      let chosenSample = null;
      if (S.catPreset === "high") {
        const agudas = CATALOG_SAMPLES.filter((s) => s.category === "aguda");
        chosenSample = agudas[catalogPlayIndex % agudas.length];
      } else if (S.catPreset === "low") {
        const graves = CATALOG_SAMPLES.filter((s) => s.category === "grave");
        chosenSample = graves[catalogPlayIndex % graves.length];
      } else if (S.catPreset === "wind") {
        const vientos = CATALOG_SAMPLES.filter((s) => s.category === "viento");
        chosenSample = vientos[catalogPlayIndex % vientos.length];
      } else if (S.catPreset === "random") {
        const pool = CATALOG_SAMPLES.filter((s) => s.category !== "viento");
        chosenSample = pool[Math.floor(Math.random() * pool.length)];
      } else {
        // scale: multimuestra afinada a escala
        const tunedPool = CATALOG_SAMPLES.filter((s) => s.category !== "viento");
        let bestDist = 999;
        for (const s of tunedPool) {
          const dist = Math.abs(midi - s.rootMidi);
          if (dist < bestDist) {
            bestDist = dist;
            chosenSample = s;
          }
        }
      }
      catalogPlayIndex++;

      const buf = chosenSample && BANCO[chosenSample.id];
      if (buf) {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const semitones = S.catPreset === "wind" ? 0 : (midi - chosenSample.rootMidi);
        src.playbackRate.value = Math.pow(2, semitones / 12);
        src.connect(g);
        src.start(t);
        src.stop(t + totalDur);
        return totalDur;
      }
    }

    if (S.sndType === "synth") {
      const osc = ctx.createOscillator();
      osc.type = S.wave;
      osc.frequency.setValueAtTime(mtof(midi), t);
      osc.connect(g);
      osc.start(t);
      osc.stop(t + totalDur);
      return totalDur;
    } else {
      // Síntesis física de campanas inarmónicas Euler-Bernoulli
      const f0 = mtof(midi);
      const partials = [1.0, 2.756, 5.404];
      const partialGains = [0.65, 0.25, 0.10];
      for (let p = 0; p < partials.length; p++) {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = f0 * partials[p];
        const pg = ctx.createGain();
        pg.gain.value = partialGains[p];
        osc.connect(pg);
        pg.connect(g);
        osc.start(t);
        osc.stop(t + totalDur);
      }
      return totalDur;
    }
  }
  const soundOn = () => ac && ac.state === "running";
  function updSoundBtn() {
    const on = soundOn();
    $("soundBtn").setAttribute("aria-pressed", String(on));
    $("soundBtn").textContent = on ? "■ Apagar sonido" : "▶ Activar sonido";
    $("noteDl").disabled = !on || lastMidi == null;
    $("recBtn").disabled = !on && !recording;
  }
  $("soundBtn").addEventListener("click", async () => {
    if (!ac) initAudio();
    try { if (ac.state === "running") await ac.suspend(); else await ac.resume(); } catch (_) {}
    updSoundBtn();
  });

  // ================= descargas =================
  let dlCap;
  async function downloadsCap() {
    if (dlCap !== undefined) return dlCap;
    try { dlCap = window.claude && window.claude.use ? await window.claude.use("downloads") : null; } catch (_) { dlCap = null; }
    return dlCap;
  }
  function wavFromBuffer(buf) {
    const ch = Math.min(2, buf.numberOfChannels), sr = buf.sampleRate, n = buf.length;
    const out = new ArrayBuffer(44 + n * ch * 2), v = new DataView(out);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, "RIFF"); v.setUint32(4, 36 + n * ch * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, ch, true); v.setUint32(24, sr, true); v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true);
    w(36, "data"); v.setUint32(40, n * ch * 2, true);
    const data = []; for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
    let o = 44;
    for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const s = Math.max(-1, Math.min(1, data[c][i])); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
    return new Blob([out], { type: "audio/wav" });
  }
  async function deliver(blob, base) {
    const cap = await downloadsCap();
    if (cap) {
      try { await cap.save({ filename: base + ".webm", data: blob }); toast("Descarga lista"); }
      catch (e) { toast(e && e.code === "declined" ? "Descarga cancelada" : "No se pudo descargar en esta vista"); }
      return;
    }
    let file = blob, ext = ".webm";
    try { const buf = await ac.decodeAudioData(await blob.arrayBuffer()); file = wavFromBuffer(buf); ext = ".wav"; } catch (_) {}
    const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = base + ext;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast("Descargando " + base + ext);
  }
  function pickMime() {
    if (!window.MediaRecorder) return null;
    for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/ogg"]) if (MediaRecorder.isTypeSupported(m)) return m;
    return "";
  }
  let recorder = null, recording = false, recChunks = [], recBlob = null, recStart = 0;
  $("recBtn").addEventListener("click", () => {
    if (!ac) return;
    const mime = pickMime();
    if (mime === null) { $("recHint").textContent = "Este navegador no permite grabar audio."; return; }
    if (!recording) {
      recChunks = []; recorder = new MediaRecorder(recDest.stream, mime ? { mimeType: mime } : undefined);
      recorder.ondataavailable = (e) => { if (e.data.size) recChunks.push(e.data); };
      recorder.onstop = () => { recBlob = new Blob(recChunks, { type: recorder.mimeType || "audio/webm" }); $("recDl").disabled = false; $("recHint").textContent = "Grabación lista para descargar."; $("stRec").textContent = "lista"; };
      recorder.start(); recording = true; recStart = performance.now();
      $("recBtn").setAttribute("aria-pressed", "true"); $("recBtn").textContent = "■ Detener"; $("recBadge").hidden = false; $("stRec").textContent = "grabando";
    } else {
      recorder.stop(); recording = false;
      $("recBtn").setAttribute("aria-pressed", "false"); $("recBtn").textContent = "● Grabar"; $("recBadge").hidden = true;
    }
  });
  $("recDl").addEventListener("click", () => { if (recBlob) deliver(recBlob, "oir-la-luz-grabacion"); });
  let lastMidi = null;
  $("noteDl").addEventListener("click", () => {
    if (!soundOn() || lastMidi == null) return;
    const mime = pickMime(); if (mime === null) { toast("Este navegador no permite grabar audio"); return; }
    const ch = buildChain(ac), dest = ac.createMediaStreamDestination(); ch.out.connect(dest);
    const rec = new MediaRecorder(dest.stream, mime ? { mimeType: mime } : undefined), chunks = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const m = lastMidi;
    rec.onstop = () => deliver(new Blob(chunks, { type: rec.mimeType || "audio/webm" }), "nota-" + noteName(m).replace("#", "s") + "-" + Math.round(mtof(m)) + "Hz");
    rec.start(); $("noteDl").disabled = true; toast("Grabando " + noteName(m));
    const dur = voice(ac, [ch.input, main.input], m, 0.9, 0);
    setTimeout(() => { rec.stop(); updSoundBtn(); }, (dur + 1.4) * 1000);
  });

  // ================= detección =================
  const PW = 128, PH = 72;
  const proc = document.createElement("canvas"); proc.width = PW; proc.height = PH;
  const pctx = proc.getContext("2d", { willReadFrequently: true });
  let prev = null; const mask = new Uint8Array(PW * PH);
  let energy = [], flash = [], last = [];
  const parts = [], roll = [];
  function ensureGrid() { const n = S.cols * S.rows; if (energy.length !== n) { energy = new Array(n).fill(0); flash = new Array(n).fill(0); last = new Array(n).fill(0); } }
  function cellMidi(c, r) { const sc = SCALES[S.scale]; return S.root + sc[c % sc.length] + 12 * Math.floor(c / sc.length) + 12 * (S.rows - 1 - r); }
  function activeSource() { return S.src === "demo" ? demo : S.src === "plant" ? plantCanvas : (S.src === "cam" || S.src === "file") && video.readyState >= 2 ? video : null; }
  function srcAspect(src) { if (!src) return 16 / 9; if (src === demo || src === plantCanvas) return 16 / 9; return (video.videoWidth || 16) / (video.videoHeight || 9); }

  // Interacción táctil / cursor con la escultura viva STL
  const stageEl = $("stage");
  stageEl.addEventListener("pointermove", (e) => {
    if (S.src !== "plant") return;
    const r = view.getBoundingClientRect();
    const ar = 16 / 9;
    let bw = r.width, bh = r.width / ar;
    if (bh > r.height) { bh = r.height; bw = r.height * ar; }
    const bx = (r.width - bw) / 2, by = (r.height - bh) / 2;
    const x = ((e.clientX - r.left - bx) / bw) * 640;
    const y = ((e.clientY - r.top - by) / bh) * 360;
    if (prevPlantMX < -500) { prevPlantMX = x; prevPlantMY = y; }
    plantMouseVX = x - prevPlantMX;
    plantMouseVY = y - prevPlantMY;
    plantMouseSpeed = Math.hypot(plantMouseVX, plantMouseVY);
    prevPlantMX = x; prevPlantMY = y;
    plantMouseX = x; plantMouseY = y;
  });
  stageEl.addEventListener("pointerleave", () => {
    plantMouseX = -1000; plantMouseY = -1000;
    plantMouseVX = 0; plantMouseVY = 0; plantMouseSpeed = 0;
    prevPlantMX = -1000; prevPlantMY = -1000;
  });

  function getScaleNotes() {
    const sc = SCALES[S.scale] || SCALES.pmaj;
    const notes = [];
    const totalNotes = 16;
    for (let i = 0; i < totalNotes; i++) {
      const oct = Math.floor(i / sc.length);
      const deg = sc[i % sc.length];
      notes.push(S.root + oct * 12 + deg);
    }
    notes.sort((a, b) => a - b);
    return notes;
  }

  let trackedBoxes = [];
  let nextBoxId = 1;
  let pulseIdx = 0;
  let lastPulseT = 0;

  function analyse(now) {
    const src = activeSource(); if (!src) { prev = null; return; }
    pctx.save();
    if (S.src === "cam" && S.mirror) { pctx.translate(PW, 0); pctx.scale(-1, 1); }
    pctx.drawImage(src, 0, 0, PW, PH); pctx.restore();
    const d = pctx.getImageData(0, 0, PW, PH).data, gray = new Uint8Array(PW * PH);
    for (let i = 0, j = 0; i < gray.length; i++, j += 4) gray[i] = (d[j] * 0.3 + d[j + 1] * 0.59 + d[j + 2] * 0.11) | 0;

    const BX = 24, BY = 14;
    const bw = PW / BX, bh = PH / BY;
    const blockE = new Float32Array(BX * BY);
    const blockPx = bw * bh;

    if (prev) {
      let changed = 0;
      for (let i = 0; i < gray.length; i++) {
        const df = Math.abs(gray[i] - prev[i]);
        if (df > S.thr) {
          mask[i] = Math.min(255, df);
          changed++;
        } else {
          mask[i] = 0;
        }
      }

      // cálculo de energía por bloque
      for (let by = 0; by < BY; by++) {
        const y0 = Math.floor(by * bh), y1 = Math.floor((by + 1) * bh);
        for (let bx = 0; bx < BX; bx++) {
          const x0 = Math.floor(bx * bw), x1 = Math.floor((bx + 1) * bw);
          let count = 0;
          for (let y = y0; y < y1; y++) {
            const rowOff = y * PW;
            for (let x = x0; x < x1; x++) {
              if (mask[rowOff + x] > 0) count++;
            }
          }
          blockE[by * BX + bx] = count / blockPx;
        }
      }

      // partículas breves
      const p = S.parts ? Math.min(0.35, 50 / Math.max(1, changed)) : 0;
      if (p) {
        for (let y = 0; y < PH; y++) {
          for (let x = 0; x < PW; x++) {
            const i = y * PW + x;
            if (mask[i] && Math.random() < p && parts.length < 300) {
              const k = Math.min(1, (mask[i] - S.thr) / 110);
              parts.push({ x: (x + Math.random()) / PW, y: (y + Math.random()) / PH, vy: -0.01 - Math.random() * 0.02, k, life: 1, decay: 1.6 + Math.random() * 1.2 });
            }
          }
        }
      }
    }
    prev = gray;

    // Sensibilidad calibrada: solo formamos cajas con cúmulos reales (mínimo 2 bloques conectados)
    const visited = new Uint8Array(BX * BY);
    const rawClusters = [];
    const sensThreshold = Math.max(0.018, S.sens * 0.75);

    for (let by = 0; by < BY; by++) {
      for (let bx = 0; bx < BX; bx++) {
        const idx = by * BX + bx;
        if (visited[idx] || blockE[idx] < sensThreshold) continue;

        const queue = [idx];
        visited[idx] = 1;
        let minBx = bx, maxBx = bx, minBy = by, maxBy = by;
        let totalE = 0, blockCount = 0;

        while (queue.length > 0) {
          const curr = queue.shift();
          const cbx = curr % BX, cby = Math.floor(curr / BX);
          totalE += blockE[curr];
          blockCount++;
          if (cbx < minBx) minBx = cbx;
          if (cbx > maxBx) maxBx = cbx;
          if (cby < minBy) minBy = cby;
          if (cby > maxBy) maxBy = cby;

          const neighbors = [];
          if (cbx > 0) neighbors.push(curr - 1);
          if (cbx < BX - 1) neighbors.push(curr + 1);
          if (cby > 0) neighbors.push(curr - BX);
          if (cby < BY - 1) neighbors.push(curr + BX);

          for (const n of neighbors) {
            if (!visited[n] && blockE[n] >= sensThreshold) {
              visited[n] = 1;
              queue.push(n);
            }
          }
        }

        const padX = 0.008, padY = 0.010;
        const x = Math.max(0.01, minBx / BX - padX);
        const y = Math.max(0.01, minBy / BY - padY);
        const w = Math.min(0.98 - x, (maxBx - minBx + 1) / BX + padX * 2);
        const h = Math.min(0.98 - y, (maxBy - minBy + 1) / BY + padY * 2);
        const avgE = totalE / blockCount;

        // Requiere al menos 2 bloques conectados y tamaño mínimo para descartar ruido puntual
        if (blockCount >= 2 && avgE >= sensThreshold && (w >= 0.035 && h >= 0.035)) {
          rawClusters.push({ x, y, w, h, cx: x + w / 2, cy: y + h / 2, energy: avgE });
        }
      }
    }

    // Emparejar clusters con cajas rastreadas existentes
    const matched = new Set();
    for (const c of rawClusters) {
      let bestBox = null, bestDist = 0.28;
      for (const b of trackedBoxes) {
        if (matched.has(b)) continue;
        const dist = Math.hypot(b.cx - c.cx, b.cy - c.cy);
        if (dist < bestDist) { bestDist = dist; bestBox = b; }
      }

      if (bestBox) {
        matched.add(bestBox);
        const moveDist = Math.hypot(bestBox.cx - c.cx, bestBox.cy - c.cy);
        bestBox.speed = (bestBox.speed || 0.02) * 0.5 + moveDist * 0.5;
        bestBox.x += (c.x - bestBox.x) * 0.45;
        bestBox.y += (c.y - bestBox.y) * 0.45;
        bestBox.w += (c.w - bestBox.w) * 0.45;
        bestBox.h += (c.h - bestBox.h) * 0.45;
        bestBox.cx = bestBox.x + bestBox.w / 2;
        bestBox.cy = bestBox.y + bestBox.h / 2;
        bestBox.energy = bestBox.energy * 0.5 + c.energy * 0.5;
        bestBox.life = 1.0;
      } else {
        const newB = {
          id: nextBoxId++,
          code: "VIDA",
          phrase: "VIDA",
          x: c.x, y: c.y, w: c.w, h: c.h,
          cx: c.cx, cy: c.cy,
          energy: c.energy,
          speed: 0.02,
          life: 1.0,
          flash: 0,
          lastNoteIdx: -1,
          lastPlayedTime: 0
        };
        trackedBoxes.push(newB);
        matched.add(newB);
      }
    }

    // Desvanecer después de 1 segundo (a 15 fps: 1/15 por cuadro)
    for (const b of trackedBoxes) {
      if (!matched.has(b)) b.life -= (1 / 15);
    }
    trackedBoxes = trackedBoxes.filter((b) => b.life > 0.01);
    if (trackedBoxes.length > 14) {
      trackedBoxes.sort((a, b) => (b.energy * b.life) - (a.energy * a.life));
      trackedBoxes = trackedBoxes.slice(0, 14);
    }

    // ================= DISPARO DE SONIDO =================
    const notes = getScaleNotes();

    // MODO 1: ARPA DINÁMICA (al cruzar alturas)
    if (S.soundMode === "harp") {
      for (const b of trackedBoxes) {
        if (b.life < 0.25) continue;
        const normH = Math.max(0, Math.min(0.999, 1 - b.cy));
        const noteIdx = Math.floor(normH * notes.length);

        if (noteIdx !== b.lastNoteIdx && (now - b.lastPlayedTime > S.cool * 0.65)) {
          b.lastNoteIdx = noteIdx;
          b.lastPlayedTime = now;
          b.flash = 1;
          const m = notes[noteIdx];

          // Dinámica de volumen: suave -> sonido bien despacio (0.08 - 0.20), fuerte -> sonido alto (0.85 - 1.0)
          const speedFactor = Math.min(1.0, (b.speed || 0.01) / 0.065);
          const energyFactor = Math.min(1.0, (b.energy || 0.04) / 0.28);
          const motionFactor = speedFactor * 0.70 + energyFactor * 0.30;
          const vel = Math.max(0.08, Math.min(1.0, 0.08 + Math.pow(motionFactor, 1.25) * 0.92));
          const pan = S.mapPan ? (b.cx * 2 - 1) * 0.85 : 0;

          if (soundOn()) voice(ac, [main.input], m, vel, pan);
          roll.push({ t: now, m }); lastMidi = m; lastFreq = mtof(m); lastNoteT = performance.now(); updScopeCap();
          $("lastNote").textContent = noteName(m);
          $("lastHz").textContent = Math.round(mtof(m)) + " Hz";
          $("lastZone").textContent = "VIDA · " + (motionFactor < 0.28 ? "Muy suave" : motionFactor < 0.58 ? "Suave" : motionFactor < 0.82 ? "Medio" : "Fuerte");
          $("lastPct").textContent = Math.round(b.energy * 100) + " %";
          $("noteDl").disabled = !soundOn();
        }
      }
    }

    // MODO 2: PULSO RÍTMICO (arpegiador sobre las cajas activas)
    if (S.soundMode === "pulse") {
      const pulseInterval = Math.max(130, S.cool * 0.75);
      if (now - lastPulseT >= pulseInterval) {
        lastPulseT = now;
        const alive = trackedBoxes.filter((b) => b.life > 0.25).sort((a, b) => a.y - b.y);
        if (alive.length > 0) {
          pulseIdx = (pulseIdx + 1) % alive.length;
          const b = alive[pulseIdx];
          const normH = Math.max(0, Math.min(0.999, 1 - b.cy));
          const noteIdx = Math.floor(normH * notes.length);
          const m = notes[noteIdx];
          b.lastNoteIdx = noteIdx;
          b.flash = 1;

          // Dinámica de volumen: suave -> sonido despacio, fuerte -> sonido alto
          const speedFactor = Math.min(1.0, (b.speed || 0.01) / 0.065);
          const energyFactor = Math.min(1.0, (b.energy || 0.04) / 0.28);
          const motionFactor = speedFactor * 0.70 + energyFactor * 0.30;
          const vel = Math.max(0.08, Math.min(1.0, 0.08 + Math.pow(motionFactor, 1.25) * 0.92));
          const pan = S.mapPan ? (b.cx * 2 - 1) * 0.85 : 0;

          if (soundOn()) voice(ac, [main.input], m, vel, pan);
          roll.push({ t: now, m }); lastMidi = m; lastFreq = mtof(m); lastNoteT = performance.now(); updScopeCap();
          $("lastNote").textContent = noteName(m);
          $("lastHz").textContent = Math.round(mtof(m)) + " Hz";
          $("lastZone").textContent = "VIDA [" + (pulseIdx + 1) + "/" + alive.length + "]";
          $("lastPct").textContent = Math.round(b.energy * 100) + " %";
          $("noteDl").disabled = !soundOn();
        }
      }
    }
  }

  // ================= dibujo =================
  const view = $("view"), vctx = view.getContext("2d");
  const maskC = document.createElement("canvas"); maskC.width = PW; maskC.height = PH;
  const mctx = maskC.getContext("2d"), mimg = mctx.createImageData(PW, PH);
  function fit(c) {
    const r = c.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    return dpr;
  }
  function drawView(dt) {
    const dpr = fit(view), W = view.width, H = view.height;
    vctx.fillStyle = "#05061A"; vctx.fillRect(0, 0, W, H);
    const src = activeSource(), ar = srcAspect(src);
    let bw = W, bh = W / ar; if (bh > H) { bh = H; bw = H * ar; }
    const bx = (W - bw) / 2, by = (H - bh) / 2;
    if (S.view === "mask") {
      for (let i = 0; i < PW * PH; i++) {
        const j = i * 4, m = mask[i];
        if (m) { const k = Math.min(1, (m - S.thr) / 110); mimg.data[j] = 59 + (226 - 59) * k; mimg.data[j + 1] = 59 + (255 - 59) * k; mimg.data[j + 2] = 255 - 196 * k; }
        else { mimg.data[j] = 8; mimg.data[j + 1] = 9; mimg.data[j + 2] = 32; }
        mimg.data[j + 3] = 255;
      }
      mctx.putImageData(mimg, 0, 0);
      vctx.imageSmoothingEnabled = false; vctx.drawImage(maskC, bx, by, bw, bh); vctx.imageSmoothingEnabled = true;
    } else if (src) {
      vctx.save();
      if (S.src === "cam" && S.mirror) { vctx.translate(bx * 2 + bw, 0); vctx.scale(-1, 1); }
      vctx.drawImage(src, bx, by, bw, bh); vctx.restore();
      if (S.veil > 0) { vctx.fillStyle = "rgba(5,6,26," + S.veil.toFixed(2) + ")"; vctx.fillRect(bx, by, bw, bh); }
    } else {
      vctx.fillStyle = "rgba(238,240,255,.6)"; vctx.font = Math.round(11 * dpr) + "px 'IBM Plex Mono', monospace"; vctx.textAlign = "center";
      vctx.fillText(S.src === "camoff" ? "CÁMARA APAGADA" : "ESPERANDO IMAGEN", W / 2, H / 2); vctx.textAlign = "start";
    }

    // Filtro verde muy traslúcido dentro de las cajas activas (paleta verde fósforo)
    for (const b of trackedBoxes) {
      if (b.life < 0.02) continue;
      const alpha = Math.max(0, Math.min(1, b.life));
      const rx = bx + b.x * bw, ry = by + b.y * bh, rw = b.w * bw, rh = b.h * bh;
      const isNeon = b.flash > 0.08;
      const fillAlpha = (isNeon ? 0.24 : 0.12) * alpha;
      vctx.fillStyle = "rgba(167,249,62," + fillAlpha.toFixed(3) + ")";
      vctx.fillRect(rx, ry, rw, rh);
    }

    // partículas: puntos breves, sin estela (verde fósforo y blanco)
    if (S.parts && S.view !== "mask") {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.y += p.vy * dt; p.life -= p.decay * dt;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        const a = (p.life * 0.55).toFixed(3);
        vctx.fillStyle = p.k > 0.55 ? "rgba(255,255,255," + a + ")" : "rgba(167,249,62," + a + ")";
        const s = (1 + p.k * 1.6) * dpr;
        vctx.fillRect(bx + p.x * bw - s / 2, by + p.y * bh - s / 2, s, s);
      }
    }

    // Arpa: cuerdas / alturas tenues de fondo
    if (S.lines && S.soundMode === "harp") {
      const totalNotes = 15;
      vctx.strokeStyle = "rgba(167,249,62,.09)";
      vctx.lineWidth = 1;
      vctx.beginPath();
      for (let i = 1; i < totalNotes; i++) {
        const y = Math.round(by + (i / totalNotes) * bh) + 0.5;
        vctx.moveTo(bx, y); vctx.lineTo(bx + bw, y);
      }
      vctx.stroke();
    }

    // Constelación: líneas verdes que conectan las cajas activas (paleta foto)
    if (S.lines && trackedBoxes.length > 1) {
      const alive = trackedBoxes.filter((b) => b.life > 0.08).sort((a, b) => a.y - b.y);
      if (alive.length > 1) {
        vctx.strokeStyle = "rgba(167,249,62,.65)";
        vctx.lineWidth = 1;
        vctx.beginPath();
        for (let i = 0; i < alive.length; i++) {
          const cx = bx + alive[i].cx * bw;
          const cy = by + alive[i].cy * bh;
          if (i === 0) vctx.moveTo(cx, cy);
          else vctx.lineTo(cx, cy);
        }
        vctx.stroke();

        // Bigotes horizontales estilo escaneo en verde
        vctx.strokeStyle = "rgba(167,249,62,.26)";
        vctx.beginPath();
        for (let i = 0; i < alive.length; i++) {
          const cx = bx + alive[i].cx * bw;
          const cy = by + alive[i].cy * bh;
          vctx.moveTo(Math.max(bx, cx - 60 * dpr), cy);
          vctx.lineTo(Math.min(bx + bw, cx + 60 * dpr), cy);
        }
        vctx.stroke();
      }
    }

    // Cajas delimitadoras de color blanco y textos blancos con la palabra "VIDA"
    const notesPool = getScaleNotes();
    for (const b of trackedBoxes) {
      if (b.life <= 0.01) continue;
      b.flash = Math.max(0, b.flash - dt * 2.8);
      const alpha = Math.max(0, Math.min(1, b.life));
      const rx = bx + b.x * bw, ry = by + b.y * bh;
      const rw = b.w * bw, rh = b.h * bh;
      const isNeon = b.flash > 0.08;

      if (S.lines) {
        vctx.lineWidth = 1;
        vctx.strokeStyle = isNeon ? "#FFFFFF" : "rgba(255,255,255," + (0.85 * alpha) + ")";
        vctx.strokeRect(Math.round(rx) + 0.5, Math.round(ry) + 0.5, Math.round(rw), Math.round(rh));
      }

      // Frase "VIDA" en mayúscula, texto blanco
      vctx.font = "500 " + Math.round(11 * dpr) + "px 'IBM Plex Mono', monospace";
      vctx.fillStyle = isNeon ? "#FFFFFF" : "rgba(255,255,255," + (0.95 * alpha) + ")";
      vctx.fillText("VIDA", rx, ry - 6 * dpr);

      // Nota si la capa de notas está activa, también en blanco
      if (S.notes && b.lastNoteIdx >= 0) {
        const m = notesPool[b.lastNoteIdx] || S.root;
        vctx.font = Math.round(9 * dpr) + "px 'IBM Plex Mono', monospace";
        vctx.fillStyle = isNeon ? "#FFFFFF" : "rgba(255,255,255," + (0.75 * alpha) + ")";
        vctx.fillText(noteName(m).toUpperCase(), rx + rw - 30 * dpr, ry + 12 * dpr);
      }
    }
  }

  const scope = $("scope"), sctx = scope.getContext("2d"), tbuf = new Uint8Array(1024);
  const WAVE_NAME = { sine: "seno", triangle: "triangular", square: "cuadrada", sawtooth: "sierra" };
  function waveVal(type, ph) {
    ph = ph - Math.floor(ph);
    if (type === "sine") return Math.sin(2 * Math.PI * ph);
    if (type === "square") return ph < 0.5 ? 1 : -1;
    if (type === "sawtooth") return 2 * ph - 1;
    return ph < 0.25 ? 4 * ph : ph < 0.75 ? 2 - 4 * ph : 4 * ph - 4;
  }
  function harmonic(type, n) {
    if (type === "sine") return n === 1 ? 1 : 0;
    if (type === "square") return n % 2 ? 1 / n : 0;
    if (type === "triangle") return n % 2 ? 1 / (n * n) : 0;
    return 1 / n;
  }
  const fbuf = new Float32Array(2048);
  let lastFreq = 0, lastNoteT = -1e9;
  function updScopeCap() {
    const f = lastFreq || mtof(S.root + 12);
    const PRESET_LABEL = { scale: "multimuestra", high: "campanillas agudas", low: "campanas graves", wind: "ráfagas viento", random: "aleatorio" };
    const sndLbl = S.sndType === "catalog" ? ("catálogo · " + (PRESET_LABEL[S.catPreset] || "campanillas")) : ("sintetizador · " + WAVE_NAME[S.wave]);
    $("scopeCap").textContent = "forma de onda · " + sndLbl;
    $("specCap").textContent = "armónicos · corte " + (S.cut >= 1000 ? (S.cut / 1000).toFixed(1) + "k" : S.cut);
  }
  function drawScope() {
    if ($("signal").hidden) return;
    const dpr = fit(scope), W = scope.width, H = scope.height;
    sctx.clearRect(0, 0, W, H);
    const split = Math.round(W * 0.6), pad = 6 * dpr, mid = H / 2, amp = H * 0.38;
    sctx.strokeStyle = "rgba(238,240,255,.14)"; sctx.lineWidth = 1;
    sctx.beginPath(); sctx.moveTo(0, Math.round(mid) + 0.5); sctx.lineTo(split - pad, Math.round(mid) + 0.5); sctx.moveTo(split + 0.5, 0); sctx.lineTo(split + 0.5, H); sctx.stroke();
    // señal real (si hay sonido), sincronizada al inicio del ciclo y escalada a la misma cantidad de ciclos
    const cycles = 2.5, wantLive = soundOn() && lastFreq && (performance.now() - lastNoteT) < (S.atk + S.rel * 1.4) * 1000 + 150;
    let livePts = null;
    if (wantLive) {
      shape.getFloatTimeDomainData(fbuf);
      let peak = 0; for (let i = 0; i < fbuf.length; i++) peak = Math.max(peak, Math.abs(fbuf[i]));
      if (peak > 0.004) {
        const period = ac.sampleRate / lastFreq, span = Math.min(fbuf.length - 1, Math.round(period * cycles));
        let i0 = 0; for (let i = 1; i < fbuf.length - span; i++) { if (fbuf[i - 1] <= 0 && fbuf[i] > 0) { i0 = i; break; } }
        livePts = []; for (let k = 0; k <= span; k++) livePts.push([k / span * (split - pad), mid - (fbuf[i0 + k] / peak) * amp]);
      }
    }
    // forma ideal de la onda elegida: en neón sin sonido, de fondo cuando hay señal real
    sctx.strokeStyle = livePts ? "rgba(238,240,255,.32)" : "#E2FF3B"; sctx.lineWidth = (livePts ? 1 : 1.6) * dpr;
    sctx.beginPath();
    for (let x = 0; x <= split - pad; x++) { const y = mid - waveVal(S.wave, x / (split - pad) * cycles) * amp; x ? sctx.lineTo(x, y) : sctx.moveTo(x, y); }
    sctx.stroke();
    if (livePts) {
      sctx.strokeStyle = "#E2FF3B"; sctx.lineWidth = 1.6 * dpr; sctx.beginPath();
      livePts.forEach(([x, y], k) => (k ? sctx.lineTo(x, y) : sctx.moveTo(x, y))); sctx.stroke();
    }
    // armónicos teóricos y curva del pasa-bajos (12 dB/oct); los armónicos sobre el corte se apagan
    const f0 = lastFreq || mtof(S.root + 12), N = 12, bw = (W - split - pad * 2) / N, hlCut = hlOn("cut");
    for (let n = 1; n <= N; n++) {
      const a = harmonic(S.wave, n); if (!a) continue;
      const h = Math.max(1, a * (H - pad * 2)), x = split + pad + (n - 1) * bw;
      sctx.fillStyle = f0 * n > S.cut ? "rgba(123,128,179,.45)" : "#E2FF3B";
      sctx.fillRect(Math.round(x + bw * 0.2), Math.round(H - pad - h), Math.max(1, Math.round(bw * 0.6)), Math.round(h));
    }
    sctx.strokeStyle = hlCut ? "#FFFFFF" : "rgba(238,240,255,.6)"; sctx.lineWidth = (hlCut ? 2 : 1) * dpr; sctx.setLineDash([3 * dpr, 3 * dpr]);
    sctx.beginPath();
    for (let x = 0; x <= W - split - pad * 2; x++) {
      const n = 0.5 + x / bw, r = (f0 * n) / S.cut, g = 1 / Math.sqrt(1 + r * r * r * r);
      const y = H - pad - g * (H - pad * 2); x ? sctx.lineTo(split + pad + x, y) : sctx.moveTo(split + pad + x, y);
    }
    sctx.stroke(); sctx.setLineDash([]);
  }

  // ---- envolvente: attack, release, reverb y volumen ----
  const envC = $("env"), ectx = envC.getContext("2d"), mbuf = new Float32Array(1024);
  let HL = { key: null, t: 0 };
  function hlOn(k) { return HL.key === k && performance.now() - HL.t < 1400; }
  function envAt(t) {
    const peak = S.vol, hold = 0.06;
    if (t < 0) return 0;
    if (t < S.atk) return peak * (t / S.atk);
    if (t < S.atk + hold) return peak * (0.6 + 0.4 * Math.exp(-(t - S.atk) / 0.08));
    const vh = peak * (0.6 + 0.4 * Math.exp(-hold / 0.08));
    return vh * Math.exp(-(t - S.atk - hold) / (S.rel / 4));
  }
  function updEnvCap() {
    $("envCapL").textContent = "envolvente · A " + Math.round(S.atk * 1000) + " ms · R " + Math.round(S.rel * 1000) + " ms";
    $("envCapR").textContent = "reverb " + Math.round(S.rev * 100) + " % · vol " + Math.round(S.vol * 100) + " %";
  }
  function drawEnv() {
    if ($("signal").hidden) return;
    const dpr = fit(envC), W = envC.width, H = envC.height, pad = 6 * dpr, meterW = 10 * dpr;
    ectx.clearRect(0, 0, W, H);
    const PW_ = W - meterW - pad * 3, base = H - pad, top = pad + 8 * dpr, hgt = base - top;
    const hold = 0.06, noteEnd = S.atk + hold + S.rel * 1.6, tail = S.rev > 0.01 ? 2.6 * S.rev + 0.4 : 0;
    const T = Math.max(0.5, noteEnd + tail);
    const X = (t) => pad + (t / T) * PW_, Y = (v) => base - v * hgt;
    ectx.strokeStyle = "rgba(238,240,255,.14)"; ectx.lineWidth = 1;
    ectx.beginPath(); ectx.moveTo(pad, Math.round(base) + 0.5); ectx.lineTo(pad + PW_, Math.round(base) + 0.5); ectx.moveTo(pad, Math.round(Y(1)) + 0.5); ectx.lineTo(pad + PW_, Math.round(Y(1)) + 0.5); ectx.stroke();
    // cola de reverb (zona sombreada)
    if (S.rev > 0.01) {
      const hlR = hlOn("rev");
      ectx.fillStyle = hlR ? "rgba(150,150,255,.45)" : "rgba(150,150,255,.2)";
      ectx.beginPath(); ectx.moveTo(X(S.atk), base);
      for (let i = 0; i <= 80; i++) { const t = S.atk + (T - S.atk) * i / 80; ectx.lineTo(X(t), Y(Math.max(envAt(t), S.rev * S.vol * 0.55 * Math.exp(-(t - S.atk) / (0.35 + S.rev * 0.9))))); }
      ectx.lineTo(X(T), base); ectx.closePath(); ectx.fill();
    }
    // tramos: attack y release resaltables
    const seg = (t0, t1, hl) => {
      ectx.strokeStyle = hl ? "#FFFFFF" : "#E2FF3B"; ectx.lineWidth = (hl ? 2.6 : 1.6) * dpr; ectx.beginPath();
      for (let i = 0; i <= 60; i++) { const t = t0 + (t1 - t0) * i / 60; i ? ectx.lineTo(X(t), Y(envAt(t))) : ectx.moveTo(X(t), Y(envAt(t))); }
      ectx.stroke();
    };
    const hlV = hlOn("vol");
    seg(0, S.atk, hlOn("atk") || hlV); seg(S.atk, S.atk + hold, hlV); seg(S.atk + hold, noteEnd, hlOn("rel") || hlV);
    // marcas A y R
    ectx.fillStyle = "rgba(238,240,255,.7)"; ectx.font = Math.round(9 * dpr) + "px 'IBM Plex Mono', monospace";
    ectx.fillText("A", X(S.atk / 2) - 3 * dpr, pad + 6 * dpr);
    ectx.fillText("R", X(S.atk + hold + S.rel * 0.5), pad + 6 * dpr);
    ectx.strokeStyle = "rgba(238,240,255,.25)"; ectx.setLineDash([2 * dpr, 3 * dpr]); ectx.beginPath();
    [S.atk, S.atk + hold].forEach((t) => { const x = Math.round(X(t)) + 0.5; ectx.moveTo(x, top); ectx.lineTo(x, base); }); ectx.stroke(); ectx.setLineDash([]);
    // cabezal de la última nota
    const el = (performance.now() - lastNoteT) / 1000;
    if (soundOn() && el >= 0 && el < T) { const x = Math.round(X(el)) + 0.5; ectx.strokeStyle = "rgba(238,240,255,.8)"; ectx.lineWidth = 1; ectx.beginPath(); ectx.moveTo(x, top - 4 * dpr); ectx.lineTo(x, base); ectx.stroke(); }
    // medidor de nivel: volumen elegido (marco) y nivel real de salida (relleno)
    const mx = W - pad - meterW;
    ectx.strokeStyle = hlV ? "#FFFFFF" : "rgba(238,240,255,.45)"; ectx.lineWidth = 1;
    ectx.strokeRect(Math.round(mx) + 0.5, Math.round(Y(S.vol)) + 0.5, Math.round(meterW) - 1, Math.round(base - Y(S.vol)) - 1);
    let lvl = 0;
    if (analyser && soundOn()) { analyser.getFloatTimeDomainData(mbuf); let sum = 0; for (let i = 0; i < mbuf.length; i++) sum += mbuf[i] * mbuf[i]; lvl = Math.min(1, Math.sqrt(sum / mbuf.length) * 4); }
    if (lvl > 0.002) { ectx.fillStyle = "#E2FF3B"; ectx.fillRect(Math.round(mx) + 2, Math.round(Y(lvl)), Math.round(meterW) - 4, Math.round(base - Y(lvl))); }
  }
  const rollC = $("roll"), rctx = rollC.getContext("2d");
  function drawRoll(now) {
    while (roll.length && now - roll[0].t > 10000) roll.shift();
    if ($("signal").hidden) return;
    const dpr = fit(rollC), W = rollC.width, H = rollC.height, span = 10000;
    rctx.clearRect(0, 0, W, H);
    const lo = S.root - 2, hi = S.root + 12 * S.rows + 14;
    rctx.strokeStyle = "rgba(238,240,255,.12)"; rctx.lineWidth = 1;
    for (let m = Math.ceil(lo / 12) * 12; m < hi; m += 12) { const y = Math.round(H - (m - lo) / (hi - lo) * H) + 0.5; rctx.beginPath(); rctx.moveTo(0, y); rctx.lineTo(W, y); rctx.stroke(); }
    for (const n of roll) {
      const age = (now - n.t) / span, x = W - age * W, y = H - (n.m - lo) / (hi - lo) * H;
      rctx.fillStyle = age < 0.05 ? "#E2FF3B" : "rgba(150,150,255,.85)";
      rctx.fillRect(x - 2 * dpr, y - 1.5 * dpr, 9 * dpr, 3 * dpr);
    }
  }

  // ================= controles =================
  const RANGES = {
    cols: { key: "cols", fmt: (v) => v }, rows: { key: "rows", fmt: (v) => v },
    thr: { key: "thr", fmt: (v) => v }, sens: { key: "sens", fmt: (v) => v + " %", conv: (v) => v / 100 }, cool: { key: "cool", fmt: (v) => v + " ms" },
    atk: { key: "atk", fmt: (v) => v + " ms", conv: (v) => v / 1000 }, rel: { key: "rel", fmt: (v) => v + " ms", conv: (v) => v / 1000 },
    cut: { key: "cut", fmt: (v) => v >= 1000 ? (v / 1000).toFixed(1) + "k" : String(v) },
    rev: { key: "rev", fmt: (v) => v + " %", conv: (v) => v / 100 }, vol: { key: "vol", fmt: (v) => v + " %", conv: (v) => v / 100 },
    tint: { key: "tint", fmt: (v) => v + " %", conv: (v) => v / 100 }, veil: { key: "veil", fmt: (v) => v + " %", conv: (v) => v / 100 },
  };
  Object.entries(RANGES).forEach(([id, cfg]) => {
    const el = $(id), out = $(id + "Out");
    if (!el || !out) return;
    const upd = () => { const v = Number(el.value); S[cfg.key] = cfg.conv ? cfg.conv(v) : v; out.textContent = cfg.fmt(v); onChange(cfg.key); };
    el.addEventListener("input", upd); upd();
    const row = el.closest(".row");
    if (row && row.querySelector("label")) {
      const badge = document.createElement("i"); badge.className = "cc"; badge.hidden = true; badge.dataset.for = id;
      row.querySelector("label").appendChild(badge);
    }
  });
  function onChange(key) {
    if (["atk", "rel", "cut", "rev", "vol"].includes(key)) { HL = { key, t: performance.now() }; updEnvCap(); }
    if (key === "cols" || key === "rows") { ensureGrid(); if ($("stKeys")) $("stKeys").textContent = S.cols + " × " + S.rows; }
    if (key === "cut" && typeof updScopeCap === "function") updScopeCap();
    if (key === "sens") $("stDet").textContent = Math.round(S.sens * 100) + " %";
    if (!ac) return;
    if (key === "vol") master.gain.setTargetAtTime(S.vol, ac.currentTime, 0.05);
    if (key === "cut") main.filter.frequency.setTargetAtTime(S.cut, ac.currentTime, 0.05);
    if (key === "rev") setRev(main);
  }
  $("scale").addEventListener("change", (e) => { S.scale = e.target.value; });
  $("root").addEventListener("change", (e) => { S.root = Number(e.target.value); });

  // selector de modo
  function setSoundMode(mode) {
    S.soundMode = mode;
    if ($("modeHarp")) $("modeHarp").setAttribute("aria-pressed", String(mode === "harp"));
    if ($("modePulse")) $("modePulse").setAttribute("aria-pressed", String(mode === "pulse"));
    if ($("panelModeHarp")) $("panelModeHarp").setAttribute("aria-pressed", String(mode === "harp"));
    if ($("panelModePulse")) $("panelModePulse").setAttribute("aria-pressed", String(mode === "pulse"));
    if ($("stKeys")) $("stKeys").textContent = mode === "harp" ? "Arpa" : "Pulso";
    updMap();
    toast(mode === "harp" ? "Modo: Arpa Dinámica (notas por altura)" : "Modo: Pulso Rítmico (arpegiador)");
  }
  if ($("modeHarp")) $("modeHarp").addEventListener("click", () => setSoundMode("harp"));
  if ($("modePulse")) $("modePulse").addEventListener("click", () => setSoundMode("pulse"));
  if ($("panelModeHarp")) $("panelModeHarp").addEventListener("click", () => setSoundMode("harp"));
  if ($("panelModePulse")) $("panelModePulse").addEventListener("click", () => setSoundMode("pulse"));

  // selector de tipo de sonido y catálogo
  const sndCatBtn = $("sndCat"), sndSynthBtn = $("sndSynth");
  const catControls = $("catControls"), synthControls = $("synthControls");
  const catPresetSel = $("catPreset");

  function updSoundStateBadge() {
    if (!$("stSnd")) return;
    if (S.sndType === "catalog") {
      const PRESET_NAMES = { scale: "multimuestra", high: "agudas", low: "graves", wind: "ráfagas", random: "aleatorio" };
      $("stSnd").textContent = PRESET_NAMES[S.catPreset] || "catálogo";
    } else {
      $("stSnd").textContent = WAVE_NAME[S.wave] || S.wave;
    }
  }

  function setSoundType(type) {
    S.sndType = type;
    if (sndCatBtn) sndCatBtn.setAttribute("aria-pressed", String(type === "catalog"));
    if (sndSynthBtn) sndSynthBtn.setAttribute("aria-pressed", String(type === "synth"));
    if (catControls) catControls.hidden = type !== "catalog";
    if (synthControls) synthControls.hidden = type !== "synth";
    updSoundStateBadge();
    updMap();
    updScopeCap();
    if (soundOn()) {
      const m = S.root + 12;
      lastFreq = mtof(m);
      lastNoteT = performance.now();
      voice(ac, [main.input], m, 0.85, 0);
    }
  }

  if (sndCatBtn) sndCatBtn.addEventListener("click", () => setSoundType("catalog"));
  if (sndSynthBtn) sndSynthBtn.addEventListener("click", () => setSoundType("synth"));
  if (catPresetSel) catPresetSel.addEventListener("change", (e) => {
    S.catPreset = e.target.value;
    updSoundStateBadge();
    updMap();
    updScopeCap();
    if (soundOn()) {
      const m = S.root + 12;
      lastFreq = mtof(m);
      lastNoteT = performance.now();
      voice(ac, [main.input], m, 0.85, 0);
    }
  });

  document.querySelectorAll("[data-wave]").forEach((b) => b.addEventListener("click", () => {
    S.wave = b.dataset.wave;
    document.querySelectorAll("[data-wave]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    updSoundStateBadge();
    updScopeCap();
    updMap();
    if (soundOn()) {
      const m = S.root + 12;
      lastFreq = mtof(m);
      lastNoteT = performance.now();
      voice(ac, [main.input], m, 0.85, 0);
    }
  }));

  document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => {
    S.view = b.dataset.view;
    document.querySelectorAll("[data-view]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    updVisState();
  }));

  function updMap() {
    const p = [S.soundMode === "harp" ? "arpa dinámica (altura → nota)" : "pulso rítmico (arpegiador)"];
    p.push(S.sndType === "catalog" ? "catálogo de campanas (" + S.catPreset + ")" : "sintetizador (" + WAVE_NAME[S.wave] + ")");
    if (S.mapVel) p.push("intensidad → volumen");
    if (S.mapPan) p.push("posición x → pan");
    $("mapText").textContent = p.join(" · ");
    $("stMap").textContent = p.length + (p.length === 1 ? " regla" : " reglas");
  }
  $("mapVel").addEventListener("change", (e) => { S.mapVel = e.target.checked; updMap(); });
  $("mapPan").addEventListener("change", (e) => { S.mapPan = e.target.checked; updMap(); });
  $("mirror").addEventListener("change", (e) => { S.mirror = e.target.checked; prev = null; });
  updMap(); updVisState(); updEnvCap(); updSoundStateBadge(); HL = { key: null, t: 0 };

  // pantalla completa
  $("fsBtn").addEventListener("click", async () => {
    const st = $("stage");
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (st.requestFullscreen) await st.requestFullscreen();
      else if (st.webkitRequestFullscreen) st.webkitRequestFullscreen();
      else throw new Error("no");
    } catch (_) { toast("Pantalla completa no disponible en esta vista"); }
  });
  document.addEventListener("fullscreenchange", () => { $("fsBtn").textContent = document.fullscreenElement ? "⛶ Salir" : "⛶ Pantalla completa"; });

  // ================= MIDI =================
  const STORE = "oirlaluz.midi.v1";
  let midiMap = {};
  try { midiMap = JSON.parse(localStorage.getItem(STORE) || "{}") || {}; } catch (_) { midiMap = {}; }
  let learning = false, learnTarget = null;
  function saveMap() { try { localStorage.setItem(STORE, JSON.stringify(midiMap)); } catch (_) {} }
  function paintBadges() {
    document.querySelectorAll(".cc").forEach((b) => { b.hidden = true; b.textContent = ""; });
    Object.entries(midiMap).forEach(([cc, id]) => { const b = document.querySelector('.cc[data-for="' + id + '"]'); if (b) { b.hidden = false; b.textContent = "CC" + cc; } });
  }
  paintBadges();
  function onMidi(e) {
    const [st, d1, d2] = e.data;
    if ((st & 0xf0) !== 0xb0) return;
    if (learning && learnTarget) {
      Object.keys(midiMap).forEach((k) => { if (midiMap[k] === learnTarget.id) delete midiMap[k]; });
      midiMap[d1] = learnTarget.id; saveMap(); paintBadges();
      $("midiHint").textContent = "CC " + d1 + " → " + learnTarget.id + ". Toca otro slider o termina con Asignar.";
      learnTarget.classList.remove("target"); learnTarget = null; return;
    }
    const id = midiMap[d1]; if (!id) return;
    const el = $(id), min = Number(el.min), max = Number(el.max), step = Number(el.step) || 1;
    el.value = String(Math.round((min + (d2 / 127) * (max - min)) / step) * step);
    el.dispatchEvent(new Event("input"));
  }
  $("midiBtn").addEventListener("click", async () => {
    if (!navigator.requestMIDIAccess) { $("midiHint").textContent = "Este navegador no tiene Web MIDI. Usa Chrome o Edge en la versión local."; return; }
    try {
      const access = await navigator.requestMIDIAccess();
      const bind = () => { let n = 0; access.inputs.forEach((i) => { i.onmidimessage = onMidi; n++; }); $("stMidi").textContent = n ? n + " conectado" + (n > 1 ? "s" : "") : "sin equipos"; $("midiHint").textContent = n ? "Presiona Asignar." : "No hay controladores conectados. Enchufa uno y vuelve a intentar."; };
      access.onstatechange = bind; bind();
      $("midiBtn").setAttribute("aria-pressed", "true"); $("learnBtn").disabled = false; $("midiClear").disabled = false;
    } catch (e) { $("midiHint").textContent = "MIDI no disponible en esta vista. Abre la versión local en Chrome o Edge."; }
  });
  $("learnBtn").addEventListener("click", () => {
    learning = !learning; $("learnBtn").setAttribute("aria-pressed", String(learning));
    $("dock").classList.toggle("learning", learning);
    if (learnTarget) { learnTarget.classList.remove("target"); learnTarget = null; }
    $("midiHint").textContent = learning ? "Abre otro panel, toca un slider y mueve una perilla." : "Asignaciones guardadas en este navegador.";
  });
  document.querySelectorAll("input[type=range]").forEach((el) => el.addEventListener("pointerdown", () => {
    if (!learning) return;
    if (learnTarget) learnTarget.classList.remove("target");
    learnTarget = el; el.classList.add("target");
    $("midiHint").textContent = "Mueve una perilla para asignarla a " + el.id + ".";
  }));
  $("midiClear").addEventListener("click", () => { midiMap = {}; saveMap(); paintBadges(); $("midiHint").textContent = "Asignaciones borradas."; });

  // ================= bucle =================
  let lastT = performance.now(), acc = 0;
  function loop(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    if (S.src === "demo") drawDemo(dt);
    else if (S.src === "plant") drawPlant(dt);
    acc += dt;
    if (acc >= 1 / 15) { acc = 0; analyse(now); }
    drawView(dt); drawScope(); drawEnv(); drawRoll(now);
    if (recording) { const s = Math.floor((now - recStart) / 1000), t = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); $("recTime").textContent = t; $("recBadgeT").textContent = t; }
    requestAnimationFrame(loop);
  }
  updSoundBtn(); drawPlant(0);
  requestAnimationFrame(loop);
})();
