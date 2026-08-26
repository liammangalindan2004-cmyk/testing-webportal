param(
    [int]$StaticPort = 5000,
    [int]$FirebasePort = 5001,
    [switch]$OpenUrls,
    [switch]$ForceNoFirebase,
    [switch]$EnableFirebaseHosting,
    [switch]$IncludeWebsiteSync,
    [switch]$QuietMode
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$debugLogPath = Join-Path $repoRoot 'firebase-debug.log'

function Assert-Prerequisites {
    $required = @('node', 'npm', 'npx', 'firebase')
    $missing = @()

    foreach ($cmd in $required) {
        $found = Get-Command $cmd -ErrorAction SilentlyContinue
        if (-not $found) {
            $missing += $cmd
        }
    }

    if ($missing.Count -gt 0) {
        Write-Host ("PREREQ_FAIL: Missing commands: " + ($missing -join ', '))
        return $false
    }

    if (-not $QuietMode) {
        Write-Host 'PREREQ_PASS: node, npm, npx, firebase are available.'
    }
    return $true
}

function Wait-Url {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [int]$Retries = 25,
        [int]$DelayMs = 1000
    )

    for ($i = 1; $i -le $Retries; $i++) {
        try {
            $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
            if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
                return $true
            }
        } catch {
        }
        Start-Sleep -Milliseconds $DelayMs
    }
    return $false
}

function Get-AvailablePort {
    param(
        [int]$StartPort,
        [int]$MaxTries = 20
    )

    for ($i = 0; $i -lt $MaxTries; $i++) {
        $candidate = $StartPort + $i
        $inUse = Get-NetTCPConnection -LocalPort $candidate -State Listen -ErrorAction SilentlyContinue
        if (-not $inUse) {
            return $candidate
        }
    }

    throw "No available port found starting from $StartPort"
}

function Find-LivePort {
    param(
        [int]$StartPort,
        [int]$Range = 6,
        [int]$Attempts = 30,
        [int]$DelayMs = 1000
    )

    for ($a = 1; $a -le $Attempts; $a++) {
        for ($offset = 0; $offset -lt $Range; $offset++) {
            $candidate = $StartPort + $offset
            try {
                $resp = Invoke-WebRequest -Uri "http://localhost:$candidate/" -UseBasicParsing -TimeoutSec 3
                if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
                    return $candidate
                }
            } catch {
            }
        }
        Start-Sleep -Milliseconds $DelayMs
    }

    return $null
}

function Clear-StalePortProcesses {
    param(
        [Parameter(Mandatory = $true)][int]$Port
    )

    $stopped = @()
    try {
        $netstatLines = netstat -ano -p tcp 2>$null
        foreach ($entry in $netstatLines) {
            if ($entry -match '^\s*TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)\s*$') {
                $listenPort = [int]$matches[1]
                $ownerProcess = [int]$matches[2]
                if ($listenPort -eq $Port) {
                    try {
                        Stop-Process -Id $ownerProcess -Force -ErrorAction SilentlyContinue
                        $stopped += $ownerProcess
                    } catch {
                    }
                }
            }
        }
    } catch {
    }

    if ($stopped.Count -gt 0) {
        if (-not $QuietMode) {
            Write-Host ("START_ALL_INFO: Cleared stale process(es) on port $Port" + ' (' + ($stopped -join ', ') + ')')
        }
        Start-Sleep -Seconds 1
    }
}

function Get-FirebaseAuthStatus {
    $firebasercPath = Join-Path $repoRoot '.firebaserc'

    $projectId = $null
    if (Test-Path $firebasercPath) {
        try {
            $firebaserc = Get-Content $firebasercPath -Raw | ConvertFrom-Json
            $projectId = $firebaserc.projects.default
        } catch {
            $projectId = $null
        }
    }

    $auth = [ordered]@{
        authenticated = $false
        email = $null
        projectId = $projectId
        reason = $null
    }

    $loginJsonText = ''
    $cmdExit = 1
    $loginJob = $null
    try {
        $loginJob = Start-Job -ScriptBlock {
            $env:NODE_OPTIONS = '--no-deprecation'
            $output = (& firebase login:list --json 2>$null) | Out-String
            [pscustomobject]@{
                output = $output
                exitCode = $LASTEXITCODE
            }
        }

        if (Wait-Job -Job $loginJob -Timeout 20) {
            $result = Receive-Job -Job $loginJob
            $loginJsonText = [string]$result.output
            $cmdExit = [int]$result.exitCode
        } else {
            Stop-Job -Job $loginJob -Force -ErrorAction SilentlyContinue
            $auth.reason = 'firebase login:list timed out'
        }
    } catch {
        $auth.reason = 'firebase login:list failed'
    } finally {
        if ($loginJob) {
            Remove-Job -Job $loginJob -Force -ErrorAction SilentlyContinue
        }
    }

    if ($cmdExit -eq 0 -and -not [string]::IsNullOrWhiteSpace($loginJsonText)) {
        try {
            $login = $loginJsonText | ConvertFrom-Json

            $loginResult = @()
            if ($null -ne $login.result) {
                $loginResult = @($login.result)
            }

            $isSuccessStatus = ($login.status -eq 'success')
            $hasLoginResult = ($loginResult.Count -gt 0)

            if ($isSuccessStatus -and $hasLoginResult) {
                $auth.authenticated = $true
                $auth.email = $login.result[0].user.email
                $auth.reason = 'active firebase login detected'
            } else {
                $auth.reason = 'no active firebase login'
            }
        } catch {
            $auth.reason = 'unable to parse firebase login output'
        }
    } elseif ([string]::IsNullOrWhiteSpace([string]$auth.reason)) {
        $auth.reason = 'firebase login:list failed'
    }

    return [pscustomobject]$auth
}

function Open-TargetUrls {
    param(
        [int]$StaticPort,
        [switch]$IncludeFirebase,
        [int]$FirebasePort
    )

    $urls = @(
        "http://localhost:$StaticPort/",
        "http://localhost:$StaticPort/register",
        "http://localhost:$StaticPort/UNMEIstudentsportal/login.html",
        "http://localhost:$StaticPort/UNMEIadminportal/admin-login.html",
        "http://localhost:$StaticPort/UNMEIinstructorportal/instructor-login.html"
    )

    if ($IncludeFirebase) {
        $urls += "http://localhost:$FirebasePort/"
    }

    foreach ($u in $urls) {
        Start-Process $u | Out-Null
    }
}

function Stop-BackgroundPidSafe {
    param(
        [Parameter(Mandatory = $false)][int]$Pid = 0,
        [Parameter(Mandatory = $true)][string]$Label
    )

    if ($Pid -le 0) {
        return
    }

    try {
        $proc = Get-Process -Id $Pid -ErrorAction SilentlyContinue
        if ($null -ne $proc) {
            Stop-Process -Id $Pid -Force -ErrorAction SilentlyContinue
            Write-Host ("START_ALL_INFO: Stopped $Label process pid=$Pid during cleanup.")
        }
    } catch {
    }
}

$staticPid = 0
$firebasePid = 0

try {
    # 1) Prereq check
    if (-not (Assert-Prerequisites)) {
        throw 'Prerequisite check failed.'
    }

    # Clean stale firebase debug artifacts from prior runs.
    if (Test-Path $debugLogPath) {
        Remove-Item -Path $debugLogPath -Force -ErrorAction SilentlyContinue
        if (-not $QuietMode) {
            Write-Host 'START_ALL_INFO: Removed stale firebase-debug.log.'
        }
    }

    # 2) Always align public mirror before serve
    # Use hashtable splatting so -IncludeWebsite is passed as a named switch
    # (array splatting passes elements as positional args and the flag is lost).
    $syncArgs = @{}
    if ($IncludeWebsiteSync) {
        $syncArgs['IncludeWebsite'] = $true
    }

    $checkSyncScript = Join-Path $PSScriptRoot 'check-sync.ps1'
    if ($QuietMode) {
        # Suppress all child-script labels (SYNC_CHECK_*) per QuietMode spec;
        # output is shown only if verification fails.
        $quietArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $checkSyncScript)
        if ($IncludeWebsiteSync) { $quietArgs += '-IncludeWebsite' }
        $quietOut = & powershell @quietArgs 2>&1
        if ($LASTEXITCODE -ne 0) {
            $quietOut | ForEach-Object { Write-Host $_ }
            throw 'Sync verification failed.'
        }
    } else {
        & $checkSyncScript @syncArgs
        if ($LASTEXITCODE -ne 0) {
            if (-not $QuietMode) { Write-Host 'START_ALL_INFO: drift found, applying sync fallback.' }
            & (Join-Path $PSScriptRoot 'sync-to-public.ps1') @syncArgs
            & $checkSyncScript @syncArgs
            if ($LASTEXITCODE -ne 0) {
                throw 'Sync verification failed after fallback.'
            }
        }
    }

    # 3) Start static server
    # Clear any stale process left on the static port from a previous run
    # (e.g. after replacing the project folder, an old serve process may
    # still hold the port and prevent the new one from binding).
    Clear-StalePortProcesses -Port $StaticPort

    $staticCmd = "Set-Location '$repoRoot'; npx -y serve public -l $StaticPort"
    $staticPid = (Start-Process -FilePath 'powershell' -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-Command',$staticCmd) -WindowStyle Hidden -PassThru).Id

    # Use 40 retries (40s) to allow time for npx to download 'serve' on a
    # fresh machine / fresh npm cache before the health check gives up.
    if (-not (Wait-Url -Url "http://localhost:$StaticPort/" -Retries 40)) {
        throw "Static server failed health check on port $StaticPort. Possible causes: (1) a stale process was on the port - run .\scripts\stop-all.ps1 first, (2) npx serve download timed out - check network/npm cache, (3) port conflict. Troubleshoot: .\scripts\stop-all.ps1 then re-run start-all."
    }
    if (-not $QuietMode) {
        Write-Host ("START_ALL_INFO: Static server is live on port $StaticPort (pid=$staticPid).")
    }

    $firebaseStarted = $false
    $firebaseAuth = $null
    $effectiveFirebasePort = $FirebasePort

    # 4) Firebase auth guard + optional firebase hosting
    if ($EnableFirebaseHosting -and -not $ForceNoFirebase) {
        $firebaseAuth = Get-FirebaseAuthStatus

        if ($firebaseAuth.authenticated) {
            $effectiveFirebasePort = Get-AvailablePort -StartPort $FirebasePort
            $firebaseCmd = "Set-Location '$repoRoot'; Remove-Item -Path '$debugLogPath' -Force -ErrorAction SilentlyContinue; `$env:FIREBASE_DEBUG=''; firebase serve --only hosting --port $effectiveFirebasePort"
            $firebasePid = (Start-Process -FilePath 'powershell' -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-Command',$firebaseCmd) -WindowStyle Hidden -PassThru).Id

            $livePort = Find-LivePort -StartPort $effectiveFirebasePort
            if ($null -ne $livePort) {
                $effectiveFirebasePort = $livePort
                $firebaseStarted = $true
                if (-not $QuietMode) { Write-Host ("START_ALL_INFO: Firebase hosting is live on port $effectiveFirebasePort (pid=$firebasePid).") }
            } else {
                Write-Host "START_ALL_WARN: Firebase hosting did not pass health check on port $effectiveFirebasePort."
                Stop-BackgroundPidSafe -Pid $firebasePid -Label 'firebase hosting'
                $firebasePid = 0
            }
        } else {
            if (-not $QuietMode) { Write-Host 'START_ALL_WARN: Firebase login not active. Running static-only fallback.' }
        }
    } elseif ($ForceNoFirebase) {
        if (-not $QuietMode) { Write-Host 'START_ALL_INFO: ForceNoFirebase enabled. Running static-only fallback mode.' }
    } else {
        if (-not $QuietMode) { Write-Host 'START_ALL_INFO: Firebase hosting disabled by default in guarded mode. Use -EnableFirebaseHosting to enable it.' }
    }

    # 5) Optional URL open
    if ($OpenUrls) {
        if ($firebaseStarted) {
            Open-TargetUrls -StaticPort $StaticPort -IncludeFirebase -FirebasePort $effectiveFirebasePort
        } else {
            Open-TargetUrls -StaticPort $StaticPort
        }
    }

    # Guardrail: keep workspace clean if firebase CLI emitted a debug log at startup.
    if (Test-Path $debugLogPath) {
        Remove-Item -Path $debugLogPath -Force -ErrorAction SilentlyContinue
        if (-not $QuietMode) { Write-Host 'START_ALL_INFO: Removed firebase-debug.log generated during startup.' }
    }

    if ($QuietMode) {
        Write-Host ''
        Write-Host 'Unmei Nihongo Center - Portal System v1.0'
        Write-Host 'All services started successfully.'
        Write-Host ''
        Write-Host "Portal: http://localhost:$StaticPort/"
        Write-Host ''
        Write-Host 'Press Ctrl+C to stop.'
    } else {
        Write-Host 'START_ALL_PASS'
        Write-Host ("STATIC_URL=http://localhost:$StaticPort/")
        if ($firebaseStarted) {
            Write-Host ("FIREBASE_URL=http://localhost:$effectiveFirebasePort/")
        } else {
            Write-Host 'FIREBASE_URL=SKIPPED_FALLBACK'
        }
    }
    exit 0
}
catch {
    if ($firebasePid -gt 0) {
        Stop-BackgroundPidSafe -Pid $firebasePid -Label 'firebase hosting'
    }

    if ($staticPid -gt 0) {
        Stop-BackgroundPidSafe -Pid $staticPid -Label 'static server'
    }

    Write-Host ("START_ALL_FAIL: " + $_.Exception.Message)
    exit 1
}
