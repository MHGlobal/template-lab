using System;
using System.Globalization;
using System.Linq;

namespace Bond0Control
{
    public sealed class SpeedResult
    {
        public DateTime TimestampUtc { get; set; }
        public string Profile { get; set; } = "";
        public int PayloadBytes { get; set; }
        public double DownloadMbps { get; set; }
        public double UploadMbps { get; set; }
        public double LatencyMs { get; set; }
        public double JitterMs { get; set; }
        public double LossPercent { get; set; }
        public int ReceivedPings { get; set; }
        public int SentPings { get; set; }
    }

    public static class BenchmarkCore
    {
        public const int MinPayloadBytes = 256 * 1024;
        public const int MaxPayloadBytes = 8 * 1024 * 1024;

        public static void ValidatePayload(int bytes)
        {
            if (bytes < MinPayloadBytes || bytes > MaxPayloadBytes)
                throw new ArgumentOutOfRangeException(nameof(bytes), "Teste limitado a 256 KiB–8 MiB.");
        }

        public static double Mbps(long bytes, double seconds)
        {
            if (bytes < 0 || seconds <= 0 || double.IsNaN(seconds) || double.IsInfinity(seconds))
                throw new ArgumentOutOfRangeException(nameof(seconds));
            return bytes * 8.0 / seconds / 1_000_000.0;
        }

        // Jitter here is mean absolute RTT change, NOT RFC3550 jitter.
        public static double JitterMs(double[] rtts)
        {
            if (rtts == null || rtts.Length < 2) return 0;
            double sum = 0;
            for (int i = 1; i < rtts.Length; i++)
                sum += Math.Abs(rtts[i] - rtts[i - 1]);
            return sum / (rtts.Length - 1);
        }

        public static double LossPercent(int sent, int received)
        {
            if (sent <= 0 || received < 0 || received > sent)
                throw new ArgumentOutOfRangeException(nameof(sent));
            return (sent - received) * 100.0 / sent;
        }

        public static string CsvEscape(string value)
        {
            string text = (value ?? "").Replace("\r", " ").Replace("\n", " ");
            // Protect history exports from spreadsheet formula injection.
            if (text.Length > 0 && "=+-@\t".Contains(text[0]))
                text = "'" + text;
            return "\"" + text.Replace("\"", "\"\"") + "\"";
        }

        public static string CsvRow(SpeedResult r)
        {
            return string.Join(",", new [] {
                CsvEscape(r.TimestampUtc.ToString("O", CultureInfo.InvariantCulture)),
                CsvEscape(r.Profile),
                r.PayloadBytes.ToString(CultureInfo.InvariantCulture),
                r.DownloadMbps.ToString("F3", CultureInfo.InvariantCulture),
                r.UploadMbps.ToString("F3", CultureInfo.InvariantCulture),
                r.LatencyMs.ToString("F1", CultureInfo.InvariantCulture),
                r.JitterMs.ToString("F1", CultureInfo.InvariantCulture),
                r.LossPercent.ToString("F1", CultureInfo.InvariantCulture),
                r.ReceivedPings.ToString(CultureInfo.InvariantCulture),
                r.SentPings.ToString(CultureInfo.InvariantCulture),
            });
        }

        public const string CsvHeader =
            "utc,profile,payload_bytes,download_mbps,upload_mbps,latency_ms,jitter_ms,loss_pct,ping_rx,ping_tx";
    }
}
