\ This file is used to edit the built-in system font.

8 constant CHAR_WIDTH
8 constant CHAR_HEIGHT

: draw_frame
    0 cls
    16 0 do
        16 0 do
            i CHAR_WIDTH * j CHAR_HEIGHT * i j 16 * + 1 1 false false draw_sprite
        loop
    loop
;

(
--SPRITE DATA------
00000000000220000022022000000000000220000000022000222000000220000022000000022000020202000000000000000000000000000000000000000000
00000000000220000022022002202200002222202200220022000220000220000220000000002200002220000000000000000000000000000000000000000220
00000000000220000022022022222220020220000002200022000220000000000220000000002200022222000002000000000000000000000000000000002200
00000000000220000000000002202200002222000022000000220000000000000220000000002200002220000002000000000000000000000000000000022000
00000000000220000000000002202200000220200220000022002200000000000220000000002200020202000222220000000000002220000000000000220000
00000000000000000000000022222220022222002200022022002000000000000220000000002200000000000002000000020000000000000000000002200000
00000000000220000000000002202200000220000000000000220200000000000022000000022000000000000002000000200000000000000002000022000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
02222200002220000022220002222200220022002222222002222200222222200222220002222200000000000000000000022000000000000022000002222200
22000220000220000220022022000220220022002200000022000220000002202200022022000220000000000000000000220000000000000002200022000220
22000220000220000000022000000220220022002200000022000000000002202200022022000220000200000002200002200000000000000000220022000220
22000220000220000022220000002200220022002222220022222200000022000222220022000220000000000000000022000000002222000000022000002200
22000220000220000220000000000220222222200000022022000220000220002200022002222220000000000000000002200000000000000000220000022000
22000220000220000220000022000220000022002200022022000220002200002200022000000220000200000002200000220000002222000002200000000000
02222200002222000222222002222200000022000222220002222200002200000222220002222200000000000022000000022000000000000022000000022000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000002220002222220002222200222222002222222022222220022222002200022022222200000022002200022022000000220002202200022002222200
00000000022022002200022022000220220002202200000022000000220002202200022000220000000022002200220022000000222022202220022022000220
00000000220002202200022022000000220002202200000022000000220000002200022000220000000022002202200022000000222222202222022022000220
00000000220002202222220022000000220002202222000022220000220022202222222000220000000022002222000022000000220202202222222022000220
00000000222222202200022022000000220002202200000022000000220002202200022000220000220022002202200022000000220002202202222022000220
00000000220002202200022022000220220002202200000022000000220002202200022000220000220022002200220022000000220002202200222022000220
00000000220002202222220002222200222222002222222022000000022222002200022022222200022220002200022022222220220002202200022002222200
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
22222000022222002222220002222200022222202200022022000220220002202200022022002200222222200022200000000000002220000002000000000000
22002200220002202200022022000220000220002200022022000220220002200220220022002200000022200022000022000000000220000020200000000000
22002200220002202200022022000000000220002200022022000220220002200022200022002200000222000022000002200000000220000200020000000000
22002200220002202222220002222200000220002200022022000220220202200002000002222000002220000022000000220000000220000000000000000000
22222000220022202202200000000220000220002200022002202200222222200022200000220000022200000022000000022000000220000000000000000000
22000000220002002200220022000220000220002200022000222000222022200220220000220000222000000022000000002200000220000000000000000000
22000000022220202200022002222200000220000222220000020000220002202200022000220000222222200022200000000220002220000000000022222220
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000220000000000000000002200000000000022200000000000220000000000000000000000000000000022000000000000000000000000000
00220000000000000220000000000000000002200000000000220220000000000220000000022000000220000220000000022000000000000000000000000000
00022000002222000222200000222200002222200022220000220000002220000220000000000000000000000220220000022000222222002222200002222000
00000000000002200220220002200220022002200220022002222000022022000222200000022000000220000222200000022000220202202200220022002200
00000000002222200220220002200000022002200222220000220000022022000220220000022000000220000222000000022000220202202200220022002200
00000000022002200220220002200220022002200220000000220000002222000220220000022000000220000222200000022000220202202200220022002200
00000000002222200222200000222200002222200022220000220000000022000220220000022000220220000220220000022000220002202200220002222000
00000000000000000000000000000000000000000000000000000000022220000000000000000000022200000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000220000022000002200000000000000000000
00000000000000000000000000000000000220000000000000000000000000000000000000000000000000000022000000022000000220000222000000000000
02222200002222200220220000222200002222000220022002200220220002202200022002200220022222200022000000022000000220002202202000000000
02200220022002200222000002200000000220000220022002200220220202200220220002200220000022000000220000022000002200000000222000000000
02200220022002200220000000222200000220000220022002200220220202200022200000222220000220000022000000022000000220000000000000000000
02222200002222200220000000000220000220000220022000222200220202200220220000000220002200000022000000022000000220000000000000000000
02200000000002200220000002222200000022000022220000022000002020002200022000000220022222200000220000022000002200000000000000000000
02200000000002200000000000000000000000000000000000000000000000000000000000222
--SOUND DATA--------

)
