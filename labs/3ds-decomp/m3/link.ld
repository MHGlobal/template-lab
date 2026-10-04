ENTRY(_start)
SECTIONS
{
  . = 0x00100000;
  .text : ALIGN(4) { KEEP(*(.text.start)) *(.text*) }
  /DISCARD/ : { *(.ARM.exidx*) *(.ARM.extab*) *(.comment) *(.note*) }
}
