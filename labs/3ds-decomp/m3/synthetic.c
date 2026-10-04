#include <stdint.h>
__attribute__((noinline))
uint32_t mix_state(uint32_t value, uint32_t salt) {
    value ^= salt + 0x9e3779b9u;
    value ^= value >> 7u;
    value *= 33u;
    return value ^ (value << 5u);
}
__attribute__((noinline))
uint32_t puzzle_step(uint32_t current, uint32_t target, uint32_t moves) {
    uint32_t distance = current > target ? current - target : target - current;
    uint32_t mixed = mix_state(distance + moves, 0x13572468u);
    if (distance == 0u) return mixed ^ 0x55aa55aau;
    return mixed + distance * 29u;
}
__attribute__((noinline))
uint32_t save_checksum(uint32_t a, uint32_t b, uint32_t c) {
    return mix_state(a ^ c, b + 0x10203040u);
}
__attribute__((noreturn, used, section(".text.start")))
void _start(void) {
    volatile uint32_t state = puzzle_step(11u, 17u, 3u);
    state ^= save_checksum(state, 2u, 7u);
    (void)state;
    for (;;) __asm__ volatile ("nop");
}
