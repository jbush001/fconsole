1 constant BUTTON_L
2 constant BUTTON_R
4 constant BUTTON_U
8 constant BUTTON_D

8 constant box_size
4 constant well_x_offs
4 constant well_y_offs
10 constant well_width
15 constant well_height

create piece_l 0 , -1 , 0 , 0 , 0 , 1 , 1 , 1 ,
create piece_j 0 , -1 , 0 , 0 , 0 , 1 , -1 , 1 ,
create piece_i 0 , -2 , 0 , -1 , 0 , 0 , 0 , 1 ,
create piece_t -1 , 0 , 0 , 0 , 1 , 0 , 0 , 1 ,
create piece_o 0 , 0 , 1 , 0 , 1 , 1 , 0 , 1 ,
create piece_s -1 , 1 , 0 , 1 , 0 , 0 , 1 , 0 ,
create piece_z 1 , 1 , 0 , 1 , 0 , 0 , -1 , 0 ,
create pieces piece_l , piece_j , piece_i , piece_t , piece_o , piece_s , piece_z ,

create well_data well_width well_height * cells allot

create score_table 40 , 100 , 300 , 1200 ,
variable score


variable piece_x
variable piece_y
variable cur_shape
variable shape_color
variable rotation

: ++
    dup @ 1 + swap !
;

: --
    dup @ 1 - swap !
;

( x y -- x y )
: rotate
    rotation @ 1 = if
        \ x = y y = -x
        swap
        negate
    then
    rotation @ 2 = if
        \ x = -x  y = -y
        negate
        swap
        negate
        swap
    then
    rotation @ 3 = if
        \ x = -y y = x
        negate
        swap
    then
;

( piece_addr -- piece_addr )
: draw_square
    dup @      \ Read X
    over 4 + @ \ Read Y

    rotate

    \ Convert to screen locations
    piece_y @ + box_size * well_y_offs +
    swap
    piece_x @ + box_size * well_x_offs +
    swap

    7 7 fill_rect
;

: draw_piece
    cur_shape @
    draw_square 8 +
    draw_square 8 +
    draw_square 8 +
    draw_square
    drop
;

\ Given piece addr translate and rotate to
\ coords in grid
( piece_addr -- x y )
: transform_square_coords
    dup @      \ Read X
    over 4 + @ \ Read Y

    rotate

    \ Convert to screen locations
    piece_y @ +
    swap
    piece_x @ +
    swap
;

: lock_square
    transform_square_coords

    well_width * + cells \ Convert to array offset
    well_data +

    shape_color @ swap !
;

: lock_piece
    cur_shape @
    lock_square 8 +
    lock_square 8 +
    lock_square 8 +
    lock_square
    drop
;

variable collision

: check_square
    transform_square_coords

    ( x y )
    \ Check in bounds
    dup 0 < if
        1 collision !
        drop drop
        exit
    then

    dup well_height >= if
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

    dup well_width >= if
        1 collision !
        drop drop
        exit
    then

    swap
    well_width * + cells \ Convert to array offset
    well_data +
    @  \ Read
    if
        1 collision !
    then
;

: piece_collides
    0 collision !
    cur_shape @
    check_square 8 +
    check_square 8 +
    check_square 8 +
    check_square
    drop
    collision @
;

variable drop_timer

: new_piece
    random 7 mod
    dup

    1 + shape_color !

    cells pieces + @
    cur_shape !

    4 piece_x !
    2 piece_y !
;

variable x
variable y
variable blink_state
variable blink_counter
create finished_rows well_height cells allot

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
        y @ well_height <
    while
        \ If this row is finished, it will blink before being removed.
        \ Check if the row is blinking before drawing
        y @ cells finished_rows + @   ( Is this row set as finished )
        blink_state @ and             ( and we are the hide phase )
        0= if
            0 x !
            begin
                x @ well_width <
            while
                y @ well_width * x @ + cells well_data + @  \ read well block
                set_color

                x @ box_size * well_x_offs +
                y @ box_size * well_y_offs +
                7 7 fill_rect

                x ++
            repeat
        then
        y ++
    repeat
;

variable finished_row_count
variable row_is_finished

: check_finished
    well_height finished_rows zero_memory

    0 finished_row_count !
    0 y !
    begin
        y @ well_height <
    while
        1 row_is_finished !
        0 x !
        begin
            x @ well_width <
        while
            y @ well_width * x @ + cells well_data + @
            0= if
                0 row_is_finished !
            then

            x ++
        repeat

        row_is_finished @ if
            1 y @ cells finished_rows + !
            finished_row_count ++
        then

        y ++
    repeat

    finished_row_count @
;

variable dest_y

: remove_finished_rows
    \ Walk from bottom up
    well_height 1 -
    dup
    y !  \ Y is source address
    dest_y !

    begin
        y @ 0 >=
    while
        y @ cells finished_rows + @   ( Is this row set as finished )
        0= if
            \ Not eliminated, copy
            y @ well_width * cells well_data +  \ src
            dest_y @ well_width * cells well_data +  \ dest
            well_width \ count
            copy
            dest_y --
        then

        y --
    repeat

    \ Clear rows at top that are now exposed.
    dest_y @ well_width * cells
    well_data
    zero_memory
;

variable button_mask

: check_buttons
    \We only take action when the button transition
    \ from not pressed to pressed, so check if the button state
    \ has changed from the last frame.
    buttons dup                 ( buttons buttons )
    button_mask @ -1 xor and    ( ~button_mask & buttons )
    swap button_mask !          ( update button msak)
;

variable drop_delay
variable game_over

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
        piece_x @ well_width < if
            piece_x @ 1 + piece_x !
            piece_collides if
                \ Collision, undo action
                piece_x @ 1 - piece_x !
            then
        then
    then

    \ Check up (rotate)
    BUTTON_U and if
        rotation @ 1 + 3 and rotation !
        piece_collides if
            \ Collision, undo action
            rotation @ 3 + 3 and rotation !
        then
    then

    \ Check down. Unlike the others, this can be held
    buttons BUTTON_D and if
        drop_timer ++
    then

    drop_timer ++
    drop_timer @ drop_delay @ >= if
        0 drop_timer !
        piece_y @ 1 + piece_y !
        piece_collides if
            \ Hit bottom
            piece_y @ 1 - piece_y ! \ Restore to place before collision
            lock_piece
            check_finished dup if
                \ Update score based on number of lines cleared
                cells score_table + @
                score @ + score !
                score @ . \ print it for now (we can't draw text yet)

                \ If we finished a row, need to wait for blink animation
                \ to finish before adding new piece.
                1 blink_counter !
            else
                drop \ Clear extra finished line count

                \ carry on
                new_piece
                piece_collides if
                    1 game_over !
                then
            then
        then
    then
;


: init_game
    0 game_over !
    20 drop_delay !
    0 drop_timer !

    \ Clear the well data structure
    well_width well_height *
    well_data
    zero_memory

    well_width finished_rows zero_memory

    new_piece

    0 score !
;

: draw_frame
    game_over @ if
        \ User can press a button to restart
        check_buttons if
            init_game
        then
    else
        blink_counter @ if
            \ Peforming a blink animation sequence to remove rows.
            blink_counter ++
            blink_counter @ 6 / 1 and 0= blink_state !

            \ Check if the animation sequence is finished.
            blink_counter @ 30 > if
                \ yes, so remove rows and start game again.
                new_piece
                piece_collides if
                    1 game_over !
                then
                remove_finished_rows
                0 blink_counter !
            then
        else
            move_piece
        then
    then


    \ Draw
    0 cls

    draw_well

    \ Draw the currently drawing piece
    shape_color @ set_color
    blink_counter @ 0= if
        draw_piece
    then
;

init_game
