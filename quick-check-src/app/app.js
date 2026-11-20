/* ATLAS Quick Check – gemeinsame Logik für Einzel- und Teammodus.
 *
 * Der Modus kommt aus window.QC_CONFIG (siehe config.solo.js / config.team.js):
 *   mode: "solo"  Eine Person, eigenes Ergebnis, optional Kontaktdaten als Lead.
 *   mode: "team"  Mehrere Personen über QR-Code, Ergebnis ist der Mittelwert
 *                 der Gruppe und aktualisiert sich laufend.
 *
 * Diese Datei wird von sync.py in beide Deployments eingesetzt. Änderungen
 * gehören immer hierher, nie in die erzeugten Dateien unter static/ oder
 * server/public/.
 */
(function () {
  "use strict";

  // =====================================================================
  // MODUS UND KONFIGURATION
  // =====================================================================

  var CFG = window.QC_CONFIG || {};
  var MODE = CFG.mode === "team" ? "team" : "solo";
  var API = (CFG.apiBase || "").replace(/\/+$/, "");
  var POLL_MS = CFG.pollMs || 3000;
  /* Versionszusatz: Seit dem Fragentausch im Oktober 2026 tragen die Kennungen
   * q0 bis q19 eine andere Bedeutung. Ein Entwurf aus der Zeit davor darf
   * nicht auf die neuen Aussagen gelegt werden, deshalb ein neuer Schlüssel. */
  var STORAGE_KEY = "atlas-quick-check-draft-v2";

  // Im Teammodus liefert immer ein Backend die Seite aus, dann ist ein leerer
  // apiBase gleichbedeutend mit "gleiche Herkunft". Im Einzelmodus bedeutet ein
  // leerer apiBase dagegen: kein Backend, es wird nichts übertragen.
  var HAS_BACKEND = MODE === "team" ? true : !!CFG.apiBase;
  var ASK_FOR_CONTACT = MODE === "solo" && CFG.askForContact !== false;

  function param(name) {
    var m = new RegExp("[?&]" + name + "=([^&]*)").exec(window.location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : null;
  }

  /* Team- und Einzelmodus behandeln den Raum grundlegend verschieden.
   *
   * Team: Raum kommt AUSSCHLIESSLICH aus der URL, kein Ruckfall auf "default"
   * mehr. Ohne eigenen Raumcode (oder mit dem Codewort "default") landete
   * sonst jeder Aufruf ohne QR-Code im selben geteilten Topf wie alle
   * anderen -- samt der Leads aus dem Einzelmodus. Siehe README, Abschnitt
   * "Offene Punkte".
   *
   * Solo: Jeder Durchlauf bekommt eine eigene, zufaellige Kennung als Raum.
   * Es gibt dort ohnehin keine Gruppenauswertung; die Kennung dient nur der
   * Ablage der Leads, und zwei Durchlaeufe duerfen sich nie denselben Topf
   * teilen. */
  var ROOM = MODE === "solo"
    ? ("solo-" + uuid().replace(/-/g, "")).slice(0, 40)
    : (param("room") || "").slice(0, 40);
  var NO_ROOM = MODE === "team" && (!ROOM || ROOM === "default");
  var PRESENT = MODE === "team" && param("present") === "1";
  var TRAINER = MODE === "team" && param("trainer") === "1";

  var TOKEN_KEY = "atlas-quick-check-admin-token";
  var ROOMS_KEY = "atlas-quick-check-rooms";

  // =====================================================================
  // SPRACHE
  // =====================================================================

  /* Alle Texte stehen in i18n.js (window.QC_I18N), je Sprache ein Block.
   * Gewählt wird nach der Browsersprache, und zwar die erste aus
   * navigator.languages, für die es einen Block gibt. ?lang=xx übersteuert das.
   * Bewusst keine Erkennung über die IP-Adresse: ungenau und eine zusätzliche
   * Datenverarbeitung. Gibt es für keine der Browsersprachen einen Block, gilt
   * Englisch: wer weder Deutsch noch eine andere angebotene Sprache eingestellt
   * hat, liest Englisch eher als Deutsch. */
  var I18N = window.QC_I18N || {};
  var BASE_LANG = "de";
  var FALLBACK_LANG = I18N.en ? "en" : BASE_LANG;

  function pickLang() {
    var wanted = [param("lang")];
    var nav = window.navigator || {};
    if (nav.languages && nav.languages.length) wanted = wanted.concat([].slice.call(nav.languages));
    else wanted.push(nav.language);
    for (var i = 0; i < wanted.length; i++) {
      var code = String(wanted[i] || "").toLowerCase().split(/[-_]/)[0];
      if (code && I18N[code]) return code;
    }
    return FALLBACK_LANG;
  }

  var LANG = pickLang();
  var L = I18N[LANG] || {};
  var LB = I18N[BASE_LANG] || {};

  /** Wert aus dem Sprachblock, sonst aus dem deutschen. */
  function lv(name) { return L[name] !== undefined ? L[name] : LB[name]; }

  /** Text zum Schlüssel, Platzhalter {name} werden ersetzt. */
  function t(key, params) {
    var s = (L.s && L.s[key] !== undefined) ? L.s[key] : ((LB.s && LB.s[key]) || key);
    if (params) {
      s = s.replace(/\{(\w+)\}/g, function (m, k) {
        return params[k] !== undefined ? String(params[k]) : m;
      });
    }
    return s;
  }

  /** Anzeigename einer Dimension; intern bleiben die deutschen Kennungen. */
  function dimName(d) { return (lv("dims") || {})[d] || d; }

  // =====================================================================
  // FRAGEBOGEN
  // =====================================================================

  /* Reihenfolge der Abfrage und der Achsen auf der Zielscheibe. Sie ergibt das
   * Merkwort ATLAS: Alignment, Teams, Leadership, Arbeitsfluss, Struktur.
   *
   * Seit dem Fragentausch im Oktober 2026 folgt QUESTIONS derselben Reihenfolge,
   * je vier Aussagen pro Dimension, Kennungen q0 bis q19. Die beiden Listen
   * sind damit absichtlich deckungsgleich; ein Umsortieren von QUESTIONS
   * verschiebt die Kennungen und deutet gespeicherte Antworten um.
   */
  var DIMENSIONS = ["Alignment", "Teams", "Leadership", "Arbeitsfluss", "Struktur"];

  /* Die Erklärsätze der Dimensionen (dimIntro in i18n.js) stehen bewusst NICHT
   * im Fragenteil, sondern erst im Ergebnis: eine vorangestellte Definition
   * rahmt die Antwort und verschiebt sie von "trifft diese Aussage zu" zu "wie
   * gut sind wir in der Kategorie". */
  function dimIntro(d) { return (lv("dimIntro") || {})[d] || ""; }

  /* Aussagen je Dimension. "neg: true" kennzeichnet eine negativ formulierte
   * Aussage: Zustimmung bedeutet dort ein schlechtes Ergebnis. Gespeichert und
   * übertragen wird immer der angeklickte Rohwert 1 bis 5; umgedreht wird erst
   * bei der Auswertung, siehe effective(). Der Server mittelt roh je Kennung
   * und kennt die Richtung nur für die Benachrichtigungsmail.
   *
   * Die Texte stehen je Sprache in i18n.js unter "questions", in derselben
   * Reihenfolge. Die Richtung gilt für alle Sprachen: eine negativ formulierte
   * Aussage bleibt in jeder Übersetzung negativ, sonst kehrt sich die
   * Auswertung um. */
  var QUESTIONS = [
    { dim: "Alignment" },
    { dim: "Alignment" },
    { dim: "Alignment", neg: true },
    { dim: "Alignment", neg: true },

    { dim: "Teams" },
    { dim: "Teams", neg: true },
    { dim: "Teams", neg: true },
    { dim: "Teams" },

    { dim: "Leadership" },
    { dim: "Leadership", neg: true },
    { dim: "Leadership" },
    { dim: "Leadership", neg: true },

    { dim: "Arbeitsfluss" },
    { dim: "Arbeitsfluss", neg: true },
    { dim: "Arbeitsfluss" },
    { dim: "Arbeitsfluss" },

    { dim: "Struktur" },
    { dim: "Struktur", neg: true },
    { dim: "Struktur", neg: true },
    { dim: "Struktur" }
  ].map(function (q, i) {
    q.id = "q" + i;
    q.neg = !!q.neg;
    q.text = (L.questions && L.questions[i]) || (LB.questions || [])[i] || q.id;
    return q;
  });

  /* Wirksamer Wert einer Antwort: bei negativ formulierten Aussagen gespiegelt,
   * 5 wird 1 und 1 wird 5. Gilt genauso für den Mittelwert einer Frage über
   * mehrere Personen, denn der Mittelwert gespiegelter Werte ist der
   * gespiegelte Mittelwert. */
  function effective(q, v) {
    return q.neg ? 6 - v : v;
  }

  // Beschriftung wie im bisherigen Typeform: nur die drei Anker sind benannt.
  var SCALE_LABELS = lv("scale") || {};
  var SCALE = [1, 2, 3, 4, 5].map(function (v) { return { v: v, label: SCALE_LABELS[v] || "" }; });

  // Zonen der Zielscheibe. "inclusive" legt fest, ob der obere Randwert noch zur
  // Zone gehört. "tragfähig" beginnt bewusst erst bei 4,0: bei Selbstauskunft
  // über die eigene Organisation ist durchgängige Zustimmung der häufigste Fall,
  // mildere Schwellen liefern dann kein verwertbares Ergebnis.
  var ZONE_TEXT = lv("zones") || {};
  var ZONES = [
    { key: "low", to: 2, inclusive: false, fill: "#f4ded9", a: 2 },
    { key: "mid", to: 4, inclusive: false, fill: "#f9ecd6", a: 2, b: 4 },
    { key: "high", to: 5, inclusive: true, fill: "#e3ede1", a: 4 }
  ].map(function (z) {
    var tx = ZONE_TEXT[z.key] || {};
    z.label = tx.label || z.key;
    z.range = (tx.range || "").replace("{a}", fmt(z.a)).replace("{b}", z.b ? fmt(z.b) : "");
    return z;
  });

  function zoneFor(value) {
    for (var i = 0; i < ZONES.length; i++) {
      var z = ZONES[i];
      if (z.inclusive ? value <= z.to : value < z.to) return z;
    }
    return ZONES[ZONES.length - 1];
  }

  // Gesamtbewertung. Texte wörtlich aus dem bisherigen Typeform. Dessen
  // Punktegrenzen 29 und 45 bei 15 Aussagen entsprechen einem Mittelwert von
  // unter 2,0 bzw. bis 3,0; so ausgedrückt gilt die Einordnung unabhängig von
  // der Anzahl der Aussagen und ebenso für Gruppenmittelwerte.
  // Titel und Text je Band stehen in i18n.js unter "bands".
  var BAND_TEXT = lv("bands") || [];
  var OVERALL_BANDS = [
    { to: 2, inclusive: false },
    { to: 3, inclusive: true },
    { to: 5, inclusive: true }
  ].map(function (b, i) {
    var tx = BAND_TEXT[i] || {};
    b.title = tx.title || "";
    b.text = tx.text || "";
    return b;
  });

  function overallBandFor(overallMean) {
    for (var i = 0; i < OVERALL_BANDS.length; i++) {
      var b = OVERALL_BANDS[i];
      if (b.inclusive ? overallMean <= b.to : overallMean < b.to) return b;
    }
    return OVERALL_BANDS[OVERALL_BANDS.length - 1];
  }

  // Ansatzpunkte je Dimension, deutsch wörtlich aus dem bisherigen Typeform.
  var MEASURES = lv("measures") || {};

  // =====================================================================
  // HILFSFUNKTIONEN
  // =====================================================================

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /** Eine Nachkommastelle, Dezimalzeichen je Sprache (2,0 bzw. 2.0). */
  function fmt(v) { return v.toFixed(1).replace(".", lv("decimal") || ","); }

  /** Zahl oder Gedankenstrich, wenn keine Angabe vorliegt. */
  function fmtOr(v) { return isNum(v) ? fmt(v) : "–"; }

  function isNum(v) { return typeof v === "number" && !isNaN(v); }

  /** Liste von Dimensionskennungen als "A, B und C" mit Anzeigenamen. */
  function joinAnd(list) {
    var names = list.map(function (d) { return esc(dimName(d)); });
    if (names.length === 1) return names[0];
    return names.slice(0, -1).join(", ") + " " + (lv("and") || "und") + " " + names[names.length - 1];
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
  }

  function questionsOf(dim) {
    return QUESTIONS.filter(function (q) { return q.dim === dim; });
  }

  function isStepComplete(i) {
    return questionsOf(DIMENSIONS[i]).every(function (q) { return typeof answers[q.id] === "number"; });
  }

  /* Seit "keine Angabe" erlaubt ist, gilt ein Schritt auch dann als erledigt,
   * wenn man ihn mit offenen Aussagen verlassen hat. Sonst bliebe sein Balken
   * grau, obwohl nichts mehr zu tun ist. */
  function isStepDone(i) {
    return i < reached || isStepComplete(i);
  }

  function answeredCount() {
    return QUESTIONS.filter(function (q) { return typeof answers[q.id] === "number"; }).length;
  }

  function readDraft() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var d = JSON.parse(raw);
      return d && d.answers && typeof d.answers === "object" ? d : null;
    } catch (e) { return null; }
  }

  /* reached: der weiteste Schritt, der bisher angezeigt wurde. Damit setzt
   * "Fortsetzen" dort an, wo man war, auch wenn davor Aussagen offen sind. */
  function writeDraft() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers: answers, reached: reached, ts: Date.now() }));
    } catch (e) { /* privates Fenster o. ä. – kein Problem */ }
  }

  function clearDraft() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { }
  }

  /* Token und Raumliste liegen nur im Browser des Trainers. Nichts davon geht
   * an den Server; der kennt weder Geraete noch Sitzungen. */
  function readToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; }
  }

  function writeToken(t) {
    try { localStorage.setItem(TOKEN_KEY, t); } catch (e) { }
  }

  function clearToken() {
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) { }
  }

  function readRooms() {
    try {
      var a = JSON.parse(localStorage.getItem(ROOMS_KEY) || "[]");
      return Array.isArray(a) ? a.filter(function (r) { return typeof r === "string" && r; }) : [];
    } catch (e) { return []; }
  }

  function forgetRoom(room) {
    try {
      localStorage.setItem(ROOMS_KEY, JSON.stringify(readRooms().filter(function (r) {
        return r !== room;
      })));
    } catch (e) { }
  }

  function rememberRoom(room) {
    if (!room || room === "default") return;
    try {
      var a = readRooms().filter(function (r) { return r !== room; });
      a.unshift(room);
      localStorage.setItem(ROOMS_KEY, JSON.stringify(a.slice(0, 8)));
    } catch (e) { }
  }

  function api(path) { return API + path; }

  /* Streuung der Punktwolke. Gleiche Werte lägen sonst exakt aufeinander — bei
   * fünf Personen sähe man drei Punkte statt fünf, also gerade das nicht, worum
   * es geht. Ein Zufallswert scheidet aus: die Moderationsansicht lädt alle drei
   * Sekunden neu, die Punkte würden tanzen. Aus Schlüssel und Achse entsteht
   * deshalb immer derselbe Versatz.
   *
   * FNV-1a mit der in JavaScript üblichen Ersetzung der Multiplikation durch
   * Schieben und Addieren: h * 16777619 überschritte die 53 Bit, in denen eine
   * Gleitkommazahl noch ganzzahlig rechnet. */
  function hash32(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h = (h ^ s.charCodeAt(i)) >>> 0;
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h;
  }

  /** Immer derselbe Wert zwischen -1 und 1 für Schlüssel und Achse. */
  function jitter(key, i) {
    return ((hash32(key + "|" + i) % 2001) / 1000) - 1;
  }

  // =====================================================================
  // AUSWERTUNG
  // =====================================================================

  /* Mittelwerte je Dimension aus einem Antwortobjekt {q0: 4, ...}.
   *
   * Aussagen ohne Angabe fehlen im Objekt und zählen nicht mit: der Mittelwert
   * entsteht aus den beantworteten Aussagen der Dimension. Ist keine einzige
   * beantwortet, ist der Wert null -- nicht 0, denn 0 läge unterhalb der Skala
   * und sähe aus wie die schlechteste mögliche Bewertung. */
  function scoresFromAnswers(ans) {
    var sums = {}, counts = {}, avg = {};
    DIMENSIONS.forEach(function (d) { sums[d] = 0; counts[d] = 0; });
    QUESTIONS.forEach(function (q) {
      var v = ans[q.id];
      if (typeof v === "number") { sums[q.dim] += effective(q, v); counts[q.dim] += 1; }
    });
    DIMENSIONS.forEach(function (d) { avg[d] = counts[d] ? sums[d] / counts[d] : null; });
    return withOverall(avg);
  }

  /* Mittelwerte je Dimension aus den Fragen-Mittelwerten des Backends.
   * Das Backend aggregiert absichtlich nur je Frage und kennt die Dimensionen
   * nicht: sonst müsste der Fragebogen an zwei Stellen gepflegt werden. Eine
   * Aussage, die niemand beantwortet hat, fehlt in qMeans. */
  function scoresFromQuestionMeans(qMeans) {
    return scoresFromAnswers(qMeans || {});
  }

  /** Dimensionen mit einem Wert, in Anzeigereihenfolge. */
  function ratedDims(avg) {
    return DIMENSIONS.filter(function (d) { return isNum(avg[d]); });
  }

  /* Ergänzt ein Mittelwert-Objekt um den Gesamtmittelwert: der Mittelwert der
   * bewerteten Dimensionen. Ohne jede Bewertung ist er null. */
  function withOverall(avg) {
    var rated = ratedDims(avg);
    return {
      avg: avg,
      rated: rated,
      overall: rated.length
        ? rated.reduce(function (a, d) { return a + avg[d]; }, 0) / rated.length
        : null
    };
  }

  // =====================================================================
  // ZIELSCHEIBE
  // =====================================================================

  /* series: Liste von { avg, fill, stroke, dash, label, dots }.
   * Das erste Element ist die Leitreihe: es bestimmt die Werte an den Achsen
   * und die Beschreibung für Screenreader.
   *
   * opts (optional):
   *   cloud  Liste von { key, avg } — je Rückmeldung ein Punkt an jeder Achse,
   *          ohne Verbindung untereinander. Dann darf series leer sein, und
   *          opts.mean übernimmt die Rolle der Leitreihe.
   *   mean   Mittelwerte je Dimension, als Marke quer zur Achse.
   *   legend Zusätzliche Legendeneinträge { swatch, label }. */
  function renderRadar(targetId, legendId, series, opts) {
    opts = opts || {};
    var w = 520, h = 440, cx = w / 2, cy = h / 2, R = 125;
    var n = DIMENSIONS.length;
    var cloud = opts.cloud || [];
    var primary = series.length ? series[0].avg : (opts.mean || {});

    function point(i, r) {
      var a = (Math.PI * 2 * i) / n - Math.PI / 2;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    }

    /** Richtungsvektor der Achse i, Länge 1. */
    function unit(i) {
      var a = (Math.PI * 2 * i) / n - Math.PI / 2;
      return [Math.cos(a), Math.sin(a)];
    }

    /* Ein Punkt auf der Achse i beim Wert v, quer dazu um off Pixel versetzt. */
    function offAxis(i, v, off) {
      var r = (R * v) / 5, u = unit(i);
      return [cx + u[0] * r - u[1] * off, cy + u[1] * r + u[0] * off];
    }

    function ring(value) {
      var pts = [];
      for (var i = 0; i < n; i++) {
        var p = point(i, (R * value) / 5);
        pts.push(p[0].toFixed(1) + "," + p[1].toFixed(1));
      }
      return pts.join(" ");
    }

    /* Eckpunkte des Profils. Eine Dimension ohne Angabe bekommt keinen Punkt;
     * das Profil verbindet dann die bewerteten Nachbarn. Ein Punkt in der Mitte
     * hieße "Wert 0" und sähe aus wie die schlechteste Bewertung. */
    function polyFor(avg) {
      var pts = [];
      for (var i = 0; i < n; i++) {
        var v = avg[DIMENSIONS[i]];
        if (!isNum(v)) continue;
        var p = point(i, (R * v) / 5);
        pts.push(p[0].toFixed(1) + "," + p[1].toFixed(1));
      }
      return pts;
    }

    var described = DIMENSIONS.map(function (d) {
      if (!isNum(primary[d])) return t("r.aria.dimNone", { dim: dimName(d) });
      var s = t("r.aria.dim", { dim: dimName(d), x: fmt(primary[d]), zone: zoneFor(primary[d]).label });
      var vals = cloud.map(function (m) { return m.avg[d]; }).filter(isNum);
      if (vals.length) {
        s += t("r.aria.range", { x: fmt(Math.min.apply(null, vals)), y: fmt(Math.max.apply(null, vals)) });
      }
      return s;
    }).join(". ");

    var svg = '<svg viewBox="0 0 ' + w + " " + h +
      '" role="img" aria-label="' + esc(t("r.aria.radar", { desc: described })) + '">';

    // Bewertungszonen, von außen nach innen gemalt
    ZONES.slice().reverse().forEach(function (z) {
      svg += '<polygon points="' + ring(z.to) + '" fill="' + z.fill + '"/>';
    });

    // Ringe für die Werte 1 bis 5
    for (var lvl = 1; lvl <= 5; lvl++) {
      svg += '<polygon points="' + ring(lvl) + '" fill="none" stroke="#ffffff" stroke-width="1.5"/>';
    }

    // Zonengrenzen hervorheben
    ZONES.forEach(function (z) {
      if (z.to < 5) {
        svg += '<polygon points="' + ring(z.to) +
          '" fill="none" stroke="#9d9d8c" stroke-width="1" stroke-dasharray="4 3"/>';
      }
    });

    // Achsen
    for (var i2 = 0; i2 < n; i2++) {
      var pa = point(i2, R);
      svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + pa[0].toFixed(1) + '" y2="' + pa[1].toFixed(1) +
        '" stroke="#ffffff" stroke-width="1.5"/>';
    }

    // Messreihen, hintere zuerst
    series.slice().reverse().forEach(function (s) {
      var pts = polyFor(s.avg);
      if (!pts.length) return;
      svg += '<polygon points="' + pts.join(" ") + '" fill="' + (s.fill || "none") +
        '" stroke="' + s.stroke + '" stroke-width="2.5"' +
        (s.dash ? ' stroke-dasharray="' + s.dash + '"' : "") + "/>";
      if (s.dots) {
        pts.forEach(function (pt) {
          var xy = pt.split(",");
          svg += '<circle cx="' + xy[0] + '" cy="' + xy[1] + '" r="5" fill="' + s.stroke +
            '" stroke="#ffffff" stroke-width="1.5"/>';
        });
      }
    });

    /* Punktwolke: je Rückmeldung ein Punkt an jeder Achse, bewusst ohne
     * Verbindung. Ein durchgezogenes Profil je Person ergäbe fünf verschlungene
     * Fünfecke; im Workshop interessiert aber, wo sich Bewertungen ballen und
     * wo sie auseinandergehen, nicht das Einzelprofil. */
    cloud.forEach(function (m) {
      for (var i3 = 0; i3 < n; i3++) {
        var v3 = m.avg[DIMENSIONS[i3]];
        if (!isNum(v3)) continue;   // diese Person hat die Dimension nicht bewertet
        /* Der Versatz wächst mit dem Abstand zur Mitte: nah am Mittelpunkt
         * liegen die Achsen dicht beieinander, ein fester Wert schöbe Punkte
         * in den Nachbarsektor. */
        var spread = Math.min(15, Math.max(6, (R * v3) / 5 * 0.12));
        var pc = offAxis(i3, v3, jitter(m.key, i3) * spread);
        svg += '<circle cx="' + pc[0].toFixed(1) + '" cy="' + pc[1].toFixed(1) +
          '" r="5.5" fill="rgba(234,93,18,0.55)" stroke="#ffffff" stroke-width="1"/>';
      }
    });

    /* Der Mittelwert als Ring, nicht als Strich: ein Strich quer zur Achse
     * liest sich an den schrägen Achsen wie ein Rest der Verbindungslinie, die
     * hier gerade absichtlich fehlt. Ein Ring ist eine Marke, keine Linie. */
    if (opts.mean) {
      for (var i6 = 0; i6 < n; i6++) {
        if (!isNum(opts.mean[DIMENSIONS[i6]])) continue;
        var p6 = offAxis(i6, opts.mean[DIMENSIONS[i6]], 0);
        svg += '<circle cx="' + p6[0].toFixed(1) + '" cy="' + p6[1].toFixed(1) +
          '" r="9.5" fill="none" stroke="#33332e" stroke-width="2.5"/>';
      }
    }

    // Ringzahlen auf der senkrechten Achse nach unten: dort verläuft bei fünf
    // Achsen keine Speiche, es gibt also keine Überdeckung.
    for (var lvl2 = 1; lvl2 <= 5; lvl2++) {
      svg += '<text x="' + cx + '" y="' + (cy + (R * lvl2) / 5 + 4).toFixed(1) +
        '" text-anchor="middle" font-size="11" fill="#55554e" paint-order="stroke" stroke="#ffffff" ' +
        'stroke-width="3.5" stroke-linejoin="round">' + lvl2 + "</text>";
    }

    // Achsenbeschriftung mit dem Wert der Leitreihe
    for (var i4 = 0; i4 < n; i4++) {
      var d = DIMENSIONS[i4];
      var pl = point(i4, R + 26);
      var anchor = "middle";
      if (pl[0] > cx + 6) anchor = "start";
      else if (pl[0] < cx - 6) anchor = "end";
      svg += '<text x="' + pl[0].toFixed(1) + '" y="' + (pl[1] + 5).toFixed(1) + '" text-anchor="' + anchor +
        '" font-size="15" font-weight="700" fill="#222">' + esc(dimName(d)) +
        ' <tspan font-weight="400" font-size="13.5" fill="#55554e">' + fmtOr(primary[d]) + "</tspan></text>";
    }

    svg += "</svg>";
    $(targetId).innerHTML = svg;

    if (legendId) {
      var leg = ZONES.map(function (z) {
        return '<li><span class="swatch" style="background:' + z.fill + '"></span>' +
          esc(z.label) + ' <span class="muted">(' + esc(z.range) + ")</span></li>";
      }).join("");
      series.forEach(function (s) {
        leg += '<li><span class="swatch ' + s.swatch + '"></span>' + esc(s.label) + "</li>";
      });
      (opts.legend || []).forEach(function (e) {
        leg += '<li><span class="swatch ' + e.swatch + '"></span>' + esc(e.label) + "</li>";
      });
      $(legendId).innerHTML = leg;
    }
  }

  /* Streifendiagramm je Dimension: die Skala 1 bis 5 mit den Zonen als
   * Hintergrund, darauf ein Punkt je Rückmeldung und die Marke des Mittelwerts.
   *
   * Die Zielscheibe zeigt dieselben Punkte, staucht sie aber nahe der Mitte und
   * verteilt sie über fünf schräge Achsen. Hier liegen Ballung und Spreizung
   * nebeneinander auf einer Geraden — das ist die Ansicht, an der im Workshop
   * tatsächlich diskutiert wird.
   *
   * Die Skala beginnt bei 1, nicht bei 0: 0 ist keine mögliche Bewertung. Die
   * Zonengrenzen liegen deshalb an derselben Stelle wie auf der Zielscheibe,
   * der Streifen nutzt die Breite aber ganz aus. */
  function renderStrips(targetId, members, mean) {
    var w = 560, x0 = 136, x1 = 532, rowH = 58, top = 30, pad = 8;
    var h = top + DIMENSIONS.length * rowH;
    var stripH = 26;

    function x(v) { return x0 + ((v - 1) / 4) * (x1 - x0); }

    var svg = '<svg viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="' +
      esc(t("p.stripsAria", { n: members.length })) + '">';

    // Skalenbeschriftung, einmal über dem obersten Streifen
    // Laufvariable bewusst nicht "t": das ist die Übersetzungsfunktion.
    for (var tick = 1; tick <= 5; tick++) {
      svg += '<text x="' + x(tick).toFixed(1) + '" y="16" text-anchor="middle" font-size="11" ' +
        'fill="#55554e">' + tick + "</text>";
    }

    DIMENSIONS.forEach(function (d, i) {
      var y = top + i * rowH;
      var mid = y + stripH / 2;

      /* Zonen als Hintergrund. An beiden Enden ragt der Streifen über die Skala
       * hinaus: ein Punkt bei 1 oder bei 5 säße sonst halb daneben. */
      var prev = 1;
      ZONES.forEach(function (z, zi) {
        if (z.to <= prev) return;
        var xa = (zi === 0 ? x(prev) - pad : x(prev));
        var xb = (z.to >= 5 ? x(z.to) + pad : x(z.to));
        svg += '<rect x="' + xa.toFixed(1) + '" y="' + y + '" width="' +
          (xb - xa).toFixed(1) + '" height="' + stripH + '" fill="' + z.fill + '"/>';
        prev = z.to;
      });

      // Gitter bei den ganzen Werten
      for (var g = 2; g <= 4; g++) {
        svg += '<line x1="' + x(g).toFixed(1) + '" y1="' + y + '" x2="' + x(g).toFixed(1) +
          '" y2="' + (y + stripH) + '" stroke="#ffffff" stroke-width="1.5"/>';
      }

      var v = mean ? mean[d] : null;
      var hasMean = members.length && isNum(v);
      svg += '<text x="' + (x0 - 14) + '" y="' + (mid - 1) + '" text-anchor="end" font-size="14" ' +
        'font-weight="700" fill="#222">' + esc(dimName(d)) + "</text>";
      svg += '<text x="' + (x0 - 14) + '" y="' + (mid + 14) + '" text-anchor="end" font-size="11.5" ' +
        'fill="#55554e">' + (hasMean ? esc(t("p.stripMean", { x: fmt(v) })) : "—") + "</text>";

      // Ein Punkt je Rückmeldung, senkrecht gestreut wie in der Zielscheibe.
      // Wer die Dimension nicht bewertet hat, bekommt hier keinen Punkt.
      members.forEach(function (m) {
        var mv = m.avg[d];
        if (!isNum(mv)) return;
        var cy = mid + jitter(m.key, i) * (stripH / 2 - 4);
        svg += '<circle cx="' + x(mv).toFixed(1) + '" cy="' + cy.toFixed(1) +
          '" r="5.5" fill="rgba(234,93,18,0.55)" stroke="#ffffff" stroke-width="1"/>';
      });

      if (hasMean) {
        svg += '<line x1="' + x(v).toFixed(1) + '" y1="' + (y - 4) + '" x2="' + x(v).toFixed(1) +
          '" y2="' + (y + stripH + 4) + '" stroke="#33332e" stroke-width="3" stroke-linecap="round"/>';
      }
    });

    svg += "</svg>";
    $(targetId).innerHTML = svg;
  }

  /** Balken mit Zonenhintergrund und Marke beim Messwert. */
  function barHtml(value) {
    var html = '<div class="bar" aria-hidden="true">';
    var prev = 0;
    ZONES.forEach(function (z) {
      html += '<span class="bar-zone" style="width:' + (((z.to - prev) / 5) * 100).toFixed(1) +
        "%;background:" + z.fill + '"></span>';
      prev = z.to;
    });
    if (isNum(value)) {
      html += '<span class="bar-mark" style="left:' + ((value / 5) * 100).toFixed(1) + '%"></span>';
    }
    return html + "</div>";
  }

  /* series wie bei renderRadar. Bei zwei Reihen bekommt die Tabelle eine
   * zusätzliche Spalte; die Einordnung richtet sich stets nach der Leitreihe. */
  function renderScores(bodyId, headId, series) {
    if (headId) {
      var head = '<th scope="col">' + esc(t("r.colDimension")) + "</th>";
      series.forEach(function (s) {
        head += '<th scope="col" style="text-align:right">' + esc(s.column) + "</th>";
      });
      head += '<th scope="col" style="text-align:right">' + esc(t("r.colRating")) + "</th>";
      $(headId).innerHTML = head;
    }

    $(bodyId).innerHTML = DIMENSIONS.map(function (d) {
      var v = series[0].avg[d];
      var row = '<td><span class="dim-name">' + esc(dimName(d)) + "</span>" + barHtml(v) + "</td>";
      series.forEach(function (s, i) {
        var sv = s.avg[d];
        row += '<td class="num' + (i ? " secondary" : "") + '">' + fmtOr(sv) +
          (i || !isNum(sv) ? "" : " <small>" + esc(t("r.ofFive")) + "</small>") + "</td>";
      });
      row += '<td class="pill-cell">' + (isNum(v)
        ? '<span class="pill pill-' + zoneFor(v).key + '">' + esc(zoneFor(v).label) + "</span>"
        : '<span class="muted">' + esc(t("r.noAnswer")) + "</span>") + "</td>";
      return "<tr>" + row + "</tr>";
    }).join("");
  }

  function renderMeasures(containerId, avg) {
    /* Ansatzpunkte nur dort, wo etwas zu holen ist: für Entwicklungsfelder und
     * für teilweise wirksame Dimensionen. Was wirksam ist, braucht keinen Tipp. */
    /* Dimensionen ohne Angabe fallen heraus: über sie lässt sich nichts sagen. */
    var rated = ratedDims(avg);
    if (!rated.length) {
      $(containerId).innerHTML = "";
      return;
    }
    var order = rated.filter(function (d) {
      return zoneFor(avg[d]).key !== "high";
    }).sort(function (a, b) {
      var diff = avg[a] - avg[b];
      return diff !== 0 ? diff : DIMENSIONS.indexOf(a) - DIMENSIONS.indexOf(b);
    });

    var html = "<h2>" + esc(t("m.title")) + "</h2>";
    if (!order.length) {
      html += '<p class="muted">' +
        esc(t(rated.length === DIMENSIONS.length ? "m.allHigh" : "m.allRatedHigh")) + "</p>";
      $(containerId).innerHTML = html;
      return;
    }

    html += '<p class="muted">' + esc(t("m.intro")) + "</p>";

    order.forEach(function (d) {
      var v = avg[d];
      var z = zoneFor(v);
      html += '<div class="measure">';
      html += "<h3>" + esc(dimName(d)) + ' <span class="pill pill-' + z.key + '">' + esc(z.label) + "</span></h3>";
      html += '<p class="meta">' + esc(t("m.meta", { intro: dimIntro(d), x: fmt(v) })) + "</p>";
      html += "<ul>" + (MEASURES[d] || []).map(function (m) { return "<li>" + esc(m) + "</li>"; }).join("") + "</ul>";
      html += "</div>";
    });

    $(containerId).innerHTML = html;
  }

  /** Einleitungssatz mit Stärken, Hebeln und vollständig genannten Gleichständen. */
  /* Einleitungssatz mit Stärken, Hebeln und vollständig genannten Gleichständen.
   * Grundlage sind nur die bewerteten Dimensionen. Bei einer einzigen gibt es
   * weder Stärke noch Hebel im Vergleich, der zweite Satz entfällt dann. */
  function leadText(sc, subject) {
    var rated = sc.rated || ratedDims(sc.avg);
    if (!rated.length) return esc(t("r.lead.none"));

    var values = rated.map(function (d) { return sc.avg[d]; });
    var minVal = Math.min.apply(null, values);
    var maxVal = Math.max.apply(null, values);
    var lowest = rated.filter(function (d) { return sc.avg[d] === minVal; });
    var highest = rated.filter(function (d) { return sc.avg[d] === maxVal; });
    var z = zoneFor(sc.overall);

    var key = rated.length === DIMENSIONS.length ? "r.lead.all.html"
      : (rated.length === 1 ? "r.lead.one.html" : "r.lead.some.html");
    var out = t(key, {
      subject: esc(subject),
      n: rated.length,
      x: fmt(sc.overall),
      zone: '<span class="pill pill-' + z.key + '">' + esc(z.label) + "</span>"
    });

    if (rated.length === 1) return out;
    if (lowest.length === rated.length) {
      out += esc(t("r.lead.allEqual"));
    } else {
      out += t(highest.length > 1 ? "r.lead.strongMany.html" : "r.lead.strongOne.html", { dims: joinAnd(highest) });
      out += t(lowest.length > 1 ? "r.lead.leverMany.html" : "r.lead.leverOne.html", { dims: joinAnd(lowest) });
    }
    return out;
  }

  // =====================================================================
  // ZUSTAND UND NAVIGATION
  // =====================================================================

  var answers = {};
  var step = 0;
  var reached = 0;        // weitester bisher angezeigter Schritt
  var submitted = false;
  var groupData = null;   // { count, avg } aus /api/aggregate
  var pollTimer = null;
  var SCREENS = ["screen-intro", "screen-questions", "screen-contact", "screen-result", "screen-present",
    "screen-trainer", "screen-noroom"];

  function show(id) {
    SCREENS.forEach(function (s) { $(s).hidden = s !== id; });
    window.scrollTo(0, 0);
    updateProgress(id);
  }

  function updateProgress(id) {
    var stepsEl = $("steps");
    if (id === "screen-questions") {
      $("progress").textContent = t("q.progress", { n: step + 1, total: DIMENSIONS.length });
      stepsEl.hidden = false;
      stepsEl.innerHTML = DIMENSIONS.map(function (d, i) {
        /* Erledigt schlaegt aktuell: sonst bleibt der Balken, auf dem man steht,
         * dunkel, obwohl seine Fragen beantwortet sind -- auf der letzten
         * Dimension sichtbar als ein schwarzer Balken neben vier orangen. Wo man
         * ist, sagt ohnehin die Zeile "Dimension X von 5" darueber. */
        var cls = isStepDone(i) ? "done" : (i === step ? "current" : "");
        return '<li class="' + cls + '"></li>';
      }).join("");
    } else {
      stepsEl.hidden = true;
      $("progress").textContent = id === "screen-contact" ? t("top.contact")
        : (id === "screen-result" ? t("top.result")
          : (id === "screen-present" ? t("top.present")
            : (id === "screen-trainer" ? t("top.trainer") : "")));
    }
    updateCounter();
  }

  function countText(n) {
    return n === 1 ? t("count.one") : t("count.many", { n: n });
  }

  function updateCounter() {
    var el = $("counter");
    if (MODE !== "team" || !groupData) { el.hidden = true; return; }
    el.hidden = false;
    el.textContent = countText(groupData.count);
  }

  // =====================================================================
  // FRAGEN RENDERN
  // =====================================================================

  function renderStep() {
    var dim = DIMENSIONS[step];
    $("dim-letter").textContent = dimName(dim).charAt(0);
    $("dim-title").textContent = dimName(dim);
    $("questions-error").hidden = true;

    var html = "";
    questionsOf(dim).forEach(function (q) {
      html += '<fieldset class="q" id="fs-' + q.id + '">';
      html += "<legend>" + esc(q.text) + "</legend>";
      html += '<div class="scale">';
      SCALE.forEach(function (st) {
        var aria = st.label ? st.v + " – " + st.label : t("q.ofFive", { n: st.v });
        var checked = answers[q.id] === st.v ? " checked" : "";
        html += '<label><input type="radio" name="' + q.id + '" value="' + st.v +
          '" aria-label="' + esc(aria) + '"' + checked + ">" +
          '<span class="scale-inner"><span class="scale-num">' + st.v + "</span>" +
          (st.label ? '<span class="scale-txt">' + esc(st.label) + "</span>" : "") +
          "</span></label>";
      });
      html += "</div>";
      html += '<div class="scale-anchors" aria-hidden="true"><span>' + esc(SCALE_LABELS[1] || "") + "</span>" +
        "<span>" + esc(SCALE_LABELS[5] || "") + "</span></div>";
      html += "</fieldset>";
    });

    $("questions").innerHTML = html;
    $("btn-next").textContent = step === DIMENSIONS.length - 1
      ? (ASK_FOR_CONTACT ? t("q.toContact") : t("q.showResult"))
      : t("q.next");
    $("btn-back").textContent = step === 0 ? t("q.backToStart") : t("q.backTo", { dim: dimName(DIMENSIONS[step - 1]) });
  }

  function goToStep(i) {
    step = Math.max(0, Math.min(DIMENSIONS.length - 1, i));
    if (step > reached) { reached = step; writeDraft(); }
    renderStep();
    show("screen-questions");
  }

  // =====================================================================
  // ERGEBNIS
  // =====================================================================

  function renderResultSolo(submitState) {
    var sc = scoresFromAnswers(answers);
    $("result-title").textContent = t("r.titleSolo");
    $("result-lead").innerHTML = leadText(sc, t("r.subjectSolo"));
    renderBand(sc.overall);

    var series = [{
      avg: sc.avg, fill: "rgba(234,93,18,0.30)", stroke: "#ea5d12", dots: true,
      label: t("r.yourScores"), column: t("r.colAverage"), swatch: "swatch-group"
    }];
    renderRadar("radar", "zone-legend", series);
    renderScores("scores-body", "scores-head", series);
    renderMeasures("measures", sc.avg);

    $("result-disclaimer").textContent = t("r.disclaimerSolo");
    $("scores-note").textContent = t("r.noteSolo") +
      (answeredCount() < QUESTIONS.length ? " " + t("r.noteSkipped") : "");

    var notes = "";
    if (submitState === "sent") {
      notes = '<div class="notice">' + esc(t("r.sent")) + "</div>";
    } else if (submitState === "static") {
      notes = '<div class="notice">' + t("r.static.html") + "</div>";
    } else if (submitState === "skipped") {
      notes = '<div class="notice">' + esc(t("r.skipped")) + "</div>";
    } else if (submitState === "failed") {
      notes = '<div class="notice">' + esc(t("r.failed")) + "</div>";
    }
    $("result-notes").innerHTML = notes;
  }

  /** Gesamtbewertung; ohne jede Bewertung bleibt der Kasten leer und verborgen. */
  function renderBand(overall) {
    var box = $("result-band");
    if (!isNum(overall)) { box.innerHTML = ""; box.hidden = true; return; }
    var band = overallBandFor(overall);
    box.hidden = false;
    box.innerHTML = "<p><strong>" + esc(band.title) + "</strong></p>" +
      (band.text ? "<p>" + esc(band.text) + "</p>" : "");
  }

  function renderResultTeam() {
    var own = scoresFromAnswers(answers);
    var group = groupData ? withOverall(groupData.avg) : own;
    var count = groupData ? groupData.count : 1;

    $("result-title").textContent = t("r.titleTeam");
    $("result-lead").innerHTML = leadText(group, t("r.subjectTeam"));
    renderBand(group.overall);

    var series = [{
      avg: group.avg, fill: "rgba(234,93,18,0.30)", stroke: "#ea5d12", dots: true,
      label: t("r.group"), column: t("r.group"), swatch: "swatch-group"
    }, {
      avg: own.avg, fill: "none", stroke: "#55554e", dash: "6 4", dots: false,
      label: t("r.yourAnswers"), column: t("r.you"), swatch: "swatch-own"
    }];
    renderRadar("radar", "zone-legend", series);
    renderScores("scores-body", "scores-head", series);
    renderMeasures("measures", group.avg);

    $("result-disclaimer").textContent = t("r.disclaimerTeam");
    $("scores-note").textContent = t("r.noteTeam");
    $("result-notes").innerHTML = '<div class="notice">' + esc(t("r.teamReceived", {
      count: count === 1 ? t("r.teamCount.one") : t("r.teamCount.many", { n: count })
    })) + "</div>";

    $("cta-box").hidden = true;
    $("btn-restart").hidden = true;
  }

  function renderPresent() {
    var group = groupData ? withOverall(groupData.avg) : withOverall(
      DIMENSIONS.reduce(function (o, d) { o[d] = null; return o; }, {}));
    var count = groupData ? groupData.count : 0;

    $("present-count").textContent = count;
    $("present-count-label").textContent = count === 1 ? t("count.word.one") : t("count.word.many");
    $("present-room").textContent = ROOM;

    var joinUrl = window.location.origin + window.location.pathname +
      "?room=" + encodeURIComponent(ROOM);
    $("present-url").textContent = joinUrl.replace(/^https?:\/\//, "");
    $("present-qr").innerHTML = '<img alt="' + esc(t("p.qrAlt")) + '" src="' +
      esc(api("/api/qr?room=" + encodeURIComponent(ROOM))) + '">';

    var series = [{
      avg: group.avg, fill: "rgba(234,93,18,0.30)", stroke: "#ea5d12", dots: true,
      label: t("r.group"), column: t("r.colAverage"), swatch: "swatch-group"
    }];
    var members = groupData && groupData.members ? groupData.members : [];

    /* Im Workshop zeigt die Ansicht jede Bewertung einzeln: über einen Punkt
     * spricht man erst, wenn er nicht allein steht. Ein gemitteltes Profil
     * verdeckt gerade das — eine Dimension, bei der die Hälfte 1 und die andere
     * 5 vergibt, sieht darin aus wie durchgängiges Mittelmaß. */
    if (members.length) {
      renderRadar("present-radar", "present-legend", [], {
        cloud: members,
        mean: group.avg,
        legend: [
          { swatch: "swatch-dot", label: t("p.legendDot") },
          { swatch: "swatch-mean", label: t("p.legendMean") }
        ]
      });
      renderStrips("present-strips", members, group.avg);
      $("present-strips").hidden = false;
    } else {
      renderRadar("present-radar", "present-legend", series);
      $("present-strips").hidden = true;
    }
    renderScores("present-scores", null, series);

    $("present-hint").textContent = count === 0
      ? t("p.hintEmpty")
      : (members.length ? t("p.hintCloud") : t("p.hint"));
  }

  function refreshView() {
    if (PRESENT) renderPresent();
    else if (MODE === "team" && submitted) renderResultTeam();
  }

  // =====================================================================
  // BACKEND
  // =====================================================================

  function fetchJson(url, opts) {
    return fetch(url, opts).then(function (r) {
      if (!r.ok) throw new Error("http_" + r.status);
      return r.json();
    });
  }

  function loadAggregate() {
    if (!HAS_BACKEND) return Promise.resolve(null);
    return fetchJson(api("/api/aggregate?room=" + encodeURIComponent(ROOM))).then(function (d) {
      /* members bleibt leer, wenn der Server die Einzeldaten nicht mitliefert.
       * Die Moderationsansicht fällt dann auf das gemittelte Profil zurück,
       * statt eine leere Zielscheibe zu zeigen. */
      groupData = {
        count: d.count || 0,
        avg: scoresFromQuestionMeans(d.questions || {}).avg,
        members: (d.responses || []).map(function (r, i) {
          return {
            key: typeof r.key === "string" && r.key ? r.key : "r" + i,
            avg: scoresFromAnswers(r.answers || {}).avg
          };
        })
      };
      updateCounter();
      refreshView();
      return groupData;
    }).catch(function (e) {
      if (window.console) console.warn("[Quick Check] Gruppendaten nicht abrufbar:", e);
      return null;
    });
  }

  function startPolling() {
    if (!HAS_BACKEND || pollTimer) return;
    pollTimer = setInterval(loadAggregate, POLL_MS);
  }

  function submitAnswers(contact) {
    var payload = {
      id: uuid(),
      answers: answers,
      room: ROOM,
      source: MODE === "team" ? "quick-check/team" : "it-team-flow.de/quick-check"
    };
    if (contact) payload.contact = contact;

    if (!HAS_BACKEND) {
      if (window.console) console.info("[Quick Check] Kein Backend konfiguriert. Nicht gesendet:", payload);
      return Promise.resolve("static");
    }

    return fetch(api("/api/submit"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (r) {
      if (!r.ok) throw new Error("http_" + r.status);
      return "sent";
    }).catch(function (e) {
      if (window.console) console.warn("[Quick Check] Senden fehlgeschlagen:", e);
      return "failed";
    });
  }

  // =====================================================================
  // VALIDIERUNG
  // =====================================================================

  /* Einzelne Aussagen dürfen offen bleiben ("keine Angabe"). Erst am Ende des
   * Fragebogens muss insgesamt mindestens eine beantwortet sein: ohne jede
   * Bewertung gibt es kein Profil, und der Server nimmt leere Antworten nicht
   * an. */
  function validateStep() {
    var box = $("questions-error");
    if (step < DIMENSIONS.length - 1 || answeredCount() > 0) {
      box.hidden = true;
      return true;
    }
    box.hidden = false;
    box.textContent = t("q.noneAnswered");
    box.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  }

  function setFieldError(inputId, errId, message) {
    var input = $(inputId), err = $(errId);
    if (message) {
      input.setAttribute("aria-invalid", "true");
      err.hidden = false;
      err.textContent = message;
    } else {
      input.removeAttribute("aria-invalid");
      err.hidden = true;
      err.textContent = "";
    }
  }

  /* Feldsatz bewusst identisch zum Kontaktformular auf it-agile.de/kontakt/
   * (TYPO3 Powermail), damit Anfragen aus beiden Quellen gleich aussehen. */
  function collectContact() {
    return {
      firstname: $("c-firstname").value.trim(),
      lastname: $("c-lastname").value.trim(),
      email: $("c-email").value.trim(),
      phone: $("c-phone").value.trim(),
      company: $("c-company").value.trim(),
      topic: $("c-topic").value,
      message: $("c-message").value.trim(),
      consent: $("c-consent").checked
    };
  }

  function validateContact() {
    var ok = true;
    var c = collectContact();

    setFieldError("c-firstname", "err-firstname", c.firstname ? "" : t("c.err.firstname"));
    if (!c.firstname) ok = false;

    setFieldError("c-lastname", "err-lastname", c.lastname ? "" : t("c.err.lastname"));
    if (!c.lastname) ok = false;

    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.email);
    setFieldError("c-email", "err-email", emailOk ? "" : t("c.err.email"));
    if (!emailOk) ok = false;

    var consentErr = $("err-consent");
    if (!c.consent) {
      consentErr.hidden = false;
      consentErr.textContent = t("c.err.consent");
      ok = false;
    } else {
      consentErr.hidden = true;
    }
    return ok;
  }

  // =====================================================================
  // ABSCHLUSS
  // =====================================================================

  function finishSolo(submitState) {
    clearDraft();
    renderResultSolo(submitState);
    show("screen-result");
  }

  function finishTeam() {
    submitted = true;
    clearDraft();
    submitAnswers(null).then(function () {
      return loadAggregate();
    }).then(function () {
      renderResultTeam();
      show("screen-result");
      startPolling();
    });
  }

  // =====================================================================
  // EVENTS
  // =====================================================================

  $("questions").addEventListener("change", function (e) {
    var el = e.target;
    if (el && el.type === "radio") {
      answers[el.name] = parseInt(el.value, 10);
      writeDraft();
      updateProgress("screen-questions");
    }
  });

  /* "Keine Angabe": ein erneuter Klick auf den bereits gewählten Wert hebt die
   * Auswahl auf. Beim click-Ereignis ist der Radio-Knopf schon gesetzt, answers
   * enthält aber noch den alten Wert -- stimmen beide überein, war er vorher
   * schon gewählt. Ein change-Ereignis folgt in dem Fall nicht, weil sich der
   * Zustand aus Sicht des Browsers nicht geändert hat. */
  $("questions").addEventListener("click", function (e) {
    var el = e.target;
    if (!el || el.type !== "radio") return;
    if (answers[el.name] === parseInt(el.value, 10)) {
      el.checked = false;
      delete answers[el.name];
      writeDraft();
      updateProgress("screen-questions");
    }
  });

  $("btn-start").addEventListener("click", function () { goToStep(0); });

  var draft = readDraft();
  if (draft && Object.keys(draft.answers).length) {
    var count = Object.keys(draft.answers).length;
    $("btn-resume").hidden = false;
    $("btn-resume").textContent = t("intro.resume", { n: count, total: QUESTIONS.length });
    $("btn-resume").addEventListener("click", function () {
      answers = draft.answers;
      /* Fortsetzen beim weitesten erreichten Schritt; ältere Entwürfe ohne
       * diese Angabe beim ersten unvollständigen. */
      var target = 0;
      if (typeof draft.reached === "number") {
        target = draft.reached;
      } else {
        for (var i = 0; i < DIMENSIONS.length; i++) {
          if (!isStepComplete(i)) { target = i; break; }
          target = i;
        }
      }
      reached = Math.max(0, Math.min(DIMENSIONS.length - 1, target));
      goToStep(target);
    });
  }

  $("btn-back").addEventListener("click", function () {
    if (step === 0) show("screen-intro");
    else goToStep(step - 1);
  });

  $("form-questions").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validateStep()) return;
    if (step < DIMENSIONS.length - 1) {
      goToStep(step + 1);
    } else if (MODE === "team") {
      finishTeam();
    } else if (ASK_FOR_CONTACT) {
      show("screen-contact");
    } else {
      finishSolo("skipped");
    }
  });

  $("btn-back-questions").addEventListener("click", function () { goToStep(DIMENSIONS.length - 1); });

  $("form-contact").addEventListener("submit", function (e) {
    e.preventDefault();
    $("submit-error").hidden = true;

    // Spam-Falle gefüllt: still abbrechen, Ergebnis trotzdem zeigen
    if ($("c-website").value) {
      finishSolo("skipped");
      return;
    }
    if (!validateContact()) return;

    var btn = $("btn-submit");
    btn.disabled = true;
    btn.textContent = t("c.sending");

    submitAnswers(collectContact()).then(function (state) {
      btn.disabled = false;
      btn.textContent = t("c.submit");
      finishSolo(state);
    });
  });

  $("btn-skip").addEventListener("click", function () { finishSolo("skipped"); });

  $("btn-print").addEventListener("click", function () { window.print(); });

  $("btn-restart").addEventListener("click", function () {
    answers = {};
    step = 0;
    reached = 0;
    submitted = false;
    clearDraft();
    $("form-contact").reset();
    renderStep();
    show("screen-intro");
  });

  /* Zuruecksetzen, gemeinsam fuer Moderationsansicht und Trainerseite.
   * Ist das Token auf diesem Geraet hinterlegt, genuegt eine Rueckfrage. Sonst
   * danach fragen und es bei Erfolg merken, damit es das naechste Mal nicht
   * mitten im Workshop herausgesucht werden muss. */
  function resetRoom(room, report, done) {
    var stored = readToken();
    var token;
    if (stored) {
      if (!window.confirm(t("p.confirmReset", { room: room }))) return;
      token = stored;
    } else {
      token = window.prompt(t("p.promptToken", { room: room }));
      if (token === null) return;
    }
    fetch(api("/api/reset"), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ room: room })
    }).then(function (r) {
      if (r.ok) {
        if (!stored) writeToken(token);
        report(t("p.resetDone", { room: room }));
        if (done) done();
      } else if (r.status === 401) {
        // Ein gemerktes Token, das abgelehnt wird, ist veraltet: weg damit.
        if (stored) {
          clearToken();
          report(t("p.tokenStaleRejected"));
        } else {
          report(t("p.tokenRejected"));
        }
      } else {
        report(t("p.resetFailed", { code: r.status }));
      }
    }).catch(function () {
      report(t("p.unreachable"));
    });
  }

  $("btn-reset").addEventListener("click", function () {
    var msg = $("present-msg");
    resetRoom(ROOM, function (text) {
      msg.hidden = false;
      msg.textContent = text;
    }, loadAggregate);
  });

  // =====================================================================
  // TRAINERSEITE
  // =====================================================================

  function roomUrl(room) {
    return window.location.pathname + "?room=" + encodeURIComponent(room) + "&present=1";
  }

  function roomsReport(text) {
    var msg = $("trainer-rooms-msg");
    msg.hidden = false;
    msg.textContent = text;
  }

  function renderTrainerRecent() {
    var box = $("trainer-recent");
    box.innerHTML = "";
    var rooms = readRooms();
    if (!rooms.length) {
      var p = document.createElement("p");
      p.className = "muted";
      p.textContent = t("t.recentNone");
      box.appendChild(p);
      return;
    }
    var ul = document.createElement("ul");
    ul.className = "trainer-rooms";
    rooms.forEach(function (r) {
      var li = document.createElement("li");

      var a = document.createElement("a");
      a.href = roomUrl(r);
      a.textContent = r;

      var span = document.createElement("span");
      span.className = "muted";
      span.textContent = t("t.loading");

      var spacer = document.createElement("span");
      spacer.className = "spacer";

      var btnReset = document.createElement("button");
      btnReset.type = "button";
      btnReset.className = "btn-link";
      btnReset.textContent = t("t.reset");
      btnReset.addEventListener("click", function () {
        // Nach dem Zuruecksetzen neu zeichnen, damit die Anzahl stimmt.
        resetRoom(r, roomsReport, renderTrainerRecent);
      });

      var btnForget = document.createElement("button");
      btnForget.type = "button";
      btnForget.className = "btn-link";
      btnForget.textContent = t("t.forget");
      btnForget.addEventListener("click", function () {
        forgetRoom(r);
        roomsReport(t("t.forgotten", { room: r }));
        renderTrainerRecent();
      });

      li.appendChild(a);
      li.appendChild(span);
      li.appendChild(spacer);
      li.appendChild(btnReset);
      li.appendChild(btnForget);
      ul.appendChild(li);

      // Anzahl je Raum nachladen, damit erkennbar ist, welcher noch Daten haelt.
      fetchJson(api("/api/aggregate?room=" + encodeURIComponent(r))).then(function (d) {
        var n = (d && typeof d.count === "number") ? d.count : 0;
        span.textContent = countText(n);
      }).catch(function () {
        span.textContent = t("t.countUnavailable");
      });
    });
    box.appendChild(ul);
  }

  /* Macht sichtbar, ob ein Token hinterlegt ist. Ohne diese Anzeige laesst sich
   * nicht unterscheiden, ob das Feld leer ist oder nur nicht angezeigt wird. */
  function updateTokenState() {
    $("trainer-token-state").textContent = readToken() ? t("t.tokenStored") : t("t.tokenNotStored");
  }

  function initTrainer() {
    var roomInput = $("trainer-room");
    roomInput.value = param("room") || "";

    $("btn-trainer-dice").addEventListener("click", function () {
      // Vorhandenen Zufallszusatz ersetzen statt anhaengen, sonst wachsen die
      // Codes bei mehrfachem Klicken.
      var base = roomInput.value.trim().replace(/-\d{4}$/, "");
      if (!base) { roomInput.focus(); return; }
      roomInput.value = (base + "-" + String(Math.floor(1000 + Math.random() * 9000))).slice(0, 40);
    });

    $("btn-trainer-open").addEventListener("click", function () {
      var room = roomInput.value.trim().slice(0, 40);
      var msg = $("trainer-msg");
      if (!room) {
        msg.hidden = false;
        msg.textContent = t("t.needRoom");
        return;
      }
      if (room === "default") {
        msg.hidden = false;
        msg.textContent = t("t.noDefault");
        return;
      }
      rememberRoom(room);
      window.location.href = roomUrl(room);
    });

    $("trainer-token").value = readToken();
    $("btn-trainer-token-save").addEventListener("click", function () {
      var tok = $("trainer-token").value.trim();
      var msg = $("trainer-token-msg");
      msg.hidden = false;
      if (!tok) { msg.textContent = t("t.tokenEmpty"); return; }
      writeToken(tok);
      msg.textContent = t("t.tokenSaved");
      updateTokenState();
    });
    $("btn-trainer-token-clear").addEventListener("click", function () {
      clearToken();
      $("trainer-token").value = "";
      var msg = $("trainer-token-msg");
      msg.hidden = false;
      msg.textContent = t("t.tokenCleared");
      updateTokenState();
    });

    updateTokenState();
    renderTrainerRecent();
  }

  // =====================================================================
  // START
  // =====================================================================

  /* Feste Texte im Markup. index.html trägt die deutsche Fassung, damit die
   * Seite auch vor dem Skript lesbar ist; hier wird sie durch die gewählte
   * Sprache ersetzt. Attribute:
   *   data-i18n="key"              Textinhalt
   *   data-i18n-html="key"         Inhalt mit Markup (nur Schlüssel auf .html)
   *   data-i18n-placeholder="key"  Platzhalter eines Eingabefelds */
  function applyStatic() {
    document.documentElement.lang = lv("htmlLang") || LANG;
    document.title = t("meta.title");
    [].forEach.call(document.querySelectorAll("[data-i18n]"), function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    [].forEach.call(document.querySelectorAll("[data-i18n-html]"), function (el) {
      el.innerHTML = t(el.getAttribute("data-i18n-html"));
    });
    [].forEach.call(document.querySelectorAll("[data-i18n-placeholder]"), function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
  }

  applyStatic();
  $("intro-note").textContent = MODE === "team" ? t("intro.note.team") : t("intro.note.solo");

  renderStep();

  if (TRAINER) {
    initTrainer();
    show("screen-trainer");
  } else if (NO_ROOM) {
    show("screen-noroom");
  } else if (PRESENT) {
    rememberRoom(ROOM);
    document.getElementById("main").classList.add("wide");
    renderPresent();
    show("screen-present");
    loadAggregate();
    startPolling();
  } else {
    updateProgress("screen-intro");
  }
})();
