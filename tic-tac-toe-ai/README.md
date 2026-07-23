# Tic-Tac-Toe AI : Unbeatable Minimax Opponent

> **Week 1 / 52** of my *Classical AI* build-in-public challenge.
> One classical AI technique, implemented from scratch, every week.

A Tic-Tac-Toe game with a Python + Flask backend and a clean, mobile-friendly
frontend, where the AI opponent plays **perfect** Tic-Tac-Toe using the
**Minimax algorithm** (with alpha-beta pruning). It is mathematically
impossible to beat — the best a human can do is force a draw.

---

## ✨ Features

- **Unbeatable AI** — powered by Minimax + alpha-beta pruning, always plays optimally
- **Player vs AI** — choose to play as `X` or `O`, and choose who moves first
- **Proper draw detection** — correctly detects a full board with no winner
- **Live search stats** — see how many nodes the AI explored and the search
  depth reached for each move (nice little "look under the hood" touch for
  a portfolio demo)
- **Notebook-style board** — hand-drawn grid, pen-stroke X/O marks, and a
  hand-struck win line, drawn as animated SVG instead of a plain HTML grid
- **Clean, responsive UI** — works just as well on a phone as on desktop
- **Deploy-ready** — structured to deploy on [Vercel](https://vercel.com) with zero config

---

## 🧠 How Minimax Works (short version)

Minimax is a decision-making algorithm for two-player, turn-based games
where one player's gain is the other's loss (a "zero-sum" game). Tic-Tac-Toe
is a perfect fit because the game is small enough to fully "see" every
possible way it could end.

The core idea:

1. **Build a game tree.** From the current board, imagine every legal move,
   then every possible reply to that move, and so on until each branch ends
   in a win, loss, or draw.
2. **Score the endings.** Every finished game gets a number: a win for the
   AI is scored positively (`+10`, adjusted slightly by how many moves it
   took to get there), a loss is scored negatively (`-10`), and a draw is `0`.
3. **Propagate the scores back up.** Working backwards from the leaves:
   - On the AI's turn, it assumes it will pick the move with the
     **highest** score available (it's *maximizing*).
   - On the opponent's turn, the AI assumes they'll play their **best**
     possible move against it too — the move that gives the **lowest**
     score (it's *minimizing*).
4. **Pick the best root move.** Whichever first move leads to the branch
   with the best guaranteed outcome — assuming the opponent also plays
   perfectly — is the move the AI makes.

Because the algorithm assumes the opponent always plays optimally against
it and evaluates literally every possible continuation, it never makes a
mistake. The worst outcome a perfect opponent can force is a draw.

**Alpha-beta pruning** is a small but powerful optimization layered on top:
while exploring the tree, the AI keeps track of the best score it's
already guaranteed (`alpha`) and the best score its opponent is already
guaranteed (`beta`). If it ever finds a branch that can't possibly beat
what's already available elsewhere in the tree, it stops exploring that
branch early — same final decision, far fewer nodes visited. That's what
the "nodes explored" stat on screen is showing you in action.

---

## 🗂️ Project Structure

```
tic-tac-toe-ai/
├── app.py                 # Flask app + Minimax AI logic (entry point Vercel auto-detects)
├── vercel.json              # Vercel function config (maxDuration)
├── requirements.txt        # Python dependencies
├── .gitignore
├── README.md
├── templates/
│   └── index.html          # Single-page frontend
└── public/
    ├── style.css            # Notebook/paper themed responsive styling
    └── script.js            # Client-side game state + API calls
```

> **Why `public/` instead of `static/`?** Vercel serves everything in
> `public/**` directly from its CDN, bypassing the Python function
> entirely for those requests — faster, and it's the folder Vercel's
> own Flask docs recommend instead of Flask's built-in `static_folder`.
> `app.py` still points Flask's static handling at `public/` too, so
> `python app.py` locally serves the exact same files at the exact
> same URLs (`/style.css`, `/script.js`) with no extra setup.

---

## 🚀 Setup & Local Development

**Requirements:** Python 3.9+

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/tic-tac-toe-ai.git
cd tic-tac-toe-ai

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate      # on Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the app
python app.py
```

Then open **http://127.0.0.1:5000** in your browser.

---

## ☁️ Deploying to Vercel

This project needs **zero configuration** to deploy — Vercel automatically
detects the Flask `app` instance in `app.py` and treats it as a Vercel
Function. The included `vercel.json` just sets a safe execution time limit.

### Option A — Git import (recommended)

1. Push this project to a GitHub (or GitLab/Bitbucket) repository.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Leave the framework preset as-is (Vercel will detect it's a Python/Flask
   project from `app.py` + `requirements.txt`) and click **Deploy**.
4. Every future push to your main branch redeploys it automatically.

### Option B — Vercel CLI

```bash
npm i -g vercel      # one-time install
cd tic-tac-toe-ai
vercel               # first deploy, follow the prompts
vercel --prod        # promote to your production URL
```

### Testing the Vercel build locally

```bash
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
vercel dev
```

`vercel dev` runs the exact same routing Vercel uses in production
(`public/**` served from static hosting, everything else through `app.py`),
so it's the most accurate way to catch deploy issues before pushing.

---

## 🔌 API Reference

### `POST /api/move`

Given the current board and which symbol the AI is playing, returns the
AI's chosen move.

**Request body:**
```json
{
  "board": ["", "X", "", "", "O", "", "", "", ""],
  "ai_symbol": "X",
  "human_symbol": "O"
}
```

**Response:**
```json
{
  "move": 4,
  "nodes_explored": 206,
  "max_depth": 6,
  "winner": null
}
```

`winner` is evaluated *after* the AI's move and will be `"X"`, `"O"`,
`"draw"`, or `null` if the game is still in progress.

---

## 🛣️ What's Next (52-Week Challenge)

This is **Week 1 — Classical AI**. Future weeks will cover other classical
and modern AI techniques (search algorithms, constraint satisfaction,
classic ML, neural nets, and beyond) as standalone, portfolio-ready
mini-projects. Follow along on [LinkedIn](#) / [GitHub](#).

---

## 📄 License

This project is open source and available for learning purposes. Feel free
to fork it, extend it (Connect Four? N x N boards? a "beatable" difficulty
mode?), and use it in your own portfolio.
