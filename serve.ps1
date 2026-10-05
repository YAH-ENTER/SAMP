# Previews every sample in this repo at once.
# Opening index.html as a file:// URL breaks the relative css/ and js/ paths, so use this.
#
# Run it from the SAMP folder (the one holding joses-painting and archive.ps1):
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\serve.ps1
#
# Then open http://localhost:8099/ and pick a sample from the list.
# Ctrl+C stops it. -Root only needs changing to serve a folder other than this one.
param(
  [int]$Port = 8099,
  [string]$Root = $PSScriptRoot
)

if (-not $Root) { $Root = "." }
$Root = (Resolve-Path -LiteralPath $Root).Path

# Windows holds a port for a while after a server is closed without Ctrl+C, and
# another preview may already be up, so walk forward until one is free rather
# than making you guess a number.
$listener = $null
foreach ($try in $Port..($Port + 20)) {
  $candidate = New-Object System.Net.HttpListener
  $candidate.Prefixes.Add("http://localhost:$try/")
  try {
    $candidate.Start()
    $listener = $candidate
    $Port = $try
    break
  } catch {
    $candidate.Close()
  }
}

if (-not $listener) {
  Write-Error "Ports $Port to $($Port + 20) are all busy. Close any other preview windows and try again, or pass a different -Port."
  exit 1
}

Write-Output "serving $Root"
Write-Output "open http://localhost:$Port/   (Ctrl+C to stop)"

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".webp" = "image/webp"
  ".gif"  = "image/gif"
  ".ico"  = "image/x-icon"
  ".txt"  = "text/plain; charset=utf-8"
  ".woff2" = "font/woff2"
  ".woff" = "font/woff"
}

# Folders that hold a sample site, i.e. anything with an index.html in it.
function Get-Samples {
  Get-ChildItem -LiteralPath $Root -Directory |
    Where-Object { $_.Name -notmatch '^(\.git|_zips|node_modules)$' } |
    Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName "index.html") } |
    Select-Object -ExpandProperty Name
}

# The menu shown at / when the repo root has no index.html of its own.
function Get-MenuHtml {
  $samples = @(Get-Samples)
  if ($samples.Count -eq 0) {
    $rows = "<p class='empty'>No sample folders with an index.html yet.</p>"
  } else {
    $rows = ($samples | ForEach-Object {
      "<li><a href='/$_/'>$_</a></li>"
    }) -join "`n"
    $rows = "<ul>$rows</ul>"
  }
  @"
<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SAMP samples</title>
<style>
 body{margin:0;background:#06142E;color:#fff;min-height:100vh;
   font:16px/1.6 "Segoe UI",system-ui,sans-serif;display:grid;place-items:center}
 main{padding:40px 28px;width:min(560px,92vw)}
 h1{margin:0 0 6px;font-size:1.6rem;letter-spacing:-.02em}
 p.sub{margin:0 0 26px;color:rgba(255,255,255,.7);font-size:15px}
 ul{list-style:none;margin:0;padding:0;display:grid;gap:10px}
 a{display:block;padding:16px 20px;background:rgba(255,255,255,.07);
   border:1px solid rgba(255,255,255,.18);border-radius:10px;
   color:#fff;text-decoration:none;font-weight:600;transition:.2s}
 a:hover{background:#C8102E;border-color:#C8102E}
 .empty{color:rgba(255,255,255,.7)}
</style></head>
<body><main>
<h1>SAMP samples</h1>
<p class="sub">$($samples.Count) sample(s) in $Root</p>
$rows
</main></body></html>
"@
}

function Send-Bytes($ctx, $bytes, $contentType, $status) {
  $ctx.Response.StatusCode = $status
  $ctx.Response.ContentType = $contentType
  $ctx.Response.ContentLength64 = $bytes.Length
  $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
}

function Send-Text($ctx, $text, $contentType, $status) {
  Send-Bytes $ctx ([System.Text.Encoding]::UTF8.GetBytes($text)) $contentType $status
}

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $path = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    $rel = ($path.TrimStart("/")) -replace "/", "\"
    $target = if ($rel) { Join-Path $Root $rel } else { $Root }

    # Keep requests inside the served folder.
    $full = [System.IO.Path]::GetFullPath($target)
    if (-not $full.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase)) {
      Send-Text $ctx "Forbidden" "text/plain; charset=utf-8" 403
      $ctx.Response.OutputStream.Close(); Write-Output ("403 " + $path); continue
    }

    if (Test-Path -LiteralPath $full -PathType Container) {
      # A directory without a trailing slash would make the page's relative
      # css/ and js/ paths resolve one level too high, so redirect first.
      if (-not $path.EndsWith("/")) {
        $ctx.Response.StatusCode = 301
        $ctx.Response.RedirectLocation = $path + "/"
        $ctx.Response.OutputStream.Close(); Write-Output ("301 " + $path + " -> " + $path + "/"); continue
      }
      $index = Join-Path $full "index.html"
      if (Test-Path -LiteralPath $index -PathType Leaf) {
        $full = $index
      } elseif ($full -eq $Root) {
        Send-Text $ctx (Get-MenuHtml) "text/html; charset=utf-8" 200
        $ctx.Response.OutputStream.Close(); Write-Output ("200 " + $path + " (menu)"); continue
      } else {
        Send-Text $ctx "No index.html in $path" "text/plain; charset=utf-8" 404
        $ctx.Response.OutputStream.Close(); Write-Output ("404 " + $path); continue
      }
    }

    if (Test-Path -LiteralPath $full -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($full).ToLower()
      $ct = $mime[$ext]
      if (-not $ct) { $ct = "application/octet-stream" }
      Send-Bytes $ctx ([System.IO.File]::ReadAllBytes($full)) $ct 200
      Write-Output ("200 " + $path)
    } else {
      Send-Text $ctx "Not found: $path" "text/plain; charset=utf-8" 404
      Write-Output ("404 " + $path)
    }
    $ctx.Response.OutputStream.Close()
  } catch {
    Write-Output ("ERR " + $_.Exception.Message)
  }
}
