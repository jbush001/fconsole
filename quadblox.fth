: begindata here @ ;

: enddata
  create
  ' lit ,
  ,
  ' exit ,
;

begindata -1 , -1 , -1 , 0 , -1 , 1 , 0 , 1 , enddata block_l
begindata 1 , -1 , 1 , 0 , 1 , 1 , 0 , 1 , enddata block_j
begindata 0 , -2 , 0 , -1 , 0 , 0 , 0 , 1 , enddata block_i
begindata -1 , 0 , 0 , 0 , 1 , 0 , 0 , 1 , enddata block_t
begindata 0 , 0 , 1 , 0 , 1 , 1 , 0 , 1 , enddata block_o
begindata -1 , 1 , 0 , 1 , 0 , 0 , 1 , 0 , enddata block_s
begindata 1 , 1 , 0 , 1 , 0 , 0 , -1 , 0 , enddata block_z
begindata block_l , block_j , block_i , block_t , block_o , block_s , block_z , enddata blocks

8 cells allot constant currentblock

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


