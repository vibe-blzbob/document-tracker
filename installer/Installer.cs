using System;
using System.Drawing;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;

namespace DocTrackInstaller
{
    public class SetupForm : Form
    {
        private TextBox txtDest;
        private Button btnBrowse;
        private CheckBox chkDesktop;
        private CheckBox chkStartMenu;
        private CheckBox chkLaunch;
        private Button btnInstall;
        private ProgressBar progressBar;
        private Label lblStatus;
        private bool isInstalling = false;

        public SetupForm()
        {
            this.Text = "DocTrack LGU - Setup Wizard";
            this.Size = new Size(560, 420);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.BackColor = Color.FromArgb(15, 23, 42); // Slate 900
            this.ForeColor = Color.FromArgb(248, 250, 252);
            this.Font = new Font("Segoe UI", 9F, FontStyle.Regular);

            this.FormClosing += (s, e) =>
            {
                if (isInstalling)
                {
                    e.Cancel = true;
                }
            };

            BuildUI();
        }

        private void BuildUI()
        {
            // Banner Header
            Panel header = new Panel
            {
                Dock = DockStyle.Top,
                Height = 78,
                BackColor = Color.FromArgb(30, 41, 59) // Slate 800
            };

            Label title = new Label
            {
                Text = "DocTrack LGU - Installation Setup",
                Font = new Font("Segoe UI", 13F, FontStyle.Bold),
                ForeColor = Color.White,
                Location = new Point(22, 14),
                AutoSize = true
            };

            Label subtitle = new Label
            {
                Text = "Municipal Document Tracking & Routing Information System (LAN & Offline Ready)",
                Font = new Font("Segoe UI", 8.5F),
                ForeColor = Color.FromArgb(148, 163, 184),
                Location = new Point(22, 42),
                AutoSize = true
            };

            header.Controls.Add(title);
            header.Controls.Add(subtitle);
            this.Controls.Add(header);

            // Install Destination
            Label lblDest = new Label
            {
                Text = "Installation Directory:",
                Location = new Point(25, 95),
                AutoSize = true,
                ForeColor = Color.FromArgb(203, 213, 225),
                Font = new Font("Segoe UI", 9F, FontStyle.Bold)
            };
            this.Controls.Add(lblDest);

            string defaultPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "DocTrack-LGU");
            txtDest = new TextBox
            {
                Text = defaultPath,
                Location = new Point(25, 120),
                Width = 405,
                BackColor = Color.FromArgb(30, 41, 59),
                ForeColor = Color.White,
                BorderStyle = BorderStyle.FixedSingle,
                Font = new Font("Segoe UI", 9.5F)
            };
            this.Controls.Add(txtDest);

            btnBrowse = new Button
            {
                Text = "Browse...",
                Location = new Point(440, 118),
                Width = 82,
                Height = 27,
                FlatStyle = FlatStyle.Flat,
                ForeColor = Color.White,
                BackColor = Color.FromArgb(51, 65, 85),
                Cursor = Cursors.Hand
            };
            btnBrowse.FlatAppearance.BorderColor = Color.FromArgb(71, 85, 105);
            btnBrowse.Click += (s, e) =>
            {
                using (FolderBrowserDialog fbd = new FolderBrowserDialog())
                {
                    fbd.SelectedPath = txtDest.Text;
                    if (fbd.ShowDialog() == DialogResult.OK)
                    {
                        txtDest.Text = fbd.SelectedPath;
                    }
                }
            };
            this.Controls.Add(btnBrowse);

            // Options
            chkDesktop = new CheckBox
            {
                Text = "Create Desktop Shortcut (DocTrack LGU)",
                Checked = true,
                Location = new Point(25, 162),
                AutoSize = true,
                ForeColor = Color.FromArgb(226, 232, 240)
            };
            this.Controls.Add(chkDesktop);

            chkStartMenu = new CheckBox
            {
                Text = "Create Start Menu Program Shortcut",
                Checked = true,
                Location = new Point(25, 188),
                AutoSize = true,
                ForeColor = Color.FromArgb(226, 232, 240)
            };
            this.Controls.Add(chkStartMenu);

            chkLaunch = new CheckBox
            {
                Text = "Launch DocTrack LGU immediately after install",
                Checked = true,
                Location = new Point(25, 214),
                AutoSize = true,
                ForeColor = Color.FromArgb(226, 232, 240)
            };
            this.Controls.Add(chkLaunch);

            // Progress & Status
            progressBar = new ProgressBar
            {
                Location = new Point(25, 252),
                Width = 497,
                Height = 20,
                Visible = false
            };
            this.Controls.Add(progressBar);

            lblStatus = new Label
            {
                Text = "Click 'Install Now' to deploy DocTrack LGU to this computer.",
                Location = new Point(25, 280),
                Width = 497,
                Height = 35,
                ForeColor = Color.FromArgb(148, 163, 184)
            };
            this.Controls.Add(lblStatus);

            // Bottom Buttons
            btnInstall = new Button
            {
                Text = "Install Now",
                Location = new Point(392, 330),
                Width = 130,
                Height = 34,
                FlatStyle = FlatStyle.Flat,
                BackColor = Color.FromArgb(99, 102, 241), // Indigo 500
                ForeColor = Color.White,
                Font = new Font("Segoe UI", 9.5F, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            btnInstall.FlatAppearance.BorderSize = 0;
            btnInstall.Click += BtnInstall_Click;
            this.Controls.Add(btnInstall);
        }

        private void BtnInstall_Click(object sender, EventArgs e)
        {
            string targetDir = txtDest.Text.Trim();
            if (string.IsNullOrEmpty(targetDir)) return;

            isInstalling = true;
            btnInstall.Enabled = false;
            btnBrowse.Enabled = false;
            txtDest.Enabled = false;
            chkDesktop.Enabled = false;
            chkStartMenu.Enabled = false;
            progressBar.Visible = true;
            progressBar.Style = ProgressBarStyle.Continuous;
            lblStatus.ForeColor = Color.FromArgb(226, 232, 240);
            lblStatus.Text = "Preparing installation...";

            Thread worker = new Thread(() =>
            {
                try
                {
                    Program.PerformInstall(targetDir, chkDesktop.Checked, chkStartMenu.Checked, (current, total, name) =>
                    {
                        if (current == 1)
                        {
                            this.Invoke((MethodInvoker)delegate
                            {
                                progressBar.Minimum = 0;
                                progressBar.Maximum = total > 0 ? total : 1;
                            });
                        }

                        if (current % 3 == 0 || current == total)
                        {
                            this.Invoke((MethodInvoker)delegate
                            {
                                progressBar.Value = current;
                                if (!string.IsNullOrEmpty(name))
                                {
                                    lblStatus.Text = "Installing: " + name;
                                }
                            });
                        }
                    });

                    string exePath = Path.Combine(targetDir, "DocTrack-LGU.exe");
                    isInstalling = false;

                    this.Invoke((MethodInvoker)delegate
                    {
                        progressBar.Value = progressBar.Maximum;
                        lblStatus.ForeColor = Color.FromArgb(74, 222, 128); // Green 400
                        lblStatus.Text = "Installation completed successfully! Ready to use.";
                        btnInstall.Text = "Finish";
                        btnInstall.BackColor = Color.FromArgb(16, 185, 129); // Emerald 500
                        btnInstall.Enabled = true;
                        btnInstall.Click -= BtnInstall_Click;
                        btnInstall.Click += (s2, e2) =>
                        {
                            if (chkLaunch.Checked && File.Exists(exePath))
                            {
                                Process.Start(new ProcessStartInfo(exePath) { WorkingDirectory = targetDir });
                            }
                            Application.Exit();
                        };
                    });
                }
                catch (Exception ex)
                {
                    isInstalling = false;
                    this.Invoke((MethodInvoker)delegate
                    {
                        progressBar.Visible = false;
                        lblStatus.ForeColor = Color.FromArgb(248, 113, 113); // Red 400
                        lblStatus.Text = "Error: " + ex.Message;
                        btnInstall.Enabled = true;
                        btnBrowse.Enabled = true;
                        txtDest.Enabled = true;
                        MessageBox.Show("Installation failed:\n" + ex.Message, "DocTrack Setup Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    });
                }
            });

            worker.IsBackground = true;
            worker.Start();
        }
    }

    public static class Program
    {
        public static void PerformInstall(string targetDir, bool createDesktop, bool createStartMenu, Action<int, int, string> onProgress = null)
        {
            // 1. Close any running DocTrack-LGU or background server instances from target directory
            try
            {
                foreach (Process proc in Process.GetProcesses())
                {
                    try
                    {
                        if (proc.ProcessName.Equals("DocTrack-LGU", StringComparison.OrdinalIgnoreCase))
                        {
                            proc.Kill();
                            proc.WaitForExit(1000);
                        }
                        else if (proc.ProcessName.Equals("node", StringComparison.OrdinalIgnoreCase))
                        {
                            if (proc.MainModule != null && proc.MainModule.FileName.StartsWith(targetDir, StringComparison.OrdinalIgnoreCase))
                            {
                                proc.Kill();
                                proc.WaitForExit(1000);
                            }
                        }
                    }
                    catch { }
                }
            }
            catch { }

            // 2. Ensure target directory exists
            if (!Directory.Exists(targetDir))
            {
                Directory.CreateDirectory(targetDir);
            }

            // 3. Extract embedded payload.zip stream
            Assembly asm = Assembly.GetExecutingAssembly();
            Stream stream = asm.GetManifestResourceStream("payload.zip");
            if (stream == null)
            {
                foreach (string res in asm.GetManifestResourceNames())
                {
                    if (res.EndsWith("payload.zip", StringComparison.OrdinalIgnoreCase))
                    {
                        stream = asm.GetManifestResourceStream(res);
                        break;
                    }
                }
            }

            if (stream == null)
            {
                throw new Exception("Embedded application payload was not found inside the installer.");
            }

            using (stream)
            using (ZipArchive archive = new ZipArchive(stream, ZipArchiveMode.Read))
            {
                int total = archive.Entries.Count;
                int current = 0;

                foreach (ZipArchiveEntry entry in archive.Entries)
                {
                    current++;
                    string normalizedRel = entry.FullName.Replace('/', Path.DirectorySeparatorChar);
                    string destPath = Path.Combine(targetDir, normalizedRel);

                    if (string.IsNullOrEmpty(entry.Name))
                    {
                        Directory.CreateDirectory(destPath);
                    }
                    else
                    {
                        string parent = Path.GetDirectoryName(destPath);
                        if (!string.IsNullOrEmpty(parent) && !Directory.Exists(parent))
                        {
                            Directory.CreateDirectory(parent);
                        }
                        entry.ExtractToFile(destPath, true);
                    }

                    if (onProgress != null)
                    {
                        onProgress(current, total, entry.Name);
                    }
                }
            }

            // 4. Ensure uploads directory exists
            string uploadsDir = Path.Combine(targetDir, "uploads");
            if (!Directory.Exists(uploadsDir))
            {
                Directory.CreateDirectory(uploadsDir);
            }

            string exePath = Path.Combine(targetDir, "DocTrack-LGU.exe");

            // 5. Create Desktop & Start Menu Shortcuts
            if (createDesktop)
            {
                CreateShortcut(
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Desktop), "DocTrack LGU.lnk"),
                    exePath,
                    targetDir
                );
            }

            if (createStartMenu)
            {
                string startMenuProg = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), "DocTrack LGU");
                if (!Directory.Exists(startMenuProg))
                {
                    Directory.CreateDirectory(startMenuProg);
                }
                CreateShortcut(
                    Path.Combine(startMenuProg, "DocTrack LGU.lnk"),
                    exePath,
                    targetDir
                );
            }
        }

        private static void CreateShortcut(string shortcutPath, string targetPath, string workingDir)
        {
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType == null) return;
                object shell = Activator.CreateInstance(shellType);
                object shortcut = shellType.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, shell, new object[] { shortcutPath });
                if (shortcut == null) return;

                Type shortcutType = shortcut.GetType();
                shortcutType.InvokeMember("TargetPath", BindingFlags.SetProperty, null, shortcut, new object[] { targetPath });
                shortcutType.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, shortcut, new object[] { workingDir });
                shortcutType.InvokeMember("Description", BindingFlags.SetProperty, null, shortcut, new object[] { "DocTrack LGU - Municipal Document Tracking System" });
                shortcutType.InvokeMember("IconLocation", BindingFlags.SetProperty, null, shortcut, new object[] { targetPath + ",0" });
                shortcutType.InvokeMember("Save", BindingFlags.InvokeMethod, null, shortcut, null);
            }
            catch { }
        }

        [STAThread]
        static int Main(string[] args)
        {
            bool isSilent = false;
            string customTarget = null;

            if (args != null && args.Length > 0)
            {
                foreach (string arg in args)
                {
                    if (arg.Equals("/S", StringComparison.OrdinalIgnoreCase) ||
                        arg.Equals("/silent", StringComparison.OrdinalIgnoreCase) ||
                        arg.Equals("-s", StringComparison.OrdinalIgnoreCase) ||
                        arg.Equals("--silent", StringComparison.OrdinalIgnoreCase))
                    {
                        isSilent = true;
                    }
                    else if (arg.StartsWith("/D=", StringComparison.OrdinalIgnoreCase))
                    {
                        customTarget = arg.Substring(3).Trim('"');
                    }
                }
            }

            if (isSilent)
            {
                string targetDir = !string.IsNullOrEmpty(customTarget)
                    ? customTarget
                    : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "DocTrack-LGU");

                try
                {
                    PerformInstall(targetDir, true, true, null);
                    return 0;
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine("Silent install failed: " + ex.Message);
                    return 1;
                }
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new SetupForm());
            return 0;
        }
    }
}
