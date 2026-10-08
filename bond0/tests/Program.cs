using System;
using Bond0Control;

static class Tests
{
    static int checks;

    static void Assert(bool predicate, string message)
    {
        checks++;
        if (!predicate) throw new Exception("TEST FAILED: " + message);
    }

    static void Main()
    {
        Assert(Math.Abs(BenchmarkCore.Mbps(1_000_000, 1) - 8) < 0.00001, "Mbps decimal");
        Assert(Math.Abs(BenchmarkCore.Mbps(4_194_304, 2.762588) - 12.14602) < 0.01, "observed download");
        Assert(Math.Abs(BenchmarkCore.JitterMs(new double[] {70, 80, 75}) - 7.5) < .0001, "jitter");
        Assert(BenchmarkCore.JitterMs(Array.Empty<double>()) == 0, "no jitter with zero replies");
        Assert(BenchmarkCore.LossPercent(20, 19) == 5.0, "loss 20/19");
        Assert(BenchmarkCore.LossPercent(6, 0) == 100.0, "total loss");
        Assert(BenchmarkCore.CsvEscape("A,B") == "\"A,B\"", "CSV delimiter escape");
        Assert(BenchmarkCore.CsvEscape("=cmd") == "\"'=cmd\"", "CSV formula injection prevention");
        Assert(BenchmarkCore.CsvEscape("abc\nbad") == "\"abc bad\"", "CSV newline escape");
        Assert(BenchmarkCore.CsvRow(new SpeedResult
        {
            TimestampUtc = new DateTime(2026,10,8,7,0,0,DateTimeKind.Utc),
            Profile = "A+B", PayloadBytes = 1048576, DownloadMbps = 12,
            UploadMbps = 3, LatencyMs = 83, JitterMs = 7, LossPercent = 5,
            ReceivedPings = 19, SentPings = 20
        }).Contains("\"A+B\",1048576,12.000"), "result CSV format");
        BenchmarkCore.ValidatePayload(1048576);
        checks++;
        bool rejected = false;
        try { BenchmarkCore.ValidatePayload(10_000_000); }
        catch (ArgumentOutOfRangeException) { rejected = true; }
        Assert(rejected, "reject excessive bytes");
        Console.WriteLine("Bond0 benchmark core: " + checks + " checks PASS");
    }
}
