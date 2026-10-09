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

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)   # ...\cross-country-trips
$log = Join-Path $root 'backup-pull.log'
$repos = @(
    @{ Name = 'photos';  Path = Join-Path $root 'uploads' },
    @{ Name = 'content'; Path = Join-Path $root 'exported_content\data' }
)

# Never stop to ask for a password: there is nobody at the keyboard.
$env:GIT_TERMINAL_PROMPT = '0'
$env:GCM_INTERACTIVE = 'never'

function Write-Log($text) {
    Add-Content -LiteralPath $log -Encoding utf8 -Value ("{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $text)
}

$failed = 0
foreach ($repo in $repos) {
    if (-not (Test-Path -LiteralPath (Join-Path $repo.Path '.git'))) {
        Write-Log ("{0}: NOT A GIT REPO at {1}" -f $repo.Name, $repo.Path)
        $failed++
        continue
    }
    $before = (& git -C $repo.Path rev-parse --short HEAD) 2>$null
    $output = (& git -C $repo.Path pull --ff-only --quiet 2>&1 | Out-String).Trim()
    $code = $LASTEXITCODE
    $after = (& git -C $repo.Path rev-parse --short HEAD) 2>$null

    if ($code -ne 0) {
        $failed++
        Write-Log ("{0}: PULL FAILED (exit {1}) at {2} - {3}" -f $repo.Name, $code, $before, ($output -replace '\s+', ' '))
    } elseif ($before -ne $after) {
        $count = (& git -C $repo.Path rev-list --count "$before..$after") 2>$null
        Write-Log ("{0}: pulled {1} commit(s), {2} -> {3}" -f $repo.Name, $count, $before, $after)
    } else {
        Write-Log ("{0}: up to date at {1}" -f $repo.Name, $after)
    }
}

# Keep the log from growing without bound.
if (Test-Path -LiteralPath $log) {
    $lines = Get-Content -LiteralPath $log
    if ($lines.Count -gt 2000) { $lines | Select-Object -Last 1500 | Set-Content -LiteralPath $log -Encoding utf8 }
}

exit $failed
