0 constant court_top
screen_width 8 - constant court_right
screen_height 8 - constant court_bottom
20 constant paddle_height
6 constant paddle_width

variable ball_x
variable ball_y
variable ball_dx
variable ball_dy
variable paddle_y
variable score

: init
    screen_width 2 / 4 - ball_x !
    screen_height 2 / 4 - ball_y !
    1 ball_dx !
    1 ball_dy !
    screen_height paddle_height - 2 / paddle_y !
    0 score !

;

\   0000000
\   1     2
\   1     2
\   3333333
\   4     5
\   4     5
\   6666666
\
\ Bitmap represents which segments are on for each digit, 0-9
create segmap
2 base !
    1110111 ,  \ 0
    0100100 ,  \ 1
    1011101 ,  \ 2
    1101101 ,  \ 3
    0101110 ,  \ 4
    1101011 ,  \ 5
    1111011 ,  \ 6
    0100101 ,  \ 7
    1111111 ,  \ 8
    1101111 ,  \ 9
1010 base !

10 constant seg_length
4 constant seg_thickness

\ Rectangles for each segment, x, y, width, height
create seg0 0 , 0 , seg_length , seg_thickness ,
create seg1 0 , 0 , seg_thickness , seg_length ,
create seg2 seg_length seg_thickness - , 0 , seg_thickness , seg_length ,
create seg3 0 , seg_length seg_thickness 2 / - , seg_length , seg_thickness ,
create seg4 0 , seg_length , seg_thickness , seg_length ,
create seg5 seg_length seg_thickness - , seg_length , seg_thickness , seg_length ,
create seg6 0 , seg_length 2 * seg_thickness - , seg_length , seg_thickness ,

( seg_ptr x y -- )
: draw_segment
    \ Read the 4 values onto the stack
    3 pick @ 3 pick +
    4 pick 4 + @ 3 pick +
    5 pick 8 + @
    6 pick 12 + @
    fill_rect
    drop drop drop
;

( x y value -- )
: draw_digit
    cells segmap + @

    dup 1 and if
        seg0 4 pick 4 pick draw_segment
    then

    dup 2 and if
        seg1 4 pick 4 pick draw_segment
    then

    dup 4 and if
        seg2 4 pick 4 pick draw_segment
    then

    dup 8 and if
        seg3 4 pick 4 pick draw_segment
    then

    dup 16 and if
        seg4 4 pick 4 pick draw_segment
    then

    dup 32 and if
        seg5 4 pick 4 pick draw_segment
    then

    dup 64 and if
        seg6 4 pick 4 pick draw_segment
    then

    drop drop drop
;

: draw_score
    90 4 score @ 10 / draw_digit
    105 4 score @ 10 mod draw_digit
;

: update
    \ Update ball position
    ball_x @ ball_dx @ + ball_x !
    ball_y @ ball_dy @ + ball_y !

    \ Right side
    ball_x @ court_right = if
        0 ball_dx @ - ball_dx !
        220 20 beep
    then

    \ Top or bottom
    ball_y @ court_top = ball_y @ court_bottom = or if
        0 ball_dy @ - ball_dy !
        220 20 beep
    then

    \ Left (open) side where paddle is.
    ball_x @ paddle_width = if
        \ Are we on the paddle?
        ball_y @ 8 + paddle_y @ >
        ball_y @ paddle_y @ paddle_height + < and if
            \ Yes, on the paddle, bounce
            0 ball_dx @ - ball_dx !
            220 20 beep
            1 score +!
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
        paddle_y @ screen_height paddle_height - < if
            paddle_y @ 1 + paddle_y !
        then
    then
;

: draw_frame
    update

    0 cls
    ball_x @ ball_y @ 1 1 0 draw_sprite
    2 set_color
    0 paddle_y @ paddle_width paddle_height fill_rect
    draw_score
;

init
