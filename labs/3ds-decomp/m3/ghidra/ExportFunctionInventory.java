// @category 3DSDecompLab
import java.io.File;
import java.io.PrintWriter;
import java.math.BigInteger;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.lang.Register;
import ghidra.program.model.listing.Function;
import ghidra.program.model.listing.FunctionIterator;

public class ExportFunctionInventory extends GhidraScript {
    private String csv(String value) { return "\"" + value.replace("\"", "\"\"") + "\""; }
    @Override
    protected void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length != 1) throw new IllegalArgumentException("Usage: ExportFunctionInventory.java <output-csv>");
        File output = new File(args[0]);
        if (output.getParentFile() != null) output.getParentFile().mkdirs();
        Register tMode = currentProgram.getLanguage().getRegister("TMode");
        int count = 0;
        try (PrintWriter w = new PrintWriter(output, "UTF-8")) {
            w.println("Location,Name,Mode,Size,Segment");
            FunctionIterator it = currentProgram.getFunctionManager().getFunctions(true);
            for (Function f : it) {
                if (f.isExternal()) continue;
                long address = f.getEntryPoint().getOffset();
                long size = f.getBody().getNumAddresses();
                String mode = "$a";
                if (tMode != null) {
                    BigInteger v = currentProgram.getProgramContext().getValue(tMode, f.getEntryPoint(), false);
                    if (BigInteger.ONE.equals(v)) mode = "$t";
                }
                w.printf("%08x,%s,%s,%08x,%s%n", address, csv(f.getName()), mode, size, csv(".text"));
                count++;
            }
        }
        println("Exported " + count + " functions");
    }
}
