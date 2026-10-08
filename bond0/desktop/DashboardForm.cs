using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Http;
using System.Security.Principal;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Bond0Control
{
    // Next-generation shell: built from docking and scrollable layouts rather than
    // absolute coordinates. Data plane stays in the existing Rust executable.
    public sealed class DashboardForm : Form
    {
        private readonly Color Bg = Color.FromArgb(10, 17, 29);
        private readonly Color Sidebar = Color.FromArgb(15, 25, 41);
        private readonly Color Surface = Color.FromArgb(21, 33, 51);
        private readonly Color Border = Color.FromArgb(42, 59, 79);
        private readonly Color White = Color.FromArgb(233, 242, 251);
        private readonly Color Muted = Color.FromArgb(158, 178, 196);
        private readonly Color Blue = Color.FromArgb(62, 143, 246);
        private readonly Color Teal = Color.FromArgb(50, 204, 172);
        private readonly Color Amber = Color.FromArgb(255, 194, 91);
        private readonly string OriginalConfig = @"C:\Bond0\bonding-client.toml";
        private readonly string EnginePath = @"C:\Bond0\bonding-client.exe";
        private readonly string TempRoot = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Bond0Control");
        private readonly HashSet<string> selected = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "Ethernet 3", "Wi-Fi 2" };
        private readonly List<string> logs = new List<string>();

        private readonly NotifyIcon tray;
        private readonly TableLayoutPanel shell;
        private readonly Panel pageContainer;
        private readonly Label topStatus;
        private readonly Label topSubtitle;
        private readonly Dictionary<string, Button> navigation = new Dictionary<string, Button>();
        private readonly System.Windows.Forms.Timer refresh;
        private Label information;
        private TextBox diagnostics;
        private CheckedListBox wanSelection;
        private Process engine;
        private string currentPage = "Início";
        private string lastFailure = "Motor parado. Seleciona as redes e clica em Ligar.";
        private bool isBusy, allowExit, trayHintShown;
        private string activeConfigPath;
        private bool hasTunnelStatus;

        public DashboardForm()
        {
            Text = "Bond0 | Centro de Controlo";
            Size = new Size(1130, 770);
            MinimumSize = new Size(850, 620);
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = Bg;
            ForeColor = White;
            Font = new Font("Segoe UI", 10);
            AutoScaleMode = AutoScaleMode.Dpi;
            Icon = SystemIcons.Application;

            tray = new NotifyIcon {
                Icon = SystemIcons.Application, Visible = true,
                Text = "Bond0 — estado do túnel por verificar"
            };
            var context = new ContextMenuStrip();
            context.Items.Add("Abrir Bond0", null, (s,e) => Restore());
            context.Items.Add("Ligar", null, async (s,e) => await ConnectAsync());
            context.Items.Add("Desligar", null, (s,e) => Disconnect());
            context.Items.Add(new ToolStripSeparator());
            context.Items.Add("Sair", null, (s,e) => Exit());
            tray.ContextMenuStrip = context;
            tray.DoubleClick += (s,e) => Restore();

            shell = new TableLayoutPanel {
                Dock = DockStyle.Fill, ColumnCount = 2, RowCount = 1, Margin = Padding.Empty,
                BackColor = Bg
            };
            shell.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 218));
            shell.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
            shell.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            Controls.Add(shell);
            shell.Controls.Add(BuildSidebar(), 0, 0);

            var main = new TableLayoutPanel {
                Dock = DockStyle.Fill, ColumnCount = 1, RowCount = 2,
                BackColor = Bg, Margin = Padding.Empty, Padding = Padding.Empty
            };
            main.RowStyles.Add(new RowStyle(SizeType.Absolute, 87));
            main.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            main.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
            shell.Controls.Add(main, 1, 0);
            var topbar = new TableLayoutPanel {
                Dock = DockStyle.Fill, ColumnCount = 2, RowCount = 2, BackColor = Sidebar,
                Padding = new Padding(25, 10, 24, 7), Margin = Padding.Empty
            };
            topbar.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
            topbar.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 195));
            topbar.RowStyles.Add(new RowStyle(SizeType.Percent, 57));
            topbar.RowStyles.Add(new RowStyle(SizeType.Percent, 43));
            var title = TextLabel("BOND0  /  CONTROL CENTER", 16, White, true);
            title.Dock = DockStyle.Fill;
            topbar.Controls.Add(title, 0, 0);
            topSubtitle = TextLabel("Centro de redes • sem IA • servidor Oracle", 9, Muted);
            topSubtitle.Dock = DockStyle.Fill;
            topbar.Controls.Add(topSubtitle, 0, 1);
            topStatus = TextLabel("● DESLIGADO", 11, Amber, true);
            topStatus.Dock = DockStyle.Fill;
            topStatus.TextAlign = ContentAlignment.MiddleRight;
            topbar.Controls.Add(topStatus, 1, 0);
            topbar.SetRowSpan(topStatus, 2);
            main.Controls.Add(topbar, 0, 0);
            pageContainer = new Panel { Dock = DockStyle.Fill, BackColor = Bg, Padding = Padding.Empty };
            main.Controls.Add(pageContainer, 0, 1);

            refresh = new System.Windows.Forms.Timer { Interval = 3000 };
            refresh.Tick += (s,e) => RefreshBanner();
            refresh.Start();
            Resize += (s,e) => { if(WindowState == FormWindowState.Minimized) MinimizeToTray(); };
            FormClosing += OnWindowClosing;
            ReadSelectedNetworks();
            RenderPage("Início");
            RefreshBanner();
            Log("Bond0 v0.2 Preview | Painel redesenhado | Motor Rust existente.");
            Log("Apenas a interface Bond0 pode receber alteração de IP. WANs físicas nunca são desligadas.");
        }

        private Panel BuildSidebar()
        {
            var side = new Panel { Dock = DockStyle.Fill, BackColor = Sidebar, Padding = new Padding(12, 18, 12, 13) };
            var layout = new TableLayoutPanel { Dock = DockStyle.Fill, RowCount = 3, ColumnCount = 1, BackColor = Sidebar };
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 75));
            layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 67));
            layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
            side.Controls.Add(layout);
            var brand = TextLabel("◉  Bond0", 21, White, true);
            brand.Dock = DockStyle.Fill; brand.Padding = new Padding(10, 0, 0, 0);
            layout.Controls.Add(brand, 0, 0);

            var menu = new FlowLayoutPanel {
                Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown,
                WrapContents = false, AutoScroll = true, Padding = new Padding(0, 7, 0, 0),
                Margin = Padding.Empty
            };
            foreach (var page in new [] { "Início", "Minhas redes", "Velocidade", "Hotspot", "Servidor VPS", "Diagnóstico" })
            {
                var button = Button(page, Surface, 175);
                button.Height = 44; button.TextAlign = ContentAlignment.MiddleLeft;
                button.Padding = new Padding(12, 0, 0, 0);
                button.Margin = new Padding(2, 2, 2, 5);
                button.Click += (s,e) => RenderPage(page);
                navigation[page] = button;
                menu.Controls.Add(button);
            }
            layout.Controls.Add(menu, 0, 1);
            var foot = TextLabel("v0.2  •  LAB PREVIEW\nSem IA • Sem alterações automáticas de rotas", 8, Muted);
            foot.Dock = DockStyle.Fill; foot.Padding = new Padding(8, 4, 0, 0);
            layout.Controls.Add(foot, 0, 2);
            return side;
        }

        private Label TextLabel(string text, float size, Color color, bool bold = false)
        {
            return new Label {
                Text = text, ForeColor = color,
                Font = new Font("Segoe UI", size, bold ? FontStyle.Bold : FontStyle.Regular),
                AutoSize = false, TextAlign = ContentAlignment.MiddleLeft
            };
        }

        private Button Button(string text, Color color, int width = 164)
        {
            var button = new Button {
                Text = text, Height = 42, Width = width, ForeColor = White,
                BackColor = color, FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 10, FontStyle.Bold),
                Cursor = Cursors.Hand, Margin = new Padding(0, 0, 10, 8)
            };
            button.FlatAppearance.BorderSize = 0;
            return button;
        }

        private Panel Card(string title, string subtitle, int height = 164)
        {
            var p = new Panel {
                Width = 330, Height = height, BackColor = Surface,
                Padding = new Padding(17), Margin = new Padding(0, 0, 14, 14)
            };
            var heading = TextLabel(title, 10, White, true);
            heading.Dock = DockStyle.Top; heading.Height = 30; p.Controls.Add(heading);
            var body = TextLabel(subtitle, 9, Muted);
            body.Dock = DockStyle.Top; body.Height = height - 60;
            p.Controls.Add(body); body.BringToFront();
            return p;
        }

        private FlowLayoutPanel Page(string title, string description)
        {
            var list = new FlowLayoutPanel {
                Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown,
                WrapContents = false, AutoScroll = true,
                BackColor = Bg, Padding = new Padding(22, 14, 18, 30)
            };
            var heading = TextLabel(title, 21, White, true);
            heading.Width=780; heading.Height=48;
            var subtitle = TextLabel(description, 10, Muted);
            subtitle.Width=780; subtitle.Height=47;
            list.Controls.Add(heading);
            list.Controls.Add(subtitle);
            return list;
        }

        private FlowLayoutPanel Row(int height)
        {
            return new FlowLayoutPanel {
                Width = 820, Height = height, BackColor = Bg,
                WrapContents = true, AutoScroll = false, FlowDirection = FlowDirection.LeftToRight,
                Margin = new Padding(0, 2, 0, 4)
            };
        }

        private void RenderPage(string page)
        {
            currentPage = page;
            foreach (var kv in navigation) kv.Value.BackColor = kv.Key == page ? Color.FromArgb(36, 76, 132) : Surface;
            pageContainer.Controls.Clear();
            if (page == "Início") pageContainer.Controls.Add(Home());
            else if (page == "Minhas redes") pageContainer.Controls.Add(Networks());
            else if (page == "Velocidade") pageContainer.Controls.Add(Speed());
            else if (page == "Hotspot") pageContainer.Controls.Add(Hotspot());
            else if (page == "Servidor VPS") pageContainer.Controls.Add(Server());
            else pageContainer.Controls.Add(Diagnostics());
            RefreshBanner();
        }

        private Control Home()
        {
            var page = Page("Visão geral", "Controla o túnel, acompanha as ligações e vê o motivo de qualquer falha.");
            var actions = Row(59);
            var start = Button("Ligar Bond0", Color.FromArgb(25, 147, 112), 165);
            var stop = Button("Desligar", Color.FromArgb(124, 64, 80), 125);
            var networks = Button("Gerir redes", Surface, 135);
            var speed = Button("Teste de velocidade", Blue, 188);
            start.Click += async (s,e) => await ConnectAsync();
            stop.Click += (s,e) => Disconnect();
            networks.Click += (s,e) => RenderPage("Minhas redes");
            speed.Click += (s,e) => OpenSpeed();
            actions.Controls.Add(start); actions.Controls.Add(stop); actions.Controls.Add(networks); actions.Controls.Add(speed);
            page.Controls.Add(actions);

            var infoCard = new Panel {
                Width = 790, Height = 110, BackColor = Color.FromArgb(32, 46, 67),
                Padding = new Padding(16), Margin = new Padding(0, 0, 0, 14)
            };
            information = TextLabel(lastFailure, 10, Amber);
            information.Dock = DockStyle.Fill;
            information.TextAlign = ContentAlignment.MiddleLeft;
            infoCard.Controls.Add(information);
            page.Controls.Add(infoCard);

            var cards = Row(180);
            cards.Controls.Add(Card("ESTADO DO MOTOR", GetEngineState(), 153));
            cards.Controls.Add(Card("ADAPTADOR BOND0", GetInterfaceStatus("Bond0"), 153));
            page.Controls.Add(cards);

            var networkCards = Row(190);
            foreach (var name in selected.Take(2))
                networkCards.Controls.Add(Card(name.ToUpperInvariant(), GetInterfaceStatus(name), 150));
            if (selected.Count < 2) networkCards.Controls.Add(Card("REDES", "Seleciona as interfaces em Minhas redes.", 150));
            page.Controls.Add(networkCards);

            var extra = TextLabel("STRIPE distribui pacotes por WANs. O ganho de velocidade depende dos testes A, B e A+B.", 9, Muted);
            extra.Width = 785; extra.Height = 64;
            page.Controls.Add(extra);
            return page;
        }

        private Control Networks()
        {
            var page = Page("Minhas redes", "Escolhe interfaces físicas disponíveis. Uma interface sem IPv4 útil não pode iniciar o túnel.");
            var hints = TextLabel("Redes detetadas neste Windows. Interfaces virtuais, Wi-Fi Direct, APIPA e gateways ICS não servem como WANs.", 10, Amber);
            hints.Width = 780; hints.Height = 55; page.Controls.Add(hints);

            wanSelection = new CheckedListBox {
                Width = 760, Height = 290, BackColor = Surface, ForeColor = White,
                CheckOnClick = true, BorderStyle = BorderStyle.FixedSingle,
                Font = new Font("Segoe UI", 11), Margin = new Padding(0, 0, 0, 12)
            };
            var network = NetworkInterface.GetAllNetworkInterfaces();
            foreach (var item in network.OrderBy(x => x.Name))
            {
                if (!IsPhysical(item)) continue;
                var ip = InterfaceIPv4(item.Name);
                var enabled = NetworkRules.EligibleWan(item.Name, item.Description, item.NetworkInterfaceType, ip) &&
                    item.OperationalStatus == OperationalStatus.Up;
                var tag = enabled ? "PRONTA" : "INDISPONÍVEL";
                var title = item.Name + "    •    " + ip + "    •    " + tag;
                var index = wanSelection.Items.Add(new WanChoice(item.Name, title, enabled));
                if (selected.Contains(item.Name) && enabled) wanSelection.SetItemChecked(index, true);
            }
            foreach (var lost in selected.Where(name => !network.Any(x => x.Name.Equals(name, StringComparison.OrdinalIgnoreCase))))
            {
                wanSelection.Items.Add(new WanChoice(lost, lost + "    •    NÃO ENCONTRADO", false));
            }
            page.Controls.Add(wanSelection);

            var row = Row(63);
            var apply = Button("Aplicar seleção", Blue, 190);
            apply.Click += (s,e) => {
                if (Running()) { SetFailure("Desliga o Bond0 antes de alterar as redes."); return; }
                var chosen = wanSelection.CheckedItems.Cast<WanChoice>().Where(x=>x.Enabled).Select(x=>x.Alias).ToArray();
                if (!chosen.Any()) { SetFailure("Seleciona pelo menos uma WAN com IPv4 válido."); return; }
                selected.Clear();
                foreach (var alias in chosen) selected.Add(alias);
                SaveSelectedNetworks();
                SetFailure("Perfil preparado: " + String.Join(" + ", chosen) + ". Clica em Ligar para aplicar.");
                Log("WANs permitidas: " + String.Join(", ", chosen));
                RenderPage("Início");
            };
            var refreshButton = Button("Atualizar interfaces", Surface, 196);
            refreshButton.Click += (s,e)=>RenderPage("Minhas redes");
            row.Controls.Add(apply); row.Controls.Add(refreshButton);
            page.Controls.Add(row);

            var tail = TextLabel("Não são desligadas as placas físicas. A alteração aplica-se ao próximo arranque do motor.", 9, Muted);
            tail.Width=760;tail.Height=55;page.Controls.Add(tail);
            return page;
        }

        private sealed class WanChoice
        {
            public readonly string Alias;
            public readonly string Display;
            public readonly bool Enabled;
            public WanChoice(string alias, string display, bool enabled)
            { Alias=alias; Display=display; Enabled=enabled; }
            public override string ToString() { return Display; }
        }

        private Control Speed()
        {
            var page = Page("Laboratório de velocidade", "Mede download, upload, perda, latência e jitter com limites de 1–8 MiB.");
            var card = Card("TESTE REAL DO TÚNEL", "Mede pelo servidor privado na VPS. O motor precisa de estar ligado. Para comparar A/B/A+B, altera as redes e repete as medições.", 172);
            card.Width = 790;page.Controls.Add(card);
            var start = Button("Abrir laboratório", Blue, 228);
            start.Click+=(s,e)=>OpenSpeed();
            page.Controls.Add(start);
            return page;
        }

        private Control Hotspot()
        {
            var page = Page("Partilhar Internet", "Partilha futura da ligação agregada Bond0 com dispositivos Wi-Fi e Ethernet.");
            var intro = Card("HOTSPOT VIRTUAL — PREPARAÇÃO", "Primeiro, verificamos se o Windows suporta partilhar o adaptador Bond0, qual rádio Wi-Fi pode emitir e se as rotas e ICS não vão criar um loop.", 170);
            intro.Width = 790;page.Controls.Add(intro);
            var row = Row(64);
            var preflight = Button("Diagnóstico hotspot", Blue, 215);
            preflight.Click += (s,e) => OpenHotspot();
            var windows = Button("Definições Windows", Surface, 205);
            windows.Click += (s,e) => {
                try { Process.Start(new ProcessStartInfo("ms-settings:network-mobilehotspot") { UseShellExecute = true }); }
                catch (Exception ex) { SetFailure(ex.Message); }
            };
            row.Controls.Add(preflight);row.Controls.Add(windows);page.Controls.Add(row);
            var warning = TextLabel("A PARTILHA AUTOMÁTICA A+B AINDA NÃO ESTÁ ATIVADA. Primeiro precisamos validar DHCP, NAT, DNS, tráfego real dos clientes e rollback.", 10, Amber, true);
            warning.Width=780; warning.Height=90;page.Controls.Add(warning);
            return page;
        }

        private Control Server()
        {
            var page = Page("Servidor Oracle", "Distingue o túnel de dados da API administrativa.");
            var cards = Row(195);
            cards.Controls.Add(Card("TÚNEL DE DADOS", "UDP 5000; existente no servidor. Estado local: " +
                (Running() ? "motor iniciado" : "motor parado"), 165));
            cards.Controls.Add(Card("MANAGER VPS", "API 127.0.0.1:8870 — somente leitura. Sem gateway HTTPS autenticado para o desktop ou Netlify.", 165));
            page.Controls.Add(cards);
            var probe = Button("Verificar túnel", Blue, 190);
            probe.Click+=async (s,e)=>await ProbeAsync();
            page.Controls.Add(probe);
            var info = TextLabel("A comunicação administrativa desktop ↔ VPS ↔ Netlify permanece indisponível até existir pairing e autenticação.", 10, Amber);
            info.Width=770;info.Height=100;page.Controls.Add(info);
            return page;
        }

        private Control Diagnostics()
        {
            var page = Page("Diagnóstico", "Os erros do motor e os motivos da falha aparecem aqui e no painel inicial.");
            var row = Row(57);
            var diagnose = Button("Analisar adaptadores", Blue, 215);
            diagnose.Click+=(s,e)=>InspectAdapters();
            var copy = Button("Copiar registos", Surface, 155);
            copy.Click+=(s,e)=>Clipboard.SetText(String.Join(Environment.NewLine, logs));
            row.Controls.Add(diagnose);row.Controls.Add(copy);page.Controls.Add(row);
            diagnostics = new TextBox {
                Width = 783, Height = 400, Multiline = true, ReadOnly = true,
                BackColor = Surface, ForeColor = White, Font = new Font("Consolas", 9),
                BorderStyle = BorderStyle.None, ScrollBars = ScrollBars.Both,
                Text = String.Join(Environment.NewLine, logs.TakeLast(120))
            };
            page.Controls.Add(diagnostics);
            return page;
        }

        private void OpenSpeed()
        {
            using var dialog = new SpeedLabForm(
                () => selected.SetEquals(new [] {"Ethernet 3", "Wi-Fi 2"}) ? "A+B" :
                    (selected.Count==1 && selected.Contains("Ethernet 3") ? "A" :
                     selected.Count==1 && selected.Contains("Wi-Fi 2") ? "B" :
                        String.Join(" + ", selected.OrderBy(s=>s))),
                Running, Log);
            dialog.ShowDialog(this);
        }

        private void OpenHotspot()
        {
            using var dialog = new HotspotPreflightForm(Running, Log);
            dialog.ShowDialog(this);
        }

        private bool IsPhysical(NetworkInterface item)
        {
            return item.NetworkInterfaceType == NetworkInterfaceType.Ethernet ||
                item.NetworkInterfaceType == NetworkInterfaceType.Wireless80211 ||
                item.NetworkInterfaceType == NetworkInterfaceType.Ppp ||
                item.NetworkInterfaceType == NetworkInterfaceType.Wwanpp ||
                item.NetworkInterfaceType == NetworkInterfaceType.Wwanpp2;
        }

        private static string InterfaceIPv4(string alias)
        {
            try
            {
                var item = NetworkInterface.GetAllNetworkInterfaces().FirstOrDefault(
                    i=>i.Name.Equals(alias, StringComparison.OrdinalIgnoreCase));
                if(item == null) return "não encontrado";
                var candidates = item.GetIPProperties().UnicastAddresses.Where(
                    x=>x.Address.AddressFamily==System.Net.Sockets.AddressFamily.InterNetwork)
                    .Select(x=>x.Address.ToString()).ToArray();
                return candidates.FirstOrDefault(x=>!x.StartsWith("169.254.")) ??
                       candidates.FirstOrDefault() ?? "sem IPv4";
            }
            catch(Exception) { return "erro de leitura"; }
        }

        private string GetInterfaceStatus(string alias)
        {
            var item = NetworkInterface.GetAllNetworkInterfaces().FirstOrDefault(
                i=>i.Name.Equals(alias, StringComparison.OrdinalIgnoreCase));
            if (item == null) return "Não encontrado.\nReconfirma o nome em Minhas redes.";
            var ip = InterfaceIPv4(alias);
            return "Endereço: " + ip + "\nEstado: " + item.OperationalStatus + "\n" +
                (NetworkRules.EligibleWan(item.Name,item.Description,item.NetworkInterfaceType,ip) ?
                    "IP válido para WAN" : "Não é uma WAN utilizável");
        }

        private bool Running()
        {
            try { return engine != null && !engine.HasExited; }
            catch { return false; }
        }

        private string GetEngineState()
        {
            return Running() ? "Processo " + engine.Id + " ativo\n" +
                String.Join(" + ", selected) : "Motor desligado\nÚltima mensagem:\n" + lastFailure;
        }

        private void RefreshBanner()
        {
            if (IsDisposed) return;
            var running = Running();
            topStatus.Text = running ? (hasTunnelStatus ? "● LIGADO" : "● A INICIAR") : "● DESLIGADO";
            topStatus.ForeColor = running ? Teal : Amber;
            tray.Text = running ? "Bond0 — motor em execução" : "Bond0 — desligado";
            if (information != null && !information.IsDisposed)
                information.Text = lastFailure;
        }

        private static string Redact(string message)
        {
            if (Regex.IsMatch(message, "encryption_key|secret|Bearer\\s|password\\s*=", RegexOptions.IgnoreCase))
                return "[linha sensível ocultada]";
            return message.Length > 700 ? message.Substring(0, 700) + " [truncado]" : message;
        }

        private void Log(string message)
        {
            if (IsDisposed) return;
            if (InvokeRequired) {
                try { BeginInvoke(new Action<string>(Log), message); } catch { }
                return;
            }
            var value = "[" + DateTime.Now.ToString("HH:mm:ss") + "] " + Redact(message);
            logs.Add(value);
            if (logs.Count > 300) logs.RemoveRange(0, logs.Count - 300);
            try
            {
                Directory.CreateDirectory(TempRoot);
                var logfile = Path.Combine(TempRoot, "bond0-diagnostics.log");
                if (File.Exists(logfile) && new FileInfo(logfile).Length > 512 * 1024)
                    File.Move(logfile, logfile + ".previous", true);
                File.AppendAllText(logfile, value + Environment.NewLine, new UTF8Encoding(false));
            }
            catch { /* diagnostics still visible in app if disk unavailable */ }
            if (diagnostics != null && !diagnostics.IsDisposed)
                diagnostics.Text = String.Join(Environment.NewLine, logs.TakeLast(120));
        }

        private void SetFailure(string reason)
        {
            if (InvokeRequired) { BeginInvoke(new Action<string>(SetFailure), reason); return; }
            lastFailure = reason;
            Log(reason);
            RefreshBanner();
        }

        private bool VerifyReady(out string error)
        {
            if (!File.Exists(EnginePath)) {
                error = "Motor não encontrado: " + EnginePath; return false;
            }
            if (!File.Exists(OriginalConfig)) {
                error = "Configuração original ausente: " + OriginalConfig; return false;
            }
            if (selected.Count == 0) {
                error = "Não há interfaces selecionadas. Abre Minhas redes."; return false;
            }
            var invalid = new List<string>();
            foreach (var alias in selected)
            {
                var item = NetworkInterface.GetAllNetworkInterfaces().FirstOrDefault(
                    x=>x.Name.Equals(alias, StringComparison.OrdinalIgnoreCase));
                if(item==null) {
                    invalid.Add(alias + ": adaptador não encontrado");
                    continue;
                }
                string ip = InterfaceIPv4(alias);
                if(item.OperationalStatus!=OperationalStatus.Up)
                    invalid.Add(alias + ": estado " + item.OperationalStatus);
                else if(!NetworkRules.EligibleWan(item.Name,item.Description,item.NetworkInterfaceType,ip))
                    invalid.Add(alias + ": IPv4 inválido (" + ip + "); confirma DHCP, cabo ou Wi-Fi");
            }
            if(invalid.Count>0) {
                error = "Não foi possível ligar:\n" + String.Join("\n",invalid) +
                        "\nAbre Minhas redes, ativa as ligações e confirma os IPs.";
                return false;
            }
            if(Process.GetProcessesByName("bonding-client").Any()) {
                error = "Outro bonding-client.exe já está em execução. Fecha a instância CLI anterior com Ctrl+C antes de ligar pela aplicação.";
                return false;
            }
            error = "";
            return true;
        }

        private string CreateProfile()
        {
            string original = File.ReadAllText(OriginalConfig, Encoding.UTF8);
            string line = "allowed_interfaces = [" +
                String.Join(", ",selected.OrderBy(x=>x,StringComparer.OrdinalIgnoreCase)
                .Select(x=>"\"" + x.Replace("\\","\\\\").Replace("\"","\\\"") + "\"")) + "]";
            string updated = Regex.IsMatch(original, @"(?m)^\s*allowed_interfaces\s*=") ?
                Regex.Replace(original, @"(?m)^\s*allowed_interfaces\s*=.*$", line) :
                original.TrimEnd() + Environment.NewLine + line + Environment.NewLine;
            Directory.CreateDirectory(TempRoot);
            var path=Path.Combine(TempRoot,"running-" + Process.GetCurrentProcess().Id + ".toml");
            File.WriteAllText(path, updated, new UTF8Encoding(false));
            return path;
        }

        private async Task ConnectAsync()
        {
            if(isBusy || Running()) { SetFailure("O Bond0 já está a arrancar ou está ligado."); return; }
            if(!VerifyReady(out var error)) { SetFailure(error); return; }
            isBusy = true;
            hasTunnelStatus=false;
            SetFailure("A iniciar o motor Rust... verifica o estado abaixo.");
            string profile = null;
            try
            {
                profile = CreateProfile();
                activeConfigPath=profile;
                engine = new Process();
                engine.StartInfo = new ProcessStartInfo {
                    FileName=EnginePath,
                    WorkingDirectory=Path.GetDirectoryName(EnginePath),
                    Arguments="--config \"" + profile + "\" run",
                    UseShellExecute=false, CreateNoWindow=true,
                    RedirectStandardOutput=true, RedirectStandardError=true
                };
                engine.EnableRaisingEvents=true;
                engine.OutputDataReceived+=(s,e)=>{if(!String.IsNullOrWhiteSpace(e.Data)) ProcessOutput(e.Data);};
                engine.ErrorDataReceived+=(s,e)=>{if(!String.IsNullOrWhiteSpace(e.Data)) ProcessOutput(e.Data);};
                engine.Exited+=(s,e)=>{
                    try {
                        int code=engine.ExitCode;
                        SetFailure("O motor Bond0 terminou (código " + code + "). Abre Diagnóstico para ver a causa.");
                    } catch { }
                    hasTunnelStatus=false;
                };
                if(!engine.Start()) throw new InvalidOperationException("O motor não iniciou.");
                engine.BeginOutputReadLine(); engine.BeginErrorReadLine();
                Log("Processo Rust iniciado com PID " + engine.Id);
                for(int i=0;i<28;i++)
                {
                    await Task.Delay(400);
                    if(!Running()) break;
                    var ip=InterfaceIPv4("Bond0");
                    if(ip=="não encontrado") continue;
                    if(ip!="198.18.0.2")
                    {
                        SetFailure("O Windows atribuiu ao Bond0 " + ip + ". A corrigir exclusivamente o adaptador Bond0...");
                        var code=await Task.Run(()=>SetBondIp());
                        if(code!=0) throw new InvalidOperationException("Não consegui atribuir 198.18.0.2/24 ao Bond0 (netsh: "+code+"). Executa a aplicação como administrador.");
                    }
                    hasTunnelStatus=true;
                    SetFailure("Motor iniciado. Bond0: " + InterfaceIPv4("Bond0") +
                        ". Usa Verificar túnel para validar a ligação até à VPS.");
                    break;
                }
                if (!Running()) SetFailure("O motor parou durante o arranque. Abre Diagnóstico para ver o erro do Wintun ou das interfaces.");
                else if(!hasTunnelStatus) SetFailure("O motor está ativo, mas o adaptador Bond0 não apareceu. Confere os logs e o driver Wintun.");
            }
            catch(Exception ex) { SetFailure("Falha ao ligar: " + ex.Message); }
            finally {
                if(profile!=null) {
                    try { File.Delete(profile); activeConfigPath=null; }
                    catch(Exception ex) { Log("Atenção: não foi possível eliminar o TOML temporário: " + ex.Message); }
                }
                isBusy=false;
                RefreshBanner();
            }
        }

        private void ProcessOutput(string message)
        {
            Log("RUST: " + message);
            if (Regex.IsMatch(message, @"ERROR|failed|denied|not found|panic", RegexOptions.IgnoreCase))
            {
                string detail=message;
                if(message.IndexOf("Failed to find matching adapter name",StringComparison.OrdinalIgnoreCase)>=0)
                    detail="Wintun não encontrou o adaptador esperado. Verifica o nome Bond0 em Minhas redes e o driver Wintun. Detalhe: "+message;
                SetFailure("Erro do motor: " + detail);
            }
        }

        private static int SetBondIp()
        {
            var psi=new ProcessStartInfo("netsh.exe",
                "interface ipv4 set address name=\"Bond0\" static 198.18.0.2 255.255.255.0") {
                UseShellExecute=false,CreateNoWindow=true
            };
            using var p=Process.Start(psi);
            if(p==null) return -1;
            if(!p.WaitForExit(12000)){try{p.Kill();}catch{} return -2;}
            return p.ExitCode;
        }

        private void Disconnect()
        {
            if(!Running()) { SetFailure("O motor já está desligado."); return; }
            try
            {
                engine.Kill();
                engine.WaitForExit(3000);
                hasTunnelStatus=false;
                SetFailure("Motor desligado. As interfaces físicas permanecem ligadas.");
            }
            catch(Exception ex) { SetFailure("Não consegui desligar o motor: " + ex.Message); }
        }

        private void InspectAdapters()
        {
            foreach(var name in selected) Log("WAN "+name+": "+GetInterfaceStatus(name));
            Log("Bond0: "+GetInterfaceStatus("Bond0"));
            foreach(var p in Process.GetProcessesByName("bonding-client"))
                Log("Processo Rust detectado: PID "+p.Id);
        }

        private async Task ProbeAsync()
        {
            try {
                using var handler=new HttpClientHandler{UseProxy=false};
                using var client=new HttpClient(handler){Timeout=TimeSpan.FromSeconds(7)};
                var status=await client.GetAsync("http://198.18.0.1:8765/health");
                status.EnsureSuccessStatusCode();
                SetFailure("Túnel HTTP até à VPS: ONLINE. API administrativa remota ainda NÃO estabelecida.");
                hasTunnelStatus=true;
            }
            catch(Exception ex) { SetFailure("Não obtive resposta do servidor de teste: "+ex.Message); }
        }

        private string SettingsPath => Path.Combine(TempRoot,"wan-list.txt");
        private void ReadSelectedNetworks()
        {
            try {
                if(!File.Exists(SettingsPath)) return;
                var names=File.ReadLines(SettingsPath).Where(x=>!String.IsNullOrWhiteSpace(x)&&
                    x.Length<160&&!x.Contains("\n")&&!x.Contains("\r")).Distinct(StringComparer.OrdinalIgnoreCase).Take(12).ToArray();
                if(names.Length==0)return;
                selected.Clear();
                foreach(var name in names) selected.Add(name);
            } catch(Exception ex) { Log("Não consegui ler redes guardadas: "+ex.Message); }
        }
        private void SaveSelectedNetworks()
        {
            Directory.CreateDirectory(TempRoot);
            File.WriteAllLines(SettingsPath, selected.OrderBy(x=>x));
        }

        private void MinimizeToTray()
        {
            Hide(); ShowInTaskbar=false;
            if (!trayHintShown) {
                tray.BalloonTipTitle="Bond0 em segundo plano";
                tray.BalloonTipText="O motor pode continuar ativo. Duplo clique para abrir o painel.";
                tray.ShowBalloonTip(2500);
                trayHintShown=true;
            }
        }
        private void Restore()
        {
            Show();ShowInTaskbar=true;WindowState=FormWindowState.Normal;Activate();
        }
        private void Exit()
        {
            if(Running())
            {
                var result=MessageBox.Show("Desligar o motor Bond0 e sair da aplicação?",
                    "Sair do Bond0",MessageBoxButtons.YesNo,MessageBoxIcon.Question);
                if(result!=DialogResult.Yes)return;
                Disconnect();
            }
            allowExit=true;Close();
        }
        private void OnWindowClosing(object sender, FormClosingEventArgs e)
        {
            if(!allowExit && e.CloseReason==CloseReason.UserClosing) {
                e.Cancel=true;MinimizeToTray();return;
            }
            refresh.Stop();tray.Visible=false;tray.Dispose();
            if(activeConfigPath!=null){try{File.Delete(activeConfigPath);}catch{}}
        }
    }
}
