1 constant BUTTON_L
2 constant BUTTON_R
4 constant BUTTON_U
8 constant BUTTON_D

8 constant box_size
4 constant well_x_offs
4 constant well_y_offs
10 constant well_width
15 constant well_height

create piece_l -1 , -1 , -1 , 0 , -1 , 1 , 0 , 1 ,
create piece_j 1 , -1 , 1 , 0 , 1 , 1 , 0 , 1 ,
create piece_i 0 , -2 , 0 , -1 , 0 , 0 , 0 , 1 ,
create piece_t -1 , 0 , 0 , 0 , 1 , 0 , 0 , 1 ,
create piece_o 0 , 0 , 1 , 0 , 1 , 1 , 0 , 1 ,
create piece_s -1 , 1 , 0 , 1 , 0 , 0 , 1 , 0 ,
create piece_z 1 , 1 , 0 , 1 , 0 , 0 , -1 , 0 ,
create pieces piece_l , piece_j , piece_i , piece_t , piece_o , piece_s , piece_z ,

create well_data well_width well_height * cells allot

variable piece_x
variable piece_y
variable cur_shape
variable shape_color
variable rotation

variable seed

1 seed !

: random
    seed @ 1103515245 * 12345 +
    2147483647 and
    dup seed !
;

: negate
    0 swap -
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

variable counter

: ++
    dup @ 1 + swap !
;

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

: draw_well
    \ Draw the well sides
    7 set_color
    4 4 84 4 draw_line
    4 4 4 124 draw_line
    84 4 84 124 draw_line
    4 124 84 124 draw_line

    \ Draw locked pieces inside well
    0 y !
    begin
        y @ well_height <
    while
        0 x !
        begin
            x @ well_width <
        while
            y @ well_width * x @ + cells well_data + @  \ Address inside well data structure
            set_color

            x @ box_size * well_x_offs +
            y @ box_size * well_y_offs +
            7 7 fill_rect

            x ++
        repeat
        y ++
    repeat
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
        counter ++
    then

    counter ++
    counter @ drop_delay @ >= if
        0 counter !
        piece_y @ 1 + piece_y !
        piece_collides if
            \ Hit bottom
            piece_y @ 1 - piece_y !
            lock_piece
            new_piece
            piece_collides if
                1 game_over !
            then
        then
    then
;

( count address -- )
: zero_memory
    begin
        over 0 >
    while
        ( count well_data )
        dup 0 swap !        \ write 0
        4 +                 \ increment data pointer
        swap 1 - swap       \ decrement counter
    repeat
;

: init_game
    0 game_over !
    20 drop_delay !
    0 counter !

    \ Clear the well data structure
    well_width well_height *
    well_data
    zero_memory

    new_piece
;

: draw_frame
    game_over @ if
        \ User can press a button to restart
        check_buttons if
            init_game
        then
    else
        move_piece
    then

    \ Draw
    0 cls

    draw_well

    \ Draw the currently drawing piece
    shape_color @ set_color
    draw_piece
;

init_game
