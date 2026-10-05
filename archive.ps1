# Zips one sample folder into _zips\ so it can be handed to a client.
# Includes everything: hidden files and the .git folder.
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\archive.ps1 -Project joses-painting
param(
  [Parameter(Mandatory = $true)]
  [string]$Project,
  [string]$Root = $PSScriptRoot,
  [string]$OutDir
)

$ErrorActionPreference = "Stop"

# Compress-Archive skips hidden files, so use the .NET zip API instead.
Add-Type -AssemblyName System.IO.Compression.FileSystem

$Root = (Resolve-Path -LiteralPath $Root).Path
if (-not $OutDir) { $OutDir = Join-Path $Root "_zips" }

$src = Join-Path $Root $Project
if (-not (Test-Path -LiteralPath $src -PathType Container)) {
  # List what is actually there so the typo is obvious.
  $available = Get-ChildItem -LiteralPath $Root -Directory |
    Where-Object { $_.Name -ne "_zips" -and $_.Name -ne ".git" } |
    Select-Object -ExpandProperty Name
  if ($available) { $list = $available -join ", " } else { $list = "(none)" }
  throw "No project folder '$Project' in $Root. Available: $list"
}
$src = (Resolve-Path -LiteralPath $src).Path

if (-not (Test-Path -LiteralPath $OutDir -PathType Container)) {
  New-Item -ItemType Directory -Path $OutDir | Out-Null
}
$OutDir = (Resolve-Path -LiteralPath $OutDir).Path

# <project>_<date>.zip, then -2, -3 ... Never overwrite a zip already sent out.
$base = "{0}_{1}" -f $Project, (Get-Date -Format "yyyy-MM-dd")
$dst = Join-Path $OutDir ($base + ".zip")
$n = 1
while (Test-Path -LiteralPath $dst) {
  $n++
  $dst = Join-Path $OutDir ("{0}-{1}.zip" -f $base, $n)
}

# The $true puts the folder name inside the zip, so unzipping makes one folder
# instead of spilling loose files into whatever directory you are standing in.
[System.IO.Compression.ZipFile]::CreateFromDirectory($src, $dst, 'Optimal', $true)

$sizeMb = [math]::Round(((Get-Item -LiteralPath $dst).Length / 1MB), 2)
$zip = [System.IO.Compression.ZipFile]::OpenRead($dst)
$count = $zip.Entries.Count
$zip.Dispose()

Write-Output $dst
Write-Output "$sizeMb MB"
Write-Output "$count entries"
