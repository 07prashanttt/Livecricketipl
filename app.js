import { GameEngine } from "./engine/GameEngine.js";
import { Stadium3D } from "./engine/Stadium3D.js";

const ui = {
  canvas: document.querySelector("#stadium"),
  score: document.querySelector("#score"),
  over: document.querySelector("#overLabel"),
  rr: document.querySelector("#runRate"),
  target: document.querySelector("#target"),
  striker: document.querySelector("#strikerName"),
  batterStats: document.querySelector("#batterStats"),
  team: document.querySelector("#battingTeam"),
  innings: document.querySelector("#inningsLabel"),
  message: document.querySelector("#message"),
  status: document.querySelector("#statusText"),
  batting: document.querySelector("#battingControls"),
  bowling: document.querySelector("#bowlingControls"),
  modal: document.querySelector("#resultModal"),
  resultTitle: document.querySelector("#resultTitle"),
  resultText: document.querySelector("#resultText")
};

const stadium = new Stadium3D(ui.canvas);
const game = new GameEngine({
  onUpdate: render,
  onMessage: (message) => { ui.message.textContent = message; },
  onBall: (ball) => stadium.playBall(ball),
  onResetScene: () => stadium.resetBall()
});

function render(s) {
  ui.score.textContent = `${s.score}/${s.wickets}`;
  ui.over.textContent = `${s.overs}.${s.balls} / ${s.maxOvers} OV`;
  ui.rr.textContent = `RR ${s.runRate.toFixed(2)}`;
  ui.target.textContent = s.target ? `TARGET ${s.target}` : "TARGET —";
  ui.striker.textContent = s.striker.name;
  ui.batterStats.textContent = `${s.striker.runs} (${s.striker.balls})`;
  ui.team.textContent = s.battingTeam;
  ui.innings.textContent = s.innings === 1 ? "1ST INNINGS" : "2ND INNINGS";
  ui.status.textContent = s.phase === "ready" ? "Ready to bowl" : s.phase.toUpperCase();
  if (s.phase === "complete") {
    ui.resultTitle.textContent = s.result.title;
    ui.resultText.textContent = s.result.text;
    ui.modal.classList.remove("hidden");
  } else ui.modal.classList.add("hidden");
}

document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x === btn));
  const batting = btn.dataset.tab === "batting";
  ui.batting.classList.toggle("hidden", !batting);
  ui.bowling.classList.toggle("hidden", batting);
  game.setMode(batting ? "batting" : "bowling");
}));

document.querySelectorAll(".shot").forEach(btn => btn.addEventListener("click", () => {
  game.playShot(btn.dataset.shot);
}));
document.querySelector("#bowlBtn").addEventListener("click", () => {
  game.bowl({
    line: document.querySelector("#bowlLine").value,
    length: document.querySelector("#bowlLength").value,
    pace: document.querySelector("#bowlPace").value
  });
});
document.querySelector("#newMatchBtn").addEventListener("click", () => {
  if (confirm("Start a new match? Current match progress will be lost.")) game.newMatch();
});
document.querySelector("#playAgainBtn").addEventListener("click", () => game.newMatch());
document.querySelector("#pauseBtn").addEventListener("click", (e) => {
  const paused = game.togglePause();
  e.currentTarget.textContent = paused ? "RESUME" : "PAUSE";
});

window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  if (e.key === " " || e.key.toLowerCase() === "b") game.bowl({line:"middle",length:"good",pace:"fast"});
  if (e.key === "1") game.playShot("defend");
  if (e.key === "2") game.playShot("ground");
  if (e.key === "3") game.playShot("loft");
  if (e.key === "4") game.playShot("sweep");
});

game.newMatch();
stadium.animate();
