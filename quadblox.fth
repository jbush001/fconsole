

create block_l -1 , -1 , -1 , 0 , -1 , 1 , 0 , 1 ,
create block_j 1 , -1 , 1 , 0 , 1 , 1 , 0 , 1 ,
create block_i 0 , -2 , 0 , -1 , 0 , 0 , 0 , 1 ,
create block_t -1 , 0 , 0 , 0 , 1 , 0 , 0 , 1 ,
create block_o 0 , 0 , 1 , 0 , 1 , 1 , 0 , 1 ,
create block_s -1 , 1 , 0 , 1 , 0 , 0 , 1 , 0 ,
create block_z 1 , 1 , 0 , 1 , 0 , 0 , -1 , 0 ,
create blocks block_l , block_j , block_i , block_t , block_o , block_s , block_z ,

8 constant box_size

( x y block_addr -- x y block_addr )
: square
    dup @ box_size *         ( x y block_addr xoffs )
    over 4 + @ box_size *    ( x y block_addr xoffs yoffs )
    4 pick +                 ( x y block_addr xoffs ypos )
    over 6 pick +            ( x y block_addr xoffs ypos xpos )
    swap 7 7 fillRect ( x y block_addr xoffs )
    drop
;

( x y block_addr -- )
: drawblock
    square 8 +
    square 8 +
    square 8 +
    square
    drop drop drop
;

: init
;

variable counter

: ++
    dup @ 1 + swap !
;

: drawFrame

    0 cls

    64 64

    counter ++
    counter @ 16 / 7 mod
    dup 1 +
    setColor

    cells blocks + @
    drawblock
;


