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


variable ship_pos
10 constant MAX_MISSILES

create missile_active MAX_MISSILES cells allot
create missile_x MAX_MISSILES cells allot
create missile_y MAX_MISSILES cells allot


( -- index )
: allocate_missile
    0
    begin
       dup MAX_MISSILES <
    while
       dup cells missile_active + dup @ ( index address active )
       0= if
          1 swap !  \ Set this active
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

( -- )
: draw_missiles
    2 set_color

    MAX_MISSILES 0 do
       i cells missile_active + @
       if
            \ This missile is active, draw
            i cells missile_x + @
            i cells missile_y + @
            over
            over 4 -
            draw_line
       then
    loop
;

: update_missiles
    MAX_MISSILES 0 do
       i cells missile_active + @ if
            i cells missile_y + @
            3 -                     \ new_y_pos
            dup 0 < if
               \ Off top of screen
               drop i cells missile_active + 0 swap ! \ Make not active
            else
   	            \ Still moving
                i cells missile_y + !  \ Save position
            then
       then
    loop
;


variable last_button

: draw_frame
    buttons BUTTON_L and if
        ship_pos @ 0 > if
            ship_pos @ 1 - ship_pos !
        then
    then

    buttons BUTTON_R and if
        ship_pos @ SCREEN_WIDTH 16 - < if
            ship_pos @ 1 + ship_pos !
        then
    then

    buttons BUTTON_A and if
        last_button @ 0= if
           fire_missile
        then
        1 last_button !
    else
        0 last_button !
    then

    0 cls
    ship_pos @ 112 2 2 0 draw_sprite
    update_missiles
    draw_missiles
;

: init
  56 ship_pos !
  missile_active MAX_MISSILES zero_memory
;


init


( sprite data ---xx--xxx----x-xxx----xxxx----x--
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000022200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000025200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00400025200040000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00200022200020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00200222220020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00202222222020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00222222222220000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00222222222220000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
02222200022222
)
