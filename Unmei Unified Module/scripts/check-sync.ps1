param(
    [switch]$IncludeWebsite
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

function Get-HashMap {
    param([Parameter(Mandatory = $true)][string]$BaseDir)

    $map = @{}
    if (-not (Test-Path $BaseDir)) {
        return $map
    }

    $files = Get-ChildItem -Path $BaseDir -Recurse -File
    foreach ($f in $files) {
        $rel = $f.FullName.Substring($BaseDir.Length).TrimStart('\\')
        $map[$rel] = (Get-FileHash -Path $f.FullName -Algorithm SHA256).Hash
    }
    return $map
}

function Compare-DirectoryPair {
    param(
        [Parameter(Mandatory = $true)][string]$Source,
        [Parameter(Mandatory = $true)][string]$Target,
        [Parameter(Mandatory = $true)][string]$Label
    )

    $issues = @()
    $srcMap = Get-HashMap -BaseDir $Source
    $dstMap = Get-HashMap -BaseDir $Target

    foreach ($k in $srcMap.Keys) {
        if (-not $dstMap.ContainsKey($k)) {
            $issues += "[$Label] Missing in target: $k"
            continue
        }
        if ($srcMap[$k] -ne $dstMap[$k]) {
            $issues += "[$Label] Content mismatch: $k"
        }
    }

    foreach ($k in $dstMap.Keys) {
        if (-not $srcMap.ContainsKey($k)) {
            $issues += "[$Label] Extra in target: $k"
        }
    }

    return $issues
}

$issues = @()

if ($IncludeWebsite) {
    # Website root files that should match one-to-one
    $websiteRootFiles = @(
        'about.html',
        'beginner-course.html',
        'contact.html',
        'index.html',
        'jlpt-n4-course.html',
        'posts.html',
        'services.html',
        'study-in-japan.html',
        'unmei-portal.css'
    )

    foreach ($file in $websiteRootFiles) {
        $src = Join-Path $repoRoot "UNMEIwebsite\\$file"
        $dst = Join-Path $repoRoot "public\\$file"

        if (-not (Test-Path $src)) {
            $issues += "[WebsiteRoot] Missing source file: $file"
            continue
        }
        if (-not (Test-Path $dst)) {
            $issues += "[WebsiteRoot] Missing target file: $file"
            continue
        }

        $srcHash = (Get-FileHash -Path $src -Algorithm SHA256).Hash
        $dstHash = (Get-FileHash -Path $dst -Algorithm SHA256).Hash
        if ($srcHash -ne $dstHash) {
            $issues += "[WebsiteRoot] Content mismatch: $file"
        }
    }

    $issues += Compare-DirectoryPair -Source (Join-Path $repoRoot 'UNMEIwebsite\\wp-content') -Target (Join-Path $repoRoot 'public\\wp-content') -Label 'WebsiteWpContent'
    $issues += Compare-DirectoryPair -Source (Join-Path $repoRoot 'UNMEIwebsite\\register') -Target (Join-Path $repoRoot 'public\\register') -Label 'WebsiteRegister'
    $issues += Compare-DirectoryPair -Source (Join-Path $repoRoot 'UNMEIwebsite\\wp-includes') -Target (Join-Path $repoRoot 'public\\wp-includes') -Label 'WebsiteWpIncludes'
} else {
    Write-Host 'SYNC_CHECK_INFO: Website parity checks skipped (use -IncludeWebsite to enable).'
}
$issues += Compare-DirectoryPair -Source (Join-Path $repoRoot 'UNMEIadminportal') -Target (Join-Path $repoRoot 'public\\UNMEIadminportal') -Label 'AdminPortal'
$issues += Compare-DirectoryPair -Source (Join-Path $repoRoot 'UNMEIstudentsportal') -Target (Join-Path $repoRoot 'public\\UNMEIstudentsportal') -Label 'StudentsPortal'
$issues += Compare-DirectoryPair -Source (Join-Path $repoRoot 'UNMEIinstructorportal') -Target (Join-Path $repoRoot 'public\\UNMEIinstructorportal') -Label 'InstructorPortal'

if ($issues.Count -gt 0) {
    Write-Host 'SYNC_CHECK_FAIL'
    $issues | ForEach-Object { Write-Host $_ }
    exit 1
}

Write-Host 'SYNC_CHECK_PASS: Source and public mirror are aligned for tracked modules.'
exit 0
