-- Stumme Kennungen für die Gesundheitsschicht.
--
-- Bis hierher stand die Art des Datensatzes im Klartext in entry_id
-- («lab:…», «cycle:…», «meta»). Die Nutzlast war verschlüsselt, die Kennung
-- nicht — ein Blick in die Tabelle hätte also gereicht, um zu sehen, DASS
-- jemand Zyklusdaten oder Körperfotos führt. Das ist selbst schon ein Datum
-- nach Art. 9 DSGVO und widersprach der zugesagten Eigenschaft «der
-- Betreiber kann nicht mitlesen».
--
-- Ab jetzt steht dort der HMAC der lokalen Kennung, gebildet mit einem
-- zweiten Schlüssel aus derselben Phrase (src/lib/health/crypto.ts,
-- opaqueId). Die lokale Kennung reist im Chiffrat mit.
--
-- Die Zeilen im alten Format sind damit nutzlos: kein Gerät schreibt sie
-- fort, und ihre Kennung verrät genau das, was sie nicht verraten soll.
-- Deshalb werden sie gelöscht statt umbenannt — umbenennen könnte der
-- Server gar nicht, ihm fehlt der Schlüssel. Verloren geht dabei nichts:
-- die Daten liegen auf den Geräten, und der nächste Abgleich schreibt sie
-- im neuen Format neu.
delete from public.health_entries
where entry_id = 'meta'
   or entry_id like 'lab:%'
   or entry_id like 'symptom:%'
   or entry_id like 'cycle:%'
   or entry_id like 'self:%'
   or entry_id like 'med:%'
   or entry_id like 'peak:%';
