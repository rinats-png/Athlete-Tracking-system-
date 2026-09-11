// Theme vor dem ersten Paint setzen, damit es nicht kurz aufblitzt.
//
// Eine eigene Datei und kein Inline-Skript: die Inhaltsrichtlinie der
// Auslieferung erlaubt Skripte nur von der eigenen Herkunft (`script-src
// 'self'`), und ein Inline-Skript zählt nicht dazu. Als Inline-Block wurde
// dieses Skript in Produktion still blockiert — das Theme blitzte also genau
// so auf, wie es nicht sollte. Als Datei läuft es.
//
// Der alte Schlüssel wird noch gelesen: dieses Skript läuft vor dem Umzug
// der Speicherschlüssel (src/lib/store/migrateStorage.ts), und ein Nutzer der
// alten App soll beim ersten Start nach dem Update nicht ein falsches Theme
// aufblitzen sehen.
(function () {
  try {
    var stored = localStorage.getItem('kydon.theme') || localStorage.getItem('baseline.theme');
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.setAttribute('data-theme', stored);
    }
  } catch (e) {
    /* Private Mode o. ä. — dann gilt die Systemeinstellung. */
  }
})();
