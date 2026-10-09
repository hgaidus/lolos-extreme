# Keep this PC's copies of the live site's content and photos current.
#
# The live site commits and pushes every CMS save (content repo) and every
# photo upload (uploads repo) to GitHub by itself. Nothing brought those down
# to this PC, and the NAS copy is made FROM this PC (Synology Drive, C:\DEV ->
# DEV share), so a photo uploaded on the site reached the NAS only when someone
# happened to run `git pull` here. This script is that pull, on a schedule.
#
# Fast-forward only, on purpose: it can never merge, rewrite or discard
# anything. If a repo has local commits or edits in the way (for example a
# local test in progress), the pull is refused, logged, and tried again next
# time.
#
# Registered as the scheduled task "cross-country-trips content pull". Runs as
# the logged-on user so Git Credential Manager's stored GitHub login is used.
# Log: ..\backup-pull.log (*.log is excluded from the NAS sync).
#
# Failure email: sent through the live site's own mailer over the existing SSH
# key, so no mail password lives on this PC. Not on the first failure — the
# network is often not up yet at logon, and a local test blocks the pull on
# purpose — but once the same repo has failed on ALERT_AFTER runs in a row,
# then at most once a day while it stays broken, and once more when it
# recovers. Run with -TestEmail to send a test message and exit.

param([switch]$TestEmail)

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)   # ...\cross-country-trips
$log = Join-Path $root 'backup-pull.log'
$statePath = Join-Path $root 'backup-pull.state.json'
$repos = @(
    @{ Name = 'photos';  Path = Join-Path $root 'uploads' },
    @{ Name = 'content'; Path = Join-Path $root 'exported_content\data' }
)

$ALERT_TO = 'hgaidus@gmail.com'
$ALERT_AFTER = 2           # consecutive failed runs before the first email
$ALERT_REPEAT_HOURS = 24   # while still failing

# Never stop to ask for a password: there is nobody at the keyboard.
$env:GIT_TERMINAL_PROMPT = '0'
$env:GCM_INTERACTIVE = 'never'

function Write-Log($text) {
    Add-Content -LiteralPath $log -Encoding utf8 -Value ("{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $text)
}

# Hands {to, subject, text} to the site's mailer on stdin. The remote script
# is fixed text with no quotes PowerShell could mangle; only the JSON varies.
function Send-Alert($subject, $text) {
    $ssh = 'C:\Program Files\Git\usr\bin\ssh.exe'
    if (-not (Test-Path -LiteralPath $ssh)) { $ssh = 'ssh.exe' }
    $key = Join-Path $env:USERPROFILE '.ssh\inmotion_ccrv'
    $remote = 'cd ~/new.cross-country-trips.com/app && ~/nodevenv/new.cross-country-trips.com/app/24/bin/node --input-type=module -e ''let d=``; for await (const c of process.stdin) d+=c; const {sendMail}=await import(`./src/lib/adminMailer.js`); const r=await sendMail(JSON.parse(d.slice(d.indexOf(String.fromCharCode(123))))); console.log(r.ok?`sent`:`FAILED `+r.error); process.exit(r.ok?0:1)'' 2>&1 | grep -v -E ''MODULE_TYPELESS|Reparsing|eliminate this|trace-warnings'''
    $json = @{ to = $ALERT_TO; subject = $subject; text = $text } | ConvertTo-Json -Compress
    # Windows PowerShell prepends a byte-order mark when piping to a program;
    # ask for plain UTF-8, and the remote side starts reading at the first "{"
    # (character 123) anyway.
    $OutputEncoding = New-Object System.Text.UTF8Encoding $false
    $out = ($json | & $ssh -p 2222 -i $key -o BatchMode=yes -o ConnectTimeout=20 green139@cross-country-trips.com $remote 2>$null | Out-String).Trim()
    # The remote prints exactly "sent" on success; anything else (including
    # nothing, if SSH itself failed) is a failure and goes in the log.
    $ok = $out -match '(?m)^sent$'
    Write-Log ("alert email to {0}: {1}" -f $ALERT_TO, $(if ($ok) { 'sent' } else { "NOT SENT ($out)" }))
    return $ok
}

if ($TestEmail) {
    $ok = Send-Alert 'Test: cross-country-trips backup pull' "This is a test of the failure email from the scheduled pull on $env:COMPUTERNAME.`n`nNothing is wrong. If a pull fails $ALERT_AFTER times in a row, a message like this one will say which repo and why."
    exit $(if ($ok) { 0 } else { 1 })
}

$state = @{}
if (Test-Path -LiteralPath $statePath) {
    try { (Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $state[$_.Name] = $_.Value } } catch { $state = @{} }
}

$failed = 0
$problems = @()
$recovered = @()
foreach ($repo in $repos) {
    $name = $repo.Name
    $prev = $state[$name]
    $streak = if ($prev) { [int]$prev.streak } else { 0 }
    $alertedAt = if ($prev) { $prev.alertedAt } else { $null }

    $error_text = $null
    if (-not (Test-Path -LiteralPath (Join-Path $repo.Path '.git'))) {
        $error_text = "not a git repo at $($repo.Path)"
        Write-Log ("{0}: NOT A GIT REPO at {1}" -f $name, $repo.Path)
    } else {
        $before = (& git -C $repo.Path rev-parse --short HEAD) 2>$null
        # ToString() each line: otherwise git's stderr arrives wrapped in
        # PowerShell error records ("git.exe : ... At line:...") and that noise
        # ends up in the log and the email.
        $output = (& git -C $repo.Path pull --ff-only --quiet 2>&1 | ForEach-Object { $_.ToString() } | Out-String).Trim()
        $code = $LASTEXITCODE
        $after = (& git -C $repo.Path rev-parse --short HEAD) 2>$null

        if ($code -ne 0) {
            $error_text = ($output -replace '\s+', ' ')
            Write-Log ("{0}: PULL FAILED (exit {1}) at {2} - {3}" -f $name, $code, $before, $error_text)
        } elseif ($before -ne $after) {
            $count = (& git -C $repo.Path rev-list --count "$before..$after") 2>$null
            Write-Log ("{0}: pulled {1} commit(s), {2} -> {3}" -f $name, $count, $before, $after)
        } else {
            Write-Log ("{0}: up to date at {1}" -f $name, $after)
        }
    }

    if ($error_text) {
        $failed++
        $streak++
        $due = (-not $alertedAt) -or (((Get-Date) - [datetime]$alertedAt).TotalHours -ge $ALERT_REPEAT_HOURS)
        if ($streak -ge $ALERT_AFTER -and $due) { $problems += @{ Name = $name; Path = $repo.Path; Streak = $streak; Error = $error_text } }
        $state[$name] = @{ streak = $streak; alertedAt = $alertedAt }
    } else {
        if ($alertedAt) { $recovered += $name }
        $state[$name] = @{ streak = 0; alertedAt = $null }
    }
}

if ($problems.Count) {
    $lines = $problems | ForEach-Object { "- $($_.Name) ($($_.Path)): failed $($_.Streak) runs in a row.`n  git said: $($_.Error)" }
    $body = "The scheduled pull on $env:COMPUTERNAME could not bring down the live site's data:`n`n$($lines -join "`n`n")`n`nUntil this is fixed, new uploads and edits reach GitHub but not this PC or the NAS.`nNothing has been changed or lost: the pull is fast-forward only.`n`nLog: $log`nYou will get at most one of these a day while it stays broken, and one more when it recovers."
    if (Send-Alert "Backup pull failing: $(($problems | ForEach-Object { $_.Name }) -join ', ')" $body) {
        foreach ($p in $problems) { $state[$p.Name] = @{ streak = $p.Streak; alertedAt = (Get-Date).ToString('o') } }
    }
}
if ($recovered.Count) {
    [void](Send-Alert "Backup pull recovered: $($recovered -join ', ')" "The scheduled pull on $env:COMPUTERNAME is working again for: $($recovered -join ', ').`n`nLog: $log")
}

$state | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding utf8

# Keep the log from growing without bound.
if (Test-Path -LiteralPath $log) {
    $lines = Get-Content -LiteralPath $log
    if ($lines.Count -gt 2000) { $lines | Select-Object -Last 1500 | Set-Content -LiteralPath $log -Encoding utf8 }
}

exit $failed
