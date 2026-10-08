using System;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Drawing;
using System.Diagnostics;
using System.Net;
using System.Net.NetworkInformation;
using System.Security.Principal;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Linq;
using System.Collections.Generic;

namespace Bond0Control
{
  static class Program
  {
    [STAThread]
    static void Main()
    {
      if (!IsAdministrator())
      {
        try
        {
          Process.Start(new ProcessStartInfo(Application.ExecutablePath)
          { Verb = "runas", UseShellExecute = true });
        }
        catch (Exception ex)
        {
          MessageBox.Show("O Bond0 precisa de permissões de administrador para configurar apenas o adaptador virtual.\n\n" + ex.Message,
            "Bond0 - Permissões", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
        return;
      }
      Application.EnableVisualStyles();
      Application.SetCompatibleTextRenderingDefault(false);
      Application.Run(new MainForm());
    }
    static bool IsAdministrator()
    {
      using (WindowsIdentity identity = WindowsIdentity.GetCurrent())
      {
        return new WindowsPrincipal(identity).IsInRole(WindowsBuiltInRole.Administrator);
      }
    }
  }

  public class MainForm : Form
  {
    readonly Color back = Color.FromArgb(12, 19, 34);
    readonly Color panel = Color.FromArgb(22, 33, 54);
    readonly Color panel2 = Color.FromArgb(32, 46, 69);
    readonly Color accent = Color.FromArgb(57, 137, 240);
    readonly Color sea = Color.FromArgb(36, 196, 173);
    readonly Color muted = Color.FromArgb(154, 169, 188);
    readonly Color white = Color.FromArgb(239, 246, 255);
    readonly Color amber = Color.FromArgb(240, 180, 86);

    const string TUN_NAME = "Bond0";
    const string TUN_IP = "198.18.0.2";
    const string SERVER_IP = "198.18.0.1";
    const string BENCH_URL = "http://198.18.0.1:8765";
    const int TEST_SIZE = 4194304;

    readonly string defaultDirectory = @"C:\Bond0";
    string enginePath, configPath;
    Process client;
    bool busy = false, closing = false;
    string mode = "A+B";
    DateTime started;

    Label lblStatus, lblMode, lblIp, lblServer, lblWanA, lblWanB, lblSpeed, lblHint;
    TextBox txtLog, txtEngine, txtConfig;
    Button btnStart, btnStop, btnPing, btnSpeed, btnCheck;
    ComboBox cboMode;
    CheckedListBox clNetworks;
    Label lblSelectedNetworks;
    System.Windows.Forms.Timer clock;

    public MainForm()
    {
      enginePath = Path.Combine(defaultDirectory, "bonding-client.exe");
      configPath = Path.Combine(defaultDirectory, "bonding-client.toml");
      Text = "Bond0 Control Center  |  Windows";
      Size = new Size(1000, 740);
      MinimumSize = new Size(800, 640);
      StartPosition = FormStartPosition.CenterScreen;
      BackColor = back;
      Font = new Font("Segoe UI", 10f);
      ForeColor = white;
      AutoScaleMode = AutoScaleMode.Dpi;
      BuildUI();
      clock = new System.Windows.Forms.Timer();
      clock.Interval = 3500;
      clock.Tick += (s, e) => RefreshLocalStatus();
      clock.Start();
      RefreshLocalStatus();
      Log("Bond0 Control Center v0.1 | Sem IA | Motor Rust existente");
      Log("Operações restritas a Bond0; os adaptadores Ethernet e Wi-Fi nunca são desligados.");
      FormClosing += OnAppClosing;
    }

    Label Label(string text, float size, Color color, bool bold)
    {
      return new Label {
        Text = text, Font = new Font("Segoe UI", size, bold ? FontStyle.Bold : FontStyle.Regular),
        ForeColor = color, AutoSize = true, Margin = new Padding(0, 0, 0, 6),
        BackColor = Color.Transparent
      };
    }

    Button Button(string text, Color color, EventHandler click, int w)
    {
      Button b = new Button { Text = text, Width = w, Height = 40, FlatStyle = FlatStyle.Flat,
        BackColor = color, ForeColor = white, Cursor = Cursors.Hand, Margin = new Padding(0, 0, 9, 0),
        Font = new Font("Segoe UI", 9.5f, FontStyle.Bold) };
      b.FlatAppearance.BorderSize = 0;
      if (click != null) b.Click += click;
      return b;
    }

    Panel Card(int w, int h)
    {
      return new Panel { Width = w, Height = h, BackColor = panel,
        Margin = new Padding(0, 0, 13, 12), Padding = new Padding(19, 15, 15, 12) };
    }

    FlowLayoutPanel Flow(bool vertical)
    {
      return new FlowLayoutPanel { Dock = DockStyle.Fill, FlowDirection = vertical ?
        FlowDirection.TopDown : FlowDirection.LeftToRight, WrapContents = !vertical,
        AutoScroll = true, Padding = new Padding(18, 18, 12, 16), BackColor = back };
    }

    void BuildUI()
    {
      Panel header = new Panel { Dock = DockStyle.Top, Height = 102, BackColor = panel };
      Label title = Label("Bond0  /  CONTROL CENTER", 19, white, true);
      title.Location = new Point(24, 19);
      header.Controls.Add(title);
      Label sub = Label("Duas Internets. Um túnel. Controlo simples e sem inteligência artificial.", 9, muted, false);
      sub.Location = new Point(25, 60); header.Controls.Add(sub);
      lblStatus = Label("● DESLIGADO", 11, amber, true);
      lblStatus.AutoSize = false; lblStatus.TextAlign = ContentAlignment.MiddleRight;
      lblStatus.Anchor = AnchorStyles.Right | AnchorStyles.Top;
      lblStatus.Location = new Point(760, 31); lblStatus.Size = new Size(200, 30);
      header.Resize += (s, e) => { lblStatus.Left = header.ClientSize.Width - lblStatus.Width - 25; };
      header.Controls.Add(lblStatus);
      Controls.Add(header);

      TabControl tabs = new TabControl { Dock = DockStyle.Fill, Font = new Font("Segoe UI", 10),
        Padding = new Point(17, 8) };
      tabs.TabPages.Add(BuildDashboard());
      tabs.TabPages.Add(BuildShare());
      tabs.TabPages.Add(BuildSettings());
      tabs.TabPages.Add(BuildDiagnostics());
      Controls.Add(tabs);
      tabs.BringToFront();
      header.BringToFront();
    }

    TabPage BuildDashboard()
    {
      TabPage tp = new TabPage("Painel principal") { BackColor = back };
      FlowLayoutPanel content = Flow(true); tp.Controls.Add(content);

      Panel chooser = Card(900, 111);
      chooser.Controls.Add(LabelAt("PERFIL DE LIGAÇÃO", 9, muted, true, 0, 0, 500));
      cboMode = new ComboBox { DropDownStyle = ComboBoxStyle.DropDownList,
        Width = 230, Height = 35, Location = new Point(0, 35),
        Font = new Font("Segoe UI", 11) };
      cboMode.Items.AddRange(new object[] {"A+B  •  Agregado (STRIPE)", "A  •  Ethernet 3", "B  •  Wi-Fi 2", "Personalizado  •  Escolher múltiplas redes"});
      cboMode.SelectedIndex = 0;
      cboMode.SelectedIndexChanged += (s,e)=> {
        mode = cboMode.SelectedIndex == 0 ? "A+B" : cboMode.SelectedIndex == 1 ? "A" : cboMode.SelectedIndex == 2 ? "B" : "Personalizado";
        lblMode.Text = mode;
        Log("Perfil selecionado: " + mode + ". Será aplicado na próxima ligação.");
      };
      chooser.Controls.Add(cboMode);
      chooser.Controls.Add(LabelAt("A mudança de perfil não desativa as placas de rede.", 9, muted, false, 250, 41, 590));
      content.Controls.Add(chooser);

      FlowLayoutPanel buttons = new FlowLayoutPanel { Width = 900, Height = 55, WrapContents = false, BackColor = back };
      btnStart = Button("Ligar Bond0", Color.FromArgb(31, 155, 117), (s,e)=>StartClient(), 164);
      btnStop = Button("Desligar", Color.FromArgb(142, 70, 84), (s,e)=>StopClient(), 140);
      btnPing = Button("Testar ping", panel2, (s,e)=>PingTest(), 140);
      btnCheck = Button("Verificar VPS", panel2, (s,e)=>HealthTest(), 153);
      btnSpeed = Button("Laboratório de velocidade", accent, (s,e)=>OpenSpeedLab(), 230);
      buttons.Controls.Add(btnStart); buttons.Controls.Add(btnStop); buttons.Controls.Add(btnPing);
      buttons.Controls.Add(btnCheck); buttons.Controls.Add(btnSpeed);
      content.Controls.Add(buttons);

      FlowLayoutPanel row = new FlowLayoutPanel { Width = 925, Height = 144, WrapContents = false };
      Panel a = Card(289, 128), b = Card(289, 128), c = Card(289, 128);
      a.Controls.Add(LabelAt("INTERNET A", 9, muted, true, 0, 0, 250));
      lblWanA = LabelAt("Ethernet 3\nA aguardar leitura...", 11, white, true, 0, 29, 252); a.Controls.Add(lblWanA);
      b.Controls.Add(LabelAt("INTERNET B", 9, muted, true, 0, 0, 250));
      lblWanB = LabelAt("Wi-Fi 2\nA aguardar leitura...", 11, white, true, 0, 29, 252); b.Controls.Add(lblWanB);
      c.Controls.Add(LabelAt("MODO ATUAL", 9, muted, true, 0, 0, 250));
      lblMode = LabelAt("A+B", 19, sea, true, 0, 27, 252); c.Controls.Add(lblMode);
      row.Controls.Add(a); row.Controls.Add(b); row.Controls.Add(c); content.Controls.Add(row);

      FlowLayoutPanel row2 = new FlowLayoutPanel { Width = 925, Height = 145, WrapContents = false };
      Panel tun = Card(442, 131), srv = Card(442, 131);
      tun.Controls.Add(LabelAt("ADAPTADOR VIRTUAL WINDOWS", 9, muted, true, 0, 0, 399));
      lblIp = LabelAt("Bond0: a verificar...", 14, white, true, 0, 29, 397); tun.Controls.Add(lblIp);
      srv.Controls.Add(LabelAt("SERVIDOR ORACLE / TÚNEL", 9, muted, true, 0, 0, 399));
      lblServer = LabelAt("198.18.0.1  /  aguardando", 13, white, true, 0, 29, 397); srv.Controls.Add(lblServer);
      row2.Controls.Add(tun); row2.Controls.Add(srv); content.Controls.Add(row2);

      Panel speed = Card(900, 88);
      speed.Controls.Add(LabelAt("ÚLTIMA MEDIÇÃO", 9, muted, true, 0, 0, 600));
      lblSpeed = LabelAt("Ainda não medida", 15, sea, true, 0, 27, 780);
      speed.Controls.Add(lblSpeed); content.Controls.Add(speed);
      lblHint = Label("O modo A+B usa STRIPE. A soma de velocidades só é confirmada após comparar A, B e A+B.", 9, muted, false);
      content.Controls.Add(lblHint);
      return tp;
    }

    Label LabelAt(string text, float size, Color color, bool bold, int x, int y, int w)
    {
      Label l = Label(text, size, color, bold);
      l.Location = new Point(x, y); l.MaximumSize = new Size(w, 90); l.AutoSize = true;
      return l;
    }

    TabPage BuildShare()
    {
      TabPage tp = new TabPage("Partilhar Internet") { BackColor = back };
      FlowLayoutPanel f = Flow(true); tp.Controls.Add(f);
      Panel intro = Card(850, 172);
      intro.Controls.Add(LabelAt("PARTILHAR O BOND0 COM OUTROS DISPOSITIVOS", 13, white, true, 0, 0, 800));
      intro.Controls.Add(LabelAt("O Windows pode partilhar Internet por hotspot Wi-Fi. Contudo, para partilhar A+B é necessário que o próprio Windows use o Bond0 como saída principal, com exceções de rotas e NAT validadas.", 10, muted, false, 0, 39, 810));
      f.Controls.Add(intro);
      Panel actions = Card(850, 185);
      actions.Controls.Add(LabelAt("ASSISTENTE DE HOTSPOT (fase de segurança)", 11, white, true, 0, 0, 800));
      actions.Controls.Add(LabelAt("1. Confirma a ligação Bond0.\n2. Abre o hotspot do Windows para selecionar a origem de Internet.\n3. Não ativa partilha automática sem garantir a prevenção de ciclos de routing.", 9, muted, false, 0, 34, 790));
      Button open = Button("Abrir Hotspot Windows", accent, (s,e)=>OpenHotspot(), 220);
      open.Location = new Point(0, 120); actions.Controls.Add(open);
      Button verify = Button("Pré-verificar hotspot", panel2, (s,e)=>OpenHotspotPreflight(), 190);
      verify.Location = new Point(238, 120); actions.Controls.Add(verify);
      f.Controls.Add(actions);

      Panel future = Card(850, 138);
      future.Controls.Add(LabelAt("PARTILHA AUTOMÁTICA A+B — NÃO ATIVADA NESTA VERSÃO", 11, amber, true, 0, 0, 810));
      future.Controls.Add(LabelAt("Esta versão não altera a rota predefinida do Windows, não cria NAT e não força ICS. Uma opção automática será adicionada após testar o hotspot, as exceções de rota da Oracle e a recuperação de falhas.", 9, muted, false, 0, 40, 800));
      f.Controls.Add(future);
      return tp;
    }

    TabPage BuildSettings()
    {
      TabPage tp = new TabPage("Configuração") { BackColor = back };
      FlowLayoutPanel f = Flow(true); tp.Controls.Add(f);
      Panel card = Card(850, 256);
      card.Controls.Add(LabelAt("MOTOR EXISTENTE — NÃO É RECOMPILADO", 11, white, true, 0, 0, 795));
      card.Controls.Add(LabelAt("Localização do bonding-client.exe", 9, muted, false, 0, 38, 750));
      txtEngine = new TextBox { Location = new Point(0, 65), Width = 800, Text = enginePath, Font = new Font("Consolas", 10) };
      card.Controls.Add(txtEngine);
      card.Controls.Add(LabelAt("Configuração principal TOML (a chave existente é preservada)", 9, muted, false, 0, 105, 750));
      txtConfig = new TextBox { Location = new Point(0, 133), Width = 800, Text = configPath, Font = new Font("Consolas", 10) };
      card.Controls.Add(txtConfig);
      Button save = Button("Guardar caminhos", accent, (s,e)=>{
        if (client != null && !client.HasExited) { MessageBox.Show("Desliga o Bond0 antes de alterar os caminhos."); return; }
        enginePath = txtEngine.Text.Trim(); configPath = txtConfig.Text.Trim();
        Log("Caminhos actualizados nesta sessão."); MessageBox.Show("Caminhos atualizados.");
      }, 191);
      save.Location = new Point(0, 189); card.Controls.Add(save);
      f.Controls.Add(card);
      Panel networks = Card(850, 260);
      networks.Controls.Add(LabelAt("ADICIONAR REDES — WI-FI USB, ETHERNET, TETHERING", 11, white, true, 0, 0, 790));
      networks.Controls.Add(LabelAt("Seleciona 1 ou mais adaptadores reais; depois escolhe Personalizado no painel principal. Não desliga placas nem altera as suas rotas.", 9, muted, false, 0, 31, 790));
      clNetworks = new CheckedListBox { Location = new Point(0, 75), Size = new Size(585, 150),
        CheckOnClick = true, BackColor = panel2, ForeColor = white, BorderStyle = BorderStyle.None };
      networks.Controls.Add(clNetworks);
      Button refresh = Button("Atualizar lista", accent, (s,e)=>LoadNetworkChoices(), 165);
      refresh.Location = new Point(614, 75); networks.Controls.Add(refresh);
      lblSelectedNetworks = LabelAt("Selecciona as redes físicas pretendidas.", 9, muted, false, 614, 125, 200);
      networks.Controls.Add(lblSelectedNetworks);
      clNetworks.ItemCheck += (s,e)=> BeginInvoke(new Action(()=> {
         if (lblSelectedNetworks != null) lblSelectedNetworks.Text = "Selecionadas: " + clNetworks.CheckedItems.Count;
      }));
      f.Controls.Add(networks);
      LoadNetworkChoices();
      Panel notes = Card(850, 146);
      notes.Controls.Add(LabelAt("DEFINIÇÕES SEGURAS", 11, white, true, 0, 0, 740));
      notes.Controls.Add(LabelAt("• IP Windows: 198.18.0.2/24\n• Servidor de saúde: 198.18.0.1:8765 (somente no túnel)\n• Perfis temporários derivados do TOML original, sem escrever sobre ele.\n• Ethernet 3 e Wi-Fi 2 nunca são desativados pelo aplicativo.", 9, muted, false, 0, 35, 790));
      f.Controls.Add(notes);
      return tp;
    }

    TabPage BuildDiagnostics()
    {
      TabPage tp = new TabPage("Diagnóstico e registos") { BackColor = back };
      Panel container = new Panel { Dock = DockStyle.Fill, BackColor = back, Padding = new Padding(18) };
      Panel top = new Panel { Dock = DockStyle.Top, Height = 64, BackColor = back };
      Button sockets = Button("Ver sockets UDP", accent, (s,e)=>ShowSockets(), 175);
      Button export = Button("Exportar registo", panel2, (s,e)=>ExportLog(), 168);
      Button clear = Button("Limpar", panel2, (s,e)=>txtLog.Clear(), 120);
      sockets.Location = new Point(0, 7); export.Location = new Point(188, 7); clear.Location = new Point(368, 7);
      top.Controls.Add(sockets); top.Controls.Add(export); top.Controls.Add(clear);
      txtLog = new TextBox { Multiline = true, ReadOnly = true, ScrollBars = ScrollBars.Both,
        WordWrap = false, Font = new Font("Consolas", 10), BackColor = panel,
        ForeColor = white, Dock = DockStyle.Fill, BorderStyle = BorderStyle.None };
      container.Controls.Add(txtLog); container.Controls.Add(top);
      tp.Controls.Add(container);
      return tp;
    }

    void Log(string message)
    {
      if (txtLog == null || txtLog.IsDisposed || closing) return;
      if (InvokeRequired)
      {
        try { BeginInvoke(new Action<string>(Log), message); } catch { }
        return;
      }
      // Never log the encryption key or full TOML.
      if (message.IndexOf("encryption_key_b64", StringComparison.OrdinalIgnoreCase) >= 0)
        message = "[redacted config entry]";
      txtLog.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + message + Environment.NewLine);
    }

    string InterfaceIPv4(string name)
    {
      try
      {
        foreach (NetworkInterface n in NetworkInterface.GetAllNetworkInterfaces())
          if (string.Equals(n.Name, name, StringComparison.OrdinalIgnoreCase))
          {
            var ip = n.GetIPProperties().UnicastAddresses
                 .FirstOrDefault(x => x.Address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork);
            if (ip != null) return ip.Address.ToString();
            return "sem endereço IPv4";
          }
      }
      catch {}
      return "não encontrado";
    }

    void RefreshLocalStatus()
    {
      if (closing || IsDisposed) return;
      string a = InterfaceIPv4("Ethernet 3");
      string b = InterfaceIPv4("Wi-Fi 2");
      lblWanA.Text = "Ethernet 3\n" + a;
      lblWanB.Text = "Wi-Fi 2\n" + b;
      string ip = InterfaceIPv4(TUN_NAME);
      lblIp.Text = "Bond0  /  " + ip;
      bool on = client != null && !client.HasExited;
      lblStatus.Text = on ? "● LIGADO — " + mode : "● DESLIGADO";
      lblStatus.ForeColor = on ? sea : amber;
      btnStart.Enabled = !on && !busy;
      btnStop.Enabled = on;
    }

    void SetBusy(bool b)
    {
      busy = b;
      btnPing.Enabled = !b;
      btnSpeed.Enabled = !b;
      btnCheck.Enabled = !b;
      btnStart.Enabled = !b && (client == null || client.HasExited);
    }

    void LoadNetworkChoices()
    {
      if (clNetworks == null) return;
      HashSet<string> selected = new HashSet<string>(clNetworks.CheckedItems.Cast<string>(),
        StringComparer.OrdinalIgnoreCase);
      clNetworks.Items.Clear();
      foreach (NetworkInterface n in NetworkInterface.GetAllNetworkInterfaces()
                 .OrderBy(n=>n.Name))
      {
        string ip = InterfaceIPv4(n.Name);
        if (!NetworkRules.EligibleWan(n.Name, n.Description, n.NetworkInterfaceType, ip)) continue;
        clNetworks.Items.Add(n.Name, selected.Contains(n.Name) ||
            (selected.Count == 0 && (n.Name == "Ethernet 3" || n.Name == "Wi-Fi 2")));
      }
    }

    string ProfileConfig()
    {
      string original = File.ReadAllText(configPath, Encoding.UTF8);
      List<string> chosen;
      if (mode == "Personalizado")
      {
        if (clNetworks == null) throw new Exception("Não há lista de interfaces.");
        chosen = clNetworks.CheckedItems.Cast<string>().ToList();
      }
      else if (mode == "A") chosen = new List<string>{"Ethernet 3"};
      else if (mode == "B") chosen = new List<string>{"Wi-Fi 2"};
      else chosen = new List<string>{"Ethernet 3","Wi-Fi 2"};
      if (chosen.Count == 0) throw new Exception("Seleciona pelo menos uma ligação para o Bond0.");
      if (chosen.Count != chosen.Distinct(StringComparer.OrdinalIgnoreCase).Count())
        throw new Exception("Não podes selecionar a mesma interface mais do que uma vez.");
      foreach (string adapter in chosen)
        if (adapter.IndexOfAny(new [] {'"', '\\', '\r', '\n'}) >= 0)
          throw new Exception("Nome de interface inválido: " + adapter);
      string assignment = "allowed_interfaces = [" + String.Join(", ", chosen.Select(n => "\"" + n + "\"")) + "]";
      string target = Regex.IsMatch(original, @"(?m)^\s*allowed_interfaces\s*=") ?
        Regex.Replace(original, @"(?m)^\s*allowed_interfaces\s*=.*$", assignment) :
        original.TrimEnd() + Environment.NewLine + assignment + Environment.NewLine;
      string dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Bond0Control", "Profiles");
      Directory.CreateDirectory(dir);
      string path = Path.Combine(dir, "active-" + Process.GetCurrentProcess().Id + ".toml");
      File.WriteAllText(path, target, new UTF8Encoding(false));
      return path;
    }

    async void StartClient()
    {
      if (busy || (client != null && !client.HasExited)) return;
      if (!File.Exists(enginePath) || !File.Exists(configPath))
      {
        MessageBox.Show("Não encontrei o motor ou a configuração em C:\\Bond0. Verifica o separador Configuração.");
        return;
      }
      if (Process.GetProcessesByName("bonding-client").Any(p => !p.HasExited))
      {
        MessageBox.Show("Já existe um bonding-client em execução fora desta aplicação.\nFecha-o com Ctrl+C na janela original e tenta novamente.",
          "Bond0", MessageBoxButtons.OK, MessageBoxIcon.Information);
        return;
      }
      SetBusy(true);
      string profile = null;
      try
      {
        profile = ProfileConfig();
        ProcessStartInfo info = new ProcessStartInfo(enginePath);
        info.Arguments = "--config \"" + profile + "\" run";
        info.WorkingDirectory = Path.GetDirectoryName(enginePath);
        info.UseShellExecute = false;
        info.CreateNoWindow = true;
        info.RedirectStandardOutput = true;
        info.RedirectStandardError = true;
        client = new Process { StartInfo = info, EnableRaisingEvents = true };
        client.OutputDataReceived += (s, e) => { if (!string.IsNullOrEmpty(e.Data)) Log(e.Data); };
        client.ErrorDataReceived += (s, e) => { if (!string.IsNullOrEmpty(e.Data)) Log(e.Data); };
        client.Exited += (s,e) => {
          int exitCode = 0;
          try { exitCode = client.ExitCode; } catch {}
          Log("Motor Bond0 terminou. ExitCode=" + exitCode);
          try { BeginInvoke(new Action(RefreshLocalStatus)); } catch {}
        };
        client.Start();
        client.BeginOutputReadLine(); client.BeginErrorReadLine();
        started = DateTime.Now;
        Log("Motor iniciado com perfil " + mode + " (PID " + client.Id + ").");
        bool found = false;
        for (int i = 0; i < 28; i++)
        {
          await Task.Delay(500);
          if (client.HasExited) break;
          if (InterfaceIPv4(TUN_NAME) != "não encontrado") { found = true; break; }
        }
        if (found && !client.HasExited)
        {
          string current = InterfaceIPv4(TUN_NAME);
          if (current != TUN_IP)
          {
            Log("A aplicar exclusivamente o IP " + TUN_IP + "/24 ao adaptador Bond0...");
            int result = await Task.Run(() => NetshSetBond0());
            Log(result == 0 ? "Endereço Bond0 configurado." : "Falha netsh (código " + result + ").");
          }
          await Task.Delay(300);
          Log("Bond0 IP atual: " + InterfaceIPv4(TUN_NAME));
        }
        else Log("Adaptador Bond0 não foi encontrado. Confere os registos do motor.");
      }
      catch (Exception ex)
      {
        Log("Erro ao ligar: " + ex.Message);
        MessageBox.Show(ex.Message, "Bond0 - Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
      }
      finally
      {
        // The engine loads its TOML at startup. Erase the temporary key-bearing
        // profile as soon as startup completes; never keep it for the session.
        if (!String.IsNullOrEmpty(profile))
        {
          try { File.Delete(profile); }
          catch (Exception ex) { Log("Não foi possível apagar o perfil temporário: " + ex.Message); }
        }
        SetBusy(false);
        RefreshLocalStatus();
      }
    }

    int NetshSetBond0()
    {
      ProcessStartInfo psi = new ProcessStartInfo("netsh.exe", "interface ipv4 set address name=\"Bond0\" static 198.18.0.2 255.255.255.0");
      psi.UseShellExecute = false; psi.CreateNoWindow = true;
      using (Process p = Process.Start(psi))
      {
        if (!p.WaitForExit(12000)) { try { p.Kill(); } catch {} return -1; }
        return p.ExitCode;
      }
    }

    void StopClient()
    {
      if (client == null || client.HasExited) return;
      DialogResult ok = MessageBox.Show("Desligar apenas o processo Bond0 iniciado por esta aplicação?\nAs placas físicas e as rotas predefinidas não serão alteradas.",
        "Bond0", MessageBoxButtons.YesNo, MessageBoxIcon.Question);
      if (ok != DialogResult.Yes) return;
      try
      {
        client.Kill(); client.WaitForExit(2500);
        Log("Motor parado pela aplicação.");
      }
      catch (Exception ex) { Log("Falha ao desligar: " + ex.Message); }
      RefreshLocalStatus();
    }

    async void PingTest()
    {
      SetBusy(true);
      try
      {
        Log("A testar 6 pings ao servidor " + SERVER_IP + "...");
        string outcome = await Task.Run(() => {
          int received = 0; long total = 0, low = long.MaxValue, high = 0;
          using (Ping ping = new Ping())
          {
            for (int i = 0; i < 6; i++)
            {
              try
              {
                PingReply r = ping.Send(IPAddress.Parse(SERVER_IP), 1600);
                if (r.Status == IPStatus.Success)
                { received++; total += r.RoundtripTime; low = Math.Min(low, r.RoundtripTime); high = Math.Max(high, r.RoundtripTime); }
              }
              catch {}
              Thread.Sleep(150);
            }
          }
          return received + "/6 recebidos | " + (received > 0 ? "média " + (total/received) + " ms | " + low + "–" + high + " ms" : "sem respostas");
        });
        Log("PING: " + outcome);
      }
      catch (Exception ex) { Log("Ping falhou: " + ex.Message); }
      finally { SetBusy(false); RefreshLocalStatus(); }
    }

    async void HealthTest()
    {
      SetBusy(true);
      try
      {
        string message = await Task.Run(() => {
          HttpWebRequest req = (HttpWebRequest)WebRequest.Create(BENCH_URL + "/health");
          req.Proxy = null; req.Timeout = 6000; req.ReadWriteTimeout = 6000;
          req.KeepAlive = false;
          using (WebResponse response = req.GetResponse())
          using (StreamReader reader = new StreamReader(response.GetResponseStream()))
            return reader.ReadToEnd().Trim();
        });
        lblServer.Text = SERVER_IP + "  /  ONLINE";
        Log("Servidor privado: " + message);
      }
      catch (Exception ex)
      {
        lblServer.Text = SERVER_IP + "  /  sem resposta HTTP";
        Log("Sem resposta do serviço de teste: " + ex.Message);
      }
      finally { SetBusy(false); RefreshLocalStatus(); }
    }

    async void SpeedTest()
    {
      if (client == null || client.HasExited)
      {
        MessageBox.Show("Liga primeiro o Bond0 nesta aplicação.");
        return;
      }
      SetBusy(true);
      try
      {
        Log("Download controlado de 4 MiB pelo túnel (modo " + mode + ")...");
        string result = await Task.Run(() => {
          HttpWebRequest req = (HttpWebRequest)WebRequest.Create(BENCH_URL + "/down?bytes=" + TEST_SIZE);
          req.Proxy = null; req.Timeout = 60000; req.ReadWriteTimeout = 60000; req.KeepAlive = false;
          Stopwatch timer = Stopwatch.StartNew();
          long count = 0;
          using (WebResponse response = req.GetResponse())
          using (Stream stream = response.GetResponseStream())
          {
            byte[] buf = new byte[65536]; int n;
            while ((n = stream.Read(buf,0,buf.Length)) > 0) count += n;
          }
          timer.Stop();
          if (count != TEST_SIZE) throw new Exception("Transferência incompleta: " + count + " de " + TEST_SIZE);
          double mbps = (count * 8.0) / timer.Elapsed.TotalSeconds / 1000000.0;
          return mbps.ToString("F2") + " Mbps | " + timer.Elapsed.TotalSeconds.ToString("F2") + " s | 4 MiB";
        });
        lblSpeed.Text = result + "  [" + mode + "]";
        Log("DOWNLOAD " + mode + ": " + result);
      }
      catch (Exception ex) { Log("Falha no teste de velocidade: " + ex.Message); }
      finally { SetBusy(false); RefreshLocalStatus(); }
    }

    void OpenSpeedLab()
    {
      using (var form = new SpeedLabForm(
        () => mode,
        () => client != null && !client.HasExited,
        message => Log(message)))
        form.ShowDialog(this);
    }

    void OpenHotspotPreflight()
    {
      using (var form = new HotspotPreflightForm(
        () => client != null && !client.HasExited,
        message => Log(message)))
        form.ShowDialog(this);
    }

    void OpenHotspot()
    {
      try
      {
        Log("A abrir as definições do hotspot do Windows. A partilha automática A+B ainda requer validação.");
        Process.Start(new ProcessStartInfo("ms-settings:network-mobilehotspot") { UseShellExecute = true });
      }
      catch(Exception ex) { MessageBox.Show("Não consegui abrir as definições: " + ex.Message); }
    }

    async void ShowSockets()
    {
      if (client == null || client.HasExited) { Log("Nenhum motor controlado em execução."); return; }
      int pid = client.Id;
      try
      {
        string raw = await Task.Run(() => {
          ProcessStartInfo psi = new ProcessStartInfo("netstat.exe", "-ano -p udp");
          psi.CreateNoWindow = true; psi.UseShellExecute = false; psi.RedirectStandardOutput = true;
          using (Process proc = Process.Start(psi)) {
            string s = proc.StandardOutput.ReadToEnd();
            proc.WaitForExit(10000);
            return s;
          }
        });
        Log("Sockets UDP do processo " + pid + ":");
        int found = 0;
        foreach (string line in raw.Split('\n'))
          if (Regex.IsMatch(line, @"^\s*UDP\s+") && Regex.IsMatch(line, @"\s" + pid + @"\s*$"))
          { Log(line.Trim()); found++; }
        if (found == 0) Log("Nenhum socket UDP encontrado para este PID.");
      }
      catch (Exception ex) { Log("Erro nos sockets: " + ex.Message); }
    }

    void ExportLog()
    {
      using (SaveFileDialog d = new SaveFileDialog { Filter = "Registo de texto|*.txt",
        FileName = "Bond0-diagnostico-" + DateTime.Now.ToString("yyyyMMdd-HHmmss") + ".txt" })
        if (d.ShowDialog() == DialogResult.OK)
        {
          File.WriteAllText(d.FileName, txtLog.Text, new UTF8Encoding(false));
          Log("Registo exportado.");
        }
    }

    void OnAppClosing(object sender, FormClosingEventArgs e)
    {
      if (client != null && !client.HasExited)
      {
        DialogResult answer = MessageBox.Show("O Bond0 está ligado. Encerrar também o motor?\nA Internet física não será alterada.",
          "Sair do Bond0", MessageBoxButtons.YesNoCancel);
        if (answer == DialogResult.Cancel) { e.Cancel = true; return; }
        if (answer == DialogResult.Yes) try { client.Kill(); client.WaitForExit(2000); } catch {}
      }
      closing = true;
      if (clock != null) clock.Stop();
      try
      {
        string dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Bond0Control", "Profiles");
        string own = Path.Combine(dir, "active-" + Process.GetCurrentProcess().Id + ".toml");
        // Only remove own temporary config after the client is stopped.
        if ((client == null || client.HasExited) && File.Exists(own)) File.Delete(own);
      }
      catch {}
    }
  }
}