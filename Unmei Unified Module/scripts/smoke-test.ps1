param(
    [int]$StaticPort = 5000,
    [switch]$IncludeFirebase,
    [int]$FirebasePort = 5001,
    [int]$FirebasePortRange = 6,
    [switch]$IncludeWebsiteRoutes
)

$ErrorActionPreference = 'Stop'

function Test-Url {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [int]$TimeoutSec = 8
    )

    try {
        $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec
        if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 400) {
            Write-Host ("SMOKE_URL_PASS: $Url STATUS=" + [int]$resp.StatusCode)
            return $true
        }

        Write-Host ("SMOKE_URL_FAIL: $Url STATUS=" + [int]$resp.StatusCode)
        return $false
    } catch {
        Write-Host ("SMOKE_URL_FAIL: $Url MSG=" + $_.Exception.Message)
        return $false
    }
}

function Find-LiveFirebasePort {
    param(
        [int]$StartPort,
        [int]$Range
    )

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

    return $null
}

$targets = @(
    "http://localhost:$StaticPort/",
    "http://localhost:$StaticPort/register",
    "http://localhost:$StaticPort/register/index.html",
    "http://localhost:$StaticPort/UNMEIstudentsportal/login.html",
    "http://localhost:$StaticPort/UNMEIadminportal/admin-login.html",
    "http://localhost:$StaticPort/UNMEIinstructorportal/instructor-login.html",
    "http://localhost:$StaticPort/UNMEIstudentsportal/studentportal.css",
    "http://localhost:$StaticPort/UNMEIadminportal/adminportal.css",
    "http://localhost:$StaticPort/UNMEIinstructorportal/instructorportal.css"
)

if ($IncludeWebsiteRoutes) {
    $targets += @(
        "http://localhost:$StaticPort/about.html",
        "http://localhost:$StaticPort/services.html",
        "http://localhost:$StaticPort/beginner-course.html",
        "http://localhost:$StaticPort/study-in-japan.html",
        "http://localhost:$StaticPort/contact.html",
        "http://localhost:$StaticPort/posts.html"
    )
}

$failed = 0

if ($IncludeFirebase) {
    $liveFirebasePort = Find-LiveFirebasePort -StartPort $FirebasePort -Range $FirebasePortRange
    if ($null -eq $liveFirebasePort) {
        Write-Host 'SMOKE_URL_FAIL: Firebase hosting not reachable in configured port range.'
        $failed++
    } else {
        $targets += "http://localhost:$liveFirebasePort/"
    }
}

foreach ($url in $targets) {
    if (-not (Test-Url -Url $url)) {
        $failed++
    }
}

if ($failed -gt 0) {
    Write-Host ("SMOKE_TEST_FAIL: failed_targets=" + $failed)
    exit 1
}

Write-Host 'SMOKE_TEST_PASS'
exit 0
