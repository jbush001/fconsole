4 constant button_u
8 constant button_d

variable ball_x
variable ball_y
variable ball_dx
variable ball_dy
variable paddle_y

16 constant court_top
120 constant court_right
115 constant court_bottom
32 constant paddle_height
6 constant paddle_width

: init
    31 ball_x !
    17 ball_y !
    1 ball_dx !
    1 ball_dy !
    48 paddle_y !
;

init

: draw_frame
    0 cls

    \ Update ball position
    ball_x @ ball_dx @ + ball_x !
    ball_y @ ball_dy @ + ball_y !

    \ Right side
    ball_x @ court_right = if
        0 ball_dx @ - ball_dx !
        220 50 beep
    then

    \ Top or bottom
    ball_y @ court_top = ball_y @ court_bottom = or if
        0 ball_dy @ - ball_dy !
        220 50 beep
    then

    \ Left (open) side where paddle is.
    ball_x @ paddle_width = if
        \ Are we on the paddle?
        ball_y @ 8 + paddle_y @ >
        ball_y @ paddle_y @ paddle_height + < and if
            \ Yes, on the paddle, bounce
            0 ball_dx @ - ball_dx !
            220 50 beep
        then
    then

    ball_x @ -8 < if
        \ Out of bounds. We do this here instead of in the else above because
        \ we want to animate the ball going fully out of bounds
        init
    then

    \ Move paddle
    buttons button_u and if
        paddle_y @ court_top > if
            paddle_y @ 1 - paddle_y !
        then
    then

    buttons button_d and if
        paddle_y @ 128 paddle_height - < if
            paddle_y @ 1 + paddle_y !
        then
    then


    ball_x @ ball_y @ 1 1 0 draw_sprite

    2 set_color
    0 court_top 128 court_top draw_line
    0 paddle_y @ paddle_width paddle_height fill_rect
;

