# LASTA Quick Check

Ein Fragebogen, zwei Betriebsarten, **eine Codebasis**.

| | Einzelmodus | Teammodus |
|---|---|---|
| Wer | eine Person auf der Landingpage | mehrere Personen im Workshop |
| Auswertung | eigenes Profil | Mittelwert der Gruppe, aktualisiert sich laufend |
| Zugang | Link von `it-team-flow.de` | QR-Code und Raumcode |
| Kontaktdaten | ja, als Lead | nein |
| Betrieb | statisch, GitHub Pages | Node-Server, eigene Hetzner-Cloud-Instanz |

Ersetzt das frühere Typeform (`form.typeform.com/to/JiDiDyST`) und die
SpiderApp aus dem WIEN-IT-Workshop.

## Stand am 03.09.2026

**Einzelmodus ist live** unter https://it-team-flow.de/quick-check/, erreichbar
über die Blog-Kachel der Startseite. Er läuft ohne Backend: das Ergebnis
entsteht im Browser, das Kontaktformular überträgt nichts, und die Seite weist
darauf hin.

**Teammodus läuft, unter einem vorläufigen Namen.** Er ist erreichbar unter

```
https://quick-check.2.28.53.22.sslip.io/quick-check/
```

Vollständig geprüft: HTTPS mit gültigem Zertifikat, Einreichungen werden
korrekt gemittelt, Rohdaten nur mit Token, Reset leert den Raum, QR-Code wird
geliefert. Der Dienst startet nach einem Neustart der Maschine von selbst.

Der Name ist ein Provisorium, siehe „Vom Provisorium zum endgültigen Namen".
Alles andere ist Dauerbetrieb.

### Was als Nächstes zu tun ist

1. **A-Eintrag bei united-domains setzen**: `quick-check` in der Zone
   `it-team-flow.de` auf `2.28.53.22`. Dafür wird jemand mit Zugang zum
   united-domains-Konto gebraucht — das ist die einzige verbliebene
   Abhängigkeit von einer anderen Person.
2. **Namen umstellen**, zwei Zeilen, siehe unten.
3. Danach **`apiBase` in `app/config.solo.js`** auf den Dienst zeigen lassen und
   `python3 sync.py` ausführen, damit auch der öffentliche Quick Check seine
   Anfragen dorthin sendet. Bewusst noch nicht getan: Solange der Name
   provisorisch ist, würde die Produktivseite echte Leads an eine Adresse
   senden, die von einem fremden Gratisdienst abhängt.

### Was danach noch offen bleibt

- **E-Mail-Benachrichtigung** bei neuen Anfragen. Ohne sie liegt ein Lead in
  `data.json`, bis jemand ihn abholt. Das Vorbild ist das Powermail-Formular auf
  `it-agile.de/kontakt/`, das genau das tut: speichern und benachrichtigen.
- **Backups.** Bewusst abgeschaltet, weil im Testbetrieb nichts zu verlieren
  ist. Sobald der Einzelmodus echte Leads schreibt, ist `data.json` die einzige
  Kopie einer Geschäftsinformation. Dann entweder Hetzner-Backups einschalten
  oder die Datei täglich wegsichern.
- **Mindestzahl an Rückmeldungen**, bevor im Teammodus ein Gruppenprofil
  erscheint. Bei drei oder vier Teilnehmenden lassen sich einzelne Antworten aus
  dem Mittelwert zurückrechnen.
- **Datenschutzerklärung** um den Quick Check ergänzen, sobald das
  Kontaktformular tatsächlich Daten überträgt.

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
Der Backend-Teil startet einen echten Server auf Port 31739 gegen eine
temporäre Datendatei.

## Einzelmodus veröffentlichen

Die Seite ist Teil der Hugo-Site und liegt nach `sync.py` unter
`static/quick-check/`. Hugo kopiert `static/` unverändert, es gibt also keinen
Build-Schritt. Nach dem Push auf `main` deployt der Workflow
`.github/workflows/hugo.yml` nach GitHub Pages, erreichbar unter
`https://it-team-flow.de/quick-check/`.

Ohne Backend läuft die Seite im Testbetrieb: das Ergebnis entsteht im Browser,
es wird nichts übertragen und nichts gespeichert. Die Seite sagt das auch.

Für die Lead-Erfassung in `app/config.solo.js`:

```js
apiBase: "https://quick-check.it-team-flow.de"
```

Danach `sync.py`. Das Backend muss die Herkunft `https://it-team-flow.de` in
`ALLOWED_ORIGINS` führen, sonst blockt der Browser die Anfrage. Erst umstellen,
wenn der endgültige Name steht.

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
| Maschine | `2.28.53.22`, Hetzner Cloud, Rechenzentrum Nürnberg, Name `wompti-quick-check` |
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

### Vom Provisorium zum endgültigen Namen

`quick-check.2.28.53.22.sslip.io` funktioniert ohne jeden DNS-Eintrag:
`sslip.io` löst jeden Namen, der eine IP-Adresse enthält, auf genau diese
Adresse auf. Das genügt für ein echtes Let's-Encrypt-Zertifikat, weil der Name
nachweislich auf diesen Server zeigt.

Es ist ein fremder, kostenloser Dienst. Fällt er aus, ist der Name weg. Für
den Dauerbetrieb taugt das nicht.

Sobald der A-Eintrag `quick-check.it-team-flow.de` → `2.28.53.22` bei
united-domains steht, sind es zwei Zeilen:

```bash
sed -i 's/quick-check\.2\.28\.53\.22\.sslip\.io/quick-check.it-team-flow.de/' \
  /etc/caddy/Caddyfile /etc/quick-check.env
systemctl reload caddy
systemctl restart quick-check
```

Caddy holt das neue Zertifikat von selbst. Danach `apiBase` in
`app/config.solo.js` setzen, `sync.py` laufen lassen, pushen.

Der Platzhalter der Zone zeigt auf GitHub Pages; ein ausdrücklicher Eintrag für
`quick-check` hat Vorrang vor ihm.

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
   erratbaren Zusatz: `wien-4823` statt `wien`. Grund: `GET /api/aggregate` ist
   öffentlich, wer den Raumcode errät, sieht das Gruppenprofil. Siehe „Offene
   Punkte". Die Teilnehmenden tippen den Code nie, er steckt im QR-Code.
2. Moderationsansicht öffnen und projizieren:
   `https://quick-check.2.28.53.22.sslip.io/quick-check/?room=wien-4823&present=1`
   Sie zeigt QR-Code, Adresse, Raumcode, Anzahl der Rückmeldungen und das
   Gruppenprofil. Aktualisierung alle drei Sekunden.
3. Teilnehmende scannen den QR-Code, beantworten 15 Aussagen und sehen danach
   das Gruppenprofil mit ihren eigenen Werten als gestrichelte Linie darüber.
4. Nach dem Workshop über die Moderationsansicht zurücksetzen. Das fragt nach
   dem `ADMIN_TOKEN` und leert **nur diesen Raum**.

Nach der Umstellung auf den endgültigen Namen lautet die Adresse
`https://quick-check.it-team-flow.de/quick-check/?room=wien-4823&present=1`.

Leads aus dem Einzelmodus exportieren:

```bash
curl -H "x-admin-token: DEIN-TOKEN" \
  https://quick-check.2.28.53.22.sslip.io/api/data?room=default
```

## API

| Endpunkt | Zugang | Zweck |
|---|---|---|
| `POST /api/submit` | öffentlich | Antworten, optional Kontaktdaten. Verlangt ein Feld `id`. Begrenzt auf 30 Einreichungen je IP in 10 Minuten. |
| `GET /api/aggregate?room=` | öffentlich | **nur** Anzahl und Mittelwert je Frage. Keine Rohdaten, keine Kontaktdaten. |
| `GET /api/qr?room=` | öffentlich | QR-Code als SVG |
| `GET /api/data` | Token | Rohdaten inklusive Kontaktdaten, optional nach Raum |
| `POST /api/reset` | Token | Raum leeren, `{"room":"*"}` leert alles |

Der Server kennt den Fragebogen **nicht**. Er aggregiert nur je Frage
(`q0`, `q1`, …) und weiss nichts von Dimensionen, Zonen oder Texten. Die
Zuordnung macht die App. Deshalb müssen Änderungen am Fragebogen nur an einer
Stelle gemacht werden.

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
