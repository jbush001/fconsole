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
    2 ball_dx !
    2 ball_dy !
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
create segment_coords
    0 , 0 , SEG_LENGTH , SEG_THICKNESS , \ 0
    0 , 0 , SEG_THICKNESS , SEG_LENGTH , \ 1
    SEG_LENGTH SEG_THICKNESS - , 0 , SEG_THICKNESS , SEG_LENGTH , \ 2
    0 , SEG_LENGTH SEG_THICKNESS 2 / - , SEG_LENGTH , SEG_THICKNESS , \ 3
    0 , SEG_LENGTH , SEG_THICKNESS , SEG_LENGTH , \ 4
    SEG_LENGTH SEG_THICKNESS - , SEG_LENGTH , SEG_THICKNESS , SEG_LENGTH , \ 5
    0 , SEG_LENGTH 2 * SEG_THICKNESS - , SEG_LENGTH , SEG_THICKNESS , \ 6

variable digit_x
variable digit_y

( seg_ptr -- seg_ptr )
: draw_segment
    \ Read the 4 values onto the stack
    dup @ digit_x @ +
    over 4 + @ digit_y @ +
    3 pick 8 + @
    4 pick 12 + @
    fill_rect
;

( value -- )
: draw_digit
    cells segmap + @   \ Lookup table, each bit represents a segment
    segment_coords ( bitmap coord_ptr )
    7 0 do
        over 1 i lshift and if
            draw_segment
        then
        16 +
    loop
    drop drop
;

: draw_score
    COURT_RIGHT 20 - digit_x !
    4 digit_y !
    score @ 10 / draw_digit
    COURT_RIGHT 8 - digit_x !
    score @ 10 mod draw_digit
;

( x -- -x )
: negatevar
    dup @ negate swap !
;

( low high value -- result )
: in_bounds
    swap over >=
    -rot <=
    and
;

: update
    \ Update ball position
    ball_dx @ ball_x +!
    ball_dy @ ball_y +!

    \ Right side
    ball_x @ COURT_RIGHT >= if
        -2 ball_dx !
        0 sfx
    then

    \ Top or bottom
    0 COURT_BOTTOM ball_y @ in_bounds 0= if
        ball_dy negatevar
        0 sfx
    then

    ball_x @ -8 < if
        \ Out of bounds, restart game.
        init
        1 sfx
        exit
    then

    \ Check for paddle hit
    ball_x @ PADDLE_WIDTH <
        paddle_y @ dup PADDLE_HEIGHT + ball_y @ 4 + in_bounds and if
        \ Yes, on the paddle, bounce
        2 ball_dx !
        0 sfx
        1 score +!
    then

    \ Move paddle
    buttons BUTTON_U and paddle_y @ 0 > and if
        -2 paddle_y +!
    then

    buttons BUTTON_D and paddle_y @ SCREEN_HEIGHT PADDLE_HEIGHT - < and if
        2 paddle_y +!
    then
;

: draw_frame
    update

    C_BLACK cls
    C_CYAN set_color
    draw_score
    ball_x @ ball_y @ 0 1 1 false false draw_sprite
    0 paddle_y @ PADDLE_WIDTH PADDLE_HEIGHT fill_rect
;

init

(
--SPRITE DATA------
00044000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00444400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
0444f440000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
44444f44000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
44444444000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
04444440000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00444400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00044
--SOUND DATA--------
04013c000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000
0a02322d28231e19140f000000000000000000000000000000000000000000000000f03c80f0b4800000000000000000000000000000000000000000000000000000

)
