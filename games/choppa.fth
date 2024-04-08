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

10 constant MAX_PEOPLE
create person_x MAX_PEOPLE cells allot
create person_active MAX_PEOPLE cells allot

variable xspeed
variable yloc
variable yspeed
variable xloc
variable scroll_offset
variable is_on_ground
variable people_on_board

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

        \ Do check if this is onscreen
        dup SCREEN_WIDTH <
        over CLOUD_WIDTH + 0 > and if
            i cells cloud_y + @  \ Y coordinate
            4 4 4 false false draw_sprite
        else
            drop
        then
    loop
;

: update_people
    MAX_PEOPLE 0 do
        i cells person_active + @ if
            i cells person_x + @ scroll_offset @ - \ x coord

            \ Do check if this is onscreen
            dup SCREEN_WIDTH <
            over 8 + 0 > and if
                SCREEN_HEIGHT 9 - \ y coord
                8 1 1 false false draw_sprite

                \ If on screen and the chopper is landed, people will run towards it
                is_on_ground @ if
                    \ Check with direction to move
                    i cells person_x + @ xloc @ FRAC_MULTIPLIER /
                    dup2 = if
                        \ Person boarded chopper
                        drop drop
                        false i cells person_active + !
                        1000 5 beep
                        1 people_on_board +!
                        people_on_board @ .
                    else
                        > if
                            -1
                        else
                            1
                        then
                        i cells person_x + +!
                    then
                then
            else
                drop
            then
        then
    loop
;

variable temp_digits

( x y number -- )
\ Number must be 0-99
: display_number
    dup 10 / char 0 + temp_digits c!
    10 mod char 0 + temp_digits 1 + c!
    temp_digits 2 draw_text
;

: draw_frame
    update_chopper

    C_LIGHT_BLUE cls
    C_BLACK set_color
    0 SCREEN_HEIGHT 1 - SCREEN_WIDTH 1 - over draw_line

    draw_clouds

    update_people

    10 2 people_on_board @ display_number

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
    0 people_on_board !

    MAX_PEOPLE 0 do
        i cells
        dup person_x + random MAX_SCROLL_WIDTH 150 - mod 150 + swap !
        person_active + true swap !
    loop
;

init


( sprite data ---xx--xxx----x-xxx----xxxx----x--
00000000000000000000000000000000000000000000000000000000000000000001100000000000000000000000000000000000000000000000000000000000
1111111100000000000000011111111000000000000000000000000000000000000cc00000000000000000000000000000000000000000000000000000000000
000000010000000000000001000000000000000000000000000000000000000000cccc0000000000000000000000000000000000000000000000000000000000
00000444400000000000044440000000000000000000000000000000000000000c0cc0c000000000000000000000000000000000000000000000000000000000
0000474444000010000047444400010000000000000000000000000000000000000cc00000000000000000000000000000000000000000000000000000000000
000444444444410000044444444444100000000000000011111000000000000000cccc0000000000000000000000000000000000000000000000000000000000
00044444440000000004444444000000000000000000111fff1110000000000000c00c0000000000000000000000000000000000000000000000000000000000
000044444000000000004444400000000000000000011ffffffff1000000000000c00c0000000000000000000000000000000000000000000000000000000000
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
