function showScreen(name) {
  document.querySelectorAll('.screen').forEach(div => div.classList.remove('active'));
  document.getElementById(name).classList.add('active');
}

function showMap() { showScreen('mapPage'); }
function backToMenu() { showScreen('menuPage'); }

function showBriefing(planet) {
  if (planet === 'entanglia') showScreen('briefingPage');
  else if (planet === 'dualon') showScreen('briefingDualon');
  else if (planet === 'chaos') showScreen('briefingChaos');
}

function showInstructions() {
  alert("Instructions:\n- Start the game\n- Pick your mission\n- Try to master quantum teleportation!");
}

function showSettings() {
  alert("Settings will be available in a future version!");
}

function exitGame() {
  alert("Thank you for playing Quantum Quest!");
}

window.onload = function() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('screen') === 'mapPage') {
    showScreen('mapPage');
  } else {
    showScreen('menuPage');
  }
};

/* -------------------
   ENTANGLIA GAME LOGIC
----------------------*/

let entanglia = {
  original: null,
  receiver: null,
  bits: null,
  required: [],
  player: [],
  timer: 90,
  score: 0,
  active: false,   // PATCH: controls if game is running
  failures: 0,
  failureReasons: [],
  timerID: null,
  sending: false,
};

/* Entry Points */
function openDualon2Game() {
  window.location.href = '../QTgame/index.html';
}

function openEntangliaGame() {
  showScreen('gameEntanglia');
  startEntanglia();
}

/* Leave */
function entangliaLeave() {
  stopEntanglia();
  showScreen('briefingPage');
}

/* Start Game */
function startEntanglia() {
  stopEntanglia();

  entanglia.active = true; // PATCH: mark as active

  entanglia.timer = 90;
  entanglia.score = 0;
  entanglia.failures = 0;
  entanglia.failureReasons = [];

  document.getElementById('qq-score').innerText = 0;
  document.getElementById('qq-timer').innerText = "01:30";

  newRound();

  entanglia.timerID = setInterval(() => {
    entanglia.timer--;
    document.getElementById('qq-timer').innerText = formatTime(entanglia.timer);

    // ✔ STOP HERE so no new rounds run
    if (entanglia.timer <= 0) {
      clearInterval(entanglia.timerID);
      entanglia.active = false; // PATCH: mark as inactive

      disableAll(); // freeze the UI
      setTimeout(() => {
        entangliaEndGameWithPopup();  // 💥 SHOW POPUP
      }, 200); // small delay fixes rendering bug
    }
  }, 1000);

  window.addEventListener("keydown", entKey);
}

/* Stop */
function stopEntanglia() {
  clearInterval(entanglia.timerID);
  window.removeEventListener("keydown", entKey);
  entanglia.active = false; // PATCH: mark as inactive always
}

/* Format timer */
function formatTime(sec) {
  let m = String(Math.floor(sec/60)).padStart(2,'0');
  let s = String(sec%60).padStart(2,'0');
  return m + ":" + s;
}

/* Key Support */
function entKey(e) {
  if (!entanglia.active) return; // PATCH: Ignore all input if not active
  const k = e.key.toLowerCase();
  if (k === 'e') entangle();
  if (k === 'm') measure();
  if (k === 'c') sendBits();
  if (k === 'x') entangliaApplyGate("X");
  if (k === 'z') entangliaApplyGate("Z");
  if (k === 'i') entangliaApplyGate("I");
}

/* Random qubit */
function randomBloch() {
  let u = Math.random();
  let v = Math.random();

  let theta = Math.acos(1 - 2*u);
  let phi = 2*Math.PI*v;

  return {
    theta,
    phi,
    x: Math.sin(theta)*Math.cos(phi),
    y: Math.sin(theta)*Math.sin(phi),
    z: Math.cos(theta)
  };
}

/* Draw Bloch sphere */
function drawBloch(id, v) {
  let c = document.getElementById(id);
  let ctx = c.getContext("2d");
  let w = c.width, h = c.height;
  let cx = w/2, cy = h/2;
  let r = w/2 - 18;

  ctx.clearRect(0,0,w,h);

  ctx.fillStyle="#151026";
  ctx.beginPath();
  ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.fill();

  let px = cx + v.x * (r*0.75);
  let py = cy - v.z * (r*0.75);

  ctx.strokeStyle="rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.moveTo(cx,cy); ctx.lineTo(px,py); ctx.stroke();

  ctx.fillStyle="#fff";
  ctx.beginPath(); ctx.arc(px,py,6,0,Math.PI*2); ctx.fill();
}

/* Apply Pauli Gates */
function applyGate(v, g) {
  if (g === "X") return {x:v.x, y:-v.y, z:-v.z};
  if (g === "Z") return {x:-v.x, y:-v.y, z:v.z};
  return {...v}; // I gate
}

/* New Round */
function newRound() {
  entanglia.bits = null;
  entanglia.player = [];
  entanglia.required = [];
  entanglia.sending = false;

  document.getElementById("round-result").innerText = "";

  entanglia.original = randomBloch();
  drawBloch("encoderBloch", entanglia.original);

  entanglia.receiver = {x:0,y:0,z:1};
  drawBloch("decoderBloch", entanglia.receiver);

  document.getElementById("dot-top").style.transform = "translateX(0)";
  document.getElementById("dot-bottom").style.transform = "translateX(0)";

  enableButtons(true,false,false,false);
}

/* E: Entangle */
function entangle() {
  if (!entanglia.active) return; // PATCH: Ignore if ended
  document.getElementById("round-result").innerText = "Entanglement created!";
  enableButtons(false,true,false,false);
}

/* M: Bell Measure */
function measure() {
  if (!entanglia.active) return;
  let arr = ["00","01","10","11"];
  let pick = arr[Math.floor(Math.random()*4)];

  entanglia.bits = pick;
  document.getElementById("bit-top").innerText = pick[0];
  document.getElementById("bit-bottom").innerText = pick[1];

  if (pick === "00") entanglia.required = [];
  if (pick === "01") entanglia.required = ["X"];
  if (pick === "10") entanglia.required = ["Z"];
  if (pick === "11") entanglia.required = ["X","Z"];

  let inverse = [...entanglia.required].reverse();
  let v = {...entanglia.original};
  inverse.forEach(g=>v=applyGate(v,g));
  entanglia.receiver = v;

  drawBloch("decoderBloch", v);

  enableButtons(false,false,true,false);
}

/* C: Send */
function sendBits() {
  if (!entanglia.active) return; // PATCH
  if (!entanglia.bits || entanglia.sending) return;

  entanglia.sending = true;

  let line = document.querySelector(".link-line");
  let width = line.offsetWidth - 40;

  document.getElementById("dot-top").style.transform = `translateX(${width}px)`;
  document.getElementById("dot-bottom").style.transform = `translateX(${width}px)`;

  setTimeout(()=>{
    entanglia.sending = false;
    enableButtons(false,false,false,true);
    document.getElementById("round-result").innerText = "Bits received — apply correction!";
  }, 1000);
}

/* Player applies gate */
function entangliaApplyGate(g) {
  if (!entanglia.active) return; // PATCH
  if (!entanglia.bits) return;

  entanglia.player.push(g);

  let v = {...entanglia.receiver};
  v = applyGate(v, g);
  entanglia.receiver = v;

  drawBloch("decoderBloch", v);

  let playerNoI = entanglia.player.filter(x=>x!=="I");
  let req = entanglia.required;

  if (playerNoI.length >= req.length) {
    if (playerNoI.length === req.length &&
        playerNoI.every((x,i)=>x===req[i])) {
      entangliaSuccess();
    } else {
      entangliaFail("wrongGate");
    }
  }
}

/* Enable / Disable buttons */
function enableButtons(e,m,c,g) {
  document.getElementById("ent-btn").disabled = !e;
  document.getElementById("bell-btn").disabled = !m;
  document.getElementById("send-btn").disabled = !c;

  document.getElementById("gate-x").disabled = !g;
  document.getElementById("gate-z").disabled = !g;

  let ig = document.getElementById("gate-i");
  if (ig) ig.disabled = !g;
}

/* Replay button */
function entangliaReplay() {
  startEntanglia();
}

/* Success */
function entangliaSuccess() {
  if (!entanglia.active) return; // PATCH: ignore after end
  entanglia.score++;
  document.getElementById('qq-score').innerText = entanglia.score;
  document.getElementById('round-result').innerText = 'Teleportation SUCCESS! 🎉';

  setTimeout(() => {
    if (entanglia.timer > 0 && entanglia.active) newRound();
  }, 1000);
}

/* Failure */
function entangliaFail(reason) {
  if (!entanglia.active) return; // PATCH: ignore after end
  entanglia.failures++;
  entanglia.failureReasons.push(reason);
  document.getElementById('round-result').innerText = 'Teleportation FAILED!';

  setTimeout(() => {
    if (entanglia.timer > 0 && entanglia.active) newRound();
  }, 1000);
}

/* End Game Popup */
function entangliaEndGameWithPopup() {
  disableAll();
  clearInterval(entanglia.timerID);
  entanglia.active = false; // PATCH

  document.getElementById('res-score').innerText = entanglia.score;
  document.getElementById('res-fail').innerText = entanglia.failures;

  const tips = buildDynamicTips(entanglia);
  const tipList = document.getElementById('res-tips-list');
  tipList.innerHTML = "";

  tips.forEach(t=>{
    let li=document.createElement("li");
    li.innerText=t;
    tipList.appendChild(li);
  });

  showResultsOverlay(true);
}
function disableAll() {
  document.getElementById("ent-btn").disabled = true;
  document.getElementById("bell-btn").disabled = true;
  document.getElementById("send-btn").disabled = true;
  document.getElementById("gate-x").disabled = true;
  document.getElementById("gate-z").disabled = true;

  let ig = document.getElementById("gate-i");
  if (ig) ig.disabled = true;
}
function entangliaEntangle() { entangle(); }
function entangliaMeasure() { measure(); }
function entangliaSend() { sendBits(); }
function showResultsOverlay(show) {
  const overlay = document.getElementById("ent-results-overlay");

  if (show) {
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
  } else {
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
  }
}
document.getElementById("res-replay-btn").onclick = () => {
  showResultsOverlay(false);
  startEntanglia();
};

document.getElementById("res-back-btn").onclick = () => {
  showResultsOverlay(false);
  showScreen("briefingPage");
};

document.getElementById("res-close").onclick = () => {
  showResultsOverlay(false);
};
