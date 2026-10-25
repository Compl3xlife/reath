const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const tabs = [...document.querySelectorAll(".tab")];
const panels = [...document.querySelectorAll(".panel")];
const track = document.querySelector("#track");
const stage = document.querySelector("#stage");
const tabBar = document.querySelector("#tab-bar");
const tablist = document.querySelector("#tablist");
const ids = tabs.map((tab) => tab.id.replace("tab-", ""));

let index = 0;
let termTimer = 0;
let pikeTimer = 0;
let pikeRun = 0;
let lanTimer = 0;
let lanRun = 0;
let counted = false;

function fit() {
  const panel = panels[index];
  if (!panel) return;
  stage.style.height = `${panel.offsetHeight}px`;
}

function placeBar() {
  const tab = tabs[index];
  const vertical = getComputedStyle(tablist).flexDirection !== "row";
  if (vertical) {
    tabBar.style.width = "2px";
    tabBar.style.height = `${tab.offsetHeight}px`;
    tabBar.style.transform = `translateY(${tab.offsetTop}px)`;
  } else {
    tabBar.style.height = "2px";
    tabBar.style.width = `${tab.offsetWidth}px`;
    tabBar.style.transform = `translate(${tab.offsetLeft}px, ${tablist.clientHeight - 2}px)`;
  }
}

function select(next, historyMode = "push") {
  const clamped = (next + tabs.length) % tabs.length;
  const direction = clamped < index ? "back" : "forward";
  stage.dataset.dir = direction;
  index = clamped;
  tabs.forEach((tab, i) => {
    const on = i === index;
    tab.setAttribute("aria-selected", on ? "true" : "false");
    tab.tabIndex = on ? 0 : -1;
  });
  panels.forEach((panel, i) => {
    const on = i === index;
    panel.toggleAttribute("inert", !on);
    panel.setAttribute("aria-hidden", on ? "false" : "true");
    panel.dataset.active = on ? "true" : "false";
    if (!on) panel.setAttribute("hidden", "");
    else panel.removeAttribute("hidden");
  });
  track.style.transform = `translateX(-${index * 100}%)`;
  const ghost = document.querySelector("#stage-index");
  if (ghost) {
    ghost.textContent = String(index + 1).padStart(2, "0");
    ghost.classList.remove("go");
    if (!reduce) {
      void ghost.offsetWidth;
      ghost.classList.add("go");
    }
  }
  if (!reduce) {
    stage.classList.remove("is-scanning");
    void stage.offsetWidth;
    stage.classList.add("is-scanning");
  }
  placeBar();
  fit();
  tabs[index].scrollIntoView({ inline: "nearest", block: "nearest" });
  onEnter(ids[index]);

  const hash = `#${ids[index]}`;
  if (historyMode === "push" && location.hash !== hash) {
    history.pushState({ tab: index }, "", hash);
  } else if (historyMode === "replace") {
    history.replaceState({ tab: index }, "", hash);
  }
}

function onEnter(id) {
  if (id === "profile") countStats();
  if (id === "skills") playRig(currentRig, true);
  if (id === "backend") {
    const scene = document.querySelector('[data-reel="back"] .work-list .is-on')?.dataset.scene;
    if (scene === "opus") startTerm();
    else stopTerm();
    if (scene === "pike") startPike();
    else stopPike();
    if (scene === "lan") startLan();
    else stopLan();
  } else {
    stopTerm();
    stopPike();
    stopLan();
  }
}

function countStats() {
  if (counted) return;
  counted = true;
  document.querySelectorAll("[data-count]").forEach((el) => {
    const target = Number(el.dataset.count);
    if (reduce) {
      el.textContent = String(target).padStart(2, "0");
      return;
    }
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / 800);
      const eased = 1 - (1 - t) ** 3;
      el.textContent = String(Math.round(eased * target)).padStart(2, "0");
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

tablist.addEventListener("keydown", (event) => {
  const key = event.key;
  if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"].includes(key)) return;
  event.preventDefault();
  if (key === "ArrowRight" || key === "ArrowDown") select(index + 1);
  if (key === "ArrowLeft" || key === "ArrowUp") select(index - 1);
  if (key === "Home") select(0);
  if (key === "End") select(tabs.length - 1);
  tabs[index].focus();
});

tabs.forEach((tab, i) => {
  tab.addEventListener("click", () => select(i));
});

document.querySelectorAll("[data-jump]").forEach((node) => {
  node.addEventListener("click", (event) => {
    const id = node.dataset.jump;
    const found = ids.indexOf(id);
    if (found < 0) return;
    event.preventDefault();
    select(found);
    document.querySelector("#switcher").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  });
});

window.addEventListener("popstate", () => {
  const found = Math.max(0, ids.indexOf(location.hash.replace("#", "")));
  select(found, "none");
});

const resize = new ResizeObserver(() => {
  placeBar();
  fit();
});
panels.forEach((panel) => resize.observe(panel));
window.addEventListener("resize", () => {
  placeBar();
  fit();
  layoutRig(currentRig, false);
});

function showScene(reel, button) {
  const root = button.closest(".work");
  root.querySelectorAll(".work-list button").forEach((item) => {
    const on = item === button;
    item.classList.toggle("is-on", on);
    item.setAttribute("aria-selected", on ? "true" : "false");
  });
  root.querySelectorAll(".scene").forEach((scene) => {
    const on = scene.dataset.scene === button.dataset.scene;
    scene.classList.toggle("is-on", on);
    scene.classList.remove("play");
    if (on && !reduce) {
      void scene.offsetWidth;
      scene.classList.add("play");
    } else if (on) {
      scene.classList.add("play");
    }
  });
  const blurb = root.querySelector(".work-blurb");
  if (blurb) blurb.textContent = button.dataset.blurb || "";
  const repo = root.querySelector(".repo, .work-foot > .text-link");
  if (repo) {
    if (button.dataset.repo) {
      repo.href = button.dataset.repo;
      repo.hidden = false;
    } else {
      repo.hidden = true;
    }
  }
  const live = root.querySelector(".live");
  if (live) {
    if (button.dataset.live) {
      live.href = button.dataset.live;
      live.hidden = false;
    } else {
      live.hidden = true;
    }
  }
  if (button.dataset.scene === "opus") startTerm();
  else stopTerm();
  if (button.dataset.scene === "pike") startPike();
  else stopPike();
  if (button.dataset.scene === "lan") startLan();
  else stopLan();
  fit();
}

const talk = [
  { who: "sys", text: "Listening for Opus" },
  { who: "you", text: "Opus, what's on my screen?" },
  { who: "opus", text: "The resume. Backend tab, Opus selected." },
  { who: "you", text: "Open the phone app." },
  { who: "opus", text: "It's on your home screen. Same voice, smaller window." },
  { who: "sys", text: "Listening again" },
];
let termRun = 0;

document.querySelectorAll(".work").forEach((reel) => {
  const first = reel.querySelector(".work-list button");
  if (first) showScene(reel, first);
  reel.querySelectorAll(".work-list button").forEach((button) => {
    button.addEventListener("click", () => showScene(reel, button));
  });
});

function stopTerm() {
  termRun += 1;
  window.clearTimeout(termTimer);
}

function addBubble(thread, line) {
  const bubble = document.createElement("p");
  bubble.className = `bubble ${line.who}`;
  bubble.textContent = line.text;
  thread.append(bubble);
  bubble.animate(
    [
      { opacity: 0, transform: "translateY(8px)" },
      { opacity: 1, transform: "none" },
    ],
    { duration: 280, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" },
  );
}

function startTerm() {
  stopTerm();
  const run = termRun;
  const thread = document.querySelector("#opus-thread");
  if (!thread) return;
  thread.replaceChildren();
  let step = 0;
  const next = () => {
    if (run !== termRun) return;
    if (step >= talk.length) {
      termTimer = window.setTimeout(() => {
        if (run === termRun) startTerm();
      }, 1300);
      return;
    }
    const line = talk[step];
    step += 1;
    if (line.who === "opus") {
      const typing = document.createElement("p");
      typing.className = "bubble opus typing";
      for (let i = 0; i < 3; i += 1) {
        const dot = document.createElement("i");
        typing.append(dot);
        dot.animate(
          [{ opacity: 0.2 }, { opacity: 1 }, { opacity: 0.2 }],
          { duration: 700, delay: i * 140, iterations: Infinity },
        );
      }
      thread.append(typing);
      termTimer = window.setTimeout(() => {
        if (run !== termRun) return;
        typing.remove();
        addBubble(thread, line);
        termTimer = window.setTimeout(next, 780);
      }, 620);
      return;
    }
    addBubble(thread, line);
    termTimer = window.setTimeout(next, line.who === "sys" ? 460 : 700);
  };
  next();
}

const glyphs = {
  K: "\u2654", Q: "\u2655", R: "\u2656", B: "\u2657", N: "\u2658", P: "\u2659",
  k: "\u265A", q: "\u265B", r: "\u265C", b: "\u265D", n: "\u265E", p: "\u265F",
};
const pikeGame = [
  ["e2", "e4"],
  ["e7", "e5"],
  ["d1", "h5"],
  ["b8", "c6"],
  ["f1", "c4"],
  ["g8", "f6"],
  ["h5", "f7"],
];
const pikePieces = Array.from({ length: 8 }, () => Array(8).fill(null));

function pikeSquare(code) {
  return { x: code.charCodeAt(0) - 97, y: 8 - Number(code[1]) };
}

function paintBoard() {
  const board = document.querySelector("#board");
  if (!board || board.dataset.ready) return;
  board.dataset.ready = "true";
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const cell = document.createElement("i");
      if ((x + y) % 2 === 1) cell.className = "dark";
      board.append(cell);
    }
  }
}

function clearPieces(board) {
  board.querySelectorAll(".man").forEach((piece) => piece.remove());
  for (let y = 0; y < 8; y += 1) pikePieces[y].fill(null);
}

function putPiece(board, x, y, code) {
  const piece = document.createElement("b");
  piece.className = `man ${code === code.toUpperCase() ? "w" : "b"}`;
  piece.textContent = glyphs[code];
  piece.style.transform = `translate(${x * 100}%, ${y * 100}%)`;
  board.append(piece);
  pikePieces[y][x] = piece;
}

function resetPike(board) {
  clearPieces(board);
  board.querySelectorAll("i").forEach((cell) => cell.classList.remove("hot"));
  const back = "rnbqkbnr";
  for (let x = 0; x < 8; x += 1) {
    putPiece(board, x, 0, back[x]);
    putPiece(board, x, 1, "p");
    putPiece(board, x, 6, "P");
    putPiece(board, x, 7, back[x].toUpperCase());
  }
}

function markPike(board, from, to) {
  const cells = [...board.querySelectorAll("i")];
  cells.forEach((cell) => cell.classList.remove("hot"));
  cells[from.y * 8 + from.x]?.classList.add("hot");
  cells[to.y * 8 + to.x]?.classList.add("hot");
}

function slidePiece(piece, x, y) {
  const next = `translate(${x * 100}%, ${y * 100}%)`;
  piece.classList.add("moving");
  const motion = piece.animate(
    [{ transform: piece.style.transform }, { transform: next }],
    { duration: 460, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" },
  );
  return motion.finished.then(() => {
    piece.style.transform = next;
    piece.classList.remove("moving");
  });
}

function stopPike() {
  pikeRun += 1;
  window.clearTimeout(pikeTimer);
}

function startPike() {
  stopPike();
  const run = pikeRun;
  const board = document.querySelector("#board");
  if (!board) return;
  paintBoard();
  resetPike(board);
  let move = 0;
  const play = () => {
    if (run !== pikeRun) return;
    if (move >= pikeGame.length) {
      pikeTimer = window.setTimeout(() => {
        if (run !== pikeRun) return;
        resetPike(board);
        move = 0;
        pikeTimer = window.setTimeout(play, 500);
      }, 1100);
      return;
    }
    const [fromCode, toCode] = pikeGame[move];
    move += 1;
    const from = pikeSquare(fromCode);
    const to = pikeSquare(toCode);
    const piece = pikePieces[from.y][from.x];
    const captured = pikePieces[to.y][to.x];
    if (!piece) {
      play();
      return;
    }
    pikePieces[from.y][from.x] = null;
    pikePieces[to.y][to.x] = piece;
    markPike(board, from, to);
    slidePiece(piece, to.x, to.y).then(() => {
      if (captured) captured.remove();
      if (run !== pikeRun) return;
      pikeTimer = window.setTimeout(play, 280);
    });
  };
  pikeTimer = window.setTimeout(play, 400);
}

function stopLan() {
  lanRun += 1;
  window.clearTimeout(lanTimer);
}

function startLan() {
  stopLan();
  const run = lanRun;
  const phone = document.querySelector(".handset .lcd");
  const desk = document.querySelector(".desktop .lcd");
  const packet = document.querySelector(".cast i");
  if (!phone || !desk) return;
  let frame = 0;
  phone.dataset.frame = "0";
  desk.dataset.frame = "0";
  const share = () => {
    if (run !== lanRun) return;
    frame = (frame + 1) % 3;
    phone.dataset.frame = String(frame);
    if (packet) {
      packet.animate(
        [
          { transform: "translateX(0)", opacity: 0 },
          { transform: "translateX(8px)", opacity: 1, offset: 0.15 },
          { transform: "translateX(56px)", opacity: 0 },
        ],
        { duration: 680, easing: "ease-in-out" },
      );
    }
    lanTimer = window.setTimeout(() => {
      if (run !== lanRun) return;
      desk.dataset.frame = String(frame);
      desk.animate(
        [{ filter: "brightness(1.8)" }, { filter: "brightness(1)" }],
        { duration: 320, easing: "ease-out" },
      );
      lanTimer = window.setTimeout(share, 1250);
    }, 640);
  };
  lanTimer = window.setTimeout(share, 800);
}

const rigStage = document.querySelector("#rig-stage");
const rigTiles = [...rigStage.children];
let currentRig = "align";

function seeded(n) {
  const x = Math.sin(n * 997) * 10000;
  return x - Math.floor(x);
}

const rigEase = "cubic-bezier(0.16, 1, 0.3, 1)";

function rigPoint(mode, i, width, height) {
  if (mode === "align") {
    const cols = width < 520 ? 3 : 6;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const gapX = (width - 24) / cols;
    return { x: 12 + col * gapX, y: 28 + row * 78, rot: 0 };
  }
  if (mode === "cascade") {
    return {
      x: 16 + (i % 8) * Math.min(56, (width - 40) / 8),
      y: 18 + (i % 6) * 32,
      rot: i % 2 === 0 ? -8 : 7,
    };
  }
  return {
    x: 8 + seeded(i + 1) * Math.max(0, width - 84),
    y: 8 + seeded(i + 9) * Math.max(0, height - 52),
    rot: seeded(i + 3) * 22 - 11,
  };
}

function moveTile(tile, mode, i, animate) {
  const width = rigStage.clientWidth;
  const height = rigStage.clientHeight;
  if (!width || !height) return;
  const { x, y, rot } = rigPoint(mode, i, width, height);
  const next = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
  const from = getComputedStyle(tile).transform;
  if (tile._rigAnim) tile._rigAnim.cancel();
  tile.style.transition = "none";
  tile.style.transform = next;
  if (!animate) return;
  tile._rigAnim = tile.animate(
    [{ transform: from === "none" ? "translate(0px, 0px)" : from }, { transform: next }],
    {
      duration: 780,
      delay: mode === "cascade" ? i * 36 : 0,
      easing: rigEase,
      fill: "backwards",
    }
  );
}

function layoutRig(mode, animate = true) {
  currentRig = mode;
  rigTiles.forEach((tile, i) => moveTile(tile, mode, i, animate));
}

function playRig(mode, replay = false) {
  document.querySelectorAll("[data-rig]").forEach((button) => {
    if (button.dataset.rig === "replay") return;
    button.setAttribute("aria-pressed", button.dataset.rig === mode ? "true" : "false");
  });
  if (!replay) {
    layoutRig(mode, true);
    return;
  }
  const back = mode;
  rigTiles.forEach((tile, i) => moveTile(tile, "scatter", i, false));
  requestAnimationFrame(() => {
    requestAnimationFrame(() => layoutRig(back, true));
  });
}

document.querySelectorAll("[data-rig]").forEach((button) => {
  button.addEventListener("click", () => {
    const replay = button.dataset.rig === "replay";
    playRig(replay ? currentRig : button.dataset.rig, replay);
  });
});

const canvas = document.querySelector("#field");
const ctx = canvas.getContext("2d");
const hero = document.querySelector("#hero");
const pointer = { x: 0, y: 0, on: false };
let particles = [];
let fieldFrame = 0;
let particleLime = "rgba(223,242,90,0.8)";
let particleIndigo = "rgba(141,139,255,0.85)";

function readParticleColors() {
  const paint = getComputedStyle(document.documentElement);
  particleLime = paint.getPropertyValue("--particle-lime").trim() || particleLime;
  particleIndigo = paint.getPropertyValue("--particle-indigo").trim() || particleIndigo;
}

function resizeField() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const count = Math.round((canvas.clientWidth * canvas.clientHeight) / 14000);
  particles = Array.from({ length: Math.max(28, Math.min(count, 90)) }, (_, i) => ({
    x: seeded(i + 2) * canvas.clientWidth,
    y: seeded(i + 4) * canvas.clientHeight,
    vx: seeded(i + 6) * 0.4 - 0.2,
    vy: seeded(i + 8) * 0.4 - 0.2,
    indigo: i % 7 === 0,
  }));
}

function drawField() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);
  particles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0 || p.x > w) p.vx *= -1;
    if (p.y < 0 || p.y > h) p.vy *= -1;
    if (pointer.on) {
      const dx = p.x - pointer.x;
      const dy = p.y - pointer.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 160 && dist > 0) {
        p.x += (dx / dist) * 0.8;
        p.y += (dy / dist) * 0.8;
      }
    }
    ctx.fillStyle = p.indigo ? particleIndigo : particleLime;
    ctx.fillRect(p.x, p.y, 2.2, 2.2);
  });
  fieldFrame = requestAnimationFrame(drawField);
}

if (!reduce) {
  readParticleColors();
  resizeField();
  hero.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.on = true;
  });
  hero.addEventListener("pointerleave", () => {
    pointer.on = false;
  });
  window.addEventListener("resize", resizeField);
  drawField();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(fieldFrame);
    else drawField();
  });
}

const blinkerTrack = document.querySelector(".demo.track");
const blinkerCar = blinkerTrack?.querySelector(".car");
const blinkerFront = blinkerTrack ? [...blinkerTrack.querySelectorAll(".wheel.fl, .wheel.fr")] : [];
const blinkerLamp = blinkerCar?.querySelector(".lamp");
const axle = { x: 22, y: 18 };
const wheelbase = 50;
let blinkerLast = 0;
let blinkerDist = 0;

function roadPad() {
  const style = getComputedStyle(blinkerTrack);
  const x = parseFloat(style.getPropertyValue("--road-x"));
  const y = parseFloat(style.getPropertyValue("--road-y"));
  return {
    x: Number.isFinite(x) ? x : 78,
    y: Number.isFinite(y) ? y : 48,
  };
}

function roadPose(dist, width, height) {
  const pad = roadPad();
  const cw = Math.max(36, width - pad.x * 2);
  const ch = Math.max(36, height - pad.y * 2);
  const cx = width / 2;
  const cy = height / 2;
  const horizontal = cw >= ch;
  const radius = (horizontal ? ch : cw) / 2;
  const straight = Math.abs(cw - ch);
  const arc = Math.PI * radius;
  const length = straight * 2 + arc * 2;
  let s = dist % length;
  if (s < 0) s += length;
  let x;
  let y;
  let heading;

  if (horizontal) {
    const half = straight / 2;
    if (s < straight) {
      x = cx - half + s;
      y = cy - radius;
      heading = 0;
    } else if (s < straight + arc) {
      const angle = -Math.PI / 2 + (s - straight) / radius;
      x = cx + half + Math.cos(angle) * radius;
      y = cy + Math.sin(angle) * radius;
      heading = Math.atan2(Math.cos(angle), -Math.sin(angle));
    } else if (s < straight * 2 + arc) {
      x = cx + half - (s - straight - arc);
      y = cy + radius;
      heading = Math.PI;
    } else {
      const angle = Math.PI / 2 + (s - straight * 2 - arc) / radius;
      x = cx - half + Math.cos(angle) * radius;
      y = cy + Math.sin(angle) * radius;
      heading = Math.atan2(Math.cos(angle), -Math.sin(angle));
    }
  } else if (s < straight) {
    x = cx + radius;
    y = cy - straight / 2 + s;
    heading = Math.PI / 2;
  } else if (s < straight + arc) {
    const angle = (s - straight) / radius;
    x = cx + Math.cos(angle) * radius;
    y = cy + straight / 2 + Math.sin(angle) * radius;
    heading = Math.atan2(Math.cos(angle), -Math.sin(angle));
  } else if (s < straight * 2 + arc) {
    x = cx - radius;
    y = cy + straight / 2 - (s - straight - arc);
    heading = -Math.PI / 2;
  } else {
    const angle = Math.PI + (s - straight * 2 - arc) / radius;
    x = cx + Math.cos(angle) * radius;
    y = cy - straight / 2 + Math.sin(angle) * radius;
    heading = Math.atan2(Math.cos(angle), -Math.sin(angle));
  }

  return { x, y, heading, length };
}

function driveBlinker(now) {
  if (!blinkerLast) blinkerLast = now;
  const dt = Math.min(now - blinkerLast, 34);
  blinkerLast = now;
  const width = blinkerTrack.clientWidth;
  const height = blinkerTrack.clientHeight;
  if (width && height && dt > 0) {
    const step = 0.12 * dt;
    blinkerDist += step;
    const rear = roadPose(blinkerDist, width, height);
    const front = roadPose(blinkerDist + wheelbase, width, height);
    const heading = Math.atan2(front.y - rear.y, front.x - rear.x);
    blinkerCar.style.transform = `translate(${rear.x - axle.x}px, ${rear.y - axle.y}px) rotate(${(heading * 180) / Math.PI}deg)`;
    const nose = roadPose(blinkerDist + wheelbase + 28, width, height);
    let steer = Math.atan2(nose.y - front.y, nose.x - front.x) - heading;
    steer = Math.atan2(Math.sin(steer), Math.cos(steer));
    const steerDeg = Math.max(-30, Math.min(30, (steer * 180) / Math.PI * 1.7));
    blinkerFront.forEach((wheel) => {
      wheel.style.transform = `rotate(${steerDeg}deg)`;
    });
    if (blinkerLamp) blinkerLamp.style.opacity = Math.floor(now / 260) % 2 ? "1" : "0.35";
  }
  requestAnimationFrame(driveBlinker);
}

if (blinkerTrack && blinkerCar) requestAnimationFrame(driveBlinker);

const showcaseRoot = document.querySelector(".showcase");
const showcase = document.querySelector("#showcase-track");
const showcaseSet = showcase?.querySelector(".showcase-set");
let showcaseX = 0;
let showcaseLast = 0;
let showcasePaused = false;

function showcaseSpan() {
  const twin = showcaseSet?.nextElementSibling;
  if (!showcaseSet || !twin) return 0;
  return twin.offsetLeft - showcaseSet.offsetLeft;
}

function fillShowcase() {
  const span = showcaseSpan();
  if (!span || !showcaseRoot) return 0;
  const needed = Math.ceil((showcaseRoot.clientWidth + span) / span) + 1;
  while (showcase.querySelectorAll(".showcase-set").length < needed) {
    const clone = showcaseSet.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    clone.querySelectorAll("a").forEach((link) => {
      link.tabIndex = -1;
    });
    showcase.append(clone);
  }
  return span;
}

function runShowcase(now) {
  if (!showcaseLast) showcaseLast = now;
  const dt = Math.min(48, now - showcaseLast);
  showcaseLast = now;
  const width = fillShowcase();
  if (width && !showcasePaused) {
    showcaseX = (showcaseX + (width / 28000) * dt) % width;
    showcase.style.transform = `translate3d(${-showcaseX}px, 0, 0)`;
  }
  requestAnimationFrame(runShowcase);
}

if (showcaseRoot && showcaseSet) {
  fillShowcase();
  showcaseRoot.addEventListener("pointerenter", () => {
    showcasePaused = true;
  });
  showcaseRoot.addEventListener("pointerleave", () => {
    showcasePaused = false;
    showcaseLast = 0;
  });
  document.addEventListener("visibilitychange", () => {
    showcaseLast = 0;
  });
  window.addEventListener("resize", fillShowcase);
  requestAnimationFrame(runShowcase);
}

const start = Math.max(0, ids.indexOf(location.hash.replace("#", "")));
layoutRig("align", false);
select(start, start ? "replace" : "none");
if (start) {
  document.querySelector("#switcher").scrollIntoView();
}

const cert = document.querySelector("#open-cert");
const dialog = document.querySelector("#cert-dialog");
cert.addEventListener("click", () => dialog.showModal());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

const themeButton = document.querySelector("#theme-toggle");
const themeMeta = document.querySelector('meta[name="theme-color"]');

function paintTheme(theme) {
  document.documentElement.dataset.theme = theme;
  readParticleColors();
  const light = theme === "light";
  if (themeMeta) themeMeta.content = light ? "#f4f0e6" : "#07080b";
  themeButton.setAttribute("aria-pressed", light ? "true" : "false");
  themeButton.setAttribute("aria-label", light ? "Switch to dark mode" : "Switch to light mode");
}

paintTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");

themeButton.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  localStorage.setItem("reath-theme", next);
  paintTheme(next);
});

window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", (event) => {
  if (localStorage.getItem("reath-theme")) return;
  paintTheme(event.matches ? "light" : "dark");
});

document.querySelector("#contact-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const name = String(data.get("name") ?? "").trim();
  const from = String(data.get("email") ?? "").trim();
  const message = String(data.get("message") ?? "").trim();
  const subject = encodeURIComponent(`Hello from ${name}`);
  const body = encodeURIComponent(`${message}\n\n— ${name}\n${from}`);
  document.querySelector("#form-status").textContent =
    "Your mail app opens with this note. You can also write straight to matthewreath01@gmail.com.";
  window.location.href = `mailto:matthewreath01@gmail.com?subject=${subject}&body=${body}`;
});
