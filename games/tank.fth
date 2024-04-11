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

variable direction
variable delay
variable tank_x
variable tank_y
variable cannon_x
variable cannon_y
variable cannon_active
variable cannon_dx
variable cannon_dy

create spr_tab 0 , 1 , 2 , 1 , 0 , 1 , 2 , 1 ,
create xvec 0 , 1 , 1 , 1 , 0 , -1 , -1 , -1 ,
create yvec -1 , -1 , 0 , 1 , 1 , 1 , 0 , -1 ,


: draw_frame
    C_BROWN cls

    \ Handle rotation. We use a delay here to limit the rate of spinning.
    delay @ 5 > if
        0 delay !
        buttons BUTTON_R and if
            direction @ 1 + 8 mod direction !
        then

        buttons BUTTON_L and if
            direction @ 7 + 8 mod direction !
        then
    else
        1 delay +!
    then

    \ Forward and backward movement
    buttons BUTTON_U and if
        direction @ cells
	dup xvec + @ tank_x +!
        yvec + @ tank_y +!
    then

    buttons BUTTON_D and if
        direction @ cells
	dup xvec + @ negate tank_x +!
        yvec + @ negate tank_y +!
    then

    \ We allow only one cannon ball to be on screen at a time, which seems
    \ appropriate, as tanks don't generally allow rapid fire.
    cannon_active @ if
        \ Update position of cannon ball
        cannon_dx @ cannon_x +!
        cannon_dy @ cannon_y +!

        \ Check if off screen
        cannon_x @ SCREEN_WIDTH >
        cannon_x @ 0 < or
        cannon_y @ SCREEN_HEIGHT > or
        cannon_y @ 0 < or if
            false cannon_active !
        else
            cannon_x @ cannon_y @ 6 1 1 false false draw_sprite
        then
    else
        buttons BUTTON_A and if
            \ Fire cannon
            direction @ cells xvec + @
            direction @ cells yvec + @
            dup2

            \ Set position of cannon ball, in front of barrel
            8 * tank_y @ 4 + + cannon_y !
            8 * tank_x @ 4 + + cannon_x !

            \ Set direction of cannon ball movement
            4 * cannon_dy !
            4 * cannon_dx !

            true cannon_active !
        then
   then

    \ Draw tank
    tank_x @ tank_y @
    direction @ cells spr_tab + @ 2 * \ Pick the right sprite: vert, diag, or horiz
    2 2
    direction @ 4 >  \ Flip X if the tank is facing left
    direction @ 2 > direction @ 7 < and \ Flip y if the tank is facing down
    draw_sprite
;

: init
   SCREEN_WIDTH 2 / 8 - tank_x !
   SCREEN_HEIGHT 2 / 8 - tank_y !
   0 direction !
   false cannon_active !
;

init

( sprite data ---xx--xxx----x-xxx----xxxx----x--
0000000cc000000000000000000000c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
0000000cc00000000000000100000ccc000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
0000000cc0000000000000111000ccc0001111111111000000011000000000000000000000000000000000000000000000000000000000000000000000000000
0000000cc000000000000111c00ccc00001111111111000000118100000000000000000000000000000000000000000000000000000000000000000000000000
0000000cc00000000000111cccccc000000ccccccc00000000111100000000000000000000000000000000000000000000000000000000000000000000000000
0011000cc0001100000111cccccc0000000ccccccc00000000011000000000000000000000000000000000000000000000000000000000000000000000000000
0011cccccccc110000111ccccccc0000000ccccccc00000000000000000000000000000000000000000000000000000000000000000000000000000000000000
0011cccccccc11000001ccccccccc000000ccccccccccccc00000000000000000000000000000000000000000000000000000000000000000000000000000000
0011cccccccc11000000ccccccccc100000ccccccccccccc00000000000000000000000000000000000000000000000000000000000000000000000000000000
0011cccccccc110000000ccccccc1110000ccccccc00000000000000000000000000000000000000000000000000000000000000000000000000000000000000
0011cccccccc1100000000ccccc11100000ccccccc00000000000000000000000000000000000000000000000000000000000000000000000000000000000000
0011cccccccc11000000000ccc111000000ccccccc00000000000000000000000000000000000000000000000000000000000000000000000000000000000000
0011cccccccc110000000000c1110000001111111111000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00110000000011000000000011100000001111111111000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000001
)
