---
title: "User-Story-Simulation: Flow und Varianz"
date: 2024-01-14T12:00:00+01:00
draft: false
wf_page: "684991c327f4d0186c0e0f1f" 
---

<div class="container-content-blog">
<p class="intro centered">Stellen Sie sich vor, Sie haben eine Lieferkette von Teams. Jedes Team bearbeitet <strong>User Storys</strong> und gibt sie an das nächste weiter.</p>
Die <strong>Varianz</strong> (Schwankung der Geschwindigkeit) hat einen enormen Einfluss. Bei 0% Varianz arbeiten alle wie Maschinen (immer 6 Storys). Bei 100% schwankt die Leistung stark (wie beim Würfeln 1-6).</p>
<p>Stellen Sie die Varianz ein und starten Sie die Simulation.</p>
</div>

<div id="sim-container">
<div class="controls-top centered margin-bottom-20">
<label for="variance-slider">Varianz der Geschwindigkeit: <span id="variance-val">50</span>%</label>
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
max-width: 900px;
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
align-items: center;
justify-content: flex-start;
min-width: 800px;
padding: 20px 0;
}
.team-container {
display: flex;
flex-direction: column;
align-items: center;
margin: 0 5px;
position: relative;
}
.team-box {
width: 60px;
height: 60px;
background-color: #333;
color: white;
border-radius: 8px;
display: flex;
justify-content: center;
align-items: center;
font-weight: bold;
font-size: 12px;
text-align: center;
z-index: 2;
}
.matches-pile {
display: flex;
flex-direction: column;
justify-content: center;
align-items: center;
width: 60px;
min-height: 50px;
margin: 0 5px;
background-color: #fff;
border: 1px dashed #ccc;
border-radius: 4px;
padding: 5px;
transition: background-color 0.3s;
}
.matches-pile.full {
background-color: #ffe6e6;
}
.matches-count {
font-size: 18px;
font-weight: bold;
color: #D63319;
}
.matches-label {
font-size: 10px;
color: #999;
text-align: center;
}
.last-roll {
font-size: 10px;
color: #333;
background: #eee;
padding: 2px 4px;
border-radius: 4px;
margin-top: 5px;
opacity: 0; 
transition: opacity 0.3s;
text-align: center;
}
.last-roll.visible {
opacity: 1;
}
.arrow {
color: #999;
font-size: 14px;
margin: 0 5px;
}
</style>

<script>
(function() {
const numTeams = 6;
const maxCapacity = 6;
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
teamEl.innerHTML = '<div class="team-box">Team ' + (i+1) + '</div><div class="last-roll" id="roll-' + i + '">Speed: -</div>';
container.appendChild(teamEl);
const arrow1 = document.createElement('div');
arrow1.className = 'arrow';
arrow1.innerHTML = '➞';
container.appendChild(arrow1);
const pileEl = document.createElement('div');
pileEl.className = 'matches-pile';
pileEl.id = 'pile-' + i;
const label = i === numTeams - 1 ? 'Fertig' : 'Buffer';
pileEl.innerHTML = '<div class="matches-label">' + label + '</div><div class="matches-count">' + piles[i] + '</div>';
container.appendChild(pileEl);
if (i < numTeams - 1) {
const arrow2 = document.createElement('div');
arrow2.className = 'arrow';
arrow2.innerHTML = '➞';
container.appendChild(arrow2);
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
const el = document.getElementById('pile-' + index);
if (el) {
el.querySelector('.matches-count').innerText = count;
if(index < numTeams -1 && count > 5) {
el.classList.add('full');
} else {
el.classList.remove('full');
}
}
});
}
function getVariance() {
const el = document.getElementById('variance-slider');
return el ? parseInt(el.value, 10) : 50;
}
function calculateSpeed() {
const v = getVariance();
if (v === 0) return maxCapacity;
const maxReduction = Math.floor(maxCapacity * (v / 100));
const effectiveMaxReduction = Math.min(maxReduction, maxCapacity - 1);
const reduction = Math.floor(Math.random() * (effectiveMaxReduction + 1));
return maxCapacity - reduction;
}
function nextRound() {
round++;
let moves = Array(numTeams).fill(0);
const speed1 = calculateSpeed();
moves[0] = speed1; 
showRoll(0, speed1);
for (let i = 1; i < numTeams; i++) {
const speed = calculateSpeed();
const inputAvailable = piles[i-1];
moves[i] = Math.min(inputAvailable, speed);
showRoll(i, speed);
}
piles[0] += moves[0];
for (let i = 1; i < numTeams; i++) {
piles[i-1] -= moves[i];
piles[i] += moves[i];
}
updateUI();
}
function showRoll(teamIndex, amount) {
const rollEl = document.getElementById('roll-' + teamIndex);
if(rollEl) {
rollEl.innerText = 'Speed: ' + amount;
rollEl.classList.add('visible');
}
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
document.querySelectorAll('.last-roll').forEach(el => el.classList.remove('visible'));
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
<p>Wenn Sie die Varianz auf <strong>0%</strong> stellen, füllen sich die Puffer langsam, aber der Durchfluss ist am Ende konstant max (6). Jedes Team liefert perfekt.</p>
<p>Sobald Sie die Varianz erhöhen (z.B. <strong>50%</strong>), passiert etwas Spannendes: Obwohl die Teams oft schnell sein könnten, <strong>verhungern</strong> sie, weil keine Arbeit da ist (Puffer leer). Gleichzeitig staut sich Arbeit vor anderen Teams.</p>
<p>Durchsatz geht verloren, nicht weil die Teams langsam sind, sondern weil die <strong>Synchronisation fehlt</strong>.</p>
<p class="intro centered margin-top-30"><strong>Flow entsteht nicht durch lokalen Druck, sondern durch systemische Steuerung.</strong></p>
<div class="centered">
<a href="{{< webinar_url >}}" target="_blank" class="button-primary w-button">Zum kostenfreien Webinar anmelden</a>
</div>
</div>
