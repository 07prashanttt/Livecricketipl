export class GameEngine {
  constructor({ onUpdate = () => {}, onMessage = () => {}, onBall = () => {}, onResetScene = () => {} } = {}) {
    this.onUpdate = onUpdate;
    this.onMessage = onMessage;
    this.onBall = onBall;
    this.onResetScene = onResetScene;
    this.mode = "batting";
    this.paused = false;
    this.newMatch();
  }

  newMatch() {
    this.state = {
      battingTeam: "CSK", bowlingTeam: "MI", innings: 1,
      score: 0, wickets: 0, overs: 0, balls: 0, maxOvers: 2,
      target: null, phase: "ready", runRate: 0,
      striker: { name: "Ruturaj Gaikwad", runs: 0, balls: 0 },
      nonStriker: { name: "Devon Conway", runs: 0, balls: 0 },
      bowler: { name: "Jasprit Bumrah" }, lastBall: null, result: null,
      pendingOutcome: null
    };
    this.paused = false;
    this.mode = "batting";
    this.onResetScene();
    this.onMessage("First innings: choose BOWLING to deliver the first ball.");
    this.update();
  }

  setMode(mode) {
    if (this.state.phase === "complete") return;
    this.mode = mode;
    this.onMessage(mode === "bowling"
      ? "Choose line, length and pace, then tap BOWL."
      : "Watch the delivery. Time your shot as the ball reaches the batter.");
  }

  togglePause() {
    this.paused = !this.paused;
    this.onMessage(this.paused ? "Match paused." : "Match resumed.");
    return this.paused;
  }

  bowl(choice) {
    const s = this.state;
    if (this.paused || s.phase !== "ready" || s.phase === "complete") return;
    s.phase = "delivery";
    const paceFactor = choice.pace === "fast" ? 1.0 : choice.pace === "slow" ? 1.35 : 1.15;
    const lengthFactor = ({ yorker: 0.92, full: 1.0, good: 1.08, short: 1.2 })[choice.length];
    const lineFactor = ({ off: 0.95, middle: 1.0, leg: 1.06 })[choice.line];
    const deliveryTime = Math.round(1150 * paceFactor * lengthFactor * lineFactor);
    s.pendingOutcome = { choice, deliveryTime, shot: null };
    this.deliveryStarted = performance.now();
    this.onBall({ ...s.pendingOutcome, batter: s.striker.name });
    this.onMessage("Ball delivered! Tap a batting shot now.");
    this.update();
    clearTimeout(this.deliveryTimer);
    this.deliveryTimer = setTimeout(() => {
      if (this.state.phase !== "delivery" || this.paused) return;
      this.resolveBall(null);
    }, Math.max(650, deliveryTime));
  }

  playShot(shot) {
    const s = this.state;
    if (this.paused || s.phase !== "delivery" || !s.pendingOutcome) return;
    const elapsed = performance.now() - (this.deliveryStarted || (this.deliveryStarted = performance.now()));
    const timing = Math.abs(elapsed - 620);
    this.deliveryStarted = 0;
    clearTimeout(this.deliveryTimer);
    this.resolveBall({ shot, timing });
  }

  resolveBall(input) {
    const s = this.state;
    if (s.phase !== "delivery" || !s.pendingOutcome) return;
    const choice = s.pendingOutcome.choice;
    const timing = input ? input.timing : 999;
    const shot = input?.shot || "miss";
    const goodTiming = timing < 230;
    const okayTiming = timing < 480;
    let runs = 0, wicket = false, extra = false, text = "";

    const difficulty = (choice.pace === "fast" ? 0.10 : choice.pace === "slow" ? -0.04 : 0)
      + (choice.length === "yorker" ? 0.12 : choice.length === "short" ? -0.02 : 0)
      + (choice.line === "middle" ? 0.03 : 0);
    const shotRisk = ({ defend: -0.18, ground: 0.02, loft: 0.20, sweep: 0.10, miss: 0.08 })[shot] ?? 0;
    const chance = Math.random() + difficulty + shotRisk;

    if (!input) {
      if (Math.random() < 0.07) { extra = true; text = "WIDE! One extra run."; }
      else if (Math.random() < 0.24) { wicket = true; text = "BOWLED! The batter is out."; }
      else { text = "DOT BALL! No shot connected."; }
    } else if (shot === "defend") {
      if (goodTiming || okayTiming) { runs = Math.random() < 0.24 ? 1 : 0; text = runs ? "Soft hands: quick single." : "Solid defensive block. No run."; }
      else if (chance > 1.18) { wicket = true; text = "Defensive shot missed. WICKET!"; }
      else { text = "Beaten by the delivery. Dot ball."; }
    } else if (goodTiming) {
      if (shot === "loft" && chance > 0.78) { runs = 6; text = "WHAT A HIT! SIX over the boundary!"; }
      else if (shot === "loft" || shot === "sweep") { runs = Math.random() < 0.56 ? 4 : 2; text = runs === 4 ? "FOUR! Beautiful placement." : "Two runs taken."; }
      else if (shot === "ground") { runs = chance > 0.75 ? 4 : 2; text = runs === 4 ? "FOUR! Crunched through the gap." : "Good running: two."; }
      else { runs = 1; text = "Worked into the field for one."; }
    } else if (okayTiming) {
      if (shot === "loft" && chance > 1.03) { wicket = true; text = "Mistimed in the air... CAUGHT!"; }
      else { runs = shot === "defend" ? 0 : (Math.random() < 0.55 ? 1 : 2); text = runs ? "Not perfectly timed, but they run." : "No run."; }
    } else {
      if (shot === "loft" || (shot === "sweep" && chance > 1.1)) { wicket = true; text = "Mistimed shot! The fielder takes it."; }
      else { text = "Too early or too late. Dot ball."; }
    }

    if (!extra) {
      s.striker.balls++;
      s.balls++;
    }
    if (runs) {
      s.score += runs;
      s.striker.runs += runs;
      if (runs % 2 === 1) [s.striker, s.nonStriker] = [s.nonStriker, s.striker];
    }
    if (wicket) {
      s.wickets++;
      s.striker = { name: `New Batter ${s.wickets + 2}`, runs: 0, balls: 0 };
      text += " New batter comes in.";
    }
    if (s.balls >= 6) {
      s.overs++;
      s.balls = 0;
      [s.striker, s.nonStriker] = [s.nonStriker, s.striker];
    }
    s.runRate = s.overs + s.balls / 6 > 0 ? s.score / (s.overs + s.balls / 6) : 0;
    s.lastBall = { runs, wicket, extra, text };
    s.pendingOutcome = null;
    s.phase = "ready";
    this.onMessage(text);
    this.onResetScene();

    if (s.wickets >= 10 || s.overs >= s.maxOvers || (s.innings === 2 && s.target && s.score >= s.target)) {
      this.endInnings();
    } else {
      this.update();
    }
  }

  endInnings() {
    const s = this.state;
    if (s.innings === 1) {
      s.target = s.score + 1;
      s.innings = 2;
      [s.battingTeam, s.bowlingTeam] = [s.bowlingTeam, s.battingTeam];
      s.score = 0; s.wickets = 0; s.overs = 0; s.balls = 0; s.runRate = 0;
      s.striker = { name: "Ishan Kishan", runs: 0, balls: 0 };
      s.nonStriker = { name: "Rohit Sharma", runs: 0, balls: 0 };
      s.bowler = { name: "Matheesha Pathirana" };
      s.phase = "ready";
      this.onMessage(`Innings break! ${s.battingTeam} need ${s.target} runs to win.`);
      this.update();
    } else {
      const won = s.score >= s.target;
      s.phase = "complete";
      s.result = {
        title: won ? `${s.battingTeam} WIN!` : `${s.bowlingTeam} WIN!`,
        text: won ? `${s.battingTeam} chased ${s.target} in ${s.overs}.${s.balls} overs.` : `${s.bowlingTeam} defended ${s.target - 1}. ${s.battingTeam} finished ${s.score}/${s.wickets}.`
      };
      this.onMessage("Match completed.");
      this.update();
    }
  }

  update() {
    this.onUpdate({ ...this.state, striker: { ...this.state.striker }, nonStriker: { ...this.state.nonStriker } });
  }
}
