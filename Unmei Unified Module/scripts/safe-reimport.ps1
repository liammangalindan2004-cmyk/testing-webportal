param(
    [string]$JsonPath = 'firebase-database-structure.json',
    [string]$Project = 'unmei-nihongo-center',
    [string]$DatabasePath = '/',
    [switch]$SkipImport
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$payloadCandidate = Join-Path $repoRoot $JsonPath

if (-not (Test-Path $payloadCandidate)) {
    throw "Payload file not found: $payloadCandidate"
}

$payloadPath = (Resolve-Path $payloadCandidate).Path

function Read-JsonText {
    param(
        [byte[]]$Bytes
    )

    if ($Bytes.Length -ge 3 -and $Bytes[0] -eq 0xEF -and $Bytes[1] -eq 0xBB -and $Bytes[2] -eq 0xBF) {
        return [System.Text.Encoding]::UTF8.GetString($Bytes, 3, $Bytes.Length - 3)
    }

    if ($Bytes.Length -ge 2 -and $Bytes[0] -eq 0xFF -and $Bytes[1] -eq 0xFE) {
        return [System.Text.Encoding]::Unicode.GetString($Bytes, 2, $Bytes.Length - 2)
    }

    if ($Bytes.Length -ge 2 -and $Bytes[0] -eq 0xFE -and $Bytes[1] -eq 0xFF) {
        return [System.Text.Encoding]::BigEndianUnicode.GetString($Bytes, 2, $Bytes.Length - 2)
    }

    $utf8Text = [System.Text.Encoding]::UTF8.GetString($Bytes)
    if ($utf8Text.Length -gt 0 -and [int][char]$utf8Text[0] -eq 0xFEFF) {
        return $utf8Text.Substring(1)
    }
    return $utf8Text
}

function Test-FirebaseKey {
    param(
        [string]$Key
    )

    if ([string]::IsNullOrEmpty($Key)) {
        return $false
    }

    if ($Key -match '[\x00-\x1F\x7F]') {
        return $false
    }

    if ($Key -match '[\.\$#\[\]/]') {
        return $false
    }

    return $true
}

function Collect-InvalidKeys {
    param(
        [object]$Node,
        [string]$Path,
        [System.Collections.Generic.List[string]]$Output
    )

    if ($null -eq $Node) {
        return
    }

    if ($Node -is [System.Collections.IDictionary]) {
        foreach ($k in $Node.Keys) {
            $key = [string]$k
            $nextPath = if ([string]::IsNullOrEmpty($Path)) { "/$key" } else { "$Path/$key" }
            if (-not (Test-FirebaseKey -Key $key)) {
                [void]$Output.Add($nextPath)
            }
            Collect-InvalidKeys -Node $Node[$k] -Path $nextPath -Output $Output
        }
        return
    }

    if ($Node -is [System.Array]) {
        for ($i = 0; $i -lt $Node.Length; $i++) {
            Collect-InvalidKeys -Node $Node[$i] -Path "$Path[$i]" -Output $Output
        }
        return
    }

    if ($Node -is [string]) {
        return
    }

    $props = @($Node.PSObject.Properties)
    if ($props.Count -eq 0) {
        return
    }

    foreach ($prop in $props) {
        $key = [string]$prop.Name
        $nextPath = if ([string]::IsNullOrEmpty($Path)) { "/$key" } else { "$Path/$key" }
        if (-not (Test-FirebaseKey -Key $key)) {
            [void]$Output.Add($nextPath)
        }
        Collect-InvalidKeys -Node $prop.Value -Path $nextPath -Output $Output
    }
}

# Dataset integrity gate (counts, referential integrity, Saturday pairing, emoji scan).
$validator = Join-Path $PSScriptRoot 'validate-seed-dataset.cjs'
if (Test-Path $validator) {
    & node $validator
    if ($LASTEXITCODE -ne 0) {
        throw 'Seed dataset validation failed. Fix firebase-database-structure.json before importing.'
    }
}

$bytes = [System.IO.File]::ReadAllBytes($payloadPath)
$text = Read-JsonText -Bytes $bytes

if ([string]::IsNullOrWhiteSpace($text)) {
    throw "Payload is empty after decoding: $payloadPath"
}

try {
    $data = $text | ConvertFrom-Json
} catch {
    throw "JSON parse failed in payload '$payloadPath': $($_.Exception.Message)"
}

$invalid = New-Object 'System.Collections.Generic.List[string]'
Collect-InvalidKeys -Node $data -Path '' -Output $invalid

if ($invalid.Count -gt 0) {
    $preview = $invalid | Select-Object -First 20
    $msg = ($preview -join [Environment]::NewLine)
    throw "Firebase-invalid key(s) detected ($($invalid.Count)). First entries:`n$msg"
}

# Normalize payload to UTF-8 without BOM so firebase CLI reads it reliably.
[System.IO.File]::WriteAllText($payloadPath, $text, (New-Object System.Text.UTF8Encoding($false)))

if ($SkipImport) {
    Write-Host "SAFE_REIMPORT_VALIDATE_PASS: $payloadPath"
    exit 0
}

if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) {
    throw 'firebase CLI not found in PATH.'
}

$env:NODE_OPTIONS = '--no-deprecation'

& firebase database:set $DatabasePath $payloadPath --project $Project --force
if ($LASTEXITCODE -ne 0) {
    throw "firebase database:set failed with exit code $LASTEXITCODE"
}

Write-Host "SAFE_REIMPORT_PASS: project=$Project path=$DatabasePath file=$payloadPath"