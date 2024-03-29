\ Copyright 2024 Jeff Bush
\
\ Licensed under the Apache License, Version 2.0 (the 'License');
\ you may not use this file except in compliance with the License.
\ You may obtain a copy of the License at
\
\   http://www.apache.org/licenses/LICENSE-2.0
\
\ Unless required by applicable law or agreed to in writing, software
\ distributed under the License is distributed on an 'AS IS' BASIS,
\ WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
\ See the License for the specific language governing permissions and
\ limitations under the License.

0 constant COURT_TOP
SCREEN_WIDTH 8 - constant COURT_RIGHT
SCREEN_HEIGHT 8 - constant COURT_BOTTOM
20 constant PADDLE_HEIGHT
6 constant PADDLE_WIDTH

variable ball_x
variable ball_y
variable ball_dx
variable ball_dy
variable paddle_y
variable score

: init
    SCREEN_WIDTH 2 / 4 - ball_x !
    SCREEN_HEIGHT 2 / 4 - ball_y !
    1 ball_dx !
    1 ball_dy !
    SCREEN_HEIGHT PADDLE_HEIGHT - 2 / paddle_y !
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
binary
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
decimal

10 constant SEG_LENGTH
4 constant SEG_THICKNESS

\ Rectangles for each segment, x, y, width, height
create seg_locs
0 , 0 , SEG_LENGTH , SEG_THICKNESS , \ 0
0 , 0 , SEG_THICKNESS , SEG_LENGTH , \ 1
SEG_LENGTH SEG_THICKNESS - , 0 , SEG_THICKNESS , SEG_LENGTH , \ 2
0 , SEG_LENGTH SEG_THICKNESS 2 / - , SEG_LENGTH , SEG_THICKNESS , \ 3
0 , SEG_LENGTH , SEG_THICKNESS , SEG_LENGTH , \ 4
SEG_LENGTH SEG_THICKNESS - , SEG_LENGTH , SEG_THICKNESS , SEG_LENGTH , \ 5
0 , SEG_LENGTH 2 * SEG_THICKNESS - , SEG_LENGTH , SEG_THICKNESS , \ 6

variable digit_x
variable digit_y

( seg_ptr -- )
: draw_segment
    \ Read the 4 values onto the stack
    dup @ digit_x @ +
    over 4 + @ digit_y @ +
    3 pick 8 + @
    4 pick 12 + @
    fill_rect
    drop
;

( value -- )
: draw_digit
    cells segmap + @   \ Lookup table, each bit represents a segment
    seg_locs
    1
    ( bitmap coord_ptr mask )

    begin
        dup 64 <=
    while
        dup 4 pick and if
            over draw_segment
        then
        swap 16 + swap
        2 *
    repeat

    drop drop drop
;

: draw_score
    90 digit_x !
    4 digit_y !
    score @ 10 / draw_digit
    102 digit_x !
    score @ 10 mod draw_digit
;

: update
    \ Update ball position
    ball_x @ ball_dx @ + ball_x !
    ball_y @ ball_dy @ + ball_y !

    \ Right side
    ball_x @ COURT_RIGHT = if
        0 ball_dx @ - ball_dx !
        220 20 beep
    then

    \ Top or bottom
    ball_y @ COURT_TOP = ball_y @ COURT_BOTTOM = or if
        0 ball_dy @ - ball_dy !
        220 20 beep
    then

    \ Left (open) side where paddle is.
    ball_x @ PADDLE_WIDTH = if
        \ Are we on the paddle?
        ball_y @ 8 + paddle_y @ >
        ball_y @ paddle_y @ PADDLE_HEIGHT + < and if
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
    buttons BUTTON_U and if
        paddle_y @ COURT_TOP > if
            paddle_y @ 1 - paddle_y !
        then
    then

    buttons BUTTON_D and if
        paddle_y @ SCREEN_HEIGHT PADDLE_HEIGHT - < if
            paddle_y @ 1 + paddle_y !
        then
    then
;

: draw_frame
    update

    0 cls
    ball_x @ ball_y @ 1 1 0 draw_sprite
    7 set_color
    0 paddle_y @ PADDLE_WIDTH PADDLE_HEIGHT fill_rect
    draw_score
;

init


( sprite data ---xx--xxx----x-xxx----xxxx----x--
00022000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00222200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
0222f220000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
22222f22000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
22222222000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
02222220000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00222200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00022
)
