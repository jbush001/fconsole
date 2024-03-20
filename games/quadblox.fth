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
4 constant WELL_X_OFFS
4 constant WELL_Y_OFFS
10 constant WELL_WIDTH
15 constant WELL_HEIGHT

\ Each piece consits of four blocks. Each block is stored here
\ as an X and Y offset from the pivot point.
create piece_l 0 , -1 , 0 , 0 , 0 , 1 , 1 , 1 ,
create piece_j 0 , -1 , 0 , 0 , 0 , 1 , -1 , 1 ,
create piece_i 0 , -1 , 0 , 0 , 0 , 1 , 0 , 2 ,
create piece_t -1 , 0 , 0 , 0 , 1 , 0 , 0 , -1 ,
create piece_o 0 , -1 , 1 , -1 , 1 , 0 , 0 , 0 ,
create piece_s -1 , 0 , 0 , 0 , 0 , -1 , 1 , -1 ,
create piece_z 1 , 0 , 0 , 0 , 0 , -1 , -1 , -1 ,
create pieces piece_l , piece_j , piece_i , piece_t , piece_o , piece_s , piece_z ,

create piece_colors 10 , 4 , 7 , 5 , 6 , 3 , 2 ,

\ Track which blocks in the well have pieces in them. This only tracks pieces
\ that have fallen in the well, not the currently dropping pieces.
create well_data WELL_WIDTH WELL_HEIGHT * cells allot

\ Score increment for number of rows cleared.
create score_table 40 , 100 , 300 , 1200 ,
variable score
variable total_lines

\ Information about currently dropping piece.
variable piece_x
variable piece_y
variable cur_shape
variable shape_color
variable rotation
variable next_shape
variable next_color

\ Given an X and Y coordinate, rotate it according to current piece
\ rotation.
( x y -- x y )
: rotate
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

    rotate

    \ Convert to screen locations
    piece_y @ + BLOCK_SIZE * WELL_Y_OFFS +
    swap
    piece_x @ + BLOCK_SIZE * WELL_X_OFFS +
    swap

    7 7 fill_rect
;

: draw_piece
    shape_color @ set_color
    cur_shape @
    draw_block 8 +
    draw_block 8 +
    draw_block 8 +
    draw_block
    drop
;

\ Given piece addr translate and rotate to
\ coords in grid
( piece_addr -- x y )
: transform_block_coords
    dup @      \ Read X
    over 4 + @ \ Read Y

    rotate

    \ Convert to screen locations
    piece_y @ +
    swap
    piece_x @ +
    swap
;

: lock_block
    transform_block_coords

    WELL_WIDTH * + cells \ Convert to array offset
    well_data +

    shape_color @ swap !
;

\ When a piece cannot fall any more, copy its blocks
\ into the well grid.
: lock_piece
    cur_shape @
    lock_block 8 +
    lock_block 8 +
    lock_block 8 +
    lock_block
    drop
;

variable collision

: block_collides
    transform_block_coords

    ( x y )
    \ Check in bounds
    dup 0 < if
        1 collision !
        drop drop
        exit
    then

    dup WELL_HEIGHT >= if
        1 collision !
        drop drop
        exit
    then

    swap

    dup 0 < if
        1 collision !
        drop drop
        exit
    then

    dup WELL_WIDTH >= if
        1 collision !
        drop drop
        exit
    then

    swap
    WELL_WIDTH * + cells \ Convert to array offset
    well_data +
    @  \ Read
    if
        1 collision !
    then
;

: piece_collides
    0 collision !
    cur_shape @
    block_collides 8 +
    block_collides 8 +
    block_collides 8 +
    block_collides
    drop
    collision @
;

: new_piece
    \ Copy next piece to current.
    next_shape @ cur_shape !
    next_color @ shape_color !
    4 piece_x !
    2 piece_y !

    \ Set next piece
    random 7 mod
    dup cells piece_colors + @ next_color !

    cells pieces + @
    next_shape !
;

variable x
variable y
variable blink_state
variable blink_counter
create finished_rows WELL_HEIGHT cells allot

: draw_well
    \ Draw the well sides
    7 set_color
    3 3 84 3 draw_line
    3 3 3 124 draw_line
    84 3 84 124 draw_line
    3 124 84 124 draw_line

    \ Draw locked pieces inside well
    0 y !
    begin
        y @ WELL_HEIGHT <
    while
        \ If this row is finished, it will blink before being removed.
        \ Check if the row is blinking before drawing
        y @ cells finished_rows + @   ( Is this row set as finished )
        blink_state @ and             ( and we are the hide phase )
        0= if
            0 x !
            begin
                x @ WELL_WIDTH <
            while
                y @ WELL_WIDTH * x @ + cells well_data + @  \ read well block
                dup if
                    set_color

                    x @ BLOCK_SIZE * WELL_X_OFFS +
                    y @ BLOCK_SIZE * WELL_Y_OFFS +
                    7 7 fill_rect
                else
                    drop
                then

                1 x +!
            repeat
        then
        1 y +!
    repeat
;

variable finished_row_count
variable row_is_finished

\ Check if any rows have all of their columns filled and
\ need to disappear.
: check_finished
    finished_rows WELL_HEIGHT zero_memory

    0 finished_row_count !
    0 y !
    begin
        y @ WELL_HEIGHT <
    while
        1 row_is_finished !
        0 x !
        begin
            x @ WELL_WIDTH <
        while
            y @ WELL_WIDTH * x @ + cells well_data + @
            0= if
                0 row_is_finished !
            then

            1 x +!
        repeat

        row_is_finished @ if
            1 y @ cells finished_rows + !
            1 finished_row_count +!
        then

        1 y +!
    repeat

    finished_row_count @
;

variable dest_y

\ Copy rows down to fill spaces left by rows that have been completed.
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
            y @ WELL_WIDTH * cells well_data +  \ src
            dest_y @ WELL_WIDTH * cells well_data +  \ dest
            WELL_WIDTH \ count
            copy_memory
            -1 dest_y +!
        then

        -1 y +!
    repeat

    \ Clear rows at top that are now exposed.
    well_data
    dest_y @ WELL_WIDTH * cells
    zero_memory
;

variable button_mask

: check_buttons
    \ We only take action when the button transition
    \ from not pressed to pressed, so check if the button state
    \ has changed from the last sample.
    buttons dup                 ( buttons buttons )
    button_mask @ -1 xor and    ( ~button_mask & buttons )
    swap button_mask !          ( update button msak)
;

48 constant '0'

\ Convert an integer value into ascii
\ ( strptr value count -- )
: itoa
    rot over + 1 -  ( value count endptr)
    begin
        over
    while
        rot   ( count endptr value)
        dup 10 mod '0' + ( count endptr value digit )
        3 pick c! ( count endptr value )
        10 /
        -rot 1 - ( value count endptr )
        swap 1 - swap
    repeat
;

create score_str 8 allot
create lines_str 4 allot

\ We only convert the numeric scores to strings when the change,
\ as an optimization.
: update_score_str
    \ There's a divide by four since copy_memory works in
    \ terms of words, not bytes.
    score_str score @ 6 itoa
    lines_str total_lines @ 4 itoa
;

\ Minimum time to display game over screen. User can hit any key
\ to restart after a game over, but it's possible they inadvertently
\ do it if they are mashing buttons.
variable game_over_delay
variable drop_timer
variable drop_delay
variable game_over

: trigger_game_over
    1 game_over !
    120 game_over_delay !
;

\ We check if the movement is legal by first moving to the new
\ position and then checking if pieces are either out of bounds
\ or intersecting existing blocks. If so, we undo the movement.
: move_piece
    check_buttons

    \ top of stack is now buttons that have been pressed
    \ Check left
    dup BUTTON_L and piece_x @ 0 > and if
        piece_x @ 1 - piece_x !
        piece_collides if
            \ Collision, undo action
            piece_x @ 1 + piece_x !
        then
    then

    \ Check right
    dup BUTTON_R and if
        piece_x @ WELL_WIDTH < if
            piece_x @ 1 + piece_x !
            piece_collides if
                \ Collision, undo action
                piece_x @ 1 - piece_x !
            then
        then
    then

    \ Check up button, which rotates the piece.
    BUTTON_A and if
        rotation @ 1 + 3 and rotation !
        piece_collides if
            \ Collision, undo action
            rotation @ 3 + 3 and rotation !
        then
    then

    \ Check down button, which speeds up the descent.
    \ Unlike the others, this can be held
    buttons BUTTON_D and if
        1 drop_timer +!
    then

    \ Handle falling
    1 drop_timer +!
    drop_timer @ drop_delay @ >= if
        0 drop_timer !
        piece_y @ 1 + piece_y !
        piece_collides if
            \ Hit bottom and can no longer fall.
            piece_y @ 1 - piece_y ! \ Restore to place before collision
            lock_piece
            check_finished dup if
                dup total_lines +!

                \ Update score based on number of lines cleared
                cells score_table + 1 - @
                score @ + score !

                update_score_str

                \ Kick off animation. We don't add the new piece here because
                \ we need to wait for the animation to finish.
                1 blink_counter !
            else
                drop \ Clear extra finished line count

                \ carry on
                new_piece
                piece_collides if
                    trigger_game_over
                then
            then
        then
    then
;

: draw_score
    15 set_color

    90 10 s" Score" draw_text
    90 20 score_str 6 draw_text
    90 30 s" Lines" draw_text
    90 40 lines_str 4 draw_text
;

( piece_addr -- piece_addr )
: draw_next_block
    dup @ BLOCK_SIZE * 100 +       \ Read X
    over 4 + @  BLOCK_SIZE * 80 + \ Read Y

    7 7 fill_rect
;

: draw_next
    90 60 s" Next" draw_text

    next_color @ set_color
    next_shape @
    draw_next_block 8 +
    draw_next_block 8 +
    draw_next_block 8 +
    draw_next_block
    drop
;

: init_game
    0 game_over !
    20 drop_delay !
    0 drop_timer !

    \ Clear the well data structure
    well_data
    WELL_WIDTH WELL_HEIGHT *
    zero_memory

    finished_rows WELL_WIDTH zero_memory

    \ Need to call this twice initially to initialize the next
    \ piece indicator properly.
    new_piece
    new_piece

    0 score !
    0 total_lines !
    update_score_str
;

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
        1 set_color
        18 64 58 16 fill_rect
        15 set_color 
        20 74 s" Game Over" draw_text

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
            blink_counter @ 6 / 1 and 0= blink_state !

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

( sprite data ---xx--xxx----x-xxx----xxxx----x--
0
)
