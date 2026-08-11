[CmdletBinding()]
param(
    [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\\dist\\firefox')
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$manifestPath = Join-Path $projectRoot 'manifest.json'
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json -AsHashtable

# Firefox does not accept Chrome's host-access DNR permission or the `windows`
# permission declaration. The extension does not use either API at runtime.
$manifest.permissions = @($manifest.permissions | Where-Object { $_ -notin @('declarativeNetRequestWithHostAccess', 'windows') })
$manifest.background = @{ scripts = @('worker.js') }
$manifest.browser_specific_settings = @{
    gecko = @{
        id = 'neopass@neopass.tech'
        strict_min_version = '142.0'
        data_collection_permissions = @{
            required = @('none')
        }
    }
}

$releaseRoot = [System.IO.Path]::GetFullPath($OutputDirectory)
$extensionRoot = Join-Path $releaseRoot 'extension'
$archivePath = Join-Path $releaseRoot ("NeoExamShield-$($manifest.version)-firefox.zip")

if (Test-Path -LiteralPath $extensionRoot) {
    Remove-Item -LiteralPath $extensionRoot -Recurse -Force
}
if (Test-Path -LiteralPath $archivePath) {
    Remove-Item -LiteralPath $archivePath -Force
}
New-Item -ItemType Directory -Path $extensionRoot -Force | Out-Null

foreach ($item in @('contentScript.js', 'devtools.js', 'metadata.json', 'nptel.txt', 'popup.html', 'popup.js', 'worker.js', 'data', 'images')) {
    Copy-Item -LiteralPath (Join-Path $projectRoot $item) -Destination $extensionRoot -Recurse -Force
}

$manifest | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $extensionRoot 'manifest.json') -Encoding utf8
Compress-Archive -Path (Join-Path $extensionRoot '*') -DestinationPath $archivePath -CompressionLevel Optimal
Write-Output "Created $archivePath"
