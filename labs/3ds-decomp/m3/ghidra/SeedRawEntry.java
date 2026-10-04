// @category 3DSDecompLab
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Function;

public class SeedRawEntry extends GhidraScript {
    @Override
    protected void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length != 1) throw new IllegalArgumentException("Usage: SeedRawEntry.java <address>");
        long offset = Long.decode(args[0]);
        Address entry = currentProgram.getAddressFactory().getDefaultAddressSpace().getAddress(offset);
        if (!disassemble(entry)) throw new IllegalStateException("Could not disassemble " + entry);
        Function f = getFunctionAt(entry);
        if (f == null) f = createFunction(entry, "entry_seed");
        if (f == null) throw new IllegalStateException("Could not create function at " + entry);
        println("Seeded raw ARM entry at " + entry);
    }
}
