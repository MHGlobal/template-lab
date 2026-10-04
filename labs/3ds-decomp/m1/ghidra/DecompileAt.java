// Decompile one function at a known address from a stripped synthetic ARM ELF.
// @category 3DSDecompLab

import java.io.File;
import java.io.PrintWriter;

import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileOptions;
import ghidra.app.decompiler.DecompileResults;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Function;

public class DecompileAt extends GhidraScript {
    @Override
    protected void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length != 2) {
            throw new IllegalArgumentException(
                "Usage: DecompileAt.java <address> <output-file>"
            );
        }

        long offset = Long.decode(args[0]);
        Address target = currentProgram
            .getAddressFactory()
            .getDefaultAddressSpace()
            .getAddress(offset);

        Function function = getFunctionAt(target);
        if (function == null) {
            disassemble(target);
            function = createFunction(target, "puzzle_score_recovered");
        }

        if (function == null) {
            throw new IllegalStateException(
                "Could not create/find a function at " + target
            );
        }

        DecompInterface decompiler = new DecompInterface();
        DecompileOptions options = new DecompileOptions();
        decompiler.setOptions(options);
        decompiler.toggleCCode(true);
        decompiler.toggleSyntaxTree(true);

        if (!decompiler.openProgram(currentProgram)) {
            throw new IllegalStateException("Could not open program in decompiler");
        }

        DecompileResults results = decompiler.decompileFunction(
            function,
            60,
            monitor
        );

        if (!results.decompileCompleted()) {
            throw new IllegalStateException(
                "Decompilation failed: " + results.getErrorMessage()
            );
        }

        String code = results.getDecompiledFunction().getC();
        File output = new File(args[1]);
        File parent = output.getParentFile();
        if (parent != null) {
            parent.mkdirs();
        }

        try (PrintWriter writer = new PrintWriter(output, "UTF-8")) {
            writer.println("/* Synthetic ARM target; safe to publish. */");
            writer.println("/* Address: " + target + " */");
            writer.println(code);
        }

        println("Decompiled " + function.getName() + " at " + target);
        println("Output: " + output.getAbsolutePath());
    }
}
