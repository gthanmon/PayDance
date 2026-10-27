# SPDX-FileCopyrightText: 2026 Mr.Baoboer
# SPDX-License-Identifier: AGPL-3.0-only
#
# Additional terms: see /legal/ADDITIONAL_TERMS.md

param([string]$OutputName = 'PayDance.exe')

$ErrorActionPreference = 'Stop'
$taskProjectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Push-Location -LiteralPath $taskProjectRoot
try {
  if (Test-Path -LiteralPath '.tools/cargo/bin/cargo.exe') {
    $env:RUSTUP_HOME = Join-Path $taskProjectRoot '.tools/rustup'
    $env:CARGO_HOME = Join-Path $taskProjectRoot '.tools/cargo'
    $env:PATH = "$(Join-Path $env:CARGO_HOME 'bin');$env:PATH"
  }
  $env:VITE_PAYDANCE_LOCAL_BUILD = 'true'
  New-Item -ItemType Directory -Force -Path '.tools', 'release-assets' | Out-Null
  $taskBuildConfig = Join-Path $taskProjectRoot '.tools/tauri.local.conf.json'
  [System.IO.File]::WriteAllText($taskBuildConfig, '{"productName":"\u85aa\u8df3\u672c\u5730\u589e\u5f3a\u7248","bundle":{"createUpdaterArtifacts":false}}', [System.Text.UTF8Encoding]::new($false))
  & npm run build:exe -- --no-bundle --config $taskBuildConfig
  if ($LASTEXITCODE -ne 0) { throw 'Windows EXE build failed.' }
  if ($OutputName -ne [System.IO.Path]::GetFileName($OutputName) -or -not $OutputName.EndsWith('.exe')) { throw 'OutputName must be an EXE file name.' }
  $taskArtifact = Join-Path (Join-Path $taskProjectRoot 'release-assets') $OutputName
  Copy-Item -LiteralPath 'src-tauri/target/release/pay-dance.exe' -Destination $taskArtifact -Force
  $taskHasher = [System.Security.Cryptography.SHA256]::Create()
  $taskExeStream = [System.IO.File]::OpenRead($taskArtifact)
  try {
    $taskHash = [System.BitConverter]::ToString($taskHasher.ComputeHash($taskExeStream)).Replace('-', '').ToLowerInvariant()
  } finally {
    $taskExeStream.Dispose()
    $taskHasher.Dispose()
  }
  [System.IO.File]::WriteAllText("$taskArtifact.sha256", "$taskHash  $OutputName`n", [System.Text.UTF8Encoding]::new($false))
  Write-Output "Built: $taskArtifact"
  Write-Output "SHA256: $taskHash"
} finally {
  Pop-Location
}
