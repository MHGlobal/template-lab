using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.NetworkInformation;
using System.Threading;
using System.Threading.Tasks;

namespace Bond0Control
{
    public sealed class SpeedBenchmark
    {
        private const string BaseUrl = "http://198.18.0.1:8765";
        private static readonly IPAddress Target = IPAddress.Parse("198.18.0.1");

        public async Task<SpeedResult> RunAsync(
            string profile, int bytes, IProgress<string> updates, CancellationToken cancellation)
        {
            BenchmarkCore.ValidatePayload(bytes);
            var result = new SpeedResult {
                TimestampUtc = DateTime.UtcNow, Profile = profile, PayloadBytes = bytes
            };

            using var handler = new HttpClientHandler { UseProxy = false, AllowAutoRedirect = false };
            using var http = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(60) };
            updates?.Report("Verificando acesso à VPS...");
            using (var health = await http.GetAsync(BaseUrl + "/health",
                HttpCompletionOption.ResponseHeadersRead, cancellation))
                health.EnsureSuccessStatusCode();

            updates?.Report("Ping / latência / jitter / perda...");
            var rtts = new List<double>();
            result.SentPings = 6;
            using (var pinger = new Ping())
            {
                for (var i = 0; i < result.SentPings; i++)
                {
                    cancellation.ThrowIfCancellationRequested();
                    try
                    {
                        var reply = await pinger.SendPingAsync(Target, 1600);
                        if (reply.Status == IPStatus.Success) rtts.Add(reply.RoundtripTime);
                    }
                    catch (PingException) { }
                    if (i < result.SentPings - 1)
                        await Task.Delay(150, cancellation);
                }
            }
            result.ReceivedPings = rtts.Count;
            result.LossPercent = BenchmarkCore.LossPercent(result.SentPings, rtts.Count);
            result.LatencyMs = rtts.Count == 0 ? 0 : rtts.Average();
            result.JitterMs = BenchmarkCore.JitterMs(rtts.ToArray());

            updates?.Report("Download " + (bytes / 1048576.0).ToString("F2") + " MiB...");
            using (var response = await http.GetAsync(BaseUrl + "/down?bytes=" + bytes,
                HttpCompletionOption.ResponseHeadersRead, cancellation))
            {
                response.EnsureSuccessStatusCode();
                var sw = Stopwatch.StartNew();
                using var stream = await response.Content.ReadAsStreamAsync(cancellation);
                var buffer = new byte[65536];
                long received = 0;
                while (true)
                {
                    var size = await stream.ReadAsync(buffer.AsMemory(0, buffer.Length), cancellation);
                    if (size <= 0) break;
                    received += size;
                    if (received > bytes) throw new IOException("A VPS enviou mais bytes que o solicitado.");
                }
                sw.Stop();
                if (received != bytes)
                    throw new IOException($"Download incompleto: {received}/{bytes} bytes.");
                result.DownloadMbps = BenchmarkCore.Mbps(received, sw.Elapsed.TotalSeconds);
            }

            updates?.Report("Upload " + (bytes / 1048576.0).ToString("F2") + " MiB...");
            // The server enforces the same max 8 MiB payload limit.
            using (var payload = new ByteArrayContent(new byte[bytes]))
            {
                payload.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(
                    "application/octet-stream");
                var sw = Stopwatch.StartNew();
                using var response = await http.PostAsync(BaseUrl + "/up", payload, cancellation);
                response.EnsureSuccessStatusCode();
                var reply = (await response.Content.ReadAsStringAsync(cancellation)).Trim();
                sw.Stop();
                if (reply != "UP_OK")
                    throw new IOException("A VPS não confirmou a receção completa do upload.");
                result.UploadMbps = BenchmarkCore.Mbps(bytes, sw.Elapsed.TotalSeconds);
            }
            updates?.Report("Concluído");
            return result;
        }
    }
}
