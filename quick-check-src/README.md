# ATLAS Quick Check

Ein Fragebogen, zwei Betriebsarten, **eine Codebasis**.

| | Einzelmodus | Teammodus |
|---|---|---|
| Wer | eine Person auf der Landingpage | mehrere Personen im Workshop |
| Auswertung | eigenes Profil | Mittelwert der Gruppe, aktualisiert sich laufend |
| Zugang | Link von `it-team-flow.de` | QR-Code und Raumcode |
| Kontaktdaten | ja, als Lead | nein |
| Betrieb | statisch, GitHub Pages | Node-Server, eigene Hetzner-Cloud-Instanz |

Ersetzt das frühere Typeform (`form.typeform.com/to/JiDiDyST`) und die
SpiderApp aus einem früheren Kundenworkshop.

## Stand am 15.09.2026

**Einzelmodus ist live** unter https://it-team-flow.de/quick-check/, erreichbar
über eine eigene Sektion der Startseite.

**Teammodus läuft.** Der endgültige Name lautet:

```
https://atlas-quick-check.it-agile.de/quick-check/
```

Das Provisorium `quick-check.2.28.53.22.sslip.io` ist abgelöst. Der Dienst
antwortete am 15.09.2026 zunächst unter `wompti-quick-check.it-agile.de`; mit
der Umbenennung des Produkts auf ATLAS heißt er wie oben. **Im DNS und auf dem
Server steht dieser Schritt noch aus**, siehe „Was als Nächstes zu tun ist".

Vollständig geprüft: HTTPS mit gültigem Zertifikat, Einreichungen werden
korrekt gemittelt, Rohdaten nur mit Token, Reset leert den Raum, QR-Code wird
geliefert. Der Dienst startet nach einem Neustart der Maschine von selbst.

**`apiBase` ist gesetzt.** Der Einzelmodus überträgt Kontaktdaten damit an
`https://atlas-quick-check.it-agile.de`. Wirksam wird das erst mit dem Push
nach GitHub Pages, und nur zusammen mit den Punkten unter „Was als Nächstes zu
tun ist".

### Was als Nächstes zu tun ist

1. **A-Eintrag `atlas-quick-check` → `2.28.53.22`** bei united-domains in der
   Zone `it-agile.de` setzen, dann die AAAA-Gegenprobe (siehe „Der Name, und
   wie er zustande kam"). Danach auf dem Server:

   ```bash
   sed -i 's/wompti-quick-check\.it-agile\.de/atlas-quick-check.it-agile.de/' \
     /etc/caddy/Caddyfile /etc/quick-check.env
   systemctl reload caddy && systemctl restart quick-check
   ```

   Caddy holt das neue Zertifikat selbst. Der Eintrag für `wompti-quick-check`
   kann danach weg.

2. **`ALLOWED_ORIGINS` auf dem Server prüfen.** Der Wert muss
   `https://it-team-flow.de` enthalten:

   ```bash
   ssh root@2.28.53.22 'grep -E "ALLOWED_ORIGINS|PUBLIC_URL" /etc/quick-check.env'
   ```

   Fehlt die Herkunft, blockt der Browser die Anfrage, die App zeigt „konnte
   nicht übertragen werden", und der Lead ist weg.

3. **`NOTIFY_TO`, `NOTIFY_FROM` und die `SMTP_*`-Variablen** in
   `/etc/quick-check.env` eintragen, siehe „Benachrichtigung einrichten".
   Ohne sie liegt jede Anfrage in `data.json`, bis jemand sie abholt.

4. **Sicherung einschalten**, siehe „Sicherung der Daten". Ab der ersten
   echten Anfrage ist `data.json` die einzige Kopie einer
   Geschäftsinformation.

5. **Raum `default` leeren**, falls beim Einrichten ohne `?room=` getestet
   wurde. Dort landen später die Leads aus dem Einzelmodus:

   ```bash
   curl -X POST -H "x-admin-token: TOKEN" -H "content-type: application/json" \
     -d '{"room":"default"}' https://atlas-quick-check.it-agile.de/api/reset
   ```

6. **Erst dann pushen.** `apiBase` und der Abschnitt „ATLAS Quick Check" in
   `content/datenschutz.md` gehören in denselben Push: Er beschreibt, dass
   Daten übertragen werden, wohin und auf welcher Rechtsgrundlage. Vorher
   stimmt er nicht — nachher fehlt er.

### Was danach noch offen bleibt

- **Auftragsverarbeitungsvertrag mit Hetzner.** Die Datenschutzerklärung nennt
  die Hetzner Online GmbH als Auftragsverarbeiterin. Ein Vertrag nach Art. 28
  DSGVO muss dazu vorliegen; Hetzner stellt ihn in der Cloud Console bereit.
- **Zugriffsprotokoll des Proxys.** Ob Caddy auf dieser Maschine ein
  Zugriffsprotokoll mit IP-Adressen schreibt, ist nicht geprüft. Wenn ja,
  braucht die Datenschutzerklärung dazu einen Satz und es braucht eine
  Löschfrist. `Caddyfile.example` enthält keine `log`-Anweisung, aber die
  Voreinstellung der Distribution ist damit nicht ausgeschlossen.
- **Mindestzahl an Rückmeldungen**, bevor im Teammodus ein Gruppenprofil
  erscheint. Bei drei oder vier Teilnehmenden lassen sich einzelne Antworten aus
  dem Mittelwert zurückrechnen.
- **Zustellbarkeit der Benachrichtigung.** Sie hängt an einem fremden
  Postausgangsserver. Fällt der aus, bleibt die Anfrage gespeichert und trägt
  `notify: "fehlgeschlagen"`, aber niemand erfährt davon, solange keiner
  hinsieht. Ein täglicher Blick oder eine Überwachung wäre der nächste Schritt.

## Verzeichnisse

```
quick-check-src/            <- HIER wird bearbeitet
  app/index.html            Markup und CSS, mit Platzhaltern
  app/app.js                gesamte Logik, beide Modi
  app/config.solo.js        Konfiguration Einzelmodus
  app/config.team.js        Konfiguration Teammodus
  server/server.js          Backend
  server/quick-check.service systemd-Unit
  server/quick-check.env.example  Vorlage der Umgebungsvariablen
  server/Caddyfile.example  Reverse-Proxy-Konfiguration
  server/backup.sh          Tagessicherung von data.json
  server/quick-check-backup.service   systemd-Unit dazu
  server/quick-check-backup.timer     Zeitplan dazu
  sync.py                   erzeugt beide Deployments
  test/test.js              Testsuite

static/quick-check/index.html              <- ERZEUGT, nicht bearbeiten
quick-check-src/server/public/             <- ERZEUGT, nicht bearbeiten, nicht im Git
```

`static/quick-check/index.html` **muss** committet sein: Hugo kopiert `static/`
unveraendert durch, GitHub Pages liefert genau diese Datei aus.

`server/public/` dagegen steht in `.gitignore`. Es enthaelt neben der Seite auch
Kopien der Schriften und des Favicons, also rund zwei Megabyte, die unter
`static/fonts/` schon liegen. Auf den Server kommt es per `rsync` aus dem
Arbeitsverzeichnis, nicht aus Git. **Folge: in einem frischen Klon existiert es
nicht, bis `sync.py` gelaufen ist.**

`sync.py` setzt Konfiguration und Logik in das Markup ein und schreibt zwei
selbstenthaltene Dateien. Sie unterscheiden sich ausschliesslich im
Konfigurationsblock; die Testsuite prueft das.

**Nach jeder Änderung in `app/`:**

```bash
cd quick-check-src && python3 sync.py
```

Ohne diesen Aufruf ändert sich am Deployment nichts.

## Tests

Einmalig einrichten. jsdom absichtlich ausserhalb des Dropbox-Ordners, sonst
synchronisiert Dropbox tausende Dateien:

```bash
mkdir -p ~/.qc-test && cd ~/.qc-test && npm install jsdom
```

Ausführen:

```bash
cd quick-check-src
python3 sync.py
NODE_PATH=~/.qc-test/node_modules node test/test.js
```

Geprüft werden die **erzeugten** Dateien, damit `sync.py` mit abgedeckt ist.
Der Backend-Teil startet echte Server auf den Ports 31739 bis 31741 gegen
temporäre Datendateien. Die Benachrichtigung wird über `NOTIFY_DRY_RUN`
geprüft: die Suite braucht keinen Postausgangsserver und verschickt nichts.

Ein Teil der Prüfungen liest `content/datenschutz.md` und vergleicht sie mit
dem Formular. Kommt dort ein Feld dazu, schlägt die Prüfung fehl, bis die
Datenschutzerklärung es nennt.

## Einzelmodus veröffentlichen

Die Seite ist Teil der Hugo-Site und liegt nach `sync.py` unter
`static/quick-check/`. Hugo kopiert `static/` unverändert, es gibt also keinen
Build-Schritt. Nach dem Push auf `main` deployt der Workflow
`.github/workflows/hugo.yml` nach GitHub Pages, erreichbar unter
`https://it-team-flow.de/quick-check/`.

Ist `apiBase` in `app/config.solo.js` leer, läuft die Seite im Testbetrieb: das
Ergebnis entsteht im Browser, es wird nichts übertragen und nichts gespeichert.
Die Seite sagt das auch.

Für die Lead-Erfassung steht dort seit dem 15.09.2026:

```js
apiBase: "https://atlas-quick-check.it-agile.de"
```

Nach jeder Änderung `sync.py`. Drei Dinge hängen daran, alle drei vor oder mit
demselben Push:

1. Das Backend muss die Herkunft `https://it-team-flow.de` in
   `ALLOWED_ORIGINS` führen, sonst blockt der Browser die Anfrage. Der Fehler
   ist tückisch: die App fängt ihn ab, zeigt „konnte nicht übertragen werden",
   und der Lead ist weg. Prüfen mit

   ```bash
   ssh root@2.28.53.22 'grep ALLOWED_ORIGINS /etc/quick-check.env'
   ```

2. Der Abschnitt „ATLAS Quick Check" in `content/datenschutz.md` beschreibt die
   Übertragung. Vorher stimmt er nicht, nachher fehlt er. Also gemeinsam
   pushen.

3. Die Benachrichtigung muss stehen, siehe „Benachrichtigung einrichten".
   Sonst liegt der erste echte Lead ungesehen in `data.json`.

Erst umstellen, wenn der endgültige Name steht.

## Der Server

### Warum eine eigene Maschine

Der ursprüngliche Plan war, den Dienst neben dem TYPO3 auf `162.55.222.147`
zu betreiben. **Das geht nicht.** Die Maschine ist ein über konsoleH
verwaltetes Hetzner-Produkt (Reverse-DNS `dedivirt2732.your-server.de`,
Vertragstyp „Level 19"). Bei dieser Produktklasse betreibt Hetzner das
Betriebssystem: es gibt kein root, keine eigenen systemd-Dienste, keinen
Prozess auf einem eigenen Port, und die Apache-Konfiguration wird vom Werkzeug
erzeugt und würde von Hand eingetragene Änderungen überschreiben.

Der Zugang zu jener Maschine liegt zudem nicht im Team: Weder das
konsoleH-Konto noch das united-domains-Konto stand zur Verfügung.

Eine eigene kleine Cloud-Instanz löst beides und trennt den Eingriff sauber
vom Produktivauftritt. `it-agile.de`, `it-agile.eu` und Matomo bleiben
unberührt; ein Rückbau heisst „Maschine löschen".

**Verwechslungsgefahr:** Hetzner hat vier verschiedene Oberflächen. Cloud
Console (`console.hetzner.cloud`) für Cloud-Server, Robot
(`robot.hetzner.com`) für dedizierte Server, konsoleH
(`konsoleh.your-server.de`) für Webhosting und Managed Server, DNS Console
(`dns.hetzner.com`) für Zonen bei Hetzner. Unser Server liegt in der **Cloud
Console**. Die Zone `it-team-flow.de` liegt bei **united-domains**, nicht bei
Hetzner — eine Zone in der DNS Console anzulegen wäre wirkungslos und beim
Umstellen der Nameserver gefährlich, weil dort auch MX und SPF hängen.

### Was läuft

| | |
|---|---|
| Maschine | `2.28.53.22`, Hetzner Cloud, Rechenzentrum Nürnberg, Name in der Cloud Console `wompti-quick-check` (nur intern) |
| System | Debian 13 (trixie), systemd 257 |
| Node | 20.19.2 aus den Debian-Quellen, kein Fremdrepository |
| Dienst | systemd-Unit `quick-check`, Benutzer `quickcheck`, Programm in `/opt/quick-check` |
| Daten | `/var/lib/quick-check/data.json`, `0600`, Verzeichnis `0750` |
| Umgebung | `/etc/quick-check.env`, `0600` root — hält das Token aus der Unit-Datei heraus |
| Proxy | Caddy 2.6.2, holt und erneuert das Zertifikat selbsttätig |
| Firewall | Hetzner Cloud Firewall: eingehend nur 22, 80, 443 und ICMP |
| SSH | nur Schlüssel, Passwortanmeldung abgeschaltet |
| Sicherheitsupdates | `unattended-upgrades` aktiv |

Der Node-Prozess bindet an `127.0.0.1:3000`, ebenso Caddys Verwaltungsschnitt-
stelle auf `2019`. Von aussen erreichbar ist ausschliesslich Caddy.

### Neu aufsetzen

Falls die Maschine einmal neu gebaut werden muss. Vorbedingung: Debian, root
per SSH-Schlüssel, Firewall auf 22, 80, 443.

```bash
apt-get update && apt-get install -y nodejs npm caddy
adduser --system --group --no-create-home quickcheck
mkdir -p /opt/quick-check /var/lib/quick-check
chown quickcheck:quickcheck /var/lib/quick-check
chmod 750 /var/lib/quick-check
```

Dateien übertragen. Zuerst `sync.py`, sonst fehlt `public/` und der Server
liefert eine Oberfläche aus, die es nicht gibt. `node_modules` und `data.json`
bleiben draussen, `public/` kommt mit:

```bash
cd quick-check-src && python3 sync.py && cd ..
rsync -a --delete --exclude node_modules --exclude data.json \
  quick-check-src/server/ root@SERVER:/opt/quick-check/
ssh root@SERVER 'cd /opt/quick-check && npm ci --omit=dev'
```

`quick-check.env.example` nach `/etc/quick-check.env` kopieren, Werte
eintragen, `chmod 600`. `quick-check.service` nach `/etc/systemd/system/`,
`Caddyfile.example` nach `/etc/caddy/Caddyfile`, Namen anpassen.

```bash
systemctl daemon-reload
systemctl enable --now quick-check
systemctl reload caddy
curl -s localhost:3000/api/aggregate   # muss {"room":"default","count":0,...} liefern
```

### Umgebungsvariablen

| Variable | Bedeutung |
|---|---|
| `ADMIN_TOKEN` | **Pflicht.** Ohne gesetztes Token antworten `/api/data` und `/api/reset` mit 503, statt Daten offenzulegen. Lang und zufällig wählen. Liegt in `/etc/quick-check.env`, nicht im Repo. |
| `ALLOWED_ORIGINS` | Erlaubte Herkünfte, Kommaliste. Während der Übergangszeit: `https://rlethmate.github.io,https://it-team-flow.de` |
| `PUBLIC_URL` | Basis-URL für den QR-Code. Ausdrücklich setzen, dann hängt der QR-Code nicht von Kopfzeilen des Proxys ab. |
| `DATA_FILE` | `/var/lib/quick-check/data.json` |
| `HOST` | Standard `127.0.0.1`. Nur setzen, wenn der Dienst bewusst ohne Proxy erreichbar sein soll. |
| `NOTIFY_TO` | Empfänger der Benachrichtigung, Kommaliste. Besser ein Postfach als eine Person, sonst bleibt eine Anfrage im Urlaub liegen. |
| `NOTIFY_FROM` | Absender. Muss zu `SMTP_USER` passen, sonst weist der Postausgangsserver ab oder der Empfänger stuft als Spam ein. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Postausgangsserver. Port 587 mit STARTTLS ist die Voreinstellung. `SMTP_PASS` ist ein Geheimnis und gehört nur hierher. |
| `SMTP_SECURE` | `1` für TLS ab der ersten Verbindung, meist Port 465. Sonst leer lassen. |
| `NOTIFY_DRY_RUN` | `1` schreibt die Mail nur in das Journal, ohne sie zu senden. Zum Einrichten. |

Fehlt eine der drei Angaben `SMTP_HOST`, `NOTIFY_TO`, `NOTIFY_FROM`, meldet der
Dienst nichts. Anfragen werden dann trotzdem gespeichert, und der Dienst warnt
beim Start:

```
WARNUNG: Keine Benachrichtigung bei neuen Anfragen. ...
```

### Benachrichtigung einrichten

Zuerst im Probelauf, damit man den Inhalt einmal sieht, ohne jemandem eine Mail
zu schicken:

```bash
# in /etc/quick-check.env
NOTIFY_TO=flow@it-agile.de
NOTIFY_FROM=quick-check@it-agile.de
NOTIFY_DRY_RUN=1
```

```bash
systemctl restart quick-check
journalctl -u quick-check -f          # in einem zweiten Fenster mitlesen
```

Dann eine Anfrage über das Formular abschicken. Die Mail steht vollständig im
Journal. Passt sie, `SMTP_*` eintragen, `NOTIFY_DRY_RUN` leeren und neu
starten. Beim Start prüft der Dienst die Zugangsdaten einmal und sagt:

```
Benachrichtigung bereit: smtp.example.net:587 an flow@it-agile.de
```

Stimmt etwas nicht, steht dort stattdessen eine Warnung — dann merkt man den
Tippfehler beim Einrichten und nicht an der ersten echten Anfrage.

Der Versand läuft **nach** der Antwort an den Browser. Eine Anfrage geht also
nie verloren, weil der Postausgangsserver klemmt; sie ist gespeichert, bevor
die Mail überhaupt versucht wird. Der Ausgang steht als `notify` an jeder
Einreichung: `versandt`, `probelauf`, `aus` oder `fehlgeschlagen`. Übersehene
Anfragen findet man damit wieder:

```bash
jq '.submissions[] | select(.notify=="fehlgeschlagen")' /var/lib/quick-check/data.json
```

### Sicherung der Daten

`data.json` ist die einzige Kopie der eingegangenen Anfragen. Ein Fehlgriff mit
`/api/reset` löscht sie ohne Rückfrage. `backup.sh` legt eine Kopie je Tag ab
und wirft nach 30 Tagen die alten weg:

```bash
install -m 700 -o root -g root backup.sh /usr/local/sbin/quick-check-backup
install -m 644 quick-check-backup.service quick-check-backup.timer /etc/systemd/system/
mkdir -p /var/backups/quick-check && chmod 700 /var/backups/quick-check
systemctl daemon-reload
systemctl enable --now quick-check-backup.timer
systemctl start quick-check-backup     # einmal von Hand, zur Probe
ls -l /var/backups/quick-check
```

Das ist eine Sicherung **auf derselben Maschine**: gegen das versehentliche
Löschen hilft sie, gegen den Verlust des Servers nicht. Dafür zusätzlich die
Backups in der Hetzner Cloud Console einschalten oder die Datei woanders
hinziehen.

### Der Name, und wie er zustande kam

Der Dienst läuft unter `atlas-quick-check.it-agile.de`. Der A-Eintrag dazu
liegt bei **united-domains** in der Zone `it-agile.de` und zeigt auf
`2.28.53.22`. Beide Zonen, `it-agile.de` und `it-team-flow.de`, werden von
`ns.udag.de` bedient; eine Zone bei Hetzner anzulegen wäre wirkungslos und beim
Umstellen der Nameserver gefährlich, weil dort auch MX und SPF hängen.

**Beide Zonen haben einen Platzhalter.** `*.it-agile.de` zeigt auf die
TYPO3-Maschine `162.55.222.147` (A **und** AAAA), `*.it-team-flow.de` auf
GitHub Pages (nur A). Ein ausdrücklicher Eintrag hat Vorrang: Sobald der Name
selbst existiert, greift der Platzhalter für ihn gar nicht mehr, auch nicht für
AAAA. Für den Vorgängernamen `wompti-quick-check.it-agile.de` wurde das am
15.09.2026 nachgemessen: Der A-Eintrag kam durch, die AAAA-Antwort blieb leer.
Für `atlas-quick-check` steht die Gegenprobe noch aus. Ohne diese Eigenschaft wären
IPv6-Clients auf dem TYPO3 gelandet und hätten ein 404 gesehen, während
IPv4-Clients den Quick Check bekommen. Bei künftigen Subdomains beides prüfen:

```bash
dig +short NAME.it-agile.de A      # muss 2.28.53.22 sein
dig +short NAME.it-agile.de AAAA   # muss leer sein
```

Vorher lief der Dienst unter `quick-check.2.28.53.22.sslip.io`. `sslip.io` löst
jeden Namen, der eine IP-Adresse enthält, auf genau diese Adresse auf — das
genügt für ein echtes Let's-Encrypt-Zertifikat, ohne jeden DNS-Eintrag. Es ist
aber ein fremder, kostenloser Dienst; fällt er aus, ist der Name weg. Für einen
künftigen Umzug oder Neuaufbau ist das der Weg, um ohne DNS-Abhängigkeit
anzufangen.

Der Namenswechsel selbst sind zwei Zeilen auf dem Server:

```bash
sed -i 's/ALTER\.NAME/NEUER.NAME/' /etc/caddy/Caddyfile /etc/quick-check.env
systemctl reload caddy && systemctl restart quick-check
```

`/etc/quick-check.env` deshalb mit, weil dort `PUBLIC_URL` steht — die Basis für
den QR-Code. Caddy holt das neue Zertifikat von selbst; der Verlauf steht in
`journalctl -u caddy`. **`ALLOWED_ORIGINS` ändert sich dabei nicht**: Das ist
die Herkunft der aufrufenden Seite (`https://it-team-flow.de`), nicht die des
Dienstes.

### Wieder abbauen

Der Eingriff ist vollständig rückbaubar, weil er auf einer eigenen Maschine
liegt: In der Cloud Console den Server löschen. Bestehende Auftritte,
Zertifikate und Konfigurationen sind davon in keiner Weise berührt, weil an
ihnen nie etwas verändert wurde.

Nur den Dienst entfernen, Maschine behalten:

```bash
systemctl disable --now quick-check
rm /etc/systemd/system/quick-check.service /etc/quick-check.env
rm -rf /opt/quick-check /var/lib/quick-check
deluser quickcheck
```

## Workshop durchführen

1. Raumcode wählen — **nicht nur den Kundennamen**, sondern mit einem nicht
   erratbaren Zusatz: `kunde-4823` statt `kunde`. Grund: `GET /api/aggregate` ist
   öffentlich, wer den Raumcode errät, sieht das Gruppenprofil. Siehe „Offene
   Punkte". Die Teilnehmenden tippen den Code nie, er steckt im QR-Code.
2. Moderationsansicht öffnen und projizieren:
   `https://atlas-quick-check.it-agile.de/quick-check/?room=kunde-4823&present=1`
   Sie zeigt QR-Code, Adresse, Raumcode, Anzahl der Rückmeldungen und das
   Gruppenprofil. Aktualisierung alle drei Sekunden.
3. Teilnehmende scannen den QR-Code, beantworten 15 Aussagen und sehen danach
   das Gruppenprofil mit ihren eigenen Werten als gestrichelte Linie darüber.
4. Nach dem Workshop über die Moderationsansicht zurücksetzen. Das fragt nach
   dem `ADMIN_TOKEN` und leert **nur diesen Raum**.

Beim Einrichten ohne `?room=` zu testen, füllt den Raum `default` — denselben,
in dem die Leads aus dem Einzelmodus landen. Dafür lieber einen eigenen
Raumnamen verwenden.

Leads aus dem Einzelmodus exportieren:

```bash
curl -H "x-admin-token: DEIN-TOKEN" \
  https://atlas-quick-check.it-agile.de/api/data?room=default
```

## API

| Endpunkt | Zugang | Zweck |
|---|---|---|
| `POST /api/submit` | öffentlich | Antworten, optional Kontaktdaten. Verlangt ein Feld `id`. Begrenzt auf 30 Einreichungen je IP in 10 Minuten. Kontaktdaten nimmt der Server nur mit `consent: true` und gültiger E-Mail-Adresse an, sonst 400 (`consent_required`, `invalid_email`). Das Formular prüft beides auch — aber ein Formular ist keine Zugangskontrolle. |
| `GET /api/aggregate?room=` | öffentlich | **nur** Anzahl und Mittelwert je Frage. Keine Rohdaten, keine Kontaktdaten. |
| `GET /api/qr?room=` | öffentlich | QR-Code als SVG |
| `GET /api/data` | Token | Rohdaten inklusive Kontaktdaten, optional nach Raum |
| `POST /api/reset` | Token | Raum leeren, `{"room":"*"}` leert alles |

Der Server kennt den Fragebogen **nicht**. Er aggregiert nur je Frage
(`q0`, `q1`, …) und weiss nichts von Dimensionen, Zonen oder Texten. Die
Zuordnung macht die App. Deshalb müssen Änderungen am Fragebogen nur an einer
Stelle gemacht werden.

### Zwei Reihenfolgen, die nicht dasselbe sind

| | wo | Reihenfolge |
|---|---|---|
| **Anzeige** | `DIMENSIONS` in `app/app.js` | Alignment, Teams, Leadership, Architektur, Steuerung |
| **Speicherung** | `QUESTIONS` in `app/app.js` → `q0`…`q14` | Leadership, Alignment, Steuerung, Teams, Architektur |

`DIMENSIONS` bestimmt nur die Darstellung: auf welchem Schritt eine Dimension
abgefragt wird und wo ihre Achse auf der Zielscheibe sitzt. Sie ergibt das
Merkwort **ATLAS**.

Die Kennungen `q0` bis `q14` entstehen dagegen aus `QUESTIONS`, je drei
Aussagen pro Dimension. Diese Reihenfolge ist bei der Umbenennung von LASTA auf
ATLAS am 15.09.2026 **bewusst unverändert geblieben**: Da der Server nur je
`q`-Kennung mittelt, würde ein Umsortieren dort sämtliche bereits erhobenen
Antworten umdeuten, ohne dass es irgendwo auffiele.

Wer den Fragebogen umbaut, muss deshalb wissen, welche der beiden Listen er
anfasst. Zwei Prüfungen in Abschnitt [2] der Testsuite halten die Trennung fest,
und die Testhilfe `aggregate` bildet `q0`…`q14` über `QUESTION_DIMS` ab, nicht
über `DIMS`.

## Offene Punkte

- **Mindestzahl für Anonymität, und erratbare Raumcodes.** Zwei Punkte, die
  sich gegenseitig verschärfen. `GET /api/aggregate?room=` ist öffentlich, und
  zwar mit Absicht: Jede Teilnehmerin fragt ihn ab, um das Gruppenprofil zu
  sehen. Wer den Raumcode kennt oder errät, sieht es aber ebenso — und bei drei
  oder vier Teilnehmenden lassen sich einzelne Antworten aus dem Mittelwert
  zurückrechnen. Ein Aussenstehender könnte so an das Ergebnisprofil eines
  Kundenworkshops kommen. Zwei Abhilfen, beide bewusst noch nicht gebaut: das
  Gruppenprofil erst ab einer Mindestzahl von Rückmeldungen zeigen, und
  Raumcodes serverseitig mit einem Zufallsanteil erzeugen, statt sie frei
  wählen zu lassen. Bis dahin gilt die Handreichung unter „Workshop
  durchführen": Raumcode mit nicht erratbarem Zusatz.
- **Formulierung der Aussagen.** Das Subjekt wechselt zwischen „wir", „eure
  Teams" und „deine Teams"; die Aussagen 13 und 15 fragen mehrere Bedingungen
  gleichzeitig ab. Beides stammt wörtlich aus dem Typeform. Eine Änderung
  berührt die Vergleichbarkeit mit Altdaten und ist eine inhaltliche
  Entscheidung.
- **Zonengrenzen.** „wirksam" ab Mittelwert 4,0, „teilweise wirksam" ab 2,0,
  darunter „Entwicklungsfeld". Ansatzpunkte erscheinen nur für die beiden
  unteren Zonen. Die
  Textstufen der Gesamtbewertung folgen dagegen weiterhin den Punktegrenzen 29
  und 45 aus dem Typeform. Beides ist bewusst gesetzt, aber nicht empirisch
  kalibriert.
- **Einwilligung.** Speicherung und Kontaktaufnahme hängen an einem Häkchen,
  weil die Daten nur diesem einen Zweck dienen. Ob das der geforderten
  Granularität entspricht, ist juristisch zu prüfen.
- **Logik im alten Typeform ist defekt.** Die Sprungregeln am Ende deckten
  Ergebnisse über 45 Punkte nicht ab, und die Bereiche überlappten. Die
  Stufengrenzen hier sind eine Rekonstruktion der erkennbaren Absicht.
