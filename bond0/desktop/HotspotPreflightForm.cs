using System;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Diagnostics;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Bond0Control
{
    /// <summary>Read-only safe preflight. Never calls ICS/WINNAT/route mutations.</summary>
    public sealed class HotspotPreflightForm : Form
    {
        private readonly Func<bool> isTunnelRunning;
        private readonly Action<string> log;
        private readonly TextBox report;
        private readonly Button checkButton;
        private readonly Button saveButton;

        public HotspotPreflightForm(Func<bool> isTunnelRunning, Action<string> log)
        {
            this.isTunnelRunning = isTunnelRunning;
            this.log = log;
            Text = "Bond0 — Hotspot virtual combinado";
            StartPosition = FormStartPosition.CenterParent;
            Size = new Size(900, 690);
            MinimumSize = new Size(760, 560);
            Font = new Font("Segoe UI", 10);
            BackColor = Color.FromArgb(11, 20, 36);
            ForeColor = Color.White;

            var head = new Label {
                Dock = DockStyle.Top, Height = 62,
                Font = new Font("Segoe UI", 16, FontStyle.Bold),
                Text = "HOTSPOT DA INTERNET AGREGADA"
            };
            var description = new Label {
                Dock = DockStyle.Top, Height = 105,
                ForeColor = Color.FromArgb(186, 203, 225),
                Text = "Fonte pretendida: adaptador virtual Bond0 (Internet A+B+N), não uma WAN isolada.\n" +
                    "Este assistente analisa a rede e prepara um relatório de segurança. A ativação automática de ICS/NAT ainda não está validada em hardware real e permanece desativada."
            };
            var toolbar = new FlowLayoutPanel { Dock = DockStyle.Top, Height = 54, WrapContents = false };
            checkButton = new Button { Text = "Verificar condições", Width = 180, Height = 36 };
            saveButton = new Button { Text = "Guardar diagnóstico", Width = 185, Height = 36 };
            var openButton = new Button { Text = "Configurar hotspot Windows", Width = 225, Height = 36 };
            checkButton.Click += async (s, e) => await RunPreflightAsync();
            saveButton.Click += (s, e) => SaveReport();
            openButton.Click += (s, e) => {
                try {
                    Process.Start(new ProcessStartInfo("ms-settings:network-mobilehotspot") { UseShellExecute = true });
                    log("Definições de hotspot abertas. Nenhuma partilha foi ativada automaticamente.");
                }
                catch (Exception ex) { MessageBox.Show(ex.Message, "Hotspot"); }
            };
            toolbar.Controls.Add(checkButton);
            toolbar.Controls.Add(saveButton);
            toolbar.Controls.Add(openButton);

            var warning = new Label {
                Text = "PROTEÇÃO ATIVA: não modifica a rota predefinida, não desliga Wi-Fi/Ethernet e não altera ICS/NAT.",
                ForeColor = Color.FromArgb(234, 184, 106), Dock = DockStyle.Top, Height = 55
            };
            report = new TextBox {
                Dock = DockStyle.Fill, Multiline = true, ReadOnly = true, ScrollBars = ScrollBars.Both,
                WordWrap = false, Font = new Font("Consolas", 10), BackColor = Color.FromArgb(23, 35, 55),
                ForeColor = Color.White, Text = "Clica em Verificar condições para analisar as interfaces sem efetuar alterações."
            };
            Controls.Add(report);
            Controls.Add(warning);
            Controls.Add(toolbar);
            Controls.Add(description);
            Controls.Add(head);
            Padding = new Padding(22);
        }

        private static string Address(NetworkInterface adapter)
        {
            try {
                var address = adapter.GetIPProperties().UnicastAddresses
                    .FirstOrDefault(x => x.Address.AddressFamily == AddressFamily.InterNetwork);
                return address == null ? "sem IPv4" : address.Address.ToString();
            } catch { return "endereço indisponível"; }
        }

        private static string CommandOutput(string program, string args)
        {
            var psi = new ProcessStartInfo(program, args) {
                UseShellExecute = false, CreateNoWindow = true,
                RedirectStandardOutput = true, RedirectStandardError = true
            };
            using var process = Process.Start(psi);
            if (process == null) return "Não foi possível iniciar " + program;
            var content = process.StandardOutput.ReadToEnd();
            if (!process.WaitForExit(7000)) {
                try { process.Kill(); } catch { }
                return program + " excedeu o tempo limite";
            }
            return content.Length > 9000 ? content.Substring(0, 9000) + "\n[truncado]" : content;
        }

        private async Task RunPreflightAsync()
        {
            checkButton.Enabled = false;
            report.Text = "A verificar apenas o estado atual. Aguarda...";
            try
            {
                bool live = isTunnelRunning();
                var text = await Task.Run(() => {
                    var b = new StringBuilder();
                    b.AppendLine("BONDO HOTSPOT — DIAGNÓSTICO LOCAL");
                    b.AppendLine("Data local: " + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"));
                    b.AppendLine("Objetivo: partilhar saída combinada do Bond0");
                    b.AppendLine("Processo controlado ativo: " + (live ? "Sim" : "Não"));
                    var adapters = NetworkInterface.GetAllNetworkInterfaces();
                    var tun = adapters.FirstOrDefault(x => x.Name.Equals("Bond0", StringComparison.OrdinalIgnoreCase));
                    var tunIp = tun == null ? "(adaptador ausente)" : Address(tun);
                    b.AppendLine("Bond0 IPv4: " + tunIp);
                    if (!live || tunIp != "198.18.0.2")
                        b.AppendLine("BLOQUEIO: ligar Bond0 e confirmar 198.18.0.2/24 antes de partilhar.");

                    var wifi = adapters
                        .Where(x => x.NetworkInterfaceType == NetworkInterfaceType.Wireless80211)
                        .ToArray();
                    b.AppendLine("Wi-Fi detectados: " + wifi.Length);
                    foreach (var a in wifi)
                        b.AppendLine("  - " + a.Name + " [" + a.OperationalStatus + "] IP " + Address(a));
                    if (wifi.Length < 2)
                        b.AppendLine("ATENÇÃO: um único rádio Wi-Fi pode não suportar WAN + hotspot simultâneos.");
                    b.AppendLine("ADAPTADORES FÍSICOS DETETADOS:");
                    foreach (var a in adapters.Where(x =>
                        x.NetworkInterfaceType == NetworkInterfaceType.Ethernet ||
                        x.NetworkInterfaceType == NetworkInterfaceType.Wireless80211))
                        b.AppendLine("  - " + a.Name + ": " + Address(a) + " " + a.OperationalStatus);

                    b.AppendLine();
                    b.AppendLine("=== NETSH WLAN (somente leitura) ===");
                    b.AppendLine(CommandOutput("netsh.exe", "wlan show drivers"));
                    b.AppendLine();
                    b.AppendLine("=== ROTAS IPv4 (somente leitura) ===");
                    b.AppendLine(CommandOutput("route.exe", "print -4"));
                    b.AppendLine();
                    b.AppendLine("PRÓXIMOS GATES — NÃO EXECUTADOS:");
                    b.AppendLine("1. Pinning de sockets para cada WAN até ao IP público da VPS");
                    b.AppendLine("2. Confirmação da origem ICS como Bond0, nunca WAN A ou B");
                    b.AppendLine("3. DHCP/DNS/NAT e saída HTTPS com IP público Oracle num telefone");
                    b.AppendLine("4. Falha de WAN + rollback de ICS e rotas verificados");
                    return b.ToString();
                });
                report.Text = text;
                log("Preflight hotspot: concluído (read-only). Não ativou ICS, NAT nem alterou rotas.");
            }
            catch (Exception ex)
            {
                report.Text = "Falha de preflight: " + ex.Message;
            }
            finally { checkButton.Enabled = true; }
        }

        private void SaveReport()
        {
            using var dialog = new SaveFileDialog {
                Filter = "Ficheiro de texto|*.txt",
                FileName = "Bond0-Hotspot-Preflight-" + DateTime.Now.ToString("yyyyMMdd-HHmmss") + ".txt"
            };
            if (dialog.ShowDialog() == DialogResult.OK)
                File.WriteAllText(dialog.FileName, report.Text, new UTF8Encoding(false));
        }
    }
}
