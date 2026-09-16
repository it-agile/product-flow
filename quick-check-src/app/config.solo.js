/* Einzelmodus: statisches Deployment auf GitHub Pages.
 * apiBase leer waere "es wird nichts gesendet, das Ergebnis entsteht nur im
 * Browser". Gesetzt heisst: das Kontaktformular am Ende des Fragebogens
 * uebertraegt die Anfrage an das Backend auf der eigenen Hetzner-Instanz.
 *
 * Drei Dinge haengen an diesem Wert und muessen zueinander passen:
 *   1. ALLOWED_ORIGINS auf dem Server fuehrt https://it-team-flow.de,
 *      sonst blockt der Browser die Anfrage und der Lead ist weg.
 *   2. content/datenschutz.md nennt denselben Namen als Ort der Verarbeitung.
 *   3. Die Benachrichtigung (NOTIFY_*, SMTP_*) steht, sonst liegt die Anfrage
 *      ungesehen in data.json.
 */
window.QC_CONFIG = {
  mode: "solo",
  apiBase: "https://atlas-quick-check.it-agile.de",
  askForContact: true
};
