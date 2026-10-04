#include <stdint.h>

__attribute__((noinline))
static uint32_t clamp_moves(uint32_t value) {
    if (value > 999u) {
        return 999u;
    }
    return value;
}

/*
 * Reconstructed form of the synthetic target function.
 * The names/comments intentionally differ from the original source while
 * preserving the control flow and arithmetic that the ARM compiler sees.
 */
__attribute__((noinline, used))
uint32_t puzzle_score(uint32_t blocks_now, uint32_t blocks_goal, uint32_t moves) {
    uint32_t delta;

    if (blocks_now > blocks_goal) {
        delta = blocks_now - blocks_goal;
    } else {
        delta = blocks_goal - blocks_now;
    }

    if (delta == 0u) {
        return 1000u - clamp_moves(moves);
    }

    return (delta * 37u) + (moves & 31u);
}
