"use strict";

/* Backend für den ATLAS Quick Check.
 *
 * Zwei Aufgaben:
 *   1. Teammodus: Antworten mehrerer Personen sammeln und als Mittelwert je
 *      Frage wieder ausliefern, damit alle dasselbe Gruppenprofil sehen.
 *   2. Einzelmodus: Kontaktdaten aus dem öffentlichen Quick Check annehmen.
 *
 * Der Server kennt den Fragebogen bewusst NICHT. Er aggregiert nur je Frage
 * (q0, q1, ...) und weiß nichts von Dimensionen, Zonen oder Texten. Die
 * Zuordnung macht die App. So bleibt der Fragebogen an einer Stelle gepflegt.
 *
 * Endpunkte:
 *   POST /api/submit              öffentlich   Antworten, optional Kontaktdaten.
 *                                              Kontaktdaten nur mit Einwilligung
 *                                              und gültiger E-Mail-Adresse.
 *   GET  /api/aggregate?room=     öffentlich   nur Anzahl und Mittelwerte
 *   GET  /api/qr?room=            öffentlich   QR-Code als SVG
 *   GET  /api/data                Token nötig  Rohdaten inklusive Kontaktdaten
 *   POST /api/reset               Token nötig  Raum oder alles leeren
 *
 * Umgebungsvariablen:
 *   PORT             Standard 3000
 *   ADMIN_TOKEN      Pflicht für /api/data und /api/reset. Ohne gesetztes
 *                    Token antworten beide mit 503, statt Daten offenzulegen.
 *   ALLOWED_ORIGINS  Kommaliste erlaubter Herkünfte für Anfragen aus dem Browser,
 *                    z. B. "https://it-team-flow.de". Ohne Angabe sind nur
 *                    Anfragen von derselben Herkunft möglich.
 *   PUBLIC_URL       Basis-URL für den QR-Code, z. B.
 *                    "https://atlas-quick-check.it-agile.de". Ohne Angabe wird sie
 *                    aus den Anfrage-Headern abgeleitet.
 *   DATA_FILE        Pfad der Datendatei, Standard ./data.json
 *
 * Benachrichtigung bei neuen Anfragen. Ohne SMTP_HOST, NOTIFY_TO und
 * NOTIFY_FROM bleibt sie aus; der Dienst läuft dann wie bisher und sagt das
 * beim Start. Die Anfrage hängt nie am Mailversand: sie ist gespeichert, bevor
 * die Mail überhaupt versucht wird.
 *   SMTP_HOST        Postausgangsserver
 *   SMTP_PORT        Standard 587 (STARTTLS)
 *   SMTP_SECURE      "1" für TLS ab der ersten Verbindung, meist Port 465
 *   SMTP_USER        Postfach
 *   SMTP_PASS        Kennwort. Gehört nur in /etc/quick-check.env, 0600 root.
 *   NOTIFY_TO        Empfänger, Kommaliste
 *   NOTIFY_FROM      Absender, muss zum Postfach passen
 *   NOTIFY_DRY_RUN   "1" schreibt die Mail nur auf die Ausgabe, ohne Versand
 */

const express = require("express");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 3000;
/* Nur auf dem Rechner selbst lauschen. Von aussen erreichbar ist der Dienst
 * ausschliesslich ueber den Reverse Proxy. HOST=0.0.0.0 hebt das bewusst auf. */
const HOST = process.env.HOST || "127.0.0.1";
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, "data.json");
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",").map((s) => s.trim()).filter(Boolean);
const PUBLIC_URL = (process.env.PUBLIC_URL || "").replace(/\/+$/, "");

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = process.env.SMTP_SECURE === "1";
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const NOTIFY_TO = (process.env.NOTIFY_TO || "")
  .split(",").map((s) => s.trim()).filter(Boolean);
const NOTIFY_FROM = process.env.NOTIFY_FROM || "";
const NOTIFY_DRY_RUN = process.env.NOTIFY_DRY_RUN === "1";
/* Ohne Empfänger und Absender gibt es niemanden, dem man etwas schicken
 * könnte. Der Probelauf braucht keinen Postausgangsserver, der echte Versand
 * schon. */
const NOTIFY_READY = NOTIFY_TO.length > 0 && !!NOTIFY_FROM &&
  (NOTIFY_DRY_RUN || !!SMTP_HOST);

const MAX_ANSWERS = 50;          // grosszügige Obergrenze, schützt vor Müll
const MAX_FIELD_LEN = 200;       // je Kontaktfeld
const MAX_MESSAGE_LEN = 4000;    // Freitextfeld
const MAX_ROOM_LEN = 40;
const RATE_MAX = 30;             // Einreichungen je IP
const RATE_WINDOW_MS = 10 * 60 * 1000;

// ---------------------------------------------------------------- Persistenz

function loadData() {
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    if (raw && Array.isArray(raw.submissions)) return raw;
  } catch (e) {
    // Datei fehlt oder ist unlesbar: mit leerem Stand starten.
  }
  return { submissions: [] };
}

function saveData(data) {
  const tmp = DATA_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DATA_FILE); // atomar, damit ein Absturz die Datei nicht zerreisst
}

let store = loadData();

// ---------------------------------------------------------------- Hilfsmittel

function cleanRoom(value) {
  const s = typeof value === "string" && value.trim() ? value.trim() : "default";
  return s.slice(0, MAX_ROOM_LEN);
}

function validAnswers(answers) {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return false;
  const keys = Object.keys(answers);
  if (!keys.length || keys.length > MAX_ANSWERS) return false;
  return keys.every((k) => {
    if (!/^q\d{1,3}$/.test(k)) return false;
    const v = answers[k];
    return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5;
  });
}

/* Steuerzeichen aus einem einzeiligen Feld entfernen. Ein Zeilenumbruch in
 * Name oder E-Mail hat dort nichts zu suchen und wäre in einer Mail-Kopfzeile
 * gefährlich. */
function stripLine(value) {
  return value.replace(/[\u0000-\u001f\u007f]/g, "");
}

/* Im Freitext bleiben Zeilenumbrüche und Tabulatoren erhalten, alles andere
 * Unsichtbare fliegt heraus. */
function stripText(value) {
  return value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* Kontaktdaten auf bekannte Felder und Längen beschränken. Alles andere fliegt
 * heraus, damit über dieses Feld nichts Beliebiges in der Datei landet. */
function cleanContact(contact) {
  if (contact === undefined || contact === null) return undefined;
  if (typeof contact !== "object" || Array.isArray(contact)) return null;
  const out = {};
  ["firstname", "lastname", "email", "phone", "company", "topic"].forEach((k) => {
    if (typeof contact[k] === "string") {
      out[k] = stripLine(contact[k]).trim().slice(0, MAX_FIELD_LEN);
    }
  });
  // Freitext braucht mehr Platz als ein Namensfeld, aber ebenfalls eine Grenze.
  if (typeof contact.message === "string") {
    out.message = stripText(contact.message).trim().slice(0, MAX_MESSAGE_LEN);
  }
  out.consent = contact.consent === true;
  return out;
}

/* Zwei Bedingungen, ohne die Kontaktdaten nicht gespeichert werden dürfen oder
 * nutzlos wären. Der Browser prüft beides schon, aber ein Formular ist keine
 * Zugangskontrolle: ein Aufruf an /api/submit vorbei am Formular hat sonst
 * personenbezogene Daten ohne Einwilligung in die Datei geschrieben.
 * Name und Unternehmen bleiben bewusst freiwillig — eine Anfrage mit
 * E-Mail-Adresse ist beantwortbar, auch wenn der Name fehlt. */
function contactProblem(contact) {
  if (contact.consent !== true) return "consent_required";
  if (!EMAIL_RE.test(contact.email || "")) return "invalid_email";
  return null;
}

const rateBuckets = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const bucket = (rateBuckets.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (bucket.length >= RATE_MAX) {
    rateBuckets.set(ip, bucket);
    return true;
  }
  bucket.push(now);
  rateBuckets.set(ip, bucket);
  return false;
}

// Gelegentlich aufräumen, damit die Map nicht unbegrenzt wächst.
setInterval(() => {
  const now = Date.now();
  rateBuckets.forEach((times, ip) => {
    const keep = times.filter((t) => now - t < RATE_WINDOW_MS);
    if (keep.length) rateBuckets.set(ip, keep);
    else rateBuckets.delete(ip);
  });
}, RATE_WINDOW_MS).unref();

function requireToken(req, res) {
  if (!ADMIN_TOKEN) {
    res.status(503).json({ error: "admin_token_not_configured" });
    return false;
  }
  if (req.get("x-admin-token") !== ADMIN_TOKEN) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}

function baseUrl(req) {
  if (PUBLIC_URL) return PUBLIC_URL;
  const proto = req.get("x-forwarded-proto") || req.protocol || "http";
  const host = req.get("x-forwarded-host") || req.get("host") || "localhost:" + PORT;
  return proto + "://" + host;
}

// ---------------------------------------------------------- Benachrichtigung

let transport = null;

function mailer() {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
    });
  }
  return transport;
}

/* Zuordnung der Antworten zu den Dimensionen. Je drei Aussagen, in der
 * Reihenfolge von QUESTIONS in quick-check-src/app/app.js -- daraus entstehen
 * die Kennungen q0…q14. Der Server braucht sie allein, um die Mail lesbar zu
 * machen; gespeichert wird weiterhin unverändert. Die Liste ist eine
 * Verdopplung aus app.js, eine Prüfung in Abschnitt [13] der Testsuite hält
 * beide zusammen. Wer QUESTIONS umsortiert, deutet damit alle Altdaten um. */
const QUESTION_DIMS = ["Leadership", "Alignment", "Steuerung", "Teams", "Architektur"];
const PRO_DIMENSION = 3;

/* Anzeigereihenfolge, sie ergibt das Merkwort ATLAS -- absichtlich eine andere
 * als die Speicherreihenfolge darüber. */
const DIM_ORDER = ["Alignment", "Teams", "Leadership", "Architektur", "Steuerung"];

/* Mittelwert je Dimension, eine Nachkommastelle mit Komma, so wie die Zahl auch
 * in der Zielscheibe steht, die die anfragende Person gesehen hat. Eine
 * fehlende Antwort zählt nicht mit; fehlen alle einer Dimension, bleibt der
 * Gedankenstrich. */
function dimAverages(answers) {
  const summe = {}, anzahl = {};
  QUESTION_DIMS.forEach((dim, gruppe) => {
    for (let k = 0; k < PRO_DIMENSION; k++) {
      const wert = answers ? answers["q" + (gruppe * PRO_DIMENSION + k)] : undefined;
      if (typeof wert !== "number") continue;
      summe[dim] = (summe[dim] || 0) + wert;
      anzahl[dim] = (anzahl[dim] || 0) + 1;
    }
  });
  return DIM_ORDER.map((dim) => ({
    dim: dim,
    wert: anzahl[dim] ? (summe[dim] / anzahl[dim]).toFixed(1).replace(".", ",") : null
  }));
}

/* Die Mail enthält, was zum Antworten nötig ist, dazu das Profil als Mittelwert
 * je Dimension. Die einzelnen Antworten bleiben draußen: nackte Zahlen ohne die
 * Aussagen dazu sagen nichts. Sie holt man über /api/data. */
function leadMail(entry) {
  const c = entry.contact || {};
  const name = [c.firstname, c.lastname].filter(Boolean).join(" ");
  const row = (label, value) =>
    label + " ".repeat(Math.max(1, 14 - label.length)) + (value || "—");

  const lines = [
    "Neue Anfrage aus dem ATLAS Quick Check.",
    "",
    row("Name:", name),
    row("E-Mail:", c.email),
    row("Telefon:", c.phone),
    row("Unternehmen:", c.company),
    row("Anliegen:", c.topic),
    "",
    "ATLAS-Profil, Mittelwert je Dimension (1 bis 5):",
    ...dimAverages(entry.answers).map((a) => row(a.dim + ":", a.wert)),
    "",
    "Nachricht:",
    c.message || "(keine)",
    "",
    // Ortszeit, nicht UTC: die Mail liest jemand in Hamburg, nicht ein Rechner.
    row("Eingegangen:", new Date(entry.ts).toLocaleString("de-DE",
      { timeZone: "Europe/Berlin", dateStyle: "medium", timeStyle: "short" }) + " Uhr"),
    row("Quelle:", entry.source),
    row("Raum:", entry.room),
    row("Kennung:", entry.id),
    "",
    "Die Einwilligung liegt vor, sonst wäre die Anfrage nicht angenommen worden.",
    "Die einzelnen Antworten liefert GET /api/data" +
      (PUBLIC_URL ? " auf " + PUBLIC_URL : "") + ", dafür wird das Admin-Token gebraucht."
  ];

  return {
    subject: "Quick Check: Anfrage von " + (name || c.email || "unbekannt"),
    text: lines.join("\n") + "\n"
  };
}

function notifyLead(entry) {
  if (!NOTIFY_READY) return Promise.resolve("aus");

  const mail = leadMail(entry);
  const message = {
    from: NOTIFY_FROM,
    to: NOTIFY_TO.join(", "),
    subject: mail.subject,
    text: mail.text
  };
  // Antworten geht damit direkt an die anfragende Person.
  if (entry.contact && entry.contact.email) message.replyTo = entry.contact.email;

  if (NOTIFY_DRY_RUN) {
    console.log("[Benachrichtigung: Probelauf]\nAn: " + message.to +
      "\nAntwort an: " + (message.replyTo || "—") +
      "\nBetreff: " + message.subject + "\n\n" + message.text);
    return Promise.resolve("probelauf");
  }
  return mailer().sendMail(message).then(() => "versandt");
}

// ---------------------------------------------------------------- Middleware

app.disable("x-powered-by");
app.set("trust proxy", true);

// Nur ausdrücklich erlaubte Herkünfte dürfen aus dem Browser zugreifen.
app.use((req, res, next) => {
  const origin = req.get("origin");
  if (origin && ALLOWED_ORIGINS.indexOf(origin) !== -1) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.set("Access-Control-Max-Age", "600");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: "64kb" }));

// ---------------------------------------------------------------- Endpunkte

app.post("/api/submit", (req, res) => {
  if (rateLimited(req.ip)) return res.status(429).json({ error: "too_many_requests" });

  const body = req.body || {};
  if (typeof body.id !== "string" || !body.id || body.id.length > 100) {
    return res.status(400).json({ error: "invalid_id" });
  }
  if (!validAnswers(body.answers)) {
    return res.status(400).json({ error: "invalid_answers" });
  }
  const contact = cleanContact(body.contact);
  if (contact === null) return res.status(400).json({ error: "invalid_contact" });
  if (contact) {
    const problem = contactProblem(contact);
    if (problem) return res.status(400).json({ error: problem });
  }

  if (store.submissions.some((s) => s.id === body.id)) {
    return res.json({ ok: true, alreadyExists: true });
  }

  const entry = {
    id: body.id,
    ts: Date.now(),
    room: cleanRoom(body.room),
    answers: body.answers
  };
  if (contact) {
    entry.contact = contact;
    // Vor dem Versuch schon vermerkt: ein Absturz mitten im Versand bleibt so sichtbar.
    entry.notify = "offen";
  }
  if (typeof body.source === "string") {
    entry.source = stripLine(body.source).slice(0, MAX_FIELD_LEN);
  }

  store.submissions.push(entry);
  saveData(store);
  res.json({ ok: true });

  /* Die Antwort ist heraus, die Anfrage liegt in der Datei. Der Mailversand
   * darf ab hier beliebig lange dauern oder scheitern, ohne dass die Person
   * davon etwas merkt. Der Ausgang landet als entry.notify in der Datei, damit
   * übersehene Anfragen auffindbar sind:
   *   jq '.submissions[] | select(.notify=="fehlgeschlagen")' data.json
   */
  if (contact) {
    notifyLead(entry).then((state) => {
      entry.notify = state;
    }, (err) => {
      entry.notify = "fehlgeschlagen";
      console.error("[Quick Check] Benachrichtigung fehlgeschlagen für " + entry.id +
        ": " + (err && err.message));
    }).then(() => {
      try {
        saveData(store);
      } catch (e) {
        console.error("[Quick Check] Versandstand nicht gesichert: " + e.message);
      }
    });
  }
});

/* Liefert bewusst nur Anzahl und Mittelwerte je Frage. Keine Rohdaten, keine
 * Kontaktdaten: dieser Endpunkt ist öffentlich, weil ihn jede Teilnehmerin im
 * Teammodus abfragt. */
app.get("/api/aggregate", (req, res) => {
  const room = cleanRoom(req.query.room);
  const rows = store.submissions.filter((s) => s.room === room);

  const sums = Object.create(null);
  const counts = Object.create(null);
  rows.forEach((s) => {
    Object.keys(s.answers).forEach((k) => {
      sums[k] = (sums[k] || 0) + s.answers[k];
      counts[k] = (counts[k] || 0) + 1;
    });
  });

  const questions = {};
  Object.keys(sums).forEach((k) => { questions[k] = sums[k] / counts[k]; });

  res.set("Cache-Control", "no-store");
  res.json({ room: room, count: rows.length, questions: questions });
});

app.get("/api/qr", (req, res) => {
  const room = cleanRoom(req.query.room);
  const target = baseUrl(req) + "/quick-check/?room=" + encodeURIComponent(room);
  QRCode.toString(target, { type: "svg", margin: 1, errorCorrectionLevel: "M", width: 512 })
    .then((svg) => {
      res.set("Content-Type", "image/svg+xml");
      res.set("Cache-Control", "public, max-age=300");
      res.send(svg);
    })
    .catch(() => res.status(500).json({ error: "qr_failed" }));
});

app.get("/api/data", (req, res) => {
  if (!requireToken(req, res)) return;
  const room = req.query.room ? cleanRoom(req.query.room) : null;
  const rows = room ? store.submissions.filter((s) => s.room === room) : store.submissions;
  res.set("Cache-Control", "no-store");
  res.json({ count: rows.length, submissions: rows });
});

app.post("/api/reset", (req, res) => {
  if (!requireToken(req, res)) return;
  const room = (req.body && req.body.room) || null;
  if (room === "*" || room === null) {
    store = { submissions: [] };
  } else {
    const target = cleanRoom(room);
    store.submissions = store.submissions.filter((s) => s.room !== target);
  }
  saveData(store);
  res.json({ ok: true, remaining: store.submissions.length });
});

// ---------------------------------------------------------------- Auslieferung

/* Die App liegt unter /quick-check/, damit die relativen Pfade auf ../fonts/
 * und ../images/ identisch zum statischen Deployment auf GitHub Pages sind.
 * Dadurch ist es wirklich dieselbe Datei. */
app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"] }));

app.get("/", (req, res) => res.redirect("/quick-check/"));

app.listen(PORT, HOST, () => {
  console.log("Quick-Check-Backend hört auf " + HOST + ":" + PORT);
  if (!ADMIN_TOKEN) {
    console.warn("WARNUNG: ADMIN_TOKEN ist nicht gesetzt. /api/data und /api/reset sind deaktiviert.");
  }
  if (!ALLOWED_ORIGINS.length) {
    console.log("Hinweis: ALLOWED_ORIGINS ist leer, Zugriffe aus anderen Herkünften werden abgelehnt.");
  }
  if (!NOTIFY_READY) {
    console.warn("WARNUNG: Keine Benachrichtigung bei neuen Anfragen. " +
      "Dafür werden SMTP_HOST, NOTIFY_TO und NOTIFY_FROM gebraucht. " +
      "Anfragen liegen bis zur Abholung über /api/data in " + DATA_FILE + ".");
  } else if (NOTIFY_DRY_RUN) {
    console.log("Benachrichtigung im Probelauf: Mails gehen auf die Ausgabe, nicht auf die Reise.");
  } else {
    /* Zugangsdaten einmal beim Start prüfen. Sonst merkt man einen Tippfehler
     * erst an der ersten echten Anfrage, und die ist dann schon verpasst. */
    mailer().verify().then(() => {
      console.log("Benachrichtigung bereit: " + SMTP_HOST + ":" + SMTP_PORT +
        " an " + NOTIFY_TO.join(", "));
    }, (err) => {
      console.error("WARNUNG: Postausgangsserver nicht erreichbar oder Zugangsdaten falsch: " +
        (err && err.message) + " — Anfragen werden weiter gespeichert, aber nicht gemeldet.");
    });
  }
});
