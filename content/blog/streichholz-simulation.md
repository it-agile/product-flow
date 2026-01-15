---
title: "User-Story-Simulation: Flow und Varianz"
date: 2024-01-14T12:00:00+01:00
draft: false
wf_page: "684991c327f4d0186c0e0f1f" 
---

<div class="container-content-blog">
<h2 class="centered red"> Bei abhängigen Ereignissen schaukeln sich Varianzen auf! </h2>
<p>Stellen Sie sich vor, Sie haben eine Reihe von Teams, die gemeinsam <strong>business-relevante Features</strong> umsetzen müssen. Jedes Team entwickelt für seinen Bereich <strong>User Storys</strong>. Wenn ein Team seine User Storys für ein Feature umgesetzt hat, arbeitet das nächste Team an seinen User Storys im Rahmen der Features.</p>
<p>Die <strong>Varianz des Team-Durchsatzes</strong> (User Storys/Sprint) hat einen enormen Einfluss auf die <strong>teamübergreifende Lieferfähigkeit</strong>. Bei 0% Varianz arbeiten alle wie Maschinen (immer 8 Storys/Sprint). Bei 100% schwankt die Leistung stark (zwischen 0 und 16 Storys/Sprint).</p>
<p> Je größer die Varianz, desto stärker schaukeln sich Varianzen auf. Das erklärt ein Phänomen, das sich immer wieder in der Praxis beobachten lässt: Jedes Team schätzt, arbeitet und liefert mustergültig. Die business-relevanten Features verzögern sich trotzdem. So kann es leicht passieren, dass trotz "optimaler" Planung immer nur 40% der eingeplanten business-relevanten Features wie geplant geliefert werden. Die Ursache sind sich aufschaukelnde Varianzen.</p>
<p>Die Simulation veranschaulicht das Phänomen. Stellen Sie die Varianz ein und starten Sie die Simulation.</p>
</div>

<div id="sim-container">
<div class="controls-top centered margin-bottom-20">
<label for="variance-slider">Varianz des Team-Durchsatzes: <span id="variance-val">50</span>%</label>
<input type="range" id="variance-slider" name="variance" min="0" max="100" value="50" style="width: 200px;">
</div>
<div id="stations-line"></div>
<div class="controls centered margin-top-30">
<button id="btn-next-round" class="button-primary w-button">Nächste Runde</button>
<button id="btn-auto" class="button-primary w-button" style="margin-left: 10px;">Auto Play</button>
<button id="btn-reset" class="button-secondary w-button" style="margin-left: 10px;">Reset</button>
</div>
<div class="stats centered margin-top-20">
<p>Runde: <span id="round-counter">0</span> | Ø Durchsatz: <span id="throughput">0</span></p>
</div>
</div>

<style>
#sim-container {
width: 100%;
max-width: 950px;
margin: 40px auto;
padding: 20px;
background-color: #f9f9f9;
border-radius: 8px;
box-shadow: 0 4px 10px rgba(0,0,0,0.05);
overflow-x: auto;
}
#stations-line {
display: flex;
flex-direction: row;
align-items: flex-end; 
justify-content: space-around;
min-width: 900px;
padding: 20px 0;
height: 250px; 
}
.team-container {
display: flex;
flex-direction: column;
align-items: center;
width: 100px;
}
.team-box {
width: 90px;
height: 40px;
background-color: #333;
color: white;
border-radius: 4px;
display: flex;
justify-content: center;
align-items: center;
font-weight: bold;
font-size: 12px;
margin-top: 10px;
}
.gauge {
width: 80px;
height: 40px;
position: relative;
overflow: hidden;
border-radius: 40px 40px 0 0;
background: #ddd;
}
.gauge-inner {
width: 80px;
height: 40px;
background: conic-gradient(from -90deg at 50% 100%, #ff4d4d 0deg, #ffd633 90deg, #4dff4d 180deg);
position: absolute;
top: 0;
left: 0;
}
.gauge-mask {
width: 60px;
height: 30px;
background: #f9f9f9;
border-radius: 30px 30px 0 0;
position: absolute;
bottom: 0;
left: 10px;
z-index: 1;
}
.gauge-needle {
width: 2px;
height: 35px;
background: #000;
position: absolute;
bottom: 0;
left: 39px;
transform-origin: bottom center;
transform: rotate(-90deg); 
transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
z-index: 2;
}
.buffer-container {
display: flex;
flex-direction: column;
align-items: center;
width: 50px;
height: 150px;
justify-content: flex-end;
}
.buffer-bar-wrapper {
width: 20px;
height: 120px;
background: #eee;
border: 1px solid #ccc;
border-radius: 2px;
position: relative;
display: flex;
flex-direction: column;
justify-content: flex-end;
overflow: hidden;
margin-top: 5px;
}
.buffer-bar {
width: 100%;
height: 0%; 
background-color: #D63319;
transition: height 0.3s ease-out;
}
.buffer-label {
font-size: 9px;
color: #999;
margin-top: 5px;
text-align: center;
line-height: 1.1;
}
.buffer-count {
font-weight: bold;
font-size: 14px;
color: #333;
margin-bottom: 2px;
}
.arrow-small {
color: #ccc;
font-size: 12px;
margin: 0 2px 20px 2px;
}
</style>

<script>
(function() {
const numTeams = 6;
const baseSpeed = 8;
const maxBufferVisual = 20; // Increased visual cap for buffers
let piles = []; 
let round = 0;
let autoInterval = null;

function init() {
piles = Array(numTeams).fill(0);
round = 0;
renderLine();
updateUI();
}

function renderLine() {
const container = document.getElementById('stations-line');
if (!container) return;
container.innerHTML = '';

for (let i = 0; i < numTeams; i++) {
const teamEl = document.createElement('div');
teamEl.className = 'team-container';
teamEl.innerHTML = `
<div class="gauge">
<div class="gauge-inner"></div>
<div class="gauge-mask"></div>
<div class="gauge-needle" id="needle-${i}"></div>
</div>
<div class="team-box">Team ${i + 1}</div>
<div style="font-size:9px; color:#666; margin-top:2px;" id="speed-label-${i}">Storys/Sprint: -</div>
`;
container.appendChild(teamEl);

const arrow = document.createElement('div');
arrow.className = 'arrow-small';
arrow.innerHTML = '➞';
container.appendChild(arrow);

const bufferEl = document.createElement('div');
bufferEl.className = 'buffer-container';
const isLast = i === numTeams - 1;
const label = isLast ? 'Fertig' : 'wartende User Storys';
const barHtml = isLast ? '' : `
<div class="buffer-bar-wrapper">
<div class="buffer-bar" id="bar-${i}"></div>
</div>
`;

bufferEl.innerHTML = `
<div class="buffer-count" id="count-${i}">0</div>
${barHtml}
<div class="buffer-label">${label}</div>
`;
container.appendChild(bufferEl);

if (i < numTeams - 1) {
const arrowEnd = document.createElement('div');
arrowEnd.className = 'arrow-small';
arrowEnd.innerHTML = '➞';
container.appendChild(arrowEnd);
}
}
}

function updateUI() {
const roundEl = document.getElementById('round-counter');
const throughputEl = document.getElementById('throughput');
if (roundEl) roundEl.innerText = round;
if (throughputEl) {
const avg = round > 0 ? (piles[numTeams-1] / round).toFixed(1) : 0;
throughputEl.innerText = avg;
}

piles.forEach((count, index) => {
const countEl = document.getElementById('count-' + index);
if (countEl) countEl.innerText = count;

const barEl = document.getElementById('bar-' + index);
if (barEl) {
const percentage = Math.min((count / maxBufferVisual) * 100, 100);
barEl.style.height = percentage + '%';
if (count > 15) {
barEl.style.backgroundColor = '#ff0000';
} else if (count > 8) {
barEl.style.backgroundColor = '#ff9900';
} else {
barEl.style.backgroundColor = '#D63319';
}
}
});
}

function getVariance() {
const el = document.getElementById('variance-slider');
return el ? parseInt(el.value, 10) : 50;
}

function calculateSpeed() {
const v = getVariance(); // 0..100
if (v === 0) return baseSpeed;
// Variance range: [base - V_range, base + V_range]
// If V=100%, V_range = 8. Range = [0..16]. Avg = 8.
const vRange = baseSpeed * (v / 100);
const reduction = (Math.random() * (vRange * 2)) - vRange;
return Math.max(0, Math.round(baseSpeed + reduction));
}

function updateGauge(teamIndex, speed) {
const needle = document.getElementById('needle-' + teamIndex);
const label = document.getElementById('speed-label-' + teamIndex);
if (needle) {
// Map 0..16 speed to -90 to +90 degrees
// 0 -> -90
// 8 -> 0
// 16 -> +90
const angle = (speed / 16) * 180 - 90;
needle.style.transform = 'rotate(' + angle + 'deg)';
}
if (label) {
label.innerText = 'Storys/Sprint: ' + speed;
}
}

function nextRound() {
round++;
let moves = Array(numTeams).fill(0);
const speed1 = calculateSpeed();
moves[0] = speed1; 
updateGauge(0, speed1);

for (let i = 1; i < numTeams; i++) {
const speed = calculateSpeed();
const inputAvailable = piles[i-1];
moves[i] = Math.min(inputAvailable, speed);
updateGauge(i, speed);
}

piles[0] += moves[0];
for (let i = 1; i < numTeams; i++) {
piles[i-1] -= moves[i];
piles[i] += moves[i];
}
updateUI();
}

const btnNext = document.getElementById('btn-next-round');
if (btnNext) btnNext.addEventListener('click', nextRound);
const slider = document.getElementById('variance-slider');
const sliderVal = document.getElementById('variance-val');
if (slider) {
slider.addEventListener('input', () => {
if (sliderVal) sliderVal.innerText = slider.value;
});
}
const btnReset = document.getElementById('btn-reset');
if (btnReset) {
btnReset.addEventListener('click', () => {
init();
clearInterval(autoInterval);
const btnAuto = document.getElementById('btn-auto');
if(btnAuto) btnAuto.innerText = "Auto Play";
for(let i=0; i<numTeams; i++) {
const needle = document.getElementById('needle-' + i);
if(needle) needle.style.transform = 'rotate(-90deg)';
const label = document.getElementById('speed-label-' + i);
if(label) label.innerText = 'Storys/Sprint: -';
}
});
}
const btnAuto = document.getElementById('btn-auto');
if (btnAuto) {
btnAuto.addEventListener('click', function() {
if(autoInterval) {
clearInterval(autoInterval);
autoInterval = null;
this.innerText = "Auto Play";
} else {
autoInterval = setInterval(nextRound, 500);
this.innerText = "Stop";
}
});
}
init();
})();
</script>

<div class="container-content-blog margin-top-60">
<h2>Was beobachten wir hier?</h2>
<p>Wenn Sie die Varianz auf <strong>0%</strong> stellen, arbeitet jedes Team in der immer gleichen Geschwindigkeit. Jedes Team liefert perfekt. Da es keine Varianzen gibt, können sich diese nicht aufschaukeln und business-relevante Features würden wie geplant geliefert werden.</p>
<p>Sobald Sie die Varianz erhöhen (z.B. <strong>50%</strong>), passiert etwas Spannendes: Obwohl die Teams oft schnell sein könnten, <strong>verhungern</strong> sie, weil keine Arbeit da ist: Ein Team hätte Kapazität, um an einem Feature zu arbeiten, wird aber ausgebremst, weil das vorgelagerte Team seine Arbeit noch nicht abgeschlossen hat. Gleichzeitig staut sich Arbeit vor anderen Teams.</p>
<p>Teamübergreifende Lieferfähigkeit geht verloren, nicht weil die Teams langsam sind, sondern weil das gewählte Arbeitssystem dazu führt, dass sich Varianzen aufschaukeln.</p>
<p class="intro centered margin-top-30"><strong>Lieferfähigkeit entsteht nicht durch lokalen Druck, sondern durch die Wahl eines geeigneten Arbeitssystems und systemischer Steuerung.</strong></p>
<p class="intro red centered margin-top-30"><strong>Erfahren Sie mehr in einem unserer Webinare.</strong></p>
<div class="centered">
<a href="{{< webinar_url >}}" target="_blank" class="button-primary w-button">Zum kostenfreien Webinar anmelden</a>
</div>
</div>
