/* ATLAS Quick Check – alle sichtbaren Texte, je Sprache ein Block.
 *
 * Quelle der englischen Fassung: ATLAS-Quick-Check-Uebersetzung-EN.md im
 * Projektordner (final abgestimmt im November 2026). Britisches Englisch.
 *
 * Eine weitere Sprache (etwa "fr") kommt als weiterer Block mit denselben
 * Schlüsseln hinzu (langLabel und langName für den Umschalter in der
 * Kopfzeile, der seine Knöpfe aus den vorhandenen Blöcken baut). Die App wählt die Sprache nach der Browsersprache
 * (navigator.languages); ?lang=xx in der Adresse übersteuert das. Fehlt ein
 * Schlüssel in einer Sprache, greift Deutsch.
 *
 * Interne Kennungen der Dimensionen bleiben deutsch (Alignment, Teams,
 * Leadership, Arbeitsfluss, Struktur): sie stecken in Tests, Server und der
 * Benachrichtigungsmail. Angezeigt wird immer der Wert aus "dims".
 *
 * Platzhalter {n}, {x}, {dim} … setzt t() zur Laufzeit ein. Schlüssel mit der
 * Endung ".html" enthalten Markup und werden als innerHTML gesetzt; sie stammen
 * ausschließlich aus dieser Datei, nie aus Eingaben.
 *
 * Diese Datei wird von sync.py in beide Deployments eingesetzt.
 */
window.QC_I18N = {
  de: {
    htmlLang: "de",
    langLabel: "DE",
    langName: "Deutsch",
    decimal: ",",
    and: "und",

    dims: {
      Alignment: "Alignment",
      Teams: "Teams",
      Leadership: "Leadership",
      Arbeitsfluss: "Arbeitsfluss",
      Struktur: "Struktur"
    },

    // Erklärsätze, erscheinen nur im Ergebnis
    dimIntro: {
      Alignment: "Wie klar strategische Ziele sind und wie sie Arbeit und Entscheidungen leiten.",
      Teams: "Wie die Teams selbst arbeiten und sich verbessern.",
      Leadership: "Wie Entscheidungen getroffen und Teams geführt werden.",
      Arbeitsfluss: "Wie gut Arbeit und Abhängigkeiten über Teams hinweg gesteuert werden.",
      Struktur: "Wie gut Strukturen Zusammenarbeit, Lernen und Anpassung ermöglichen."
    },

    // Aussagen q0 bis q19, in der Reihenfolge von QUESTIONS in app.js
    questions: [
      "Den Mitarbeitenden sind die strategischen Ziele des Unternehmens klar.",
      "Mitarbeitende wissen genau, wie ihre Arbeit auf strategische Ziele einzahlt.",
      "Priorisierungsentscheidungen sind schwierig, weil Produktvisionen und/oder Produktziele unklar sind.",
      "Entscheidungen bei übergreifenden Themen sind langwierig.",

      "Jedes Team liefert verlässlich in hoher Qualität.",
      "Wenn einzelne Personen abwesend sind, stockt die Arbeit im Team.",
      "Lieferqualität variiert spürbar je nachdem, welches Teammitglied die Anforderung übernimmt.",
      "Die Teams reflektieren regelmäßig über teaminterne Verbesserungsmöglichkeiten.",

      "Leadership hält Personen und Teams accountable.",
      "Prioritäten wechseln häufig.",
      "Leadership sorgt für einen Rahmen, der teamübergreifende Zusammenarbeit ermöglicht.",
      "Wichtige Probleme bleiben zu lange unadressiert, weil sich niemand verantwortlich fühlt.",

      "Der Arbeitsablauf wird teamübergreifend im Sinne der Wertschöpfung optimiert.",
      "Arbeit stockt aufgrund von Abhängigkeiten.",
      "Teams entscheiden gemeinsam, welche übergreifende Arbeit sie einplanen.",
      "Wir liefern teamübergreifende Funktionalität verlässlich und vorhersagbar.",

      "Unsere Strukturen sorgen für effizienten Informationsaustausch und befördern das Unternehmenslernen.",
      "(Team-)Strukturen und Regelungen behindern die teamübergreifende Zusammenarbeit.",
      "Unsere Strukturen behindern uns, schnell auf Marktveränderungen zu reagieren.",
      "Unsere Teamstrukturen werden immer wieder so an die Ziele angepasst, dass die Ziele effektiv erreicht werden können."
    ],

    // Ansatzpunkte je Dimension
    measures: {
      Alignment: [
        "Übergreifende Boards erstellen, die den gesamten Wertstrom abbilden",
        "Workflow-Replenishments",
        "Gemeinsames Erstellen und Pflegen einer Strategie auf Flight Level 3"
      ],
      Teams: [
        "Regelmäßige Reflexion über die Zusammenarbeit mit Schnittstellen",
        "Produktreviews durchführen",
        "Retrospektiven etablieren"
      ],
      Leadership: [
        "Delegationpoker einführen",
        "Gemba Walks etablieren",
        "Entscheidungen in kleinen Gremien treffen"
      ],
      Arbeitsfluss: [
        "Fluss der Arbeit transparent machen",
        "Flussmetriken etablieren",
        "Flow Review einführen"
      ],
      Struktur: [
        "Continuous Integration aufbauen",
        "Testgetriebene Entwicklung anwenden",
        "Systeme modularisieren"
      ]
    },

    // Skala: nur die drei Anker sind benannt
    scale: { 1: "Stimme gar nicht zu", 3: "Weder noch", 5: "Stimme voll und ganz zu" },

    // Zonen; die Bereichsangaben setzen die Zahlen mit dem Dezimalzeichen der Sprache
    zones: {
      low: { label: "Entwicklungsfeld", range: "unter {a}" },
      mid: { label: "teilweise wirksam", range: "{a} bis unter {b}" },
      high: { label: "wirksam", range: "{a} und höher" }
    },

    // Gesamtbewertung, je Band Titel und Text
    bands: [
      {
        title: "Ihr scheint in Euren Teams noch viele Möglichkeiten zu haben, an denen Ihr anpacken könnt.",
        text: "Wirf die Flinte nicht ins Korn. Oder um es mit Kent Beck zu sagen: „Perfect is a Verb.“"
      },
      { title: "Ihr scheint schon einiges richtig zu machen, bleibt am Ball!", text: "" },
      { title: "Nicht schlecht, Ihr scheint viele Dinge richtig zu machen.", text: "Bleibt dran." }
    ],

    s: {
      "meta.title": "ATLAS Quick Check – Teamübergreifende Lieferfähigkeit",
      "lang.switch": "Sprache",

      // Startseite
      "intro.lead.html": "Wie gut liefert deine IT-Organisation <strong>über Teamgrenzen hinweg</strong>? Der Quick Check bewertet das entlang der fünf ATLAS-Dimensionen.",
      "intro.dims.html": "<strong>A</strong>lignment · <strong>T</strong>eams · <strong>L</strong>eadership · <strong>A</strong>rbeitsfluss · <strong>S</strong>truktur",
      "intro.note.solo": "20 Aussagen in fünf Schritten, Skala 1 bis 5. Dauer etwa 5 Minuten. Am Ende fragen wir nach deinen Kontaktdaten – dein Ergebnis kannst du auch ohne ansehen. Deine Antworten bleiben bis dahin in deinem Browser.",
      "intro.note.team": "20 Aussagen in fünf Schritten, Skala 1 bis 5. Dauer etwa 5 Minuten. Deine Antworten werden ohne Namen gespeichert und mit den Antworten der anderen zu einem gemeinsamen Profil zusammengefasst.",
      "intro.start": "Quick Check starten",
      "intro.resume": "Begonnenen Check fortsetzen ({n} von {total} bewertet)",

      // Fragebogen
      "q.hint": "Bewerte jede Aussage danach, wie stark sie auf deinen Verantwortungsbereich zutrifft.",
      "q.skipHint": "Wenn du eine Aussage nicht einschätzen kannst, lass sie offen. Ein erneuter Klick auf den gewählten Wert hebt die Auswahl wieder auf.",
      "q.legendLow": "1 = Stimme gar nicht zu",
      "q.legendHigh": "5 = Stimme voll und ganz zu",
      "q.ofFive": "{n} von 5",
      "q.progress": "Dimension {n} von {total}",
      "q.next": "Weiter",
      "q.toContact": "Weiter zu den Kontaktdaten",
      "q.showResult": "Ergebnis anzeigen",
      "q.backToStart": "Zurück zum Start",
      "q.backTo": "Zurück: {dim}",
      "q.noneAnswered": "Bitte bewerte mindestens eine Aussage, sonst lässt sich kein Profil berechnen.",

      // Kopfzeile
      "top.contact": "Kontaktdaten",
      "top.result": "Ergebnis",
      "top.present": "Moderation",
      "top.trainer": "Vorbereitung",
      "count.one": "1 Rückmeldung",
      "count.many": "{n} Rückmeldungen",
      "count.word.one": "Rückmeldung",
      "count.word.many": "Rückmeldungen",

      // Kontaktformular
      "c.title": "Fast fertig",
      "c.lead": "Wenn du magst, melden wir uns bei dir und ordnen dein Ergebnis gemeinsam mit dir ein.",
      "c.note": "Dafür speichern wir deine Angaben. Auf dein Ergebnis hat das keinen Einfluss – es wird in deinem Browser berechnet und dir in jedem Fall vollständig angezeigt.",
      "c.firstname": "Vorname",
      "c.lastname": "Nachname",
      "c.email": "E-Mail",
      "c.phone": "Telefon",
      "c.phonePlaceholder": "Telefon für schnellsten Kontakt",
      "c.company": "Unternehmen",
      "c.topic": "Womit können wir Dir helfen?",
      "c.topic.none": "Bitte wählen",
      "c.topic.training": "Frage zu einer Schulung",
      "c.topic.offer": "Frage zu einem Angebot",
      "c.topic.consulting": "Bitte um Beratung",
      "c.topic.organisational": "Organisatorische Frage",
      "c.topic.other": "Sonstiges",
      "c.message": "Deine Nachricht an uns",
      "c.optional": "(optional)",
      "c.messagePlaceholder": "Was möchtest Du zu Deinem Ergebnis besprechen?",
      "c.consent.html": "Ich willige in die Verarbeitung meiner Daten durch die it-agile GmbH ein und habe die <a href=\"../datenschutz.html\" target=\"_blank\" rel=\"noopener\">Datenschutzerklärung</a> zur Kenntnis genommen.",
      "c.required": "* Benötigte Angaben",
      "c.submit": "Absenden und Ergebnis anzeigen",
      "c.sending": "Wird gesendet …",
      "c.backToQuestions": "Zurück zu den Fragen",
      "c.skip": "Ergebnis ohne Kontaktdaten ansehen",
      "c.err.firstname": "Bitte gib deinen Vornamen an.",
      "c.err.lastname": "Bitte gib deinen Nachnamen an.",
      "c.err.email": "Bitte gib eine gültige E-Mail-Adresse an.",
      "c.err.consent": "Ohne diese Einwilligung dürfen wir deine Angaben nicht speichern. Du kannst dein Ergebnis auch ohne Kontaktdaten ansehen.",

      // Ergebnis
      "r.titleSolo": "Dein ATLAS-Profil",
      "r.titleTeam": "ATLAS-Profil der Gruppe",
      "r.subjectSolo": "deine Einschätzung",
      "r.subjectTeam": "die Einschätzung der Gruppe",
      "r.lead.all.html": "Über alle fünf Dimensionen liegt {subject} im Mittel bei <strong>{x} von 5</strong> – {zone}. ",
      "r.lead.some.html": "Über die {n} bewerteten Dimensionen liegt {subject} im Mittel bei <strong>{x} von 5</strong> – {zone}. ",
      "r.lead.one.html": "In der einzigen bewerteten Dimension liegt {subject} im Mittel bei <strong>{x} von 5</strong> – {zone}. ",
      "r.lead.none": "Es liegen keine Bewertungen vor, deshalb lässt sich kein Profil berechnen.",
      "r.lead.allEqual": "Alle Dimensionen liegen gleich hoch, ein einzelner Hebel sticht damit nicht heraus.",
      "r.lead.strongOne.html": "Am stärksten ist <strong>{dims}</strong>, ",
      "r.lead.strongMany.html": "Am stärksten sind <strong>{dims}</strong>, ",
      "r.lead.leverOne.html": "den größten Hebel siehst du bei <strong>{dims}</strong>.",
      "r.lead.leverMany.html": "den größten Hebel siehst du bei <strong>{dims}</strong> – dort liegen mehrere Dimensionen gleich niedrig.",
      "r.yourScores": "deine Werte",
      "r.yourAnswers": "deine Antworten",
      "r.group": "Gruppe",
      "r.you": "Du",
      "r.colDimension": "Dimension",
      "r.colAverage": "Mittelwert",
      "r.colRating": "Einordnung",
      "r.ofFive": "von 5",
      "r.noAnswer": "keine Angabe",
      "r.aria.radar": "Zielscheibe der fünf ATLAS-Dimensionen. {desc}",
      "r.aria.dim": "{dim} {x} von 5, {zone}",
      "r.aria.dimNone": "{dim} keine Angabe",
      "r.aria.range": ", Einzelwerte von {x} bis {y}",
      "r.disclaimerSolo": "Momentaufnahme aus deiner Sicht, keine Messung. Sie zeigt, wo sich ein genauerer Blick lohnt.",
      "r.disclaimerTeam": "Momentaufnahme aus Sicht der Teilnehmenden, keine Messung.",
      "r.noteSolo": "Je Dimension vier Aussagen. Gezeigt ist der Mittelwert auf der Skala 1 bis 5.",
      "r.noteTeam": "Je Dimension vier Aussagen, Skala 1 bis 5. Der Gruppenwert ist der Mittelwert über alle Rückmeldungen und aktualisiert sich laufend.",
      "r.noteSkipped": "Aussagen ohne Angabe zählen nicht mit; eine Dimension ganz ohne Angabe erscheint nicht im Diagramm.",
      "r.sent": "Danke. Wir haben deine Angaben erhalten und melden uns.",
      "r.static.html": "<strong>Testbetrieb:</strong> Diese Seite läuft ohne Backend. Dein Ergebnis wurde nur in deinem Browser berechnet, es wurde nichts übertragen und nichts gespeichert.",
      "r.skipped": "Du hast den Check ohne Kontaktdaten abgeschlossen. Es wurde nichts übertragen.",
      "r.failed": "Dein Ergebnis konnte nicht übertragen werden. Es steht dir hier trotzdem vollständig zur Verfügung.",
      "r.teamReceived": "Dein Beitrag ist eingegangen. Das Profil beruht auf {count} und aktualisiert sich automatisch.",
      "r.teamCount.one": "einer Rückmeldung",
      "r.teamCount.many": "{n} Rückmeldungen",

      // Ansatzpunkte
      "m.title": "Ansatzpunkte",
      "m.allHigh": "Alle fünf Dimensionen sind wirksam. Ansatzpunkte nennen wir nur dort, wo zuerst etwas zu holen ist.",
      "m.allRatedHigh": "Alle bewerteten Dimensionen sind wirksam. Ansatzpunkte nennen wir nur dort, wo zuerst etwas zu holen ist.",
      "m.intro": "Nur für die Dimensionen, die noch nicht wirksam sind – die mit dem niedrigsten Wert zuerst. Das sind erste Ansatzpunkte, keine fertige Maßnahmenplanung.",
      "m.meta": "{intro} Mittelwert {x} von 5.",

      // Wie geht es weiter?
      "cta.title": "Wie geht es weiter?",
      "cta.text": "Das Profil zeigt, wo der Fluss zwischen euren Teams stockt – aber nicht warum. Vereinbare gerne einen Termin mit uns, um weitere Optionen zu besprechen.",
      "cta.book": "Termin vereinbaren",
      "cta.more": "Mehr über Flow-Optimierung",
      "cta.whitepaper": "Whitepaper zur Flow-Optimierung herunterladen (PDF)",
      "r.print": "Ergebnis drucken oder als PDF speichern",
      "r.restart": "Check neu starten",

      // Moderationsansicht
      "p.join": "Mitmachen",
      "p.qrAlt": "QR-Code zum Mitmachen",
      "p.roomCode": "Raumcode",
      "p.reset": "Raum zurücksetzen",
      "p.resetHint.html": "Leert <strong>nur diesen Raum</strong>. Andere Räume und die Anfragen aus dem Einzelmodus bleiben unberührt. Verlangt das Admin-Token; auf der <a href=\"?trainer=1\">Trainerseite</a> lässt es sich einmalig hinterlegen.",
      "p.title": "ATLAS-Profil der Gruppe",
      "p.hint": "Das Diagramm aktualisiert sich automatisch.",
      "p.hintEmpty": "Noch keine Rückmeldungen. Das Diagramm aktualisiert sich automatisch.",
      "p.hintCloud": "Ein Punkt je Rückmeldung und Dimension. Die Ansicht aktualisiert sich automatisch.",
      "p.legendDot": "eine Rückmeldung",
      "p.legendMean": "Mittelwert der Gruppe",
      "p.stripsAria": "Verteilung der {n} Rückmeldungen je Dimension auf der Skala 1 bis 5. Dieselben Werte wie in der Zielscheibe darüber.",
      "p.stripMean": "Mittel {x}",
      "p.confirmReset": "Raum „{room}“ zurücksetzen? Alle Rückmeldungen dieses Raums werden gelöscht. Andere Räume bleiben unberührt.",
      "p.promptToken": "Admin-Token für das Zurücksetzen des Raums „{room}“:",
      "p.resetDone": "Raum „{room}“ zurückgesetzt.",
      "p.tokenStaleRejected": "Gemerktes Token abgelehnt und vom Gerät gelöscht. Bitte erneut versuchen.",
      "p.tokenRejected": "Token abgelehnt.",
      "p.resetFailed": "Zurücksetzen fehlgeschlagen (HTTP {code}).",
      "p.unreachable": "Backend nicht erreichbar.",

      // Kein Raum
      "nr.title": "Kein Raum angegeben",
      "nr.text": "Der Teammodus des ATLAS Quick Check läuft immer in einem eigenen Raum. Bitte den Link oder QR-Code aus der Einladung zum Workshop verwenden.",

      // Trainerseite
      "t.title": "Workshop vorbereiten",
      "t.lead": "Raumcode festlegen und die Moderationsansicht öffnen. Diese Seite lässt sich als Lesezeichen speichern.",
      "t.roomLabel": "Raumcode",
      "t.roomPlaceholder": "z. B. kunde-4823",
      "t.roomHint": "Nicht nur den Kundennamen nehmen. Die Auswertung ist ohne Anmeldung abrufbar – wer den Code errät, sieht sie, samt der einzelnen Bewertungen. Namen stehen nirgends, aber der Zufallszusatz ist der eigentliche Schutz; die Teilnehmenden tippen den Code ohnehin nie, er steckt im QR-Code.",
      "t.open": "Moderationsansicht öffnen",
      "t.dice": "Zufallszusatz anhängen",
      "t.recent": "Zuletzt benutzt",
      "t.recentHint": "„Zurücksetzen“ löscht die Rückmeldungen des Raums auf dem Server und wirkt für alle. „Aus Liste entfernen“ betrifft nur diese Ansicht hier; die Daten auf dem Server bleiben davon unberührt.",
      "t.recentNone": "Noch keine. Sobald du eine Moderationsansicht öffnest, erscheint der Raum hier.",
      "t.loading": "wird geladen …",
      "t.countUnavailable": "Anzahl nicht abrufbar",
      "t.reset": "Zurücksetzen",
      "t.forget": "Aus Liste entfernen",
      "t.forgotten": "Raum „{room}“ aus der Liste entfernt. Die Daten auf dem Server sind unverändert.",
      "t.needRoom": "Bitte einen Raumcode eingeben.",
      "t.noDefault": "„default“ ist der Raum des Einzelmodus, in dem die Anfragen liegen. Bitte einen anderen Code wählen.",
      "t.tokenTitle": "Admin-Token",
      "t.tokenHint": "Einmal hinterlegen, dann verlangt „Raum zurücksetzen“ nur noch eine Bestätigung. Das Token bleibt in diesem Browser und wird nirgendwohin übertragen. Auf fremder Hardware hinterher löschen.",
      "t.tokenLabel": "Token",
      "t.tokenSave": "Token merken",
      "t.tokenClear": "Token von diesem Gerät löschen",
      "t.tokenStored": "Auf diesem Gerät hinterlegt. Zurücksetzen verlangt nur noch eine Bestätigung.",
      "t.tokenNotStored": "Nicht hinterlegt. Zurücksetzen fragt jedes Mal nach dem Token.",
      "t.tokenEmpty": "Kein Token eingegeben.",
      "t.tokenSaved": "Token in diesem Browser gemerkt.",
      "t.tokenCleared": "Token von diesem Gerät gelöscht."
    }
  },

  en: {
    htmlLang: "en-GB",
    langLabel: "EN",
    langName: "English",
    decimal: ".",
    and: "and",

    dims: {
      Alignment: "Alignment",
      Teams: "Teams",
      Leadership: "Leadership",
      Arbeitsfluss: "Activity Flow",
      Struktur: "Structure"
    },

    dimIntro: {
      Alignment: "How clear the strategic goals are and how they guide work and decisions.",
      Teams: "How the teams themselves work and improve.",
      Leadership: "How decisions are made and teams are led.",
      Arbeitsfluss: "How well work and dependencies are managed across teams.",
      Struktur: "How well structures enable collaboration, learning and adaptation."
    },

    questions: [
      "The company's strategic goals are clear to employees.",
      "Employees know exactly how their work contributes to the strategic goals.",
      "Prioritisation decisions are difficult because product visions and/or product goals are unclear.",
      "Decisions on cross-team topics take a long time.",

      "Every team reliably delivers high-quality work.",
      "When individual team members are absent, the team's work stalls.",
      "Delivery quality varies noticeably depending on which team member picks up a requirement.",
      "The teams regularly reflect on ways to improve within the team.",

      "Leadership holds people and teams accountable.",
      "Priorities change frequently.",
      "Leadership provides a framework that enables cross-team collaboration.",
      "Important problems remain unaddressed for too long because nobody feels responsible.",

      "The workflow is optimised across teams with a focus on value creation.",
      "Work stalls because of dependencies.",
      "Teams decide together which cross-team work to take on.",
      "We deliver cross-team functionality reliably and predictably.",

      "Our structures ensure efficient information sharing and foster organisational learning.",
      "(Team) structures and rules hinder cross-team collaboration.",
      "Our structures prevent us from responding quickly to market changes.",
      "Our team structures are continually adapted to our goals so that those goals can be achieved effectively."
    ],

    measures: {
      Alignment: [
        "Create cross-team boards that map the entire value stream",
        "Hold replenishment meetings across the workflow",
        "Jointly create and maintain a strategy at Flight Level 3"
      ],
      Teams: [
        "Regularly reflect on collaboration with interfacing teams",
        "Hold product reviews",
        "Establish retrospectives"
      ],
      Leadership: [
        "Introduce Delegation Poker",
        "Establish Gemba walks",
        "Make decisions in small groups"
      ],
      Arbeitsfluss: [
        "Make the flow of work transparent",
        "Establish flow metrics",
        "Introduce a flow review"
      ],
      Struktur: [
        "Set up continuous integration",
        "Apply test-driven development",
        "Modularise systems"
      ]
    },

    scale: { 1: "Strongly disagree", 3: "Neither agree nor disagree", 5: "Strongly agree" },

    zones: {
      low: { label: "area for development", range: "below {a}" },
      mid: { label: "partially effective", range: "{a} to below {b}" },
      high: { label: "effective", range: "{a} and above" }
    },

    bands: [
      {
        title: "Your teams seem to have plenty of opportunities to work on.",
        text: "Don't throw in the towel. Or, in the words of Kent Beck: “Perfect is a verb.”"
      },
      { title: "You already seem to be getting quite a lot right – keep at it!", text: "" },
      { title: "Not bad – you seem to be doing many things right.", text: "Keep it up." }
    ],

    s: {
      "meta.title": "ATLAS Quick Check – Cross-Team Delivery Capability",
      "lang.switch": "Language",

      "intro.lead.html": "How well does your IT organisation deliver <strong>across team boundaries</strong>? The Quick Check assesses this along the five ATLAS dimensions.",
      "intro.dims.html": "<strong>A</strong>lignment · <strong>T</strong>eams · <strong>L</strong>eadership · <strong>A</strong>ctivity Flow · <strong>S</strong>tructure",
      "intro.note.solo": "20 statements in five steps, on a scale of 1 to 5. Takes about 5 minutes. At the end we ask for your contact details – you can also view your result without providing them. Until then, your answers stay in your browser.",
      "intro.note.team": "20 statements in five steps, on a scale of 1 to 5. Takes about 5 minutes. Your answers are stored without your name and combined with other participants' answers into a shared profile.",
      "intro.start": "Start Quick Check",
      "intro.resume": "Continue where you left off ({n} of {total} rated)",

      "q.hint": "Rate each statement according to how strongly it applies to your area of responsibility.",
      "q.skipHint": "If you cannot assess a statement, leave it blank. Clicking the selected value again clears your selection.",
      "q.legendLow": "1 = Strongly disagree",
      "q.legendHigh": "5 = Strongly agree",
      "q.ofFive": "{n} of 5",
      "q.progress": "Dimension {n} of {total}",
      "q.next": "Next",
      "q.toContact": "Continue to contact details",
      "q.showResult": "Show result",
      "q.backToStart": "Back to start",
      "q.backTo": "Back: {dim}",
      "q.noneAnswered": "Please rate at least one statement, otherwise no profile can be calculated.",

      "top.contact": "Contact details",
      "top.result": "Result",
      "top.present": "Facilitation",
      "top.trainer": "Preparation",
      "count.one": "1 response",
      "count.many": "{n} responses",
      "count.word.one": "response",
      "count.word.many": "responses",

      "c.title": "Almost done",
      "c.lead": "If you like, we will get in touch and go through your result with you.",
      "c.note": "To do so, we store the details you provide. This has no effect on your result – it is calculated in your browser and always shown to you in full.",
      "c.firstname": "First name",
      "c.lastname": "Last name",
      "c.email": "Email",
      "c.phone": "Phone",
      "c.phonePlaceholder": "Phone for the quickest response",
      "c.company": "Company",
      "c.topic": "How can we help you?",
      "c.topic.none": "Please select",
      "c.topic.training": "Question about a training course",
      "c.topic.offer": "Question about an offer",
      "c.topic.consulting": "Consulting enquiry",
      "c.topic.organisational": "Organisational question",
      "c.topic.other": "Other",
      "c.message": "Your message to us",
      "c.optional": "(optional)",
      "c.messagePlaceholder": "What would you like to discuss about your result?",
      "c.consent.html": "I consent to it-agile GmbH processing my data and have read the <a href=\"../privacy.html\" target=\"_blank\" rel=\"noopener\">privacy policy</a>.",
      "c.required": "* Required fields",
      "c.submit": "Submit and show result",
      "c.sending": "Sending …",
      "c.backToQuestions": "Back to the questions",
      "c.skip": "View result without contact details",
      "c.err.firstname": "Please enter your first name.",
      "c.err.lastname": "Please enter your last name.",
      "c.err.email": "Please enter a valid email address.",
      "c.err.consent": "Without this consent we are not allowed to store your details. You can also view your result without providing contact details.",

      "r.titleSolo": "Your ATLAS profile",
      "r.titleTeam": "Group ATLAS profile",
      "r.subjectSolo": "your assessment",
      "r.subjectTeam": "the group's assessment",
      "r.lead.all.html": "Across all five dimensions, {subject} averages <strong>{x} out of 5</strong> – {zone}. ",
      "r.lead.some.html": "Across the {n} rated dimensions, {subject} averages <strong>{x} out of 5</strong> – {zone}. ",
      "r.lead.one.html": "In the only rated dimension, {subject} averages <strong>{x} out of 5</strong> – {zone}. ",
      "r.lead.none": "No ratings were given, so no profile can be calculated.",
      "r.lead.allEqual": "All dimensions are at the same level, so no single lever stands out.",
      "r.lead.strongOne.html": "The strongest dimension is <strong>{dims}</strong>; ",
      "r.lead.strongMany.html": "The strongest dimensions are <strong>{dims}</strong>; ",
      "r.lead.leverOne.html": "you see the biggest lever in <strong>{dims}</strong>.",
      "r.lead.leverMany.html": "you see the biggest lever in <strong>{dims}</strong> – several dimensions share the lowest score.",
      "r.yourScores": "your scores",
      "r.yourAnswers": "your answers",
      "r.group": "Group",
      "r.you": "You",
      "r.colDimension": "Dimension",
      "r.colAverage": "Average",
      "r.colRating": "Rating",
      "r.ofFive": "out of 5",
      "r.noAnswer": "no answer",
      "r.aria.radar": "Radar chart of the five ATLAS dimensions. {desc}",
      "r.aria.dim": "{dim} {x} out of 5, {zone}",
      "r.aria.dimNone": "{dim} no answer",
      "r.aria.range": ", individual scores from {x} to {y}",
      "r.disclaimerSolo": "A snapshot from your perspective, not a measurement. It shows where a closer look is worthwhile.",
      "r.disclaimerTeam": "A snapshot from the participants' perspective, not a measurement.",
      "r.noteSolo": "Four statements per dimension. The average on the 1-to-5 scale is shown.",
      "r.noteTeam": "Four statements per dimension, scale of 1 to 5. The group score is the average of all responses and updates continuously.",
      "r.noteSkipped": "Statements without an answer are not counted; a dimension with no answers at all does not appear in the chart.",
      "r.sent": "Thank you. We have received your details and will be in touch.",
      "r.static.html": "<strong>Test mode:</strong> This page is running without a backend. Your result was calculated only in your browser; nothing was transmitted or stored.",
      "r.skipped": "You completed the check without contact details. Nothing was transmitted.",
      "r.failed": "Your result could not be transmitted. It is still fully available to you here.",
      "r.teamReceived": "Your input has been received. The profile is based on {count} and updates automatically.",
      "r.teamCount.one": "one response",
      "r.teamCount.many": "{n} responses",

      "m.title": "Starting points",
      "m.allHigh": "All five dimensions are effective. We only suggest starting points where there is something to gain first.",
      "m.allRatedHigh": "All rated dimensions are effective. We only suggest starting points where there is something to gain first.",
      "m.intro": "Only for dimensions that are not yet effective – lowest score first. These are initial starting points, not a finished action plan.",
      "m.meta": "{intro} Average {x} out of 5.",

      "cta.title": "What's next?",
      "cta.text": "The profile shows where flow between your teams gets stuck – but not why. Feel free to book a meeting with us to discuss further options.",
      "cta.book": "Book a meeting",
      "cta.more": "More about flow optimisation",
      "cta.whitepaper": "Download the flow optimisation white paper (PDF)",
      "r.print": "Print result or save as PDF",
      "r.restart": "Restart check",

      "p.join": "Join in",
      "p.qrAlt": "QR code to join",
      "p.roomCode": "Room code",
      "p.reset": "Reset room",
      "p.resetHint.html": "Clears <strong>this room only</strong>. Other rooms and enquiries from individual mode are not affected. Requires the admin token; it can be stored once on the <a href=\"?trainer=1\">trainer page</a>.",
      "p.title": "Group ATLAS profile",
      "p.hint": "The chart updates automatically.",
      "p.hintEmpty": "No responses yet. The chart updates automatically.",
      "p.hintCloud": "One dot per response and dimension. The view updates automatically.",
      "p.legendDot": "one response",
      "p.legendMean": "group average",
      "p.stripsAria": "Distribution of the {n} responses per dimension on the 1-to-5 scale. Same values as in the radar chart above.",
      "p.stripMean": "Avg. {x}",
      "p.confirmReset": "Reset room “{room}”? All responses in this room will be deleted. Other rooms are not affected.",
      "p.promptToken": "Admin token to reset room “{room}”:",
      "p.resetDone": "Room “{room}” has been reset.",
      "p.tokenStaleRejected": "Stored token rejected and removed from this device. Please try again.",
      "p.tokenRejected": "Token rejected.",
      "p.resetFailed": "Reset failed (HTTP {code}).",
      "p.unreachable": "Backend unreachable.",

      "nr.title": "No room specified",
      "nr.text": "The team mode of the ATLAS Quick Check always runs in its own room. Please use the link or QR code from your workshop invitation.",

      "t.title": "Prepare workshop",
      "t.lead": "Choose a room code and open the facilitation view. You can bookmark this page.",
      "t.roomLabel": "Room code",
      "t.roomPlaceholder": "e.g. client-4823",
      "t.roomHint": "Don't use just the client's name. The results can be accessed without logging in – anyone who guesses the code can see them, including the individual ratings. No names are shown anywhere, but the random suffix is the actual protection; participants never type the code anyway, it is embedded in the QR code.",
      "t.open": "Open facilitation view",
      "t.dice": "Add random suffix",
      "t.recent": "Recently used",
      "t.recentHint": "“Reset” deletes the room's responses on the server and affects everyone. “Remove from list” only affects this view; the data on the server remains unchanged.",
      "t.recentNone": "None yet. As soon as you open a facilitation view, the room will appear here.",
      "t.loading": "loading …",
      "t.countUnavailable": "Count unavailable",
      "t.reset": "Reset",
      "t.forget": "Remove from list",
      "t.forgotten": "Room “{room}” removed from the list. The data on the server is unchanged.",
      "t.needRoom": "Please enter a room code.",
      "t.noDefault": "“default” is the individual-mode room where enquiries are stored. Please choose a different code.",
      "t.tokenTitle": "Admin token",
      "t.tokenHint": "Store it once, and “Reset room” will only ask for confirmation. The token stays in this browser and is never transmitted. Delete it afterwards on devices that aren't yours.",
      "t.tokenLabel": "Token",
      "t.tokenSave": "Remember token",
      "t.tokenClear": "Delete token from this device",
      "t.tokenStored": "Stored on this device. Resetting only asks for confirmation.",
      "t.tokenNotStored": "Not stored. Resetting asks for the token every time.",
      "t.tokenEmpty": "No token entered.",
      "t.tokenSaved": "Token saved in this browser.",
      "t.tokenCleared": "Token deleted from this device."
    }
  }
};
