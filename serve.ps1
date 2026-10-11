param([ValidateRange(1024,65535)][int]$Port = 4173)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "ConsumerCase India running at http://localhost:$Port/"
try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $path = $context.Request.Url.AbsolutePath
    $assetNames = @('index.html','strategy-core.js','strategy-data.js','strategy-ui.js','strategy.css','product-core.js','storage-guard.js','product-ui.js','product.css')
    $asset = if ($path -eq '/') { 'index.html' } else { $path.TrimStart('/') }
    $file = if ($assetNames -contains $asset) { Join-Path $root ('dist\' + $asset) } else { $null }
    if ($file -and (Test-Path -LiteralPath $file)) {
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $context.Response.ContentType = switch ([System.IO.Path]::GetExtension($file)) {
        '.js' { 'text/javascript; charset=utf-8' }
        '.css' { 'text/css; charset=utf-8' }
        default { 'text/html; charset=utf-8' }
      }
      $context.Response.StatusCode = 200
      $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $context.Response.StatusCode = 404
    }
    $context.Response.Close()
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
