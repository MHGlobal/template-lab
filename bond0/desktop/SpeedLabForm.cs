using System;
using System.Collections.Generic;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Bond0Control
{
    public sealed class SpeedLabForm : Form
    {
        private readonly Func<string> getProfile;
        private readonly Func<bool> tunnelActive;
        private readonly Action<string> log;
        private readonly Label status;
        private readonly Label summary;
        private readonly ComboBox payloadSize;
        private readonly Button start;
        private readonly Button cancel;
        private readonly DataGridView table;
        private CancellationTokenSource token;
        private readonly List<SpeedResult> results = new List<SpeedResult>();
        private readonly string historyPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Bond0Control", "benchmarks.csv");

        public SpeedLabForm(Func<string> getProfile, Func<bool> tunnelActive, Action<string> log)
        {
            this.getProfile = getProfile;
            this.tunnelActive = tunnelActive;
            this.log = log;
            Text = "Bond0 — Laboratório de velocidade";
            MinimumSize = new Size(830, 600);
            Size = new Size(980, 690);
            StartPosition = FormStartPosition.CenterParent;
            BackColor = Color.FromArgb(13, 22, 37);
            ForeColor = Color.White;
            Font = new Font("Segoe UI", 10);

            var title = new Label { Text = "TESTE DE VELOCIDADE • WAN + STRIPE",
                Font = new Font("Segoe UI", 16, FontStyle.Bold),
                ForeColor = Color.White, Dock = DockStyle.Top, Height = 54 };
            var info = new Label { Text = "Executa download, upload, ping, jitter e perda. Para comparar A/B/A+B, muda o perfil no painel principal e repete. Nenhuma rota predefinida é alterada.",
                ForeColor = Color.FromArgb(170, 189, 205), Dock = DockStyle.Top, Height = 60 };
            var command = new FlowLayoutPanel { Dock = DockStyle.Top, Height = 53,
                FlowDirection = FlowDirection.LeftToRight, WrapContents = false };
            command.Controls.Add(new Label { Text = "Volume por direção:", AutoSize = true, Padding = new Padding(0, 11, 0, 0) });
            payloadSize = new ComboBox { Width = 120, DropDownStyle = ComboBoxStyle.DropDownList };
            payloadSize.Items.AddRange(new object[] { "1 MiB", "4 MiB", "8 MiB" });
            payloadSize.SelectedIndex = 1;
            command.Controls.Add(payloadSize);
            start = new Button { Text = "Iniciar teste", Width = 145, Height = 34,
                BackColor = Color.FromArgb(27, 129, 218), ForeColor = Color.White, FlatStyle = FlatStyle.Flat };
            cancel = new Button { Text = "Cancelar", Width = 110, Height = 34, Enabled = false };
            var export = new Button { Text = "Abrir CSV", Width = 120, Height = 34 };
            start.Click += async (s, e) => await RunTestAsync();
            cancel.Click += (s, e) => token?.Cancel();
            export.Click += (s, e) => {
                if (File.Exists(historyPath)) System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(historyPath) { UseShellExecute = true });
                else MessageBox.Show("Ainda não existem medições guardadas.");
            };
            command.Controls.Add(start); command.Controls.Add(cancel); command.Controls.Add(export);
            summary = new Label { Dock = DockStyle.Top, Height = 73,
                ForeColor = Color.FromArgb(54, 207, 181), Font = new Font("Segoe UI", 13, FontStyle.Bold),
                Text = "Aguardando teste do túnel..." };
            status = new Label { Dock = DockStyle.Bottom, Height = 45,
                ForeColor = Color.FromArgb(185, 199, 218), Text = "Sem tráfego de medição em curso." };
            table = new DataGridView {
                Dock = DockStyle.Fill, BackgroundColor = Color.FromArgb(23, 37, 58),
                ForeColor = Color.Black, AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill,
                AllowUserToAddRows = false, AllowUserToDeleteRows = false, ReadOnly = true,
                RowHeadersVisible = false
            };
            table.Columns.Add("utc", "Hora local");
            table.Columns.Add("profile", "Perfil");
            table.Columns.Add("down", "Download Mbps");
            table.Columns.Add("up", "Upload Mbps");
            table.Columns.Add("rtt", "Ping ms");
            table.Columns.Add("jitter", "Jitter ms");
            table.Columns.Add("loss", "Perda %");
            Controls.Add(table);
            Controls.Add(status);
            Controls.Add(summary);
            Controls.Add(command);
            Controls.Add(info);
            Controls.Add(title);
            Padding = new Padding(17);
            LoadHistory();
            FormClosing += (s, e) => {
                if (token != null)
                {
                    token.Cancel();
                    e.Cancel = true;
                    status.Text = "A cancelar teste. Aguarda o fim das operações...";
                }
            };
        }

        private async Task RunTestAsync()
        {
            if (!tunnelActive())
            {
                MessageBox.Show("Liga o motor Bond0 pelo painel antes de iniciar a medição.",
                    "Bond0", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }
            start.Enabled = false;
            cancel.Enabled = true;
            payloadSize.Enabled = false;
            var size = (payloadSize.SelectedIndex + 1) switch { 1 => 1048576, 2 => 4194304, _ => 8388608 };
            var profile = getProfile();
            token = new CancellationTokenSource();
            var updates = new Progress<string>(value => status.Text = value);
            try
            {
                var result = await new SpeedBenchmark().RunAsync(profile, size, updates, token.Token);
                results.Add(result);
                AppendRow(result);
                SaveHistory(result);
                string report = string.Format(CultureInfo.InvariantCulture,
                    "{0}: {1:F2} Mbps ↓ · {2:F2} Mbps ↑ · {3:F0} ms · jitter {4:F1} ms · perda {5:F0}%",
                    profile, result.DownloadMbps, result.UploadMbps, result.LatencyMs,
                    result.JitterMs, result.LossPercent);
                summary.Text = report;
                log(report);
                status.Text = "Medição concluída e guardada localmente. Os valores não provam ganho até comparar perfis.";
                ShowComparison();
            }
            catch (OperationCanceledException)
            {
                status.Text = "Teste cancelado; medições incompletas não são guardadas.";
            }
            catch (Exception ex)
            {
                status.Text = "Erro: " + ex.Message;
                log("Teste de velocidade falhou: " + ex.Message);
            }
            finally
            {
                token.Dispose();
                token = null;
                start.Enabled = true;
                cancel.Enabled = false;
                payloadSize.Enabled = true;
            }
        }

        private void AppendRow(SpeedResult result)
        {
            table.Rows.Insert(0, result.TimestampUtc.ToLocalTime().ToString("HH:mm:ss"),
                result.Profile, result.DownloadMbps.ToString("F2"),
                result.UploadMbps.ToString("F2"), result.LatencyMs.ToString("F0"),
                result.JitterMs.ToString("F1"), result.LossPercent.ToString("F0"));
        }

        private void SaveHistory(SpeedResult result)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(historyPath));
            if (!File.Exists(historyPath))
                File.AppendAllText(historyPath, BenchmarkCore.CsvHeader + Environment.NewLine, Encoding.UTF8);
            File.AppendAllText(historyPath, BenchmarkCore.CsvRow(result) + Environment.NewLine, Encoding.UTF8);
        }

        private void LoadHistory()
        {
            if (!File.Exists(historyPath)) return;
            try
            {
                int restored = 0;
                foreach (var line in File.ReadLines(historyPath).Skip(1).TakeLast(200))
                {
                    if (!BenchmarkCore.TryParseCsvRow(line, out var old)) continue;
                    AppendRow(old);
                    restored++;
                }
                status.Text = restored + " medições anteriores carregadas. Histórico guardado localmente.";
            }
            catch (IOException ex)
            {
                status.Text = "Não foi possível ler histórico: " + ex.Message;
            }
        }

        private void ShowComparison()
        {
            var grouped = results
                .GroupBy(r => r.Profile)
                .ToDictionary(g => g.Key, g => g.Last(), StringComparer.OrdinalIgnoreCase);
            if (grouped.TryGetValue("A", out var a) &&
                grouped.TryGetValue("B", out var b) &&
                grouped.TryGetValue("A+B", out var ab))
            {
                double fastest = Math.Max(a.DownloadMbps, b.DownloadMbps);
                if (fastest > 0)
                    status.Text = string.Format(CultureInfo.InvariantCulture,
                        "Comparação preliminar: A={0:F2}, B={1:F2}, A+B={2:F2} Mbps; variação vs melhor WAN: {3:+0.0;-0.0;0.0}% (repetir ≥3x).",
                        a.DownloadMbps, b.DownloadMbps, ab.DownloadMbps,
                        (ab.DownloadMbps / fastest - 1.0) * 100.0);
            }
        }
    }
}
