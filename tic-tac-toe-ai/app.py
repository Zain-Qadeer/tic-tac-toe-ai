"""
Tic-Tac-Toe AI — Flask backend
================================
Week 1 project of a 52-week Classical AI challenge.

This file exposes a tiny JSON API that powers an unbeatable Tic-Tac-Toe
opponent using the Minimax algorithm (with alpha-beta pruning for speed).

Routes:
    GET  /            -> serves the single-page frontend (templates/index.html)
    POST /api/move     -> given a board state + which symbol the AI is playing,
                          returns the AI's chosen move plus some search stats
                          (nodes explored, max depth reached).

The board is represented as a flat list of 9 cells, indices 0-8:

     0 | 1 | 2
     ---------
     3 | 4 | 5
     ---------
     6 | 7 | 8

Each cell is either "" (empty), "X", or "O".
"""

from flask import Flask, request, jsonify, render_template
import math

# On Vercel, static files are served straight from the CDN via the
# public/ directory (Flask's own static_folder is NOT used in that
# path — see Vercel's Flask docs). We still point Flask's static
# handling at public/ with an empty url prefix so that running
# `python app.py` locally serves /style.css and /script.js from the
# same folder, at the same URLs, with zero extra code.
app = Flask(__name__, static_folder="public", static_url_path="")

# All possible winning index combinations (rows, columns, diagonals)
WIN_COMBOS = [
    (0, 1, 2), (3, 4, 5), (6, 7, 8),   # rows
    (0, 3, 6), (1, 4, 7), (2, 5, 8),   # columns
    (0, 4, 8), (2, 4, 6),              # diagonals
]


def check_winner(board):
    """
    Check the board for a winner or a draw.

    Returns:
        "X" or "O"  -> that player has won
        "draw"      -> board is full, nobody won
        None        -> game is still in progress
    """
    for a, b, c in WIN_COMBOS:
        if board[a] and board[a] == board[b] == board[c]:
            return board[a]

    if all(cell != "" for cell in board):
        return "draw"

    return None


class MinimaxStats:
    """Small helper to track search statistics for the demo UI."""

    def __init__(self):
        self.nodes_explored = 0
        self.max_depth = 0


def minimax(board, depth, is_maximizing, ai_symbol, human_symbol, stats, alpha=-math.inf, beta=math.inf):
    """
    Classic Minimax with alpha-beta pruning.

    The AI is the "maximizing" player (it wants the highest score),
    the human is the "minimizing" player (AI assumes they play optimally
    against it, which is what makes the AI unbeatable).

    Score convention:
        +10 - depth  -> AI wins (winning sooner is scored higher)
        -10 + depth  -> Human wins (losing later is scored less bad)
          0          -> Draw

    Subtracting/adding `depth` makes the AI prefer faster wins and
    slower losses, which produces more natural-looking play instead
    of just "any winning move eventually".
    """
    stats.nodes_explored += 1
    stats.max_depth = max(stats.max_depth, depth)

    result = check_winner(board)
    if result == ai_symbol:
        return 10 - depth
    if result == human_symbol:
        return depth - 10
    if result == "draw":
        return 0

    empty_cells = [i for i, cell in enumerate(board) if cell == ""]

    if is_maximizing:
        best_score = -math.inf
        for i in empty_cells:
            board[i] = ai_symbol
            score = minimax(board, depth + 1, False, ai_symbol, human_symbol, stats, alpha, beta)
            board[i] = ""
            best_score = max(best_score, score)
            alpha = max(alpha, best_score)
            if beta <= alpha:
                break  # prune: minimizer already has a better option elsewhere
        return best_score
    else:
        best_score = math.inf
        for i in empty_cells:
            board[i] = human_symbol
            score = minimax(board, depth + 1, True, ai_symbol, human_symbol, stats, alpha, beta)
            board[i] = ""
            best_score = min(best_score, score)
            beta = min(beta, best_score)
            if beta <= alpha:
                break  # prune: maximizer already has a better option elsewhere
        return best_score


def get_best_move(board, ai_symbol, human_symbol):
    """
    Find the AI's optimal move for the given board.

    Returns a dict with the chosen move index and search stats.
    """
    stats = MinimaxStats()
    best_score = -math.inf
    best_move = None

    empty_cells = [i for i, cell in enumerate(board) if cell == ""]

    # Small opening-move optimization: if the board is completely empty,
    # take the center. Mathematically any first move is fine with perfect
    # play, but the center keeps the demo fast and matches known optimal
    # Tic-Tac-Toe theory instead of running the full ~550k-node search
    # for a move that a human wouldn't perceive as different anyway.
    if len(empty_cells) == 9:
        return {"move": 4, "nodes_explored": 1, "max_depth": 0}

    for i in empty_cells:
        board[i] = ai_symbol
        score = minimax(board, 1, False, ai_symbol, human_symbol, stats)
        board[i] = ""

        if score > best_score:
            best_score = score
            best_move = i

    return {
        "move": best_move,
        "nodes_explored": stats.nodes_explored,
        "max_depth": stats.max_depth,
    }


@app.route("/")
def index():
    """Serve the single-page frontend."""
    return render_template("index.html")


@app.route("/api/move", methods=["POST"])
def api_move():
    """
    Compute the AI's next move.

    Expected JSON body:
        {
            "board": ["", "X", "", "", "O", "", "", "", ""],
            "ai_symbol": "X",
            "human_symbol": "O"
        }

    Response JSON:
        {
            "move": 4,
            "nodes_explored": 123,
            "max_depth": 5,
            "winner": null   // "X" | "O" | "draw" | null, evaluated AFTER the AI move
        }
    """
    data = request.get_json(force=True)

    board = data.get("board")
    ai_symbol = data.get("ai_symbol")
    human_symbol = data.get("human_symbol")

    # --- Basic validation, since this API is public-facing on the demo ---
    if not isinstance(board, list) or len(board) != 9:
        return jsonify({"error": "board must be a list of 9 cells"}), 400
    if ai_symbol not in ("X", "O") or human_symbol not in ("X", "O") or ai_symbol == human_symbol:
        return jsonify({"error": "ai_symbol and human_symbol must be 'X'/'O' and differ"}), 400
    if any(cell not in ("", "X", "O") for cell in board):
        return jsonify({"error": "board cells must be '', 'X', or 'O'"}), 400

    # If the game is already decided, don't bother searching.
    existing_result = check_winner(board)
    if existing_result is not None:
        return jsonify({"move": None, "nodes_explored": 0, "max_depth": 0, "winner": existing_result})

    result = get_best_move(board[:], ai_symbol, human_symbol)

    # Apply the move to report the resulting game state back to the client
    board[result["move"]] = ai_symbol
    winner = check_winner(board)

    return jsonify({
        "move": result["move"],
        "nodes_explored": result["nodes_explored"],
        "max_depth": result["max_depth"],
        "winner": winner,
    })


if __name__ == "__main__":
    # Debug=True is fine for local development; Render will run this via
    # gunicorn in production (see Procfile), so this block only matters
    # when running `python app.py` directly on your own machine.
    app.run(debug=True, host="0.0.0.0", port=5000)
