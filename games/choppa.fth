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
\
\ To do:
\ * Animate soldiers running out of helicopter when landed at base
\ * Update score
\ * Create enemy tanks that will fire up at the helicopter.
\ * Enable the helicopter with guns/bombs.

variable dir
variable anim_frame

\ Locations and speeds are stored as 28.4 fixed point values
16 constant FRAC_MULTIPLIER
SCREEN_HEIGHT 12 - FRAC_MULTIPLIER * constant MAX_YLOC
FRAC_MULTIPLIER 2 * constant MAX_SPEED

SCREEN_WIDTH 3 / dup constant L_SCROLL_THRESH 2 * constant R_SCROLL_THRESH
1024 constant MAX_SCROLL_WIDTH
MAX_SCROLL_WIDTH SCREEN_WIDTH + 16 - FRAC_MULTIPLIER * constant MAX_XLOC

32 constant CLOUD_WIDTH
7 constant NUM_CLOUDS
create cloud_x 100 , 200 , 270 , 500 , 750 , 800 , 1000 ,
create cloud_y 10 , 30 , 15 , 45 , 17 , 50 , 45 ,

10 constant MAX_PEOPLE
create person_x MAX_PEOPLE cells allot
create person_active MAX_PEOPLE cells allot

20 constant BASE_X

variable xspeed
variable yspeed
variable xloc
variable yloc
variable scroll_offset
variable is_on_ground
variable people_on_board

: update_chopper
    \ Horizontal movement
    is_on_ground @ if
        \ Can't move horizontally while landed.
        0 xspeed !
    else
        buttons BUTTON_L and if
            0 dir !
            xspeed @ dup MAX_SPEED negate <= if 0 else 1 then - xspeed !
        else
            buttons BUTTON_R and if
                1 dir !
                xspeed @ dup MAX_SPEED >= if 0 else 1 then + xspeed !
            else
                \ no buttons, decelerate
                xspeed @ 0 > if
                    -1 xspeed +!
                then
                xspeed @ 0 < if
                    1 xspeed +!
                then
            then
        then
    then

    \ Vertical movement
    buttons BUTTON_U and if
       \ Rise
       -1 yspeed +!
       false is_on_ground !
    else
        buttons BUTTON_D and if
            \ Descend
            1 yspeed +!
        else
            \ no buttons, decelerate
            yspeed @ 0 > if
                -1 yspeed +!
            then
            yspeed @ 0 < if
                1 yspeed +!
            then
        then
    then

    \ Update position
    xspeed @ xloc +!
    yspeed @ yloc +!

    \ Clamp so it can't go off screen
    xloc @ 0 < if
        0 xloc !
        0 xspeed !
    then

    yloc @ 0 < if
        0 yloc !
        0 yspeed !
    then

    xloc @ MAX_XLOC > if
        0 xspeed !
        MAX_XLOC xloc !
    then

    yloc @ MAX_YLOC > if
        \ Stop when we hit the ground
        0 yspeed !
        MAX_YLOC yloc !
        true is_on_ground !
    then

    \ Scroll
    xloc @ FRAC_MULTIPLIER / scroll_offset @ -  \ Compute current on-screen location
    dup L_SCROLL_THRESH < scroll_offset @ 0 > and if
        dup L_SCROLL_THRESH - scroll_offset +!
    then

    dup R_SCROLL_THRESH > scroll_offset @ MAX_SCROLL_WIDTH < and if
        dup R_SCROLL_THRESH - scroll_offset +!
    then
;

: draw_clouds
    \ Clouds
    NUM_CLOUDS 0 do
        i cells cloud_x + @ scroll_offset @ - \ Get x screen coordinate

        \ Do check if this is onscreen
        dup SCREEN_WIDTH <
        over CLOUD_WIDTH + 0 > and if
            i cells cloud_y + @  \ Y coordinate
            4 4 4 false false draw_sprite
        else
            drop
        then
    loop
;

variable p_sprite
variable p_dir
variable p_anim

: update_people
    \ animation runs continuously
    p_anim @ 10 >= if
        0 p_anim !
    else
        p_anim @ 1 + p_anim !
    then

    MAX_PEOPLE 0 do
        i cells person_active + @ if
            i cells person_x + @ scroll_offset @ - \ x coord

            \ Do check if this is onscreen
            dup SCREEN_WIDTH <
            swap 8 + 0 > and if
                \ If on screen and the chopper is landed, people will run towards it
                is_on_ground @ if
                    \ Check with direction to move
                    i cells person_x + @ xloc @ FRAC_MULTIPLIER / 4 +
                    dup2 = if
                        \ Person boarded chopper
                        drop drop
                        false i cells person_active + !
                        0 sfx
                        1 people_on_board +!
                    else
                        > if
                            -1
                        else
                            1
                        then
                        dup p_dir !  \ Save for animation
                        i cells person_x + +! \ Update player position
                    then

                    p_anim @ 5 < if 9 else 10 then p_sprite ! \ Animate running
                else
                    8 p_sprite !
                then

                i cells person_x + @ scroll_offset @ - \ x coord
                SCREEN_HEIGHT 10 - \ y coord
                p_sprite @
                1 1 p_dir @ -1 = false draw_sprite
            then
        then
    loop
;

variable temp_digits

( x y number -- )
\ Number must be 0-99
: display_number
    dup 10 / char 0 + temp_digits c!
    10 mod char 0 + temp_digits 1 + c!
    temp_digits 2 draw_text
;

: draw_frame
    update_chopper

    C_LIGHT_BLUE cls
    C_LIGHT_GREEN set_color
    0 SCREEN_HEIGHT 1 - SCREEN_WIDTH 1 - over draw_line

    draw_clouds

    update_people

    \ Draw the home base
    scroll_offset @ BASE_X 32 + < if
        BASE_X scroll_offset @ - SCREEN_HEIGHT 33 - 11 4 4 false false draw_sprite
    then

    \ If the chopper is at home and has people, count them
    is_on_ground @ xloc @ FRAC_MULTIPLIER / BASE_X > and xloc @ FRAC_MULTIPLIER / BASE_X 15 + < and if
        people_on_board @ 0 > if
            0 people_on_board !
            1 sfx
        then
    then


    \ Draw status display at top
    2 2 8 1 1 false false draw_sprite \ Show person next to count
    C_BLACK set_color
    10 2 people_on_board @ display_number

    \ Draw chopper
    xloc @ FRAC_MULTIPLIER / scroll_offset @ -
    yloc @ FRAC_MULTIPLIER /
    anim_frame @ if 2 else 0 then
    2 2
    dir @ false draw_sprite
    anim_frame @ 1 xor anim_frame !
;

: init
    1 dir !
    0 anim_frame !
    0 xspeed !
    0 yspeed !
    0 scroll_offset !
    MAX_YLOC yloc !
    BASE_X 12 + FRAC_MULTIPLIER * xloc !
    true is_on_ground !
    0 people_on_board !

    MAX_PEOPLE 0 do
        i cells
        dup person_x + random MAX_SCROLL_WIDTH SCREEN_WIDTH - mod SCREEN_WIDTH + swap !
        person_active + true swap !
    loop
;

init


( sprite data ---xx--xxx----x-xxx----xxxx----x--
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
11111111000000000000000111111110000000000000000000000000000000000000100000001000000010000001000000000000000000000000000000000000
0000000100000000000000010000000000000000000000000000000000000000000ccc00000ccc00000cc0000001aaaaa0000000000000000000000000000000
000004444000000000000444400000000000000000000000000000000000000000c0c0c000c0c0c0000ccc000001a2a2a0000000000000000000000000000000
00004744440000100000474444000100000000000000000000000000000000000000c0000000c0000000c0000001a2a2a0000000000000000000000000000000
0004444444444100000444444444441000000000000000111110000000000000000ccc000000cc000000c0000001aaaaa0000000000000000000000000000000
00044444440000000004444444000000000000000000111fff11100000000000000c0c000000c0c000ccc0000001000000000000000000000000000000000000
000044444000000000004444400000000000000000011ffffffff10000000000000c0c00000c00c00000c0000001000000000000000000000000000000000000
00000101000000000000010100000000000000000011fffffffff100000000000000000000000000000000000001000000000000000000000000000000000000
0001111110000000000111111000000000000111111ffffffffff111100000000000000000000000000000000001000000000000000000000000000000000000
00000000000000000000000000000000000111ffffffffffffffffff111000000000000000000000000000000001000000000000000000000000000000000000
000000000000000000000000000000000011fffffffffffffffffffffff100000000000000000000000000000001000000000000000000000000000000000000
00000000000000000000000000000000001fffffffffffffffffffffffff10000000000000000000000000000001000000000000000000000000000000000000
00000000000000000000000000000000001fffffffffffffffffffffffff10000000000000000000000000000001000000000000000000000000000000000000
00000000000000000000000000000000001fffffffffffffffffffffffff10000000000000000000000000000001000000000000000000000000000000000000
000000000000000000000000000000000001ffffffffffffffffffffffff10000000000000000000000000000001000000000000000000000000000000000000
000000000000000000000000000000000001ffffffffffffffffffffffff10000000000000000000000000000001000000000000000000000000000000000000
0000000000000000000000000000000000001ffffffffffffffffffffff100000000000000000000000000000001000000000000000000000000000000000000
00000000000000000000000000000000000001ffffffffffffffff11111000000000000000000000000000000001000000000000000000000000000000000000
0000000000000000000000000000000000000011111ffffffff11100000000000000000000000000000000000001000000000000000000000000000000000000
00000000000000000000000000000000000000000011fffffff10000000000000000000000000000000000000001000000000000000000000000000000000000
000000000000000000000000000000000000000000001fffff100000000000000000000000000000000000001111111111100000000000000000000000000000
00000000000000000000000000000000000000000000011111000000000000000000000000000000000000008888888888000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000008888888888000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000008888888888000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000008888888888000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000008888888888000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000008888dd8888000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000008888dd8888000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000008888dd8888000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000008888dd8888000000000000000000000000000000
000000000000000000000000000000000000000000000000000000000000000000000000000000000000000011111111111111111111111111111111
)
