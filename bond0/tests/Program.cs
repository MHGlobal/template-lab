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
        var original = new SpeedResult {
            TimestampUtc = DateTime.UtcNow, Profile = "Ethernet, USB",
            PayloadBytes = 1048576, DownloadMbps = 12.125, UploadMbps = 6.375,
            LatencyMs = 83, JitterMs = 7.5, LossPercent = 5, ReceivedPings = 19, SentPings = 20
        };
        var row = BenchmarkCore.CsvRow(original);
        Assert(BenchmarkCore.TryParseCsvRow(row, out var parsed) &&
            parsed.Profile == "Ethernet, USB" &&
            Math.Abs(parsed.DownloadMbps - 12.125) < 0.00001, "CSV roundtrip");
        Assert(!BenchmarkCore.TryParseCsvRow("\"bad,rows", out _), "reject unclosed quote");
        Assert(!BenchmarkCore.TryParseCsvRow("garbage", out _), "reject invalid CSV");
        Assert(NetworkRules.EligibleWan("Ethernet 3", "Realtek Ethernet",
                System.Net.NetworkInformation.NetworkInterfaceType.Ethernet, "192.168.8.100"),
                "Ethernet WAN eligible");
        Assert(NetworkRules.EligibleWan("Wi-Fi 2", "Realtek USB Wireless",
                System.Net.NetworkInformation.NetworkInterfaceType.Wireless80211, "10.248.175.104"),
                "USB Wi-Fi eligible");
        Assert(NetworkRules.EligibleWan("USB tether", "RNDIS",
                System.Net.NetworkInformation.NetworkInterfaceType.Ethernet, "192.168.42.10"),
                "RNDIS eligible");
        Assert(!NetworkRules.EligibleWan("Bond0", "Wintun",
                System.Net.NetworkInformation.NetworkInterfaceType.Ethernet, "198.18.0.2"),
                "Tunnel must not be selected as WAN");
        Assert(!NetworkRules.EligibleWan("Ligação de Área Local* 13", "Microsoft Wi-Fi Direct Virtual Adapter",
                System.Net.NetworkInformation.NetworkInterfaceType.Wireless80211, "192.168.137.1"),
                "Wi-Fi Direct ICS excluded");
        Assert(!NetworkRules.EligibleWan("Wi-Fi 3", "Wireless Adapter",
                System.Net.NetworkInformation.NetworkInterfaceType.Wireless80211, "169.254.1.2"),
                "APIPA excluded");
        BenchmarkCore.ValidatePayload(1048576);
        checks++;
        bool rejected = false;
        try { BenchmarkCore.ValidatePayload(10_000_000); }
        catch (ArgumentOutOfRangeException) { rejected = true; }
        Assert(rejected, "reject excessive bytes");
        Console.WriteLine("Bond0 benchmark core: " + checks + " checks PASS");
    }
}
