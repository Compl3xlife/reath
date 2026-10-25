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
    const current = document.querySelector('[data-reel="back"] .work-list .is-on');
    if (current?.dataset.scene === "opus") startTerm();
    if (current?.dataset.scene === "pike") startPike();
  } else {
    stopTerm();
    stopPike();
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
  fit();
}

const lines = [
  ["dim", "wake word armed"],
  ["user", "> Opus, what's on my screen?"],
  ["ok", "reading the active tab"],
  ["ok", "tray · phone · discord chips"],
  ["ok", "listening again"],
];

document.querySelectorAll(".work").forEach((reel) => {
  const first = reel.querySelector(".work-list button");
  if (first) showScene(reel, first);
  reel.querySelectorAll(".work-list button").forEach((button) => {
    button.addEventListener("click", () => showScene(reel, button));
  });
});

function stopTerm() {
  window.clearTimeout(termTimer);
}

function startTerm() {
  stopTerm();
  const out = document.querySelector("#term-out");
  if (!out) return;
  out.textContent = "";
  if (reduce) {
    out.textContent = lines.map(([, text]) => text).join("\n");
    return;
  }
  let row = 0;
  let char = 0;
  const tick = () => {
    if (row >= lines.length) return;
    const text = lines[row][1];
    char += 1;
    out.textContent = lines
      .slice(0, row)
      .map(([, line]) => line)
      .concat(text.slice(0, char))
      .join("\n");
    if (char >= text.length) {
      row += 1;
      char = 0;
      termTimer = window.setTimeout(tick, 280);
    } else {
      termTimer = window.setTimeout(tick, 18);
    }
  };
  tick();
}

const knightPath = [12, 3, 6, 15, 4, 21, 12];
let pikeStep = 0;

function paintBoard() {
  const board = document.querySelector("#board");
  if (!board || board.dataset.ready) return;
  board.dataset.ready = "true";
  const knight = document.querySelector("#knight");
  for (let i = 0; i < 25; i += 1) {
    const cell = document.createElement("i");
    board.insertBefore(cell, knight);
  }
}

function stopPike() {
  window.clearInterval(pikeTimer);
}

function startPike() {
  paintBoard();
  stopPike();
  const knight = document.querySelector("#knight");
  const hop = () => {
    const cell = knightPath[pikeStep % knightPath.length];
    const col = cell % 5;
    const row = Math.floor(cell / 5);
    knight.style.transform = `translate(${col * 100}%, ${row * 100}%)`;
    pikeStep += 1;
  };
  hop();
  if (!reduce) pikeTimer = window.setInterval(hop, 700);
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
const blinkerWheels = blinkerTrack ? [...blinkerTrack.querySelectorAll(".wheel")] : [];
let blinkerStart = 0;

function driveBlinker(now) {
  if (!blinkerStart) blinkerStart = now;
  const width = blinkerTrack.clientWidth;
  const height = blinkerTrack.clientHeight;
  if (width && height) {
    const lap = ((now - blinkerStart) % 9000) / 9000;
    const angle = lap * Math.PI * 2 - Math.PI / 2;
    const rx = Math.max(48, width * 0.34);
    const ry = Math.max(28, height * 0.28);
    const x = width / 2 + Math.cos(angle) * rx - blinkerCar.offsetWidth / 2;
    const y = height / 2 + Math.sin(angle) * ry - blinkerCar.offsetHeight / 2;
    const heading = (angle * 180) / Math.PI + 90;
    blinkerCar.style.transform = `translate(${x}px, ${y}px) rotate(${heading}deg)`;
    const spin = ((now - blinkerStart) / 260) * 360;
    blinkerWheels.forEach((wheel) => {
      wheel.style.transform = `rotate(${spin}deg)`;
    });
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
