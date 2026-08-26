param(
    [switch]$IncludeWebsite
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

function Copy-DirectoryMirror {
    param(
        [Parameter(Mandatory = $true)][string]$Source,
        [Parameter(Mandatory = $true)][string]$Target
    )

    if (-not (Test-Path $Source)) {
        throw "Source directory not found: $Source"
    }

    if (-not (Test-Path $Target)) {
        New-Item -ItemType Directory -Path $Target | Out-Null
    }

    # /MIR keeps destination exactly aligned to source for dedicated module folders.
    $null = & robocopy $Source $Target /MIR /NFL /NDL /NJH /NJS /NP /R:2 /W:1

    # Robocopy returns bitmask exit codes. 0-7 are success/non-fatal.
    if ($LASTEXITCODE -gt 7) {
        throw "Robocopy failed for $Source -> $Target with code $LASTEXITCODE"
    }
}

function Copy-FileSafe {
    param(
        [Parameter(Mandatory = $true)][string]$Source,
        [Parameter(Mandatory = $true)][string]$Target
    )

    if (-not (Test-Path $Source)) {
        throw "Source file not found: $Source"
    }

    $targetDir = Split-Path -Path $Target -Parent
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir | Out-Null
    }
    Copy-Item -Path $Source -Destination $Target -Force
}

if ($IncludeWebsite) {
    # 1) Sync website root files to public root
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
        Copy-FileSafe -Source (Join-Path $repoRoot "UNMEIwebsite\\$file") -Target (Join-Path $repoRoot "public\\$file")
    }

    # 1b) Optional root operational guides (do not block runtime if removed)
    $guideSrc = Join-Path $repoRoot 'reimport-json.md'
    $guideDst = Join-Path $repoRoot 'public\reimport-json.md'
    if (Test-Path $guideSrc) {
        Copy-FileSafe -Source $guideSrc -Target $guideDst
    }

    # 2) Sync website static directories
    Copy-DirectoryMirror -Source (Join-Path $repoRoot 'UNMEIwebsite\\wp-content') -Target (Join-Path $repoRoot 'public\\wp-content')
    Copy-DirectoryMirror -Source (Join-Path $repoRoot 'UNMEIwebsite\\wp-includes') -Target (Join-Path $repoRoot 'public\\wp-includes')
    Copy-DirectoryMirror -Source (Join-Path $repoRoot 'UNMEIwebsite\\register') -Target (Join-Path $repoRoot 'public\\register')
} else {
}

# 3) Sync dedicated portal modules
Copy-DirectoryMirror -Source (Join-Path $repoRoot 'UNMEIadminportal') -Target (Join-Path $repoRoot 'public\\UNMEIadminportal')
Copy-DirectoryMirror -Source (Join-Path $repoRoot 'UNMEIstudentsportal') -Target (Join-Path $repoRoot 'public\\UNMEIstudentsportal')
Copy-DirectoryMirror -Source (Join-Path $repoRoot 'UNMEIinstructorportal') -Target (Join-Path $repoRoot 'public\\UNMEIinstructorportal')

exit 0
