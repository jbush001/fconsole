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

8 constant BLOCK_SIZE
10 constant WELL_WIDTH
15 constant WELL_HEIGHT

SCREEN_WIDTH WELL_WIDTH BLOCK_SIZE * - 2 / constant WELL_X_OFFS

4 constant WELL_Y_OFFS


\ Each piece consists of four blocks. Each block is stored here
\ as an X and Y offset from the pivot point.
create pieces
    0 , -1 , 0 , 0 , 0 , 1 , 1 , 1 ,   \ L
    0 , -1 , 0 , 0 , 0 , 1 , -1 , 1 ,  \ J
    0 , -1 , 0 , 0 , 0 , 1 , 0 , 2 ,   \ I
    -1 , 0 , 0 , 0 , 1 , 0 , 0 , -1 ,  \ T
    0 , -1 , 1 , -1 , 1 , 0 , 0 , 0 ,  \ O
    -1 , 0 , 0 , 0 , 0 , -1 , 1 , -1 , \ S
    1 , 0 , 0 , 0 , 0 , -1 , -1 , -1 , \ Z

\ Table of drop delays per level
create level_speed
    53 , 49 , 45 , 41 , 37 , 33 , 28 , 22 , 17 , 11 , 10 ,
    9 , 8 , 7 , 6 , 6 , 5 , 5 , 4 , 4 , 3 ,

\ Track which blocks in the well have pieces in them. This only tracks pieces
\ that have fallen in the well, not the currently dropping pieces.
create well_data WELL_WIDTH WELL_HEIGHT * cells allot

\ Score increment for number of rows cleared.
create score_table 40 , 100 , 300 , 1200 ,
variable score
variable level
variable total_lines

\ Information about currently dropping piece.
variable piece_x
variable piece_y
variable rotation
variable cur_shape
variable cur_pattern
variable next_shape
variable next_pattern

\ Given an X and Y coordinate, apply_rotation it according to current piece
\ rotation.
( x y -- x y )
: apply_rotation
    case rotation @
        0 of endof
        1 of
            \ x = y y = -x
            swap
            negate
        endof
        2 of
            \ x = -x  y = -y
            negate
            swap
            negate
            swap
        endof
        3 of
            \ x = -y y = x
            negate
            swap
        endof
    endcase
;

( piece_addr -- piece_addr )
: draw_block
    dup @      \ Read X
    over 4 + @ \ Read Y

    apply_rotation

    \ Convert to screen coordinates
    piece_y @ + BLOCK_SIZE * WELL_Y_OFFS +
    swap
    piece_x @ + BLOCK_SIZE * WELL_X_OFFS +
    swap

    cur_pattern @ 1 - 1 1 false false draw_sprite
;

( -- )
: draw_piece
    cur_shape @
    4 0 do
        draw_block 8 +
    loop
    drop
;

\ Given piece addr translate and apply_rotation to coords in grid
( block_addr -- x y )
: transform_block_coords
    dup @      \ X
    over 4 + @ \ Y

    apply_rotation

    \ Convert to screen locations
    piece_y @ +
    swap
    piece_x @ +
    swap
;

\ Convert well coordinates to offset in the well array
( x y -- addr )
: well_addr
    WELL_WIDTH * + cells \ Convert to array offset
    well_data +
;

( piece_addr -- )
: lock_block
    transform_block_coords
    well_addr
    cur_pattern @ swap !
;

\ When a piece cannot fall any more, copy its blocks into the well grid.
\ ( -- )
: lock_piece
    cur_shape @
    4 0 do
        lock_block 8 +
    loop
    drop
;

variable collision

\ Check if a block collides with the sides or existing blocks in the
\ well.
( block_addr -- )
: block_collides
    transform_block_coords

    ( x y )
    \ Check in bounds
    dup 0 < if
        true collision !
        drop drop
        exit
    then

    dup WELL_HEIGHT >= if
        true collision !
        drop drop
        exit
    then

    swap

    dup 0 < if
        true collision !
        drop drop
        exit
    then

    dup WELL_WIDTH >= if
        true collision !
        drop drop
        exit
    then

    swap

    well_addr
    @  \ Read
    if
        true collision !
    then
;

: piece_collides
    false collision !
    cur_shape @
    4 0 do
        block_collides 8 +
    loop
    drop
    collision @
;

( -- )
: new_piece
    \ Copy next piece to current.
    next_shape @ cur_shape !
    next_pattern @ cur_pattern !
    4 piece_x !
    2 piece_y !

    \ Set next piece
    random 7 mod
    dup 1 + next_pattern !

    8 * cells pieces + next_shape !
;

( x y width height -- )
: draw_rect
    4 pick 4 pick 4 pick 3 pick + over draw_line \ Top
    4 pick 4 pick over over 5 pick + draw_line \ Left
    4 pick 3 pick + 4 pick over over 5 pick + draw_line \ Right
    4 pick 4 pick 3 pick + over 5 pick + over draw_line \ Bottom

    drop drop drop drop
;

variable x
variable y
variable blink_state
variable blink_counter
create finished_rows WELL_HEIGHT cells allot

( -- )
: draw_well
    \ Draw the well sides
    C_CYAN set_color
    WELL_X_OFFS 1 - WELL_Y_OFFS 1 - WELL_WIDTH BLOCK_SIZE * 2 + WELL_HEIGHT BLOCK_SIZE * 2 + draw_rect

    \ Draw locked pieces inside well
    WELL_HEIGHT 0 do
        \ If this row is finished, it will blink before being removed.
        \ Check if the row is blinking before drawing
        i cells finished_rows + @   ( Is this row set as finished )
        blink_state @ and             ( and we are the hide phase )
        0= if
            WELL_WIDTH 0 do
                i j well_addr @  \ read well block
                dup if
                    i BLOCK_SIZE * WELL_X_OFFS +
                    swap
                    j BLOCK_SIZE * WELL_Y_OFFS +
                    swap
                    1 - 1 1 false false draw_sprite
                else
                    drop
                then
            loop
        then
    loop
;

variable finished_row_count
variable row_is_finished

\ Check if any rows have all of their columns filled and need to disappear.
( -- )
: check_finished
    finished_rows WELL_HEIGHT erase

    0 finished_row_count !
    WELL_HEIGHT 0 do
        true row_is_finished !
        WELL_WIDTH 0 do
            i j well_addr @
            0= if
                false row_is_finished !
            then
        loop

        row_is_finished @ if
            true i cells finished_rows + !
            1 finished_row_count +!
        then
    loop

    finished_row_count @
;

variable dest_y

\ Copy rows down to fill spaces left by rows that have been completed.
( -- )
: remove_finished_rows
    \ Walk from bottom up
    WELL_HEIGHT 1 -
    dup
    y !  \ Y is source address
    dest_y !

    begin
        y @ 0 >=
    while
        y @ cells finished_rows + @   ( Is this row set as finished )
        0= if
            \ Not eliminated, copy
            0 y @ well_addr   \ src
            0 dest_y @ well_addr  \ dest
            WELL_WIDTH \ count
            move
            -1 dest_y +!
        then

        -1 y +!
    repeat

    \ Clear rows at top that are now exposed.
    well_data
    dest_y @ 1 + WELL_WIDTH *
    erase
;

variable button_mask

\ Check which buttons have been pressed since the last time this was called.
\ This only detects transitions from not pressed to pressed.
( -- buttons )
: check_buttons
    buttons dup                 ( buttons buttons )
    button_mask @ -1 xor and    ( ~button_mask & buttons )
    swap button_mask !          ( update button msak)
;

\ Convert an integer value into ascii
\ ( strptr value count -- )
: itoa
    rot over + 1 -  ( value count endptr)
    swap 0 do ( value endptr )
        over 10 mod char 0 + ( value endptr digit )
        over c!
        swap 10 /
        swap 1 -
    loop
    drop drop
;

create score_str 8 allot
create lines_str 4 allot
create level_str 4 allot

\ We only convert the numeric scores to strings when the change,
\ as an optimization.
: update_score_str
    \ There's a divide by four since move works in
    \ terms of words, not bytes.
    score_str score @ 6 itoa
    lines_str total_lines @ 4 itoa
    level_str level @ 2 itoa
;

\ Minimum time to display game over screen. User can hit any key
\ to restart after a game over, but it's possible they inadvertently
\ do it if they are mashing buttons.
variable game_over_delay

variable drop_timer
variable drop_delay
variable game_over

( -- )
: trigger_game_over
    true game_over !
    120 game_over_delay !
;

( -- )
: set_drop_delay
    level @ 20 > if
        \ Max out speed
        1 drop_delay !
    else
        \ Set speed based on level
        level @ cells level_speed + @ drop_delay !
    then
;

( -- )
: try_complete_lines
    2 sfx
    check_finished dup if

        3 sfx
        dup total_lines +!

        \ Compute score increment based on number of lines cleared.
        cells score_table + 1 - @

        \ Add to score
        score +!

        \ Set current level
        total_lines @ 10 / 1 + level !

        \ Update drop delay
        set_drop_delay

        update_score_str

        \ Kick off animation. Don't add the new piece here, but wait for the
        \ animation to finish.
        1 blink_counter !
    else
        drop \ Clear extra finished line count

        \ Start new piece
        new_piece
        piece_collides if
            trigger_game_over
        then
    then
;

( -- )
: rotate_cw rotation @ 1 + 3 and rotation ! ;

( -- )
: rotate_ccw rotation @ 3 + 3 and rotation ! ;

( -- )
: move_left -1 piece_x +! ;

( -- )
: move_right 1 piece_x +! ;

( -- )
: move_down 1 piece_y +! ;

( -- )
: move_up -1 piece_y +! ;

( -- hit_bottom )
: try_drop_piece
    move_down
    piece_collides if
        \ Hit bottom and can no longer fall.
        move_up \ Restore to place before collision
        lock_piece
        try_complete_lines
        true
    else
        false
    then
;

( -- )
: fast_drop_piece
    begin
        try_drop_piece 0=
    while repeat
;


\ We check if the movement is legal by first moving to the new
\ position and then checking if pieces are either out of bounds
\ or intersecting existing blocks. If so, we undo the movement.
( -- )
: move_piece
    check_buttons

    \ top of stack is now buttons that have been pressed
    \ Check left
    dup BUTTON_L and piece_x @ 0 > and if
        move_left
        piece_collides if
            \ Collision, undo action
            move_right
        else
            1 sfx
        then
    then

    \ Check right
    dup BUTTON_R and if
        piece_x @ WELL_WIDTH < if
            move_right
            piece_collides if
                \ Collision, undo action
                move_left
            else
                1 sfx
            then
        then
    then

    \ Check A button, which rotates the piece.
    dup BUTTON_A and if
        rotate_cw
        piece_collides if
            \ Collision, undo action
            rotate_ccw
        else
            0 sfx
        then
    then

    \ Drop instantly
    BUTTON_U and if
        fast_drop_piece
    then

    \ Check down button, which speeds up the descent.
    \ Unlike the others, this can be held
    buttons BUTTON_D and if
        2 drop_timer +!
    then

    \ Handle normal falling
    1 drop_timer +!
    drop_timer @ drop_delay @ >= if
        0 drop_timer !
        try_drop_piece drop
    then
;

SCREEN_WIDTH 50 - constant STATUS_AREA_LEFT

( -- )
: draw_score
    C_WHITE set_color

    STATUS_AREA_LEFT 2 s" Score" draw_text
    STATUS_AREA_LEFT 12 score_str 6 draw_text
    STATUS_AREA_LEFT 22 s" Level" draw_text
    STATUS_AREA_LEFT 32 level_str 4 draw_text
    STATUS_AREA_LEFT 42 s" Lines" draw_text
    STATUS_AREA_LEFT 52 lines_str 4 draw_text
;

( piece_addr -- piece_addr )
: draw_next_block
    dup @ BLOCK_SIZE * STATUS_AREA_LEFT + 15 +      \ Read X
    over 4 + @  BLOCK_SIZE * 95 + \ Read Y

    next_pattern @ 1 - 1 1 false false draw_sprite
;

( -- )
: draw_next
    STATUS_AREA_LEFT 72 s" Next" draw_text

    next_shape @
    4 0 do
        draw_next_block 8 +
    loop
    drop
;

( -- )
: init_game
    false game_over !
    0 score !
    0 total_lines !
    1 level !

    0 drop_timer !
    set_drop_delay

    \ Clear the well data structure
    well_data
    WELL_WIDTH WELL_HEIGHT *
    erase

    finished_rows WELL_WIDTH erase

    \ Need to call this twice initially to initialize the next
    \ piece indicator properly.
    new_piece
    new_piece

    update_score_str
;

( -- )
: draw_frame
    \ Draw
    1 cls

    draw_well
    draw_score
    draw_next

    \ Draw the currently falling piece
    blink_counter @ 0= if
        draw_piece
    then

    game_over @ if
        C_BLACK set_color
        60 60 76 12 fill_rect
        C_WHITE set_color
        62 62 s" Game Over" draw_text

        game_over_delay @ if
            -1 game_over_delay +!
        else
            \ User can press a button to restart
            check_buttons if
                init_game
            then
        then
    else
        blink_counter @ if
            \ Peforming a blink animation sequence to remove rows.
            1 blink_counter +!
            blink_counter @ 6 / 1 and 0=  \ New blink state
            blink_state ! \ save new blink state

            \ Check if the animation sequence is finished.
            blink_counter @ 30 > if
                \ yes, so remove rows and start game again.
                new_piece
                piece_collides if
                    trigger_game_over
                then
                remove_finished_rows
                0 blink_counter !
            then
        else
            move_piece
        then
    then
;

init_game

(
--SPRITE DATA------
11111111111111111111111111111111111111111111111111111111000000000000000000000000000000000000000000000000000000000000000000000000
1ffaaaa11ff444411ff777711ff555511ff666611ff333311ff22221000000000000000000000000000000000000000000000000000000000000000000000000
1faaaaa11f4444411f7777711f5555511f6666611f3333311f222221000000000000000000000000000000000000000000000000000000000000000000000000
1aaaaaa1144444411777777115555551166666611333333112222221000000000000000000000000000000000000000000000000000000000000000000000000
1aaaaaa1144444411777777115555551166666611333333112222221000000000000000000000000000000000000000000000000000000000000000000000000
1aaaaaa1144444411777777115555551166666611333333112222221000000000000000000000000000000000000000000000000000000000000000000000000
1aaaaaa1144444411777777115555551166666611333333112222221000000000000000000000000000000000000000000000000000000000000000000000000
11111111111111111111111111111111111111111111111111111111
--SOUND DATA--------
0a01320032003c0000000000000000000000000000000000000000000000000000008000800080000000000000000000000000000000000000000000000000000000
0a013c000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000
01020b11211b13282513201105160000000000000000000000000000000000000000ffffc0c0c0c08080808080800000000000000000000000000000000000000000
0a014b374b37412341230000000000000000000000000000000000000000000000008080808080808080000000000000000000000000000000000000000000000000

)
