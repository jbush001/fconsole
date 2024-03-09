variable ballX
variable ballY
variable ballDx
variable ballDy
variable paddleX

: init
    31 ballX !
    17 ballY !
    1 ballDx !
    1 ballDy !
    48 paddleX !
;

init

: draw_frame
    0 cls

    \ Update ball position
    ballX @ ballDx @ + ballX !
    ballY @ ballDy @ + ballY !
    ballX @ 0 = ballX @ 120 = or if
        0 ballDx @ - ballDx !
    then

    ballY @ 0 = if
        0 ballDy @ - ballDy !
    then

    \ Hit the bottom
    ballY @ 116 = if
        \ Are we on the paddle?
        ballX @ 8 + paddleX @ >
        ballX @ paddleX @ 32 + < and if
            \ Yes, on the paddle, bounce
            0 ballDy @ - ballDy !
        then
    then

    ballY @ 128 = if
        \ Out of bounds. We do this here instead of in the else above because
        \ we want to animate the ball going fully out of bounds
        init
    then

    ballX @ ballY @ 1 1 0 draw_sprite
    \ Move paddle
    buttons 1 and paddleX @ 0 > and if
        paddleX @ 1 - paddleX !
    then

    buttons 2 and if
        paddleX @ 96 < if
            paddleX @ 1 + paddleX !
        then
    then

    2 set_color
    paddleX @ 124 32 4 fill_rect
;

