# Valida que los archivos .env no tengan valores con espacios sin comillas
# (evita el error "key cannot contain a space" de Docker Compose)
# Uso: .\scripts\validate-env.ps1 [.env.local | .env.production]

param(
    [string]$EnvFile = ".env.local"
)

$path = Join-Path $PSScriptRoot ".." $EnvFile
if (-not (Test-Path $path)) {
    Write-Host "Archivo no encontrado: $path" -ForegroundColor Yellow
    exit 0
}

$lines = Get-Content $path
$issues = @()
$lineNum = 0

foreach ($line in $lines) {
    $lineNum++
    $trimmed = $line.Trim()
    if ($trimmed -match '^#' -or $trimmed -eq '') { continue }
    if ($trimmed -match '^([^=]+)=(.*)$') {
        $key = $Matches[1].Trim()
        $value = $Matches[2].Trim()
        if ($key -match '\s') {
            $issues += "Línea $lineNum`: La clave no puede tener espacios: $key"
        }
        elseif ($value -match '^\S.*\s.*\S$' -and $value -notmatch '^["'']' -and $value -notmatch '["'']$') {
            $issues += "Línea $lineNum`: Valor con espacios debe ir entre comillas: $key=$value"
        }
    }
}

if ($issues.Count -gt 0) {
    Write-Host "Problemas en $EnvFile`:" -ForegroundColor Red
    $issues | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    Write-Host "`nEjemplo correcto: EMAIL_FROM=`"JAC App <noreply@localhost>`"" -ForegroundColor Cyan
    exit 1
}

Write-Host "$EnvFile`: OK (formato válido)" -ForegroundColor Green
exit 0
