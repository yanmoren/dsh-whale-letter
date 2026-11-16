/* 鲸鲸信箱 · 桌面提醒 + 独立信封窗口
 * 只使用 Windows 自带的 PowerShell / .NET WinForms / Edge，不安装任何第三方软件。 */

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const BOM = '\uFEFF'

export function binDir() {
  const home = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
  return path.join(home, 'whale-letter', 'bin')
}

function writePs(file, body) {
  fs.writeFileSync(file, BOM + body.replace(/\r?\n/g, '\r\n'), 'utf8')
}

const OPEN_PS = String.raw`param([Parameter(Mandatory=$true)][string]$Url)
$ErrorActionPreference = 'SilentlyContinue'
$pf86 = [Environment]::GetEnvironmentVariable('ProgramFiles(x86)')
$candidates = @(
  ($pf86 + '\Microsoft\Edge\Application\msedge.exe'),
  ($env:ProgramFiles + '\Microsoft\Edge\Application\msedge.exe'),
  ($env:LOCALAPPDATA + '\Microsoft\Edge\Application\msedge.exe'),
  ($env:ProgramFiles + '\Google\Chrome\Application\chrome.exe'),
  ($pf86 + '\Google\Chrome\Application\chrome.exe'),
  ($env:LOCALAPPDATA + '\Google\Chrome\Application\chrome.exe')
)
$exe = $null
foreach ($c in $candidates) { if ($c -and (Test-Path $c)) { $exe = $c; break } }
if ($exe) {
  Start-Process -FilePath $exe -ArgumentList @(
    ('--app=' + $Url),
    '--window-size=920,1010',
    '--window-position=430,50',
    '--disable-features=msEdgeSidebarV2'
  )
} else {
  Start-Process -FilePath $Url
}
`

const BALLOON_PS = String.raw`param(
  [Parameter(Mandatory=$true)][string]$Url,
  [Parameter(Mandatory=$true)][string]$OpenScript
)
$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
$form.Size = New-Object System.Drawing.Size(352, 146)
$form.BackColor = [System.Drawing.Color]::FromArgb(28, 29, 30)
$form.TopMost = $true
$form.ShowInTaskbar = $false
$form.Opacity = 0.0
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
$form.Location = New-Object System.Drawing.Point(($bounds.Right - 372), ($bounds.Bottom - 166))

$accent = New-Object System.Windows.Forms.Panel
$accent.Size = New-Object System.Drawing.Size(6, 146)
$accent.Location = New-Object System.Drawing.Point(0, 0)
$accent.BackColor = [System.Drawing.Color]::FromArgb(217, 161, 110)
$form.Controls.Add($accent)

$whale = New-Object System.Windows.Forms.Label
$whale.Text = '鲸'
$whale.Font = New-Object System.Drawing.Font('Microsoft YaHei', 15, [System.Drawing.FontStyle]::Bold)
$whale.ForeColor = [System.Drawing.Color]::FromArgb(217, 161, 110)
$whale.Size = New-Object System.Drawing.Size(52, 48)
$whale.Location = New-Object System.Drawing.Point(18, 16)
$form.Controls.Add($whale)

$title = New-Object System.Windows.Forms.Label
$title.Text = '鲸鲸来信啦~'
$title.Font = New-Object System.Drawing.Font('Microsoft YaHei', 12, [System.Drawing.FontStyle]::Bold)
$title.ForeColor = [System.Drawing.Color]::FromArgb(232, 230, 225)
$title.Size = New-Object System.Drawing.Size(260, 26)
$title.Location = New-Object System.Drawing.Point(74, 18)
$form.Controls.Add($title)

$body = New-Object System.Windows.Forms.Label
$body.Text = '有一封信在路上走了好久，慢慢拆开看呀。'
$body.Font = New-Object System.Drawing.Font('Microsoft YaHei', 9)
$body.ForeColor = [System.Drawing.Color]::FromArgb(153, 151, 146)
$body.Size = New-Object System.Drawing.Size(268, 40)
$body.Location = New-Object System.Drawing.Point(74, 46)
$form.Controls.Add($body)

$btn = New-Object System.Windows.Forms.Button
$btn.Text = '拆开看看'
$btn.Font = New-Object System.Drawing.Font('Microsoft YaHei', 9, [System.Drawing.FontStyle]::Bold)
$btn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$btn.FlatAppearance.BorderSize = 0
$btn.BackColor = [System.Drawing.Color]::FromArgb(236, 232, 224)
$btn.ForeColor = [System.Drawing.Color]::FromArgb(34, 38, 42)
$btn.Size = New-Object System.Drawing.Size(112, 30)
$btn.Location = New-Object System.Drawing.Point(74, 96)
$btn.Add_Click({
  Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden',
    '-File', $OpenScript, '-Url', $Url
  ) -WindowStyle Hidden
  $form.Close()
})
$form.Controls.Add($btn)

$later = New-Object System.Windows.Forms.Button
$later.Text = '等会儿'
$later.Font = New-Object System.Drawing.Font('Microsoft YaHei', 9)
$later.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$later.FlatAppearance.BorderSize = 0
$later.BackColor = [System.Drawing.Color]::FromArgb(28, 29, 30)
$later.ForeColor = [System.Drawing.Color]::FromArgb(140, 138, 133)
$later.Size = New-Object System.Drawing.Size(72, 30)
$later.Location = New-Object System.Drawing.Point(196, 96)
$later.Add_Click({ $form.Close() })
$form.Controls.Add($later)

$fade = New-Object System.Windows.Forms.Timer
$fade.Interval = 25
$fade.Add_Tick({
  if ($form.Opacity -lt 1.0) { $form.Opacity = [Math]::Min(1.0, $form.Opacity + 0.08) }
  else { $fade.Stop() }
})
$form.Add_Shown({ $form.Activate(); $fade.Start() })
[System.Windows.Forms.Application]::Run($form)
`

const TOAST_PS = String.raw`param([Parameter(Mandatory=$true)][string]$Title, [Parameter(Mandatory=$true)][string]$Body)
$ErrorActionPreference = 'SilentlyContinue'
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$texts = $template.GetElementsByTagName('text')
$texts.Item(0).AppendChild($template.CreateTextNode($Title)) | Out-Null
$texts.Item(1).AppendChild($template.CreateTextNode($Body)) | Out-Null
$toast = [Windows.UI.Notifications.ToastNotification]::new($template)
$appId = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe'
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId).Show($toast)
`

/** 幂等生成运行时脚本。目录固定在 ~/.dsh 下，避免中文路径与编码问题。 */
export function ensureScripts() {
  const dir = binDir()
  fs.mkdirSync(dir, { recursive: true })
  writePs(path.join(dir, 'open.ps1'), OPEN_PS)
  writePs(path.join(dir, 'balloon.ps1'), BALLOON_PS)
  writePs(path.join(dir, 'toast.ps1'), TOAST_PS)
  return {
    dir,
    open: path.join(dir, 'open.ps1'),
    balloon: path.join(dir, 'balloon.ps1'),
    toast: path.join(dir, 'toast.ps1')
  }
}

function launch(script, args) {
  const child = spawn('powershell.exe', [
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden',
    '-File', script
  ].concat(args), { detached: true, stdio: 'ignore', windowsHide: true })
  child.on('error', () => {})
  try { child.unref() } catch (e) { /* noop */ }
  return child
}

/** 打开独立无边框窗口（浏览器 --app 模式）。 */
export function openLetterWindow(port, letterId) {
  const s = ensureScripts()
  const url = 'http://127.0.0.1:' + port + '/whale-letter/read?' +
    (letterId ? 'id=' + encodeURIComponent(letterId) : 'latest=1')
  launch(s.open, ['-Url', url])
  return url
}

/** 投递提醒：桌面卡片（可点）＋可选系统 toast。 */
export function deliver({ letterId, port, mode } = {}) {
  const s = ensureScripts()
  const url = 'http://127.0.0.1:' + port + '/whale-letter/read?' +
    (letterId ? 'id=' + encodeURIComponent(letterId) : 'latest=1')
  const result = { ok: true, url, channels: [] }
  // 自动化验收 / 静默调试用：不弹任何桌面窗口。
  if (process.env.DSH_WHALE_NO_NOTIFY === '1') {
    result.channels.push('skipped-by-env')
    return result
  }
  try {
    launch(s.balloon, ['-Url', url, '-OpenScript', s.open])
    result.channels.push('desktop-card')
  } catch (e) {
    result.ok = false
    result.error = String(e && e.message ? e.message : e)
  }
  if (mode === 'both' || mode === 'toast') {
    try {
      launch(s.toast, ['-Title', '鲸鲸来信啦', '-Body', '有一封信在路上走了好久，慢慢拆开看呀'])
      result.channels.push('system-toast')
    } catch (e) { /* 纯提醒，失败不影响卡片 */ }
  }
  return result
}
