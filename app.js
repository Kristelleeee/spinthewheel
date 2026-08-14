/* ============================================================
   SPINCON — ICON wheel of questionable fortune
   The odds are honest: a slice's arc width IS its chance, and the
   wheel stops at a uniformly random angle. No result is chosen in
   advance and then animated towards.
   ============================================================ */
(() => {
"use strict";

const $ = s => document.querySelector(s);
const PAL = ["#FBC748","#53AE9A","#FBD36D","#7FC9AC","#416557","#E8A33D","#3C8C79","#F0E0B0"];
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const presenting = () => document.body.classList.contains("present");

/* ---------- prize pool ---------- */
let uid = 0;
const mk = (name, weight, color, emoji, top, bottom, img = null) =>
  ({id:++uid, name, weight, color, emoji, top, bottom, img});

/* Colours alternate gold / teal around the rim so no two neighbours match.
   Meme pictures live in ./memes and are referenced by path, not embedded. */
let items = [
  mk("LANYARD",       3,  "#416557", "🎀", "3% chance and it hit",   "my neck ate that up",     "memes/lanyard-meme.jfif"),
  mk("AIM STICKER",   20, "#53AE9A", "🎯", "AIM STICKER SECURED",    "laptop just leveled up",  "memes/aim-meme.jfif"),
  mk("KEYCHAINS",     5,  "#FBC748", "🔑", "it's a keychain",        "aight. i'll allow it.",   "memes/keychain-meme.jfif"),
  mk("AWS STICKER",   20, "#53AE9A", "☁️", "the AWS sticker dropped", "the cloud provides 🙏",   "memes/aws-meme.jfif"),
  mk("SCOPE STICKER", 20, "#FBC748", "🔭", "the scope sticker",      "it's beautiful. i'm fine.", "memes/scope-meme.jfif"),
  mk("PINS",          7,  "#53AE9A", "📌", "pins?? at 7%??",         "bag officially secured",  "memes/pins-meme.jfif"),
  mk("ICON STICKER",  20, "#FBC748", "🚨", "not the ICON STICKER",   "THE MAIN ONE. NO WAY.",   "memes/icon-meme.jfif"),
];

/* ---------- sound ---------- */
let AC = null, sound = true;
const ac = () => (AC ||= new (window.AudioContext || window.webkitAudioContext)());
function blip(freq, dur, type = "square", vol = .05){
  if(!sound) return;
  try{
    const c = ac(), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + dur);
    o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + dur);
  }catch(e){}
}
const tick = () => blip(1200 + Math.random()*260, .045, "square", .035);
const fanfare = () => [0,120,240,380].forEach((t,i) =>
  setTimeout(() => blip([523,659,784,1047][i], .34, "triangle", .09), t));

/* ---------- geometry ---------- */
const TAU = Math.PI * 2;
const START = -Math.PI / 2;                 // the flapper sits at 12 o'clock
const wrap = a => ((a % TAU) + TAU) % TAU;

function norm(){
  const total = items.reduce((s,i) => s + Math.max(0, +i.weight || 0), 0);
  if(!items.length) return [];
  if(total <= 0) return items.map(() => 1 / items.length);
  return items.map(i => Math.max(0, +i.weight || 0) / total);
}
function bounds(){
  const w = norm(), out = []; let a = 0;
  w.forEach(p => { out.push([a, a + p*TAU]); a += p*TAU; });
  return out;
}
function indexAt(rot){
  const b = bounds(), t = wrap(-rot);
  for(let i = 0; i < b.length; i++) if(t >= b[i][0] && t < b[i][1]) return i;
  return b.length - 1;
}
function lum(hex){
  const n = parseInt(hex.slice(1), 16);
  const f = v => { v /= 255; return v <= .03928 ? v/12.92 : ((v+.055)/1.055)**2.4; };
  return .2126*f(n>>16&255) + .7152*f(n>>8&255) + .0722*f(n&255);
}

/* ---------- wheel ---------- */
const cv = $("#wheel"), cx = cv.getContext("2d");
let rot = 0, size = 520;

function fit(){
  const r = $("#wheelwrap").getBoundingClientRect();
  size = Math.max(240, Math.min(r.width, r.height));
  const d = Math.min(2, devicePixelRatio || 1);
  cv.width = size * d; cv.height = size * d;
  cx.setTransform(d, 0, 0, d, 0, 0);
  draw();
}
new ResizeObserver(fit).observe($("#wheelwrap"));

/* Break a prize name over as many lines as it needs.
   Words that are too long for one line get split mid-word rather than clipped. */
function wrapLabel(text, maxW){
  const lines = [];
  let cur = "";
  for(const word of String(text).split(/\s+/).filter(Boolean)){
    const test = cur ? cur + " " + word : word;
    if(cx.measureText(test).width <= maxW){ cur = test; continue; }
    if(cur){ lines.push(cur); cur = ""; }
    if(cx.measureText(word).width <= maxW){ cur = word; continue; }
    let chunk = "";                                   // one very long word
    for(const ch of word){
      if(chunk && cx.measureText(chunk + ch).width > maxW){ lines.push(chunk); chunk = ch; }
      else chunk += ch;
    }
    cur = chunk;
  }
  if(cur) lines.push(cur);
  return lines.length ? lines : ["—"];
}

function draw(){
  const c = size/2, R = c - 11;
  const hubR = size * 0.17;                 // matches --hub: 34% in the stylesheet
  const showPct = !presenting();            // no numbers in front of an audience
  cx.clearRect(0, 0, size, size);
  const b = bounds();

  cx.save(); cx.translate(c, c);
  cx.beginPath(); cx.arc(0, 0, R + 8, 0, TAU); cx.fillStyle = "#16241E"; cx.fill();
  cx.beginPath(); cx.arc(0, 0, R + 4, 0, TAU); cx.strokeStyle = "#FBC748"; cx.lineWidth = 3; cx.stroke();

  cx.rotate(rot);
  if(!items.length){
    cx.beginPath(); cx.arc(0, 0, R, 0, TAU); cx.fillStyle = "#2B463C"; cx.fill();
    cx.restore(); return;
  }

  items.forEach((it, i) => {
    const [s, e] = b[i];
    if(e - s <= 0) return;
    const a0 = START + s, a1 = START + e, sweep = e - s;

    cx.beginPath(); cx.moveTo(0, 0); cx.arc(0, 0, R, a0, a1); cx.closePath();
    cx.fillStyle = it.color; cx.fill();
    cx.strokeStyle = "rgba(22,36,30,.5)"; cx.lineWidth = 1.6; cx.stroke();

    if(sweep <= .04) return;                // too thin to letter at all
    cx.save(); cx.rotate((a0 + a1) / 2);
    cx.fillStyle = lum(it.color) > .52 ? "#16241E" : "#FBF6E9";
    cx.textAlign = "right"; cx.textBaseline = "middle";

    const pad  = Math.max(18, R * .075);
    const room = R - pad - hubR - 8;        // radial run, stopping short of the hub
    const rMid = (R - pad + hubR + 8) / 2;  // where the block sits
    const perp = 2 * rMid * Math.sin(sweep/2) * .92;   // sideways room in the slice

    // shrink until the whole name fits on the lines the slice can hold
    let fs = Math.min(R * .085, 28), lines = [], lh = 0;
    for(let pass = 0; pass < 26; pass++){
      cx.font = `700 ${fs}px "Space Grotesk", system-ui, sans-serif`;
      lines = wrapLabel(it.name || "—", room);
      lh = fs * 1.06;
      if(lines.length * lh + (showPct ? fs*.78 : 0) <= perp || fs <= 9) break;
      fs -= 1;
    }
    const maxLines = Math.max(1, Math.floor((perp - (showPct ? fs*.78 : 0)) / lh));
    if(lines.length > maxLines){
      lines = lines.slice(0, maxLines);
      lines[maxLines-1] = lines[maxLines-1].replace(/.$/, "…");
    }

    const blockH = lines.length * lh;
    let y = -(blockH - lh) / 2 - (showPct ? fs*.39 : 0);
    lines.forEach(line => { cx.fillText(line, R - pad, y); y += lh; });

    if(showPct && sweep > .13){
      cx.font = `500 ${fs*.66}px "Space Grotesk", system-ui, sans-serif`;
      cx.globalAlpha = .66;
      cx.fillText((sweep/TAU*100).toFixed(1) + "%", R - pad, y - lh + fs*.94);
      cx.globalAlpha = 1;
    }
    cx.restore();
  });

  b.forEach(([s]) => {                      // pegs on every divider
    const a = START + s;
    cx.beginPath(); cx.arc(Math.cos(a)*(R-4), Math.sin(a)*(R-4), 3.4, 0, TAU);
    cx.fillStyle = "#FBF6E9"; cx.fill();
    cx.strokeStyle = "rgba(0,0,0,.4)"; cx.lineWidth = 1.2; cx.stroke();
  });
  cx.restore();
}

/* ---------- flapper spring ---------- */
let flap = 0, flapV = 0;
(function springLoop(){
  flapV += -flap*0.36 - flapV*0.22;
  flap += flapV;
  $("#flapper").style.setProperty("--flap", flap.toFixed(2) + "deg");
  requestAnimationFrame(springLoop);
})();

/* ---------- the spin ---------- */
let spinning = false;

function spin(){
  if(spinning || !items.length) return;
  if(items.length === 1) return land(0);
  spinning = true; $("#spinBtn").disabled = true;
  try{ ac().resume(); }catch(e){}

  const dur   = reduce ? 1100 : +$("#dur").value;
  const from  = rot;
  const turns = reduce ? 2 : 5 + Math.random()*4;
  const to    = from + turns*TAU + Math.random()*TAU;   // uniform final angle
  const t0    = performance.now();
  let lastIdx = indexAt(from);

  (function frame(now){
    const p = Math.min(1, (now - t0) / dur);
    rot = from + (to - from) * (1 - Math.pow(1 - p, 4));
    draw();
    const idx = indexAt(rot);
    if(idx !== lastIdx){ lastIdx = idx; tick(); flapV = -3.2; }
    if(p < 1) requestAnimationFrame(frame);
    else{
      rot = wrap(to); spinning = false;
      $("#spinBtn").disabled = false;
      land(indexAt(rot));
    }
  })(t0);
}

function land(i){
  const it = items[i];
  if(!it) return;
  const chance = norm()[i] * 100;
  if(!reduce){
    $("#wheelwrap").classList.add("shakeit");
    setTimeout(() => $("#wheelwrap").classList.remove("shakeit"), 450);
  }
  fanfare();
  burst(it.color);
  showMeme(it, chance);
  addHistory(it);
  if($("#raffle").checked && items.length > 1){
    items = items.filter(x => x.id !== it.id);
    renderRail(); paint();
  }
}

/* ---------- meme takeover ---------- */
let memeTimer = null;
const esc = s => String(s ?? "").replace(/[<>&"]/g, c => ({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[c]));

function showMeme(it, chance){
  const L = $("#memeLayer");
  L.style.setProperty("--win", it.color);
  L.innerHTML = `
    <div class="flood"></div><div class="rays"></div>
    <div class="memecard">
      <div class="eyebrow">SPINCON &middot; the wheel has spoken</div>
      <div class="prize">${esc(it.name || "Mystery")}</div>
      <div class="frame">
        ${it.img ? `<img src="${it.img}" alt="">` : `<div class="bigemo">${esc(it.emoji || "🎉")}</div>`}
        ${it.top    ? `<div class="mtext top">${esc(it.top)}</div>`    : ""}
        ${it.bottom ? `<div class="mtext bot">${esc(it.bottom)}</div>` : ""}
      </div>
      <div class="odds">
        <span>Chance: <b>${chance.toFixed(1)}%</b></span>
        <span>Roughly <b>1 in ${chance > 0 ? (100/chance).toFixed(1) : "∞"}</b></span>
      </div>
      <button class="close">Claim it and spin again</button>
    </div>`;
  L.classList.add("on");
  L.querySelector(".close").onclick = closeMeme;
  L.querySelector(".flood").onclick = closeMeme;
  L.querySelector(".close").focus({preventScroll:true});
  clearTimeout(memeTimer);
  if($("#autoclose").checked) memeTimer = setTimeout(closeMeme, 6500);
}
function closeMeme(){
  clearTimeout(memeTimer);
  $("#memeLayer").classList.remove("on");
  $("#memeLayer").innerHTML = "";
}

/* ---------- confetti ---------- */
const fx = $("#fx"), fc = fx.getContext("2d");
let bits = [], raf = null;
function sizeFx(){
  const d = Math.min(2, devicePixelRatio || 1);
  fx.width = innerWidth*d; fx.height = innerHeight*d;
  fc.setTransform(d, 0, 0, d, 0, 0);
}
addEventListener("resize", sizeFx); sizeFx();

function burst(color){
  const cols = [color, "#FBC748", "#53AE9A", "#FBF6E9", "#7FC9AC"];
  const n = reduce ? 34 : 150;
  for(let i = 0; i < n; i++) bits.push({
    x: innerWidth/2, y: innerHeight*0.46,
    vx: (Math.random()-.5)*17, vy: -Math.random()*17 - 4,
    w: 5 + Math.random()*8, h: 8 + Math.random()*11,
    r: Math.random()*6.3, vr: (Math.random()-.5)*.42,
    c: cols[i % cols.length], life: 1
  });
  if(!raf) raf = requestAnimationFrame(tickFx);
}
function tickFx(){
  fc.clearRect(0, 0, innerWidth, innerHeight);
  bits = bits.filter(b => b.life > 0);
  bits.forEach(b => {
    b.vy += .42; b.vx *= .994; b.x += b.vx; b.y += b.vy; b.r += b.vr;
    if(b.y > innerHeight + 60) b.life = 0;
    fc.save(); fc.translate(b.x, b.y); fc.rotate(b.r);
    fc.fillStyle = b.c; fc.fillRect(-b.w/2, -b.h/2, b.w, b.h); fc.restore();
  });
  raf = bits.length ? requestAnimationFrame(tickFx) : null;
  if(!raf) fc.clearRect(0, 0, innerWidth, innerHeight);
}

/* ---------- history ---------- */
let log = [];
function addHistory(it){
  log.unshift(it); log = log.slice(0, 9);
  $("#history").innerHTML = `<span class="lbl">Recent</span>` +
    log.map(x => `<span class="tag"><i style="background:${x.color}"></i>${esc(x.name)}</span>`).join("");
}

/* ---------- editor ---------- */
function paint(){
  const w = norm();
  $("#ribbon").innerHTML = items.map((it, i) =>
    `<div style="flex:${w[i] || .0001} 1 0;background:${it.color}" data-pct="${(w[i]*100).toFixed(0)}%" ${w[i] < .055 ? "data-narrow" : ""}></div>`
  ).join("");

  const raw = items.reduce((s, i) => s + Math.max(0, +i.weight || 0), 0);
  $("#sumNote").textContent = items.length ? `${items.length} prizes · weights total ${raw}` : "empty wheel";
  $("#oddsNote").textContent = Math.abs(raw - 100) < .01
    ? "weights add up to 100"
    : "weights are shared out, they needn't total 100";
  document.querySelectorAll(".pct").forEach((el, i) => el.textContent = (w[i]*100).toFixed(1) + "%");
  $("#spinBtn").disabled = !items.length || spinning;
  draw();
}

function renderRail(){
  const box = $("#rows"); box.innerHTML = "";
  items.forEach(it => {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <div class="rowmain">
        <button class="swatch" style="background:${it.color}" title="Colour"><input type="color" value="${it.color}"></button>
        <input class="nm" value="${esc(it.name)}" placeholder="Prize name" aria-label="Prize name">
        <input class="wt" type="number" min="0" step="0.5" value="${it.weight}" aria-label="Chance weight">
        <span class="pct">0%</span>
        <button class="iconbtn meme" title="Meme for this prize">😂</button>
        <button class="iconbtn del" title="Remove">✕</button>
      </div>
      <div class="mm">
        <input class="emo" value="${esc(it.emoji)}" maxlength="4" aria-label="Emoji">
        <input type="text" class="top" value="${esc(it.top)}" placeholder="Top meme line">
        <input type="text" class="bot" value="${esc(it.bottom)}" placeholder="Bottom meme line">
        <div class="file">
          <label>Upload a picture<input type="file" accept="image/*"></label>
          ${it.img ? `<img class="thumb" src="${it.img}" alt="">` : `<span>Otherwise the emoji fills the frame</span>`}
          ${it.img ? `<button class="mini clr" style="padding:5px 9px">Remove picture</button>` : ""}
        </div>
      </div>`;

    const q = s => row.querySelector(s);
    q(".swatch input").oninput = e => { it.color = e.target.value; q(".swatch").style.background = it.color; paint(); };
    q(".nm").oninput  = e => { it.name = e.target.value; draw(); };
    q(".wt").oninput  = e => { it.weight = Math.max(0, +e.target.value || 0); paint(); };
    q(".emo").oninput = e => it.emoji = e.target.value;
    q(".top").oninput = e => it.top = e.target.value;
    q(".bot").oninput = e => it.bottom = e.target.value;
    q(".meme").onclick = () => { row.classList.toggle("open"); q(".meme").classList.toggle("on"); };
    q(".del").onclick  = () => { items = items.filter(x => x.id !== it.id); renderRail(); paint(); };
    q(".file input").onchange = e => {
      const f = e.target.files[0];
      if(!f) return;
      const r = new FileReader();
      r.onload = () => {
        it.img = r.result;
        const at = items.indexOf(it);
        renderRail(); paint();
        const again = document.querySelectorAll(".row")[at];
        if(again){ again.classList.add("open"); again.querySelector(".meme").classList.add("on"); }
      };
      r.readAsDataURL(f);
    };
    const clr = q(".clr");
    if(clr) clr.onclick = () => { it.img = null; renderRail(); paint(); };

    box.appendChild(row);
  });
}

/* ---------- controls ---------- */
$("#spinBtn").onclick = spin;
$("#hub").onclick = spin;

addEventListener("keydown", e => {
  if(e.code === "Space" && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)){
    e.preventDefault();
    $("#memeLayer").classList.contains("on") ? closeMeme() : spin();
  }
  if(e.key === "Escape"){ closeMeme(); $("#modal").classList.remove("on"); }
});

$("#addBtn").onclick = () => {
  items.push(mk("New prize", 10, PAL[items.length % PAL.length], "🎁", "", ""));
  renderRail(); paint();
  $("#rows").scrollTop = $("#rows").scrollHeight;
};
$("#evenBtn").onclick = () => {
  items.forEach(i => i.weight = +(100 / items.length).toFixed(2));
  renderRail(); paint();
};
$("#sndBtn").onclick = e => {
  sound = !sound;
  e.currentTarget.setAttribute("aria-pressed", sound);
  e.currentTarget.textContent = sound ? "🔊 Sound on" : "🔇 Sound off";
};
$("#presentBtn").onclick = e => {
  const on = document.body.classList.toggle("present");
  e.currentTarget.setAttribute("aria-pressed", on);
  requestAnimationFrame(fit);              // redraws without the percentages
};
$("#jsonBtn").onclick = () => {
  $("#jsonBox").value = JSON.stringify(items.map(({id, ...r}) => r), null, 1);
  $("#modal").classList.add("on");
};
$("#closeModal").onclick = () => $("#modal").classList.remove("on");
$("#copyBtn").onclick = async e => {
  try{ await navigator.clipboard.writeText($("#jsonBox").value); e.target.textContent = "Copied"; }
  catch{ $("#jsonBox").select(); e.target.textContent = "Select and copy"; }
  setTimeout(() => e.target.textContent = "Copy", 1600);
};
$("#loadBtn").onclick = e => {
  try{
    const d = JSON.parse($("#jsonBox").value);
    if(!Array.isArray(d) || !d.length) throw 0;
    items = d.map(o => ({
      id: ++uid,
      name: String(o.name || "Prize"),
      weight: Math.max(0, +o.weight || 0),
      color: /^#[0-9a-f]{6}$/i.test(o.color) ? o.color : "#FBC748",
      emoji: o.emoji || "🎉", top: o.top || "", bottom: o.bottom || "", img: o.img || null
    }));
    renderRail(); paint(); $("#modal").classList.remove("on");
  }catch{
    e.target.textContent = "That text isn't a wheel — check it and try again";
    setTimeout(() => e.target.textContent = "Load this wheel", 2600);
  }
};

renderRail(); fit(); paint();
})();