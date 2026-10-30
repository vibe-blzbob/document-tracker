using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace DocTrackLGU
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string port = "3001";
            string localUrl = "http://localhost:" + port;

            // 1. Check if server is already running
            if (!IsServerRunning(localUrl))
            {
                // Start background server
                StartServer(appDir);

                // Wait up to 10 seconds for server to be responsive
                int waited = 0;
                while (!IsServerRunning(localUrl) && waited < 20)
                {
                    Thread.Sleep(500);
                    waited++;
                }
            }

            // 2. Open desktop window via Edge or Chrome in App Mode
            OpenAppWindow(localUrl);
        }

        static bool IsServerRunning(string url)
        {
            try
            {
                HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url + "/api/network-info");
                request.Timeout = 1000;
                request.Method = "GET";
                using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                {
                    return response.StatusCode == HttpStatusCode.OK;
                }
            }
            catch
            {
                return false;
            }
        }

        static void StartServer(string dir)
        {
            try
            {
                string nodeExe = FindNodeExe(dir);
                string bundledServer = Path.Combine(dir, "dist-server", "index.js");

                ProcessStartInfo psi = new ProcessStartInfo();
                psi.WorkingDirectory = dir;
                psi.WindowStyle = ProcessWindowStyle.Hidden;
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;

                if (!string.IsNullOrEmpty(nodeExe) && File.Exists(bundledServer))
                {
                    psi.FileName = nodeExe;
                    psi.Arguments = "\"" + bundledServer + "\"";
                }
                else
                {
                    psi.FileName = "cmd.exe";
                    psi.Arguments = "/c npm start";
                }

                Process.Start(psi);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Failed to launch DocTrack background server: " + ex.Message, "DocTrack LGU", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        static string FindNodeExe(string dir)
        {
            // 1. Next to executable
            string localNode = Path.Combine(dir, "node.exe");
            if (File.Exists(localNode)) return localNode;

            // 2. Standard Program Files
            string progFilesNode = @"C:\Program Files\nodejs\node.exe";
            if (File.Exists(progFilesNode)) return progFilesNode;

            string progFiles86Node = @"C:\Program Files (x86)\nodejs\node.exe";
            if (File.Exists(progFiles86Node)) return progFiles86Node;

            // 3. User LocalAppData
            string appDataNode = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), @"npm\node.exe");
            if (File.Exists(appDataNode)) return appDataNode;

            return "node";
        }

        static void OpenAppWindow(string url)
        {
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string[] candidatePaths = new string[]
            {
                @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                @"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                Path.Combine(localAppData, @"Microsoft\Edge\Application\msedge.exe"),
                @"C:\Program Files\Google\Chrome\Application\chrome.exe",
                @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                Path.Combine(localAppData, @"Google\Chrome\Application\chrome.exe")
            };

            string browserPath = null;
            foreach (string path in candidatePaths)
            {
                if (File.Exists(path))
                {
                    browserPath = path;
                    break;
                }
            }

            if (browserPath != null)
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = browserPath;
                psi.Arguments = "--app=" + url + " --window-size=1280,840";
                Process.Start(psi);
            }
            else
            {
                // Fallback to default system browser
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
        }
    }
}
