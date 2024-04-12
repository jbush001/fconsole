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
\ * Enemy ship movement
\ * Check for collisions between enemy bombs and ship.
\ * Enemy explosion animation.
\ * Add score counter.


variable ship_pos
10 constant MAX_MISSILES
10 constant MAX_STARS
7 constant MAX_ENEMIES
SCREEN_HEIGHT 16 - constant SHIP_Y

create missile_active MAX_MISSILES cells allot drop
create missile_x MAX_MISSILES cells allot drop
create missile_y MAX_MISSILES cells allot drop
create star_x MAX_STARS cells allot drop
create star_y MAX_STARS cells allot drop
create enemy_x MAX_ENEMIES cells allot drop
create enemy_y MAX_ENEMIES cells allot drop
create enemy_active MAX_ENEMIES cells allot drop
create bomb_x MAX_ENEMIES cells allot drop
create bomb_y MAX_ENEMIES cells allot drop
create bomb_active MAX_ENEMIES cells allot drop

( -- index )
: allocate_missile
    0
    begin
       dup MAX_MISSILES <
    while
       dup cells missile_active + dup @ ( index address active )
       0= if
          true swap !  \ Set this active
          exit      \ return allocated slot
       else
          drop
       then
       1 +
    repeat

    drop -1 \ Return -1 to indicate no missiles available
;

( -- )
: fire_missile
    allocate_missile
    dup -1 = if
        \ Can't fire a missile, too many on screen. Wait for
        \ them to dispatch
        drop
        exit
    then

    \ Index of slot is now on stack
    dup cells missile_x + ship_pos @ 8 + swap !
    cells missile_y + SCREEN_HEIGHT 16 - swap !
;

variable last_button

: update_ship
    buttons BUTTON_L and if
        ship_pos @ 0 > if
            ship_pos @ 2 - ship_pos !
        then
    then

    buttons BUTTON_R and if
        ship_pos @ SCREEN_WIDTH 16 - < if
            ship_pos @ 2 + ship_pos !
        then
    then

    buttons BUTTON_A and if
        last_button @ 0= if
           fire_missile
           0 sfx
        then
        true last_button !
    else
        false last_button !
    then

    ship_pos @ SHIP_Y 0 2 2 0 0 draw_sprite
;

: update_missiles
    C_RED set_color
    MAX_MISSILES 0 do
       i cells missile_active + @ if
            i cells missile_y + @
            6 -                     \ new_y_pos
            dup 0 < if
               \ Off top of screen
               drop i cells missile_active + 0 swap ! \ Make not active
            else
   	        \ Still moving
                i cells missile_y + !  \ Save position

                i cells missile_x + @
                i cells missile_y + @
                over
                over 4 -
                draw_line
            then
       then
    loop
;

: update_stars
    MAX_STARS 0 do
        i cells star_x +     ( xptr )
        i cells star_y +     ( xptr yptr )

        dup @ SCREEN_HEIGHT >= if
            \ Off bottom of screen, create a new one at top
            0 swap !       \ set y to top
            random SCREEN_WIDTH 1 - mod swap !  \ set x to random
        else
            C_WHITE set_color
            over @ over @ ( xptr yptr x y)
            over 1 - over
            draw_line

       	    dup 2 swap +! \ increment y
            drop
            drop
        then
    loop
;

: update_enemies
    MAX_ENEMIES 0 do
        i cells enemy_active + @ if
            i cells enemy_x + @ i cells enemy_y + @
            2 2 2 false false draw_sprite

           \ XXX enemy movement

           \ Each enemy can have one bomb on the screen at a time.
            i cells bomb_active + @ if
                3 i cells bomb_y + +!  \ Move the bomb towards bottom of screen
                i cells bomb_y + @ SCREEN_HEIGHT >= if
                    \ past bottom of screen
                    false i cells bomb_active + !
                else
                    C_ORANGE set_color
                    i cells bomb_x + @ i cells bomb_y + @ over over 3 + draw_line
                then
            else
                \ randomly drop bombs
                random 9 mod 1 = if
                    \ Drop a bomb. Each enemy has one bomb slot.
                    true i cells bomb_active + !
                    i cells enemy_x + @ 8 + i cells bomb_x + !
                    i cells enemy_y + @ 16 + i cells bomb_y + !
                then
            then

           \ Check missile collisions
            MAX_MISSILES 0 do
                i cells missile_x + @
                j cells enemy_x + @ 8 +
                - abs
                8 <

                i cells missile_y + @
                j cells enemy_y + @ 8 +
                - abs
                8 <
                and if
                    false i cells missile_active + !
                    false j cells enemy_active + !
                then
            loop
        then
    loop
;


: draw_frame

    0 cls
    update_stars
    update_missiles
    update_enemies
    update_ship
;

: init
    SCREEN_WIDTH 16 + 2 / ship_pos !
    missile_active MAX_MISSILES erase
    MAX_ENEMIES 0 do
        true i cells enemy_active + !
        random SCREEN_WIDTH 17 - mod i cells enemy_x + !
        random SCREEN_HEIGHT 65 - mod i cells enemy_y + !
    loop

    MAX_STARS 0 do
        random SCREEN_WIDTH 1 - mod i cells star_x + !
        random SCREEN_HEIGHT 1 - mod i cells star_y + !
    loop
;


init


( sprite data ---xx--xxx----x-xxx----xxxx----x--
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000004000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000004000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
0000000400000000000000bbbb000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
0000004440000000000000bbbb000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
0000004540000000000000bbbb000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00200045400020000000bbbbbbbb0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00400044400040000000bbbbbbbb0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
0040044444004000000bb777777bb000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
0040444444404000000bbbbbbbbbb000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
004444444444400000bbbbbbbbbbbb00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00444444444440000bb0000000000bb0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
04444400044444000b000000000000b
)
