$root = (Get-Location).Path
$port = 4173
$types = @{ '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.svg'='image/svg+xml'; '.json'='application/json'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.png'='image/png'; '.gif'='image/gif'; '.webp'='image/webp'; '.mp4'='video/mp4'; '.webm'='video/webm'; '.woff2'='font/woff2'; '.ico'='image/x-icon' }
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "dev server on http://localhost:$port"
while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $p = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    if ($p.EndsWith('/')) { $p += 'index.html' }
    $file = Join-Path $root ($p.TrimStart('/') -replace '/', '\')
    $full = [System.IO.Path]::GetFullPath($file)
    if ((-not $full.StartsWith($root)) -or (-not (Test-Path -LiteralPath $full -PathType Leaf))) {
      $ctx.Response.StatusCode = 404
      $b = [Text.Encoding]::UTF8.GetBytes("404 $p")
    } else {
      $ext = [System.IO.Path]::GetExtension($full).ToLower()
      $ct = $types[$ext]; if (-not $ct) { $ct = 'application/octet-stream' }
      $ctx.Response.ContentType = $ct
      $ctx.Response.Headers['Cache-Control'] = 'no-store'
      $b = [System.IO.File]::ReadAllBytes($full)
    }
    Write-Host "$($ctx.Response.StatusCode) $p"
    $ctx.Response.ContentLength64 = $b.Length
    $ctx.Response.OutputStream.Write($b, 0, $b.Length)
    $ctx.Response.OutputStream.Close()
  } catch {
    Write-Host "ERR: $($_.Exception.Message)"
    try { $ctx.Response.Close() } catch {}
  }
}
