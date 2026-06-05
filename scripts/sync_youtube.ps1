# Synchronisation planifiee des videos YouTube vers les predications (environnement DEV / Windows).
# A planifier via le Planificateur de taches Windows (voir scripts/README.md).
#
#   Usage : powershell -ExecutionPolicy Bypass -File scripts\sync_youtube.ps1 [-ChannelId UCxxxx]
#
param(
    [string]$ChannelId = "UCiWst6pwIt2xSBdhpSuUOAQ"
)

$ErrorActionPreference = "Stop"

# Racine du projet = dossier parent de ce script.
$ProjetDir = Split-Path -Parent $PSScriptRoot
Set-Location $ProjetDir

$LogDir = Join-Path $ProjetDir "logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
$LogFile = Join-Path $LogDir "sync_youtube.log"

function Horodatage { Get-Date -Format "yyyy-MM-dd HH:mm:ss" }

"[{0}] === Demarrage synchro chaine {1} ===" -f (Horodatage), $ChannelId | Add-Content $LogFile

# En dev, on lance un conteneur jetable (--rm) ; le pasteur est auto-detecte via lien_youtube.
docker compose run --rm backend python manage.py import_youtube_videos $ChannelId *>> $LogFile

if ($LASTEXITCODE -eq 0) {
    "[{0}] === Synchro terminee avec succes ===" -f (Horodatage) | Add-Content $LogFile
} else {
    "[{0}] !!! Echec de la synchro (code {1}) !!!" -f (Horodatage), $LASTEXITCODE | Add-Content $LogFile
    exit $LASTEXITCODE
}
