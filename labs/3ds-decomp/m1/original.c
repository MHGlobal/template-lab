#include <stdint.h>

__attribute__((noinline))
static uint32_t clamp_moves(uint32_t moves) {
    return moves > 999u ? 999u : moves;
}

__attribute__((noinline, used))
uint32_t puzzle_score(uint32_t pushed, uint32_t required, uint32_t moves) {
    uint32_t distance;

    if (pushed > required) {
        distance = pushed - required;
    } else {
        distance = required - pushed;
    }

    if (distance == 0u) {
        return 1000u - clamp_moves(moves);
    }

    return (distance * 37u) + (moves & 31u);
}

__attribute__((noreturn, used))
void _start(void) {
    volatile uint32_t score = puzzle_score(7u, 7u, 23u);
    (void)score;

    for (;;) {
        __asm__ volatile ("nop");
    }
}
