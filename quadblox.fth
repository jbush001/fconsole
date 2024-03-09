1 constant BUTTON_L
2 constant BUTTON_R
4 constant BUTTON_U
8 constant BUTTON_D

8 constant box_size
4 constant well_x_offs
4 constant well_y_offs
10 constant well_width
16 constant well_height

create block_l -1 , -1 , -1 , 0 , -1 , 1 , 0 , 1 ,
create block_j 1 , -1 , 1 , 0 , 1 , 1 , 0 , 1 ,
create block_i 0 , -2 , 0 , -1 , 0 , 0 , 0 , 1 ,
create block_t -1 , 0 , 0 , 0 , 1 , 0 , 0 , 1 ,
create block_o 0 , 0 , 1 , 0 , 1 , 1 , 0 , 1 ,
create block_s -1 , 1 , 0 , 1 , 0 , 0 , 1 , 0 ,
create block_z 1 , 1 , 0 , 1 , 0 , 0 , -1 , 0 ,
create blocks block_l , block_j , block_i , block_t , block_o , block_s , block_z ,

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

( block_addr -- block_addr )
: square
    dup @      \ Read X
    over 4 + @ \ Read Y

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

variable counter

: ++
    dup @ 1 + swap !
;

: newBlock
    random 7 mod
    dup

    1 + shape_color !

    cells blocks + @
    cur_shape !

    5 block_x !
    3 block_y !
;

newBlock

: drawFrame
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
    then

    \ Check right
    dup BUTTON_R and if
        block_x @ well_width < if
            block_x @ 1 + block_x !
        then
    then

    \ Check up (rotate)
    BUTTON_U and if
        rotation @ 1 + 3 and rotation !
    then

    \ Check down. Unlike the others, this can be held
    buttons BUTTON_D and if
        counter ++
    then

    counter ++
    counter @ drop_delay @ >= if
        0 counter !
        block_y @ 1 + block_y !
        block_y @ well_height > if
            newBlock
        then
    then

    \ Draw
    0 cls
    shape_color @ setColor
    drawblock
;


