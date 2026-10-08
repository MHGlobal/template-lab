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

        public static bool TryParseCsvRow(string line, out SpeedResult result)
        {
            result = new SpeedResult();
            if (string.IsNullOrWhiteSpace(line)) return false;
            var fields = new System.Collections.Generic.List<string>();
            var part = new System.Text.StringBuilder();
            bool quoted = false;
            for (int i = 0; i < line.Length; i++)
            {
                char c = line[i];
                if (c == '"')
                {
                    if (quoted && i + 1 < line.Length && line[i + 1] == '"')
                    {
                        part.Append('"');
                        i++;
                    }
                    else quoted = !quoted;
                }
                else if (c == ',' && !quoted)
                {
                    fields.Add(part.ToString());
                    part.Clear();
                }
                else part.Append(c);
            }
            if (quoted) return false;
            fields.Add(part.ToString());
            if (fields.Count != 10 ||
                !DateTime.TryParse(fields[0], CultureInfo.InvariantCulture,
                    DateTimeStyles.RoundtripKind, out DateTime when) ||
                !int.TryParse(fields[2], NumberStyles.Integer, CultureInfo.InvariantCulture, out int bytes) ||
                !double.TryParse(fields[3], NumberStyles.Float, CultureInfo.InvariantCulture, out double down) ||
                !double.TryParse(fields[4], NumberStyles.Float, CultureInfo.InvariantCulture, out double up) ||
                !double.TryParse(fields[5], NumberStyles.Float, CultureInfo.InvariantCulture, out double latency) ||
                !double.TryParse(fields[6], NumberStyles.Float, CultureInfo.InvariantCulture, out double jitter) ||
                !double.TryParse(fields[7], NumberStyles.Float, CultureInfo.InvariantCulture, out double loss) ||
                !int.TryParse(fields[8], NumberStyles.Integer, CultureInfo.InvariantCulture, out int rx) ||
                !int.TryParse(fields[9], NumberStyles.Integer, CultureInfo.InvariantCulture, out int tx))
                return false;
            if (bytes < MinPayloadBytes || bytes > MaxPayloadBytes ||
                down < 0 || up < 0 || latency < 0 || jitter < 0 ||
                !double.IsFinite(down) || !double.IsFinite(up) ||
                !double.IsFinite(latency) || !double.IsFinite(jitter) ||
                !double.IsFinite(loss) || loss < 0 || loss > 100 ||
                tx <= 0 || rx < 0 || rx > tx) return false;
            result = new SpeedResult {
                TimestampUtc = when, Profile = fields[1], PayloadBytes = bytes,
                DownloadMbps = down, UploadMbps = up,
                LatencyMs = latency, JitterMs = jitter, LossPercent = loss,
                ReceivedPings = rx, SentPings = tx
            };
            return true;
        }

        public const string CsvHeader =
            "utc,profile,payload_bytes,download_mbps,upload_mbps,latency_ms,jitter_ms,loss_pct,ping_rx,ping_tx";
    }
}
