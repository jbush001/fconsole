1 constant BUTTON_L
2 constant BUTTON_R
4 constant BUTTON_U
8 constant BUTTON_D

8 constant box_size
4 constant well_x_offs
4 constant well_y_offs
10 constant well_width
15 constant well_height

create block_l -1 , -1 , -1 , 0 , -1 , 1 , 0 , 1 ,
create block_j 1 , -1 , 1 , 0 , 1 , 1 , 0 , 1 ,
create block_i 0 , -2 , 0 , -1 , 0 , 0 , 0 , 1 ,
create block_t -1 , 0 , 0 , 0 , 1 , 0 , 0 , 1 ,
create block_o 0 , 0 , 1 , 0 , 1 , 1 , 0 , 1 ,
create block_s -1 , 1 , 0 , 1 , 0 , 0 , 1 , 0 ,
create block_z 1 , 1 , 0 , 1 , 0 , 0 , -1 , 0 ,
create blocks block_l , block_j , block_i , block_t , block_o , block_s , block_z ,

create well_data well_width well_height * cells allot

variable block_x
variable block_y
variable cur_shape
variable shape_color
variable rotation

variable seed
variable button_mask
variable drop_delay

20 drop_delay !

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

( block_addr -- block_addr )
: square
    dup @      \ Read X
    over 4 + @ \ Read Y

    rotate

    \ Convert to screen locations
    block_y @ + box_size * well_y_offs +
    swap
    block_x @ + box_size * well_x_offs +
    swap

    7 7 fillRect
;

: drawblock
    cur_shape @
    square 8 +
    square 8 +
    square 8 +
    square
    drop
;

\ Given block addr translate and rotate to
\ coords in grid
( block_addr -- x y )
: transform_square_coords
    dup @      \ Read X
    over 4 + @ \ Read Y

    rotate

    \ Convert to screen locations
    block_y @ +
    swap
    block_x @ +
    swap
;

: lock_square
    transform_square_coords

    well_width * + cells \ Convert to array offset
    well_data +

    shape_color @ swap !
;

: lock_block
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

: block_collides
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

: new_block
    random 7 mod
    dup

    1 + shape_color !

    cells blocks + @
    cur_shape !

    5 block_x !
    3 block_y !
;

new_block

variable x
variable y

: draw_well
    \ Draw the well sides
    7 setColor
    4 4 84 4 drawLine
    4 4 4 124 drawLine
    84 4 84 124 drawLine
    4 124 84 124 drawLine

    \ Draw locked blocks inside well
    0 y !
    begin
        y @ well_height <
    while
        0 x !
        begin
            x @ well_width <
        while
            y @ well_width * x @ + cells well_data + @  \ Address inside well data structure
            setColor

            x @ box_size * well_x_offs +
            y @ box_size * well_y_offs +
            7 7 fillRect

            x ++
        repeat
        y ++
    repeat
;

: move_block
    \ Controls. We only take action when the button transition
    \ from not pressed to pressed, so check if the button state
    \ has changed from the last frame.
    buttons dup                 ( buttons buttons )
    button_mask @ -1 xor and    ( ~button_mask & buttons )
    swap button_mask !          ( update button msak)

    \ top of stack is now buttons that have been pressed
    \ Check left
    dup BUTTON_L and block_x @ 0 > and if
        block_x @ 1 - block_x !
        block_collides if
            \ Collision, undo action
            block_x @ 1 + block_x !
        then
    then

    \ Check right
    dup BUTTON_R and if
        block_x @ well_width < if
            block_x @ 1 + block_x !
            block_collides if
                \ Collision, undo action
                block_x @ 1 - block_x !
            then
        then
    then

    \ Check up (rotate)
    BUTTON_U and if
        rotation @ 1 + 3 and rotation !
        block_collides if
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
        block_y @ 1 + block_y !
        block_collides if
            \ Hit bottom
            block_y @ 1 - block_y !
            lock_block
            new_block
        then
    then
;

: drawFrame
    move_block

    \ Draw
    0 cls

    draw_well

    \ Draw the currently drawing piece
    shape_color @ setColor
    drawblock
;


