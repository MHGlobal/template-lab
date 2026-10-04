ENTRY(_start)

SECTIONS
{
  . = 0x00100000;

  .text : ALIGN(4)
  {
    KEEP(*(.text._start))
    KEEP(*(.text.puzzle_score))
    *(.text*)
  }

  .rodata : ALIGN(4)
  {
    *(.rodata*)
  }

  .data : ALIGN(4)
  {
    *(.data*)
  }

  .bss (NOLOAD) : ALIGN(4)
  {
    *(.bss*)
    *(COMMON)
  }

  /DISCARD/ :
  {
    *(.comment)
  }
}
