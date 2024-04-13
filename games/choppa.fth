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
\ * Create enemy tanks that will fire up at the helicopter.
\ * Enable the helicopter with guns/bombs.
\ * Display total soldiers rescued, score
\ * Respawn soldiers/have levels
\ * Animate soldiers running out of helicopter when landed at base

\ Locations and speeds are stored as 28.4 fixed point values
4 constant FRAC_BITS

( integer -- fixed_point )
: tofixp
    FRAC_BITS lshift
;

( fixed_point -- integer )
: fromfixp
    FRAC_BITS rshift
;

SCREEN_HEIGHT 15 - tofixp constant MAX_YLOC_F
2 tofixp constant MAX_SPEED_F

SCREEN_WIDTH 3 / dup constant L_SCROLL_THRESH 2 * constant R_SCROLL_THRESH
1024 constant MAX_SCROLL_WIDTH
MAX_SCROLL_WIDTH SCREEN_WIDTH + 16 - tofixp constant MAX_XLOC_F

32 constant CLOUD_WIDTH
7 constant NUM_CLOUDS
create cloud_x 100 , 200 , 270 , 500 , 750 , 800 , 1000 ,
create cloud_y 10 , 30 , 15 , 45 , 17 , 50 , 45 ,

10 constant MAX_PEOPLE
create person_x MAX_PEOPLE cells allot drop
create person_active MAX_PEOPLE cells allot drop

20 constant BASE_X

variable chpr_dir
variable chpr_anim
variable chpr_xspeed_f
variable chpr_yspeed_f
variable chpr_xloc_f
variable chpr_yloc_f
variable chpr_landed
variable people_on_board
variable scroll_offset

( -- )
: update_chopper
    \ Horizontal movement
    chpr_landed @ if
        \ Can't move horizontally while on ground.
        0 chpr_xspeed_f !
    else
        buttons BUTTON_L and if
            0 chpr_dir !
            chpr_xspeed_f @ dup MAX_SPEED_F negate <= if 0 else 1 then - chpr_xspeed_f !
        else
            buttons BUTTON_R and if
                1 chpr_dir !
                chpr_xspeed_f @ dup MAX_SPEED_F >= if 0 else 1 then + chpr_xspeed_f !
            else
                \ no buttons, decelerate
                chpr_xspeed_f @ 0 > if
                    -1 chpr_xspeed_f +!
                then
                chpr_xspeed_f @ 0 < if
                    1 chpr_xspeed_f +!
                then
            then
        then
    then

    \ Vertical movement
    buttons BUTTON_U and if
       \ Rise
       -1 chpr_yspeed_f +!
       false chpr_landed !
    else
        buttons BUTTON_D and if
            \ Descend
            1 chpr_yspeed_f +!
        else
            \ no buttons, decelerate
            chpr_yspeed_f @ 0 > if
                -1 chpr_yspeed_f +!
            then
            chpr_yspeed_f @ 0 < if
                1 chpr_yspeed_f +!
            then
        then
    then

    \ Update position
    chpr_xspeed_f @ chpr_xloc_f +!
    chpr_yspeed_f @ chpr_yloc_f +!

    \ Clamp so it can't go off screen
    chpr_xloc_f @ 0 < if
        0 chpr_xloc_f !
        0 chpr_xspeed_f !
    then

    chpr_yloc_f @ 0 < if
        0 chpr_yloc_f !
        0 chpr_yspeed_f !
    then

    chpr_xloc_f @ MAX_XLOC_F > if
        0 chpr_xspeed_f !
        MAX_XLOC_F chpr_xloc_f !
    then

    chpr_yloc_f @ MAX_YLOC_F > if
        \ Stop when we hit the ground
        0 chpr_yspeed_f !
        MAX_YLOC_F chpr_yloc_f !
        true chpr_landed !
    then

    \ Scroll
    chpr_xloc_f @ fromfixp scroll_offset @ -  \ Compute current on-screen location
    dup L_SCROLL_THRESH < scroll_offset @ 0 > and if
        dup L_SCROLL_THRESH - scroll_offset +!
    then

    dup R_SCROLL_THRESH > scroll_offset @ MAX_SCROLL_WIDTH < and if
        dup R_SCROLL_THRESH - scroll_offset +!
    then
    drop

    \ Draw
    chpr_xloc_f @ fromfixp scroll_offset @ -
    chpr_yloc_f @ fromfixp
    chpr_anim @ if 2 else 0 then
    2 2
    chpr_dir @ false draw_sprite
    chpr_anim @ 1 xor chpr_anim !
;

( -- )
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

( -- )
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
                chpr_landed @ if
                    \ Check with direction to move
                    i cells person_x + @ chpr_xloc_f @ fromfixp 4 +
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
                SCREEN_HEIGHT 13 - \ y coord
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

( -- )
: draw_status_display
    2 2 8 1 1 false false draw_sprite \ Show person next to count
    C_BLACK set_color
    10 2 people_on_board @ display_number
;

( -- )
: draw_frame
    C_LIGHT_BLUE cls

    \ Draw ground
    C_LIGHT_GREEN set_color
    0 SCREEN_HEIGHT 12 - SCREEN_WIDTH 12 fill_rect

    draw_clouds

    update_people

    \ Draw the home base
    scroll_offset @ BASE_X 32 + < if
        BASE_X scroll_offset @ - SCREEN_HEIGHT 33 - 11 4 4 false false draw_sprite
    then

    \ If the chopper is at home and has people, count them
    chpr_landed @ chpr_xloc_f @ fromfixp BASE_X > and chpr_xloc_f @ fromfixp BASE_X 25 + < and if
        people_on_board @ 0 > if
            0 people_on_board !
            1 sfx
        then
    then

    draw_status_display

    update_chopper
;

: init
    1 chpr_dir !
    0 chpr_anim !
    0 chpr_xspeed_f !
    0 chpr_yspeed_f !
    0 scroll_offset !
    MAX_YLOC_F chpr_yloc_f !
    BASE_X 12 + tofixp chpr_xloc_f !
    true chpr_landed !
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
11111111000000000000000111111110000000000000000000000000000000000000100000001000000010000000000084444000000000000000000000000000
0000000100000000000000010000000000000000000000000000000000000000000ccc00000ccc00000cc0000000000084444000000000000000000000000000
000004444000000000000444400000000000000000000000000000000000000000c0c0c000c0c0c0000ccc000000000084444000000000000000000000000000
00004744440000100000474444000100000000000000000000000000000000000000c0000000c0000000c0000000000080000000000000000000000000000000
0004444444444100000444444444441000000000000000111110000000000000000ccc000000cc000000c0000000000080000000000000000000000000000000
00044444440000000004444444000000000000000000111fff11100000000000000c0c000000c0c000ccc0000000000080000000000000000000000000000000
000044444000000000004444400000000000000000011ffffffff10000000000000c0c00000c00c00000c0000000000080000000000000000000000000000000
00000101000000000000010100000000000000000011fffffffff100000000000000000000000000000000000000000080000000000000000000000000000000
0001111110000000000111111000000000000111111ffffffffff111100000000000000000000000000000000000000080000000000000000000000000000000
00000000000000000000000000000000000111ffffffffffffffffff111000000000000000000000000000000000000080000000000000000000000000000000
000000000000000000000000000000000011fffffffffffffffffffffff100000000000000000000000000000000000080000000000000000000000000000000
00000000000000000000000000000000001fffffffffffffffffffffffff10000000000000000000000000000000000080000000000000000000000000000000
00000000000000000000000000000000001fffffffffffffffffffffffff10000000000000000000000000000000000080000000000000000000000000000000
00000000000000000000000000000000001fffffffffffffffffffffffff10000000000000000000000000000001111181111111100000000000000000000000
000000000000000000000000000000000001ffffffffffffffffffffffff10000000000000000000000000000011111111111111d00000000000000000000000
000000000000000000000000000000000001ffffffffffffffffffffffff1000000000000000000000000000011111111111111dd00000000000000000000000
0000000000000000000000000000000000001ffffffffffffffffffffff100000000000000000000000000000dddddddddddddddd00000000000000000000000
00000000000000000000000000000000000001ffffffffffffffff11111000000000000000000000000000000ddddddd111dddddd00000000000000000000000
0000000000000000000000000000000000000011111ffffffff11100000000000000000000000000000000000ddddddd111dddddd00000000000000000000000
00000000000000000000000000000000000000000011fffffff10000000000000000000000000000000000000ddddddd111dddddd00000000000000000000000
000000000000000000000000000000000000000000001fffff100000000000000000000000000000000000000ddddddd111dddddd00000000000000000000000
00000000000000000000000000000000000000000000011111000000000000000000000000000000000000000ddddddd111ddddd000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ddddddd111dddd8888888888888888800000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000888888888888888888888888800000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008888888888888888888888888000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000088888888888888888888888880000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000888888888888888888888888800000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008888888888888888888888888000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000088888888888888888888888880000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000888888888888888888888888800000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000008888888888888888888888888
)
