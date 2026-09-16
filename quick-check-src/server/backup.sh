#!/bin/sh
# Tagessicherung der Quick-Check-Daten.
#
# data.json ist die einzige Kopie der eingegangenen Anfragen. Ein Fehlgriff mit
# /api/reset oder ein Plattenschaden loescht sie ohne Rueckfrage. Dieses Skript
# legt eine Kopie je Tag ab und wirft alte wieder weg.
#
# Es ersetzt keine Sicherung ausserhalb der Maschine: liegt der Server im Feuer,
# liegen die Sicherungen mit darin. Fuer den Anfang genuegt es gegen den viel
# wahrscheinlicheren Fall, das versehentliche Loeschen.
#
# Einrichten:
#   install -m 700 -o root -g root backup.sh /usr/local/sbin/quick-check-backup
#   install -m 644 quick-check-backup.service quick-check-backup.timer /etc/systemd/system/
#   mkdir -p /var/backups/quick-check && chmod 700 /var/backups/quick-check
#   systemctl daemon-reload && systemctl enable --now quick-check-backup.timer
#
# Pruefen:  systemctl list-timers quick-check-backup
#           systemctl start quick-check-backup && ls -l /var/backups/quick-check

set -eu

SRC="${DATA_FILE:-/var/lib/quick-check/data.json}"
DEST="${BACKUP_DIR:-/var/backups/quick-check}"
KEEP="${BACKUP_KEEP_DAYS:-30}"

# Noch keine einzige Anfrage: nichts zu sichern, und das ist kein Fehler.
if [ ! -f "$SRC" ]; then
    echo "quick-check-backup: $SRC gibt es noch nicht, nichts zu sichern."
    exit 0
fi

# Unlesbares oder halb geschriebenes JSON zu sichern hilft niemandem. Die
# Datendatei wird atomar per rename ersetzt, ein Torso ist also unwahrscheinlich
# -- aber eine Sicherung, die man nicht zurueckspielen kann, ist keine.
if command -v python3 >/dev/null 2>&1; then
    if ! python3 -c 'import json,sys; json.load(open(sys.argv[1]))' "$SRC" 2>/dev/null; then
        echo "quick-check-backup: $SRC ist kein lesbares JSON, Abbruch." >&2
        exit 1
    fi
fi

mkdir -p "$DEST"
chmod 700 "$DEST"

TARGET="$DEST/data-$(date +%Y-%m-%d).json"
# Erst daneben schreiben, dann umbenennen: eine abgebrochene Sicherung
# ueberschreibt so nicht die von gestern.
cp "$SRC" "$TARGET.tmp"
chmod 600 "$TARGET.tmp"
mv "$TARGET.tmp" "$TARGET"

find "$DEST" -maxdepth 1 -name 'data-*.json' -type f -mtime "+$KEEP" -delete

COUNT=$(ls -1 "$DEST"/data-*.json 2>/dev/null | wc -l | tr -d ' ')
echo "quick-check-backup: $TARGET geschrieben, $COUNT Sicherungen vorhanden."
