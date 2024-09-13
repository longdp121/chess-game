const boardElement = document.getElementById('chessboard');
let selectedSquare = null;
let turn = 'white';
let gameOver = false;

const initialBoard = [
    ['♜','♞','♝','♛','♚','♝','♞','♜'],
    ['♟','♟','♟','♟','♟','♟','♟','♟'],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['♙','♙','♙','♙','♙','♙','♙','♙'],
    ['♖','♘','♗','♕','♔','♗','♘','♖'],
];

const board = [];
let kingMoved = {'white': false, 'black': false};
let rookMoved = {
    'white': {'0': false, '7': false},
    'black': {'0': false, '7': false}
};
let enPassant = null;

function createBoard() {
    for (let row = 0; row < 8; row++) {
        board[row] = [];
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.classList.add('square');
            square.classList.add((row + col) % 2 == 0 ? 'white' : 'black');
            square.dataset.row = row;
            square.dataset.col = col;
            square.textContent = initialBoard[row][col];
            square.addEventListener('click', onSquareClick);
            boardElement.appendChild(square);
            board[row][col] = square;
        }
    }
}

function onSquareClick(e) {
    if (gameOver) return;
    const square = e.target;
    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);
    const piece = square.textContent;

    if (selectedSquare) {
        const fromRow = parseInt(selectedSquare.dataset.row);
        const fromCol = parseInt(selectedSquare.dataset.col);
        const fromPiece = selectedSquare.textContent;

        if (isValidMove(fromRow, fromCol, row, col, fromPiece)) {
            movePiece(fromRow, fromCol, row, col, fromPiece);
            if (isCheckmate(turn === 'white' ? 'black' : 'white')) {
                alert(`${turn.charAt(0).toUpperCase() + turn.slice(1)} wins by checkmate!`);
                gameOver = true;
            } else if (isStalemate(turn === 'white' ? 'black' : 'white')) {
                alert('Game is a stalemate!');
                gameOver = true;
            } else {
                turn = turn === 'white' ? 'black' : 'white';
            }
        }
        selectedSquare.classList.remove('selected');
        selectedSquare = null;
    } else {
        if (piece && isPieceColor(piece, turn)) {
            selectedSquare = square;
            square.classList.add('selected');
        }
    }
}

function isPieceColor(piece, color) {
    const whitePieces = ['♙','♖','♘','♗','♕','♔'];
    const blackPieces = ['♟','♜','♞','♝','♛','♚'];
    return color === 'white' ? whitePieces.includes(piece) : blackPieces.includes(piece);
}

function movePiece(fromRow, fromCol, toRow, toCol, piece) {
    const fromSquare = board[fromRow][fromCol];
    const toSquare = board[toRow][toCol];

    // Update moved status
    if (piece === '♔') kingMoved['white'] = true;
    if (piece === '♚') kingMoved['black'] = true;
    if (piece === '♖' && fromRow === 7 && fromCol === 0) rookMoved['white']['0'] = true;
    if (piece === '♖' && fromRow === 7 && fromCol === 7) rookMoved['white']['7'] = true;
    if (piece === '♜' && fromRow === 0 && fromCol === 0) rookMoved['black']['0'] = true;
    if (piece === '♜' && fromRow === 0 && fromCol === 7) rookMoved['black']['7'] = true;

    // En Passant capture
    if ((piece === '♙' || piece === '♟') && enPassant && toRow === enPassant.row && toCol === enPassant.col) {
        board[enPassant.captureRow][toCol].textContent = '';
    }

    // Castling move
    if ((piece === '♔' || piece === '♚') && Math.abs(toCol - fromCol) === 2) {
        // King-side castling
        if (toCol === 6) {
            movePiece(fromRow, 7, fromRow, 5, board[fromRow][7].textContent);
        }
        // Queen-side castling
        if (toCol === 2) {
            movePiece(fromRow, 0, fromRow, 3, board[fromRow][0].textContent);
        }
    }

    // Move the piece
    toSquare.textContent = fromSquare.textContent;
    fromSquare.textContent = '';

    // Pawn promotion
    if ((piece === '♙' && toRow === 0) || (piece === '♟' && toRow === 7)) {
        promotePawn(toRow, toCol);
    }

    // Set en passant target
    if ((piece === '♙' || piece === '♟') && Math.abs(toRow - fromRow) === 2) {
        enPassant = {
            row: fromRow + (toRow - fromRow) / 2,
            col: fromCol,
            captureRow: toRow,
            color: turn
        };
    } else {
        enPassant = null;
    }
}

function isValidMove(fromRow, fromCol, toRow, toCol, piece) {
    const dx = toCol - fromCol;
    const dy = toRow - fromRow;
    const targetPiece = board[toRow][toCol].textContent;

    // Cannot capture own piece
    if (targetPiece && isPieceColor(targetPiece, turn)) {
        return false;
    }

    const direction = turn === 'white' ? -1 : 1;

    let valid = false;
    switch (piece) {
        case '♙': // White pawn
        case '♟': // Black pawn
            valid = validatePawnMove(fromRow, fromCol, toRow, toCol, piece, direction);
            break;
        case '♖': case '♜': // Rook
            valid = validateRookMove(fromRow, fromCol, toRow, toCol);
            break;
        case '♘': case '♞': // Knight
            valid = validateKnightMove(fromRow, fromCol, toRow, toCol);
            break;
        case '♗': case '♝': // Bishop
            valid = validateBishopMove(fromRow, fromCol, toRow, toCol);
            break;
        case '♕': case '♛': // Queen
            valid = validateQueenMove(fromRow, fromCol, toRow, toCol);
            break;
        case '♔': case '♚': // King
            valid = validateKingMove(fromRow, fromCol, toRow, toCol);
            break;
        default:
            valid = false;
    }

    if (!valid) return false;

    // Check if move leaves own king in check
    const originalPiece = board[toRow][toCol].textContent;
    const movingPiece = board[fromRow][fromCol].textContent;
    board[toRow][toCol].textContent = movingPiece;
    board[fromRow][fromCol].textContent = '';
    const kingPosition = findKing(turn);
    if (isSquareAttacked(kingPosition.row, kingPosition.col, turn === 'white' ? 'black' : 'white')) {
        // Revert the move
        board[fromRow][fromCol].textContent = movingPiece;
        board[toRow][toCol].textContent = originalPiece;
        return false;
    }
    // Revert the move
    board[fromRow][fromCol].textContent = movingPiece;
    board[toRow][toCol].textContent = originalPiece;
    return true;
}

function validatePawnMove(fromRow, fromCol, toRow, toCol, piece, direction) {
    const dx = toCol - fromCol;
    const dy = toRow - fromRow;
    const startRow = (turn === 'white') ? 6 : 1;
    const opponentColor = (turn === 'white') ? 'black' : 'white';
    const targetPiece = board[toRow][toCol].textContent;

    // Standard move
    if (dx === 0 && dy === direction && !targetPiece) {
        return true;
    }

    // Double move from starting position
    if (dx === 0 && dy === 2 * direction && fromRow === startRow && !targetPiece && !board[fromRow + direction][fromCol].textContent) {
        return true;
    }

    // Capturing move
    if (Math.abs(dx) === 1 && dy === direction) {
        if (targetPiece && isPieceColor(targetPiece, opponentColor)) {
            return true;
        }
        // En Passant
        if (enPassant && enPassant.row === toRow && enPassant.col === toCol && enPassant.color !== turn) {
            return true;
        }
    }

    return false;
}

function validateRookMove(fromRow, fromCol, toRow, toCol) {
    if (fromRow !== toRow && fromCol !== toCol) return false;
    if (!isPathClear(fromRow, fromCol, toRow, toCol)) return false;
    return true;
}

function validateKnightMove(fromRow, fromCol, toRow, toCol) {
    const dx = Math.abs(toCol - fromCol);
    const dy = Math.abs(toRow - fromRow);
    return (dx === 2 && dy === 1) || (dx === 1 && dy === 2);
}

function validateBishopMove(fromRow, fromCol, toRow, toCol) {
    if (Math.abs(toRow - fromRow) !== Math.abs(toCol - fromCol)) return false;
    if (!isPathClear(fromRow, fromCol, toRow, toCol)) return false;
    return true;
}

function validateQueenMove(fromRow, fromCol, toRow, toCol) {
    return validateRookMove(fromRow, fromCol, toRow, toCol) || validateBishopMove(fromRow, fromCol, toRow, toCol);
}

function validateKingMove(fromRow, fromCol, toRow, toCol) {
    const dx = toCol - fromCol;
    const dy = toRow - fromRow;
    const opponentColor = turn === 'white' ? 'black' : 'white';

    // Standard move
    if (Math.abs(dx) <=1 && Math.abs(dy) <=1) {
        // Check if target square is attacked
        if (isSquareAttacked(toRow, toCol, opponentColor)) {
            return false;
        }
        return true;
    }

    // Castling
    if (!kingMoved[turn] && dy === 0 && Math.abs(dx) === 2) {
        // King-side castling
        if (dx === 2 && !rookMoved[turn]['7']) {
            if (board[fromRow][fromCol+1].textContent === '' && board[fromRow][fromCol+2].textContent === '') {
                if (!isSquareAttacked(fromRow, fromCol, opponentColor) && !isSquareAttacked(fromRow, fromCol+1, opponentColor) && !isSquareAttacked(fromRow, fromCol+2, opponentColor)) {
                    return true;
                }
            }
        }
        // Queen-side castling
        if (dx === -2 && !rookMoved[turn]['0']) {
            if (board[fromRow][fromCol-1].textContent === '' && board[fromRow][fromCol-2].textContent === '' && board[fromRow][fromCol-3].textContent === '') {
                if (!isSquareAttacked(fromRow, fromCol, opponentColor) && !isSquareAttacked(fromRow, fromCol-1, opponentColor) && !isSquareAttacked(fromRow, fromCol-2, opponentColor)) {
                    return true;
                }
            }
        }
    }

    return false;
}

function isPathClear(fromRow, fromCol, toRow, toCol) {
    const dx = Math.sign(toCol - fromCol);
    const dy = Math.sign(toRow - fromRow);
    let currentRow = fromRow + dy;
    let currentCol = fromCol + dx;

    while (currentRow !== toRow || currentCol !== toCol) {
        if (board[currentRow][currentCol].textContent) {
            return false;
        }
        currentRow += dy;
        currentCol += dx;
    }
    return true;
}

function promotePawn(toRow, toCol) {
    const promoteTo = turn === 'white' ? '♕' : '♛';
    board[toRow][toCol].textContent = promoteTo;
}

function findKing(color) {
    const kingSymbol = color === 'white' ? '♔' : '♚';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (board[row][col].textContent === kingSymbol) {
                return {row, col};
            }
        }
    }
    return null;
}

function isSquareAttacked(row, col, attackerColor) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c].textContent;
            if (piece && isPieceColor(piece, attackerColor)) {
                if (attackerCanMoveTo(r, c, row, col, piece, attackerColor)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function attackerCanMoveTo(fromRow, fromCol, toRow, toCol, piece, attackerColor) {
    const dx = toCol - fromCol;
    const dy = toRow - fromRow;
    const targetPiece = board[toRow][toCol].textContent;

    const direction = attackerColor === 'white' ? -1 : 1;

    switch (piece) {
        case '♙': case '♟':
            if (Math.abs(dx) === 1 && dy === direction) {
                return true;
            }
            break;
        case '♖': case '♜':
            if ((fromRow === toRow || fromCol === toCol) && isPathClear(fromRow, fromCol, toRow, toCol)) {
                return true;
            }
            break;
        case '♘': case '♞':
            if ((Math.abs(dx) === 2 && Math.abs(dy) === 1) || (Math.abs(dx) === 1 && Math.abs(dy) === 2)) {
                return true;
            }
            break;
        case '♗': case '♝':
            if (Math.abs(dx) === Math.abs(dy) && isPathClear(fromRow, fromCol, toRow, toCol)) {
                return true;
            }
            break;
        case '♕': case '♛':
            if ((fromRow === toRow || fromCol === toCol || Math.abs(dx) === Math.abs(dy)) && isPathClear(fromRow, fromCol, toRow, toCol)) {
                return true;
            }
            break;
        case '♔': case '♚':
            if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
                return true;
            }
            break;
    }
    return false;
}

function isCheckmate(color) {
    if (!isInCheck(color)) return false;
    return !hasLegalMoves(color);
}

function isStalemate(color) {
    if (isInCheck(color)) return false;
    return !hasLegalMoves(color);
}

function isInCheck(color) {
    const kingPosition = findKing(color);
    if (!kingPosition) return true;
    const opponentColor = color === 'white' ? 'black' : 'white';
    return isSquareAttacked(kingPosition.row, kingPosition.col, opponentColor);
}

function hasLegalMoves(color) {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col].textContent;
            if (piece && isPieceColor(piece, color)) {
                for (let r = 0; r < 8; r++) {
                    for (let c = 0; c < 8; c++) {
                        if (isValidMove(row, col, r, c, piece)) {
                            return true;
                        }
                    }
                }
            }
        }
    }
    return false;
}

createBoard();