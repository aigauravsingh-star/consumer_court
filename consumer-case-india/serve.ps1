$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add('http://localhost:4173/')
$listener.Start()
Write-Host 'ConsumerCase India running at http://localhost:4173/'
try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $path = $context.Request.Url.AbsolutePath
    $file = if ($path -eq '/' -or $path -eq '/index.html') { Join-Path $root 'dist\index.html' } else { $null }
    if ($file -and (Test-Path -LiteralPath $file)) {
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $context.Response.ContentType = 'text/html; charset=utf-8'
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

