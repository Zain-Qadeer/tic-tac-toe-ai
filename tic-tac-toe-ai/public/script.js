/*
 * Tic-Tac-Toe AI — Frontend logic
 * ================================
 * The board is drawn as a single SVG (a hand-drawn grid + pen-stroke
 * marks) with a transparent 3x3 click layer sitting on top of it, so
 * it reads like an actual notebook page rather than a plain HTML grid.
 * Game state lives here; the backend (`/api/move`) only runs Minimax
 * and hands back the AI's chosen cell plus search stats.
 */

const WIN_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6],           // diagonals
];

// SVG board is drawn on a fixed 300x300 coordinate grid regardless of
// the element's actual on-screen size (the viewBox scales it).
const BOARD_SIZE = 300;
const CELL_SIZE = BOARD_SIZE / 3;

// ---- Game state ----
let board = Array(9).fill("");
let humanSymbol = "X";
let aiSymbol = "O";
let firstPlayer = "human";
let currentTurn = "human";
let gameOver = false;

// ---- DOM references ----
const setupScreen = document.getElementById("setup-screen");
const gameScreen = document.getElementById("game-screen");
const boardEl = document.getElementById("board");
const statusText = document.getElementById("status-text");
const nodesStat = document.getElementById("nodes-stat");
const depthStat = document.getElementById("depth-stat");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");

let boardSvg = null;
let cellLayer = null;

// ---- Setup screen selections ----
document.querySelectorAll(".option-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const group = btn.dataset.choice;
    document
      .querySelectorAll(`.option-btn[data-choice="${group}"]`)
      .forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");

    if (group === "symbol") {
      humanSymbol = btn.dataset.value;
      aiSymbol = humanSymbol === "X" ? "O" : "X";
    } else if (group === "first") {
      firstPlayer = btn.dataset.value;
    }
  });
});

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", () => {
  setupScreen.classList.remove("hidden");
  gameScreen.classList.add("hidden");
});

function startGame() {
  board = Array(9).fill("");
  gameOver = false;
  currentTurn = firstPlayer;

  setupScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  buildBoardVisual();
  updateStatus();
  nodesStat.textContent = "–";
  depthStat.textContent = "–";

  if (currentTurn === "ai") {
    requestAiMove();
  }
}

/**
 * Build the SVG board fresh (grid lines + empty cell overlay).
 * Called once per game, not on every move, so the hand-drawn grid
 * doesn't "redraw" itself mid-game.
 */
function buildBoardVisual() {
  boardEl.innerHTML = "";

  boardSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  boardSvg.setAttribute("class", "board-svg");
  boardSvg.setAttribute("viewBox", `0 0 ${BOARD_SIZE} ${BOARD_SIZE}`);
  boardEl.appendChild(boardSvg);

  drawGrid();

  cellLayer = document.createElement("div");
  cellLayer.className = "cell-grid";
  boardEl.appendChild(cellLayer);

  for (let i = 0; i < 9; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.index = i;
    cell.addEventListener("click", () => handleCellClick(i));
    cellLayer.appendChild(cell);
  }

  updateCellInteractivity();
}

/**
 * Draw the 4 internal grid lines with a slight hand-drawn "bow" instead
 * of perfectly straight lines, using a single quadratic curve per line.
 * Offsets are fixed (not random) so the board looks consistent, just
 * imperfect — like someone actually ruled it by hand.
 */
function drawGrid() {
  const lines = [
    // [x1, y1, x2, y2, bow]
    [CELL_SIZE, 10, CELL_SIZE, BOARD_SIZE - 10, -5],       // vertical line 1
    [CELL_SIZE * 2, 10, CELL_SIZE * 2, BOARD_SIZE - 10, 5], // vertical line 2
    [10, CELL_SIZE, BOARD_SIZE - 10, CELL_SIZE, 5],         // horizontal line 1
    [10, CELL_SIZE * 2, BOARD_SIZE - 10, CELL_SIZE * 2, -5],// horizontal line 2
  ];

  lines.forEach(([x1, y1, x2, y2, bow], i) => {
    const midX = (x1 + x2) / 2 + (y1 === y2 ? 0 : bow);
    const midY = (y1 + y2) / 2 + (x1 === x2 ? 0 : bow);
    const path = createDrawnPath(`M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`, "grid-line", 340);
    path.style.animationDelay = `${i * 60}ms`;
    boardSvg.appendChild(path);
  });
}

/**
 * Helper: build an SVG <path> pre-configured for the "draw itself in"
 * animation (dash the full length, then animate the offset to 0).
 */
function createDrawnPath(d, className, dashLength = 200) {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  path.setAttribute("class", `${className} draw-in`);
  path.style.strokeDasharray = dashLength;
  path.style.strokeDashoffset = dashLength;
  return path;
}

/**
 * Draw a mark (X or O) inside the given cell index with a slight
 * hand-drawn wobble, then animate it on with a pen-stroke reveal.
 */
function placeMark(index, symbol) {
  const col = index % 3;
  const row = Math.floor(index / 3);
  const cx = col * CELL_SIZE + CELL_SIZE / 2;
  const cy = row * CELL_SIZE + CELL_SIZE / 2;
  const r = CELL_SIZE * 0.28;

  if (symbol === "X") {
    // Two crossing strokes, each nudged slightly off-true for realism.
    const p1 = createDrawnPath(
      `M ${cx - r - 2} ${cy - r + 3} Q ${cx - 3} ${cy + 2} ${cx + r + 1} ${cy + r - 2}`,
      "mark-x", 160
    );
    const p2 = createDrawnPath(
      `M ${cx + r + 2} ${cy - r - 2} Q ${cx + 4} ${cy - 1} ${cx - r - 1} ${cy + r + 2}`,
      "mark-x", 160
    );
    p2.style.animationDelay = "160ms";
    boardSvg.appendChild(p1);
    boardSvg.appendChild(p2);
  } else {
    // A single near-circle drawn as two arcs so it isn't a perfect
    // geometric circle — closer to how a hand actually draws an "O".
    const path = createDrawnPath(
      `M ${cx} ${cy - r} ` +
      `A ${r} ${r * 1.05} 0 1 1 ${cx - 0.5} ${cy - r}`,
      "mark-o", 260
    );
    boardSvg.appendChild(path);
  }
}

/**
 * Draw a hand-struck line across the three winning cells, like circling
 * or crossing out a completed row on paper.
 */
function drawWinLine(combo) {
  const [a, , c] = combo;
  const start = cellCenter(a);
  const end = cellCenter(c);

  const midX = (start.x + end.x) / 2 + 6;
  const midY = (start.y + end.y) / 2 - 6;

  const path = createDrawnPath(
    `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`,
    "win-line", 320
  );
  boardSvg.appendChild(path);
}

function cellCenter(index) {
  const col = index % 3;
  const row = Math.floor(index / 3);
  return {
    x: col * CELL_SIZE + CELL_SIZE / 2,
    y: row * CELL_SIZE + CELL_SIZE / 2,
  };
}

/**
 * Toggle which cells can still be clicked, without touching the SVG marks.
 */
function updateCellInteractivity() {
  Array.from(cellLayer.children).forEach((cell, i) => {
    const filled = board[i] !== "";
    const blocked = filled || gameOver || currentTurn !== "human";
    cell.classList.toggle("disabled", blocked);
  });
}

function handleCellClick(index) {
  if (gameOver || currentTurn !== "human" || board[index] !== "") {
    return;
  }

  board[index] = humanSymbol;
  placeMark(index, humanSymbol);
  updateCellInteractivity();

  const result = checkWinnerLocally(board);
  if (result) {
    finishGame(result);
    return;
  }

  currentTurn = "ai";
  updateStatus();
  requestAiMove();
}

async function requestAiMove() {
  updateStatus();

  try {
    const response = await fetch("/api/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        board: board,
        ai_symbol: aiSymbol,
        human_symbol: humanSymbol,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const data = await response.json();

    if (data.move !== null && data.move !== undefined) {
      board[data.move] = aiSymbol;
      placeMark(data.move, aiSymbol);
    }

    nodesStat.textContent = data.nodes_explored ?? "–";
    depthStat.textContent = data.max_depth ?? "–";

    updateCellInteractivity();

    if (data.winner) {
      finishGame(data.winner);
      return;
    }

    currentTurn = "human";
    updateStatus();
  } catch (err) {
    statusText.textContent = "Connection error — is the Flask server running?";
    console.error("AI move request failed:", err);
  }
}

function checkWinnerLocally(b) {
  for (const [a, c, d] of WIN_COMBOS) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) {
      return b[a];
    }
  }
  if (b.every((cell) => cell !== "")) {
    return "draw";
  }
  return null;
}

function finishGame(result) {
  gameOver = true;
  updateCellInteractivity();

  if (result === "draw") {
    statusText.textContent = "It's a draw — perfectly played by both sides!";
    statusText.className = "";
    return;
  }

  highlightWinningCombo();

  if (result === humanSymbol) {
    // Shouldn't happen against optimal play, but handled just in case.
    statusText.textContent = "You won! 🎉";
    statusText.className = "win";
  } else {
    statusText.textContent = "AI wins — Minimax never loses.";
    statusText.className = "lose";
  }
}

function highlightWinningCombo() {
  for (const combo of WIN_COMBOS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      drawWinLine(combo);
      return;
    }
  }
}

function updateStatus() {
  if (gameOver) return;

  if (currentTurn === "human") {
    statusText.textContent = "Your move";
    statusText.className = "";
  } else {
    statusText.textContent = "AI is thinking…";
    statusText.className = "thinking";
  }
}
