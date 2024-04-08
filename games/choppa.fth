variable dir
variable anim_frame

\ Locations and speeds are stored as 28.4 fixed point values
16 constant FRAC_MULTIPLIER
SCREEN_HEIGHT 10 - FRAC_MULTIPLIER * constant MAX_YLOC

SCREEN_WIDTH 3 / dup constant L_SCROLL_THRESH 2 * constant R_SCROLL_THRESH
1024 constant MAX_SCROLL_WIDTH
MAX_SCROLL_WIDTH SCREEN_WIDTH + 16 - FRAC_MULTIPLIER * constant MAX_XLOC


32 constant CLOUD_WIDTH
7 constant NUM_CLOUDS
create cloud_x 100 , 200 , 270 , 500 , 750 , 800 , 1000 ,
create cloud_y 10 , 30 , 15 , 45 , 17 , 50 , 45 ,

variable xspeed
variable yloc
variable yspeed
variable xloc
variable scroll_offset
variable is_on_ground

: update_chopper
    \ Horizontal movement
    is_on_ground @ if
        \ Can't move horizontally while landed.
        0 xspeed !
    else
        buttons BUTTON_L and if
            0 dir !
            -1 xspeed +!
        else
            buttons BUTTON_R and if
                1 dir !
                1 xspeed +!
            else
                \ no buttons, decelerate
                xspeed @ 0 > if
                    -1 xspeed +!
                then
                xspeed @ 0 < if
                    1 xspeed +!
                then
            then
        then
    then

    \ Vertical movement
    buttons BUTTON_U and if
       \ Rise
       -1 yspeed +!
       false is_on_ground !
    else
        buttons BUTTON_D and if
            \ Descend
            1 yspeed +!
        else
            \ no buttons, decelerate
            yspeed @ 0 > if
                -1 yspeed +!
            then
            yspeed @ 0 < if
                1 yspeed +!
            then
        then
    then

    \ Update position
    xspeed @ xloc +!
    yspeed @ yloc +!

    \ Clamp so it can't go off screen
    xloc @ 0 < if
        0 xloc !
        0 xspeed !
    then

    yloc @ 0 < if
        0 yloc !
        0 yspeed !
    then

    xloc @ MAX_XLOC > if
        0 xspeed !
        MAX_XLOC xloc !
    then

    yloc @ MAX_YLOC > if
        \ Stop when we hit the ground
        0 yspeed !
        MAX_YLOC yloc !
        true is_on_ground !
    then

    \ Scroll
    xloc @ FRAC_MULTIPLIER / scroll_offset @ -  \ Compute current on-screen location
    dup L_SCROLL_THRESH < scroll_offset @ 0 > and if
        dup L_SCROLL_THRESH - scroll_offset +!
    then

    dup R_SCROLL_THRESH > scroll_offset @ MAX_SCROLL_WIDTH < and if
        dup R_SCROLL_THRESH - scroll_offset +!
    then
;

: draw_clouds
    \ Clouds
    NUM_CLOUDS 0 do
        i cells cloud_x + @ scroll_offset @ - \ Get x screen coordinate

        \ Do quick check if this is onscreen
        dup SCREEN_WIDTH <
        over CLOUD_WIDTH + 0 > and if
            i cells cloud_y + @  \ Y coordinate
            4 4 4 false false draw_sprite
        else
            drop
        then
    loop
;

: draw_frame
    update_chopper

    C_LIGHT_BLUE cls
    C_BLACK set_color
    0 SCREEN_HEIGHT 1 - SCREEN_WIDTH 1 - over draw_line

    draw_clouds

    \ Draw chopper
    xloc @ FRAC_MULTIPLIER / scroll_offset @ -
    yloc @ FRAC_MULTIPLIER /
    anim_frame @ if 2 else 0 then
    2 1
    dir @ false draw_sprite
    anim_frame @ 1 xor anim_frame !
;

: init
    0 dir !
    0 anim_frame !
    0 xspeed !
    0 yspeed !
    0 scroll_offset !
    MAX_YLOC yloc !
    64 FRAC_MULTIPLIER * xloc !
    true is_on_ground !
;

init


( sprite data ---xx--xxx----x-xxx----xxxx----x--
00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
11111111000000000000000111111110000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000001000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00000444400000000000044440000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00004744440000100000474444000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
00044444444441000004444444444410000000000000001111100000000000000000000000000000000000000000000000000000000000000000000000000000
00044444440000000004444444000000000000000000111fff111000000000000000000000000000000000000000000000000000000000000000000000000000
000044444000000000004444400000000000000000011ffffffff100000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000011fffffffff100000000000000000000000000000000000000000000000000000000000000000000000000
0000000000000000000000000000000000000111111ffffffffff111100000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000111ffffffffffffffffff111000000000000000000000000000000000000000000000000000000000000000000000
000000000000000000000000000000000011fffffffffffffffffffffff100000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000001fffffffffffffffffffffffff10000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000001fffffffffffffffffffffffff10000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000001fffffffffffffffffffffffff10000000000000000000000000000000000000000000000000000000000000000000
000000000000000000000000000000000001ffffffffffffffffffffffff10000000000000000000000000000000000000000000000000000000000000000000
000000000000000000000000000000000001ffffffffffffffffffffffff10000000000000000000000000000000000000000000000000000000000000000000
0000000000000000000000000000000000001ffffffffffffff111fffff100000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000001fff1111fffff100011111000000000000000000000000000000000000000000000000000000000000000000000
0000000000000000000000000000000000000011100011ff11100000000000000000000000000000000000000000000000000000000000000000000000000000
0000000000000000000000000000000000000000000001111
)
