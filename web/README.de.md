# PICS Viewer — Web-Bluetooth-Version

[日本語](README.md) | [English](README.en.md) | **Deutsch**

Empfängt und visualisiert BLE-Advertisements von Advanced PICS im Browser. Es müssen keine Bibliotheken installiert und nichts gebaut werden.

## Starten

Führe im Wurzelverzeichnis des Repositorys Folgendes aus:

```bash
python3 -m http.server 8000 --bind 127.0.0.1 --directory web
```

Öffne <http://localhost:8000> im Browser. Bei statischem Hosting muss die Seite über HTTPS ausgeliefert werden. Direktes Öffnen über `file://` funktioniert nicht, weil ES-Module dann nicht geladen werden können – nutze einen HTTP-Server.

## Sprache

Die Oberfläche gibt es auf Japanisch, Englisch und Deutsch. Gewechselt wird über die Sprachauswahl oben rechts. Die Auswahl wird im Browser gespeichert (`localStorage`). Ohne gespeicherte Auswahl wird die Browsersprache verwendet, ansonsten Japanisch. Die Seite kann auch mit `?lang=ja`, `?lang=en` oder `?lang=de` geöffnet werden.

## Empfang mit einem echten Gerät

Es gibt zwei Empfangsmethoden. Beide empfangen nur Advertisements; eine GATT-Verbindung wird nicht aufgebaut.

- **Alle Advertisements in der Nähe scannen**: nutzt die experimentelle Web Bluetooth Scanning API (`navigator.bluetooth.requestLEScan`).
- **Gerät auswählen und Advertisements beobachten**: beobachtet ein mit `requestDevice()` ausgewähltes Gerät mit dem experimentellen `watchAdvertisements()`. Kann als Alternative ausprobiert werden, wenn der vollständige Scan nicht funktioniert.

1. Verwende einen Chrome mit Unterstützung für die Scan-API. Laut offiziellem [Implementierungsstand](https://github.com/whatwg/bluetooth/blob/main/implementation-status.md) ist sie unter macOS / Android experimentell verfügbar. Normale Web-Bluetooth-Unterstützung allein garantiert nicht, dass es funktioniert.
2. Aktiviere `chrome://flags/#enable-experimental-web-platform-features` und starte Chrome neu. Je nach Betriebssystem, Browserversion und Adapter funktioniert der Scan auch danach nicht.
3. Schalte Bluetooth am Gerät ein und erlaube dem Browser im Betriebssystem den Zugriff auf Bluetooth.
4. Öffne die Seite, drücke „Scan starten“ und erteile die Scan-Berechtigung des Browsers.
5. Warte in der Nähe einer Advanced-PICS-Ampel. Werden mehrere Kreuzungen empfangen, kannst du oben rechts im Monitor zwischen ihnen wechseln.

Die Seite zeigt an, ob die API der gewählten Methode verfügbar ist. In nicht unterstützten Umgebungen ist die Start-Schaltfläche deaktiviert, die Demo funktioniert aber. Auch wenn die API existiert, ist sie auf der Plattform eventuell nicht implementiert; Startfehler werden ebenfalls angezeigt. Echter Empfang in Safari / Firefox wird nicht unterstützt.

Wie im [offiziellen Chrome-Scan-Beispiel](https://googlechrome.github.io/samples/web-bluetooth/scan.html) wird mit `requestLEScan({ acceptAllAdvertisements: true, keepRepeatedDevices: true })` wiederholt empfangen und `manufacturerData.get(0x01CE)` aus `advertisementreceived` als PICS dekodiert. Die Berechtigung umfasst alle Advertisements in der Umgebung. Daten anderer Hersteller werden normalerweise verworfen und nur bei aktiviertem Debug-Modus zur Empfangsprüfung gespeichert und angezeigt. Es gibt keine GATT-Verbindung, kein Lesen/Schreiben und keine Steuerung von Ampeln. Es handelt sich nicht um eine API, mit der passives Scannen auf Funkebene angefordert wird.

### Geräteauswahl verwenden

Mit `?mode=watch` in der URL öffnet sich die Seite direkt mit der Geräteauswahl-Methode. Die Version unten auf der Seite lautet `2026.11.01.6`. In diesem Modus steht oben `requestDevice / watchAdvertisements erkannt` und auf der Start-Schaltfläche „Gerät wählen und beobachten“. Erscheint der alte Hinweis „Scan-API erkannt“, ist eine veraltete Seite oder ein veraltetes Skript geladen; prüfe, ob die Veröffentlichung aktualisiert wurde, und lade neu. Für HTML und geänderte Skripte/CSS werden versionierte URLs verwendet, damit der Cache keine unterschiedlichen Versionen mischt.

1. Stelle im gestoppten Zustand die „Empfangsmethode“ auf „Gerät auswählen und Advertisements beobachten“.
2. Um vor Ort ein PICS-Gerät zu finden, belasse das Ziel bei „PICS-Kandidaten (0x01CE)“. Für einen Empfangstest mit einem normalen BLE-Gerät wähle „Alle Geräte (Empfangstest)“ und schalte den „Debug-Modus“ ein.
3. Drücke „Gerät wählen und beobachten“, wähle in Chromes Auswahldialog ein Gerät und bestätige.
4. Prüfe, ob die Anzahl empfangener Ereignisse im Debug-Bereich steigt. Dass ein Gerät im Auswahldialog erscheint, bestätigt noch keinen Advertisement-Empfang.

Es wird dieselbe API wie im [offiziellen Chrome-Beispiel zur Advertisement-Beobachtung](https://googlechrome.github.io/samples/web-bluetooth/watch-advertisements.html) verwendet. Bei „PICS-Kandidaten“ grenzt `requestDevice({ filters: [{ manufacturerData: [{ companyIdentifier: 0x01CE }] }], optionalManufacturerData: [0x01CE] })` die Kandidaten anhand der gesendeten Hersteller-ID statt des Namens ein. Auch wenn der Name „Unbekanntes oder nicht unterstütztes Gerät“ lautet, musst du nicht anhand von Namen unter allen Geräten suchen. Andere Geräte mit derselben Hersteller-ID können ebenfalls erscheinen; prüfe daher nach der Auswahl, ob Kreuzungs-ID und Ampelinformationen empfangen werden. Erscheinen keine Kandidaten, ist noch nicht geklärt, ob das Advertisement im Browser auf einem Mac sichtbar ist. „Alle Geräte“ lässt `filters` weg und verwendet stattdessen `acceptAllDevices: true`. [Offizielle Chrome-Beschreibung der Herstellerdaten-Filter](https://developer.chrome.com/docs/capabilities/bluetooth#manufacturer-data-filter)

Beide fordern Zugriff auf die PICS-Herstellerdaten an und empfangen `advertisementreceived` des gewählten Geräts. Gestoppt wird über das AbortSignal von `watchAdvertisements({ signal })`. Es gibt keine GATT-Verbindung und kein Lesen/Schreiben.

Beobachtet werden kann nur das gewählte Gerät; das ist nicht gleichwertig mit einem vollständigen Scan. Erscheint das PICS-Gerät nicht im Auswahldialog, ist die Methode nicht nutzbar. Bei Geräten, die nach der Auswahl nicht mehr senden, steigt die Empfangszahl nicht. Mit dem Ziel „Alle Geräte“ lassen sich im Debug-Modus auch Nicht-PICS-Geräte anhand von Name, RSSI und Ereigniszahl prüfen. Da die Berechtigung für Herstellerdaten aber nur für `0x01CE` angefordert wird, werden Rohdaten anderer Hersteller nicht offengelegt. Auch Servicedaten können je nach Berechtigung fehlen.

In Tests durch Nutzer wurden unter Android PICS-Informationen per vollständigem Scan empfangen und auf einem Mac Advertisements eines ausgewählten normalen BLE-Geräts. Auf dem Mac funktionierte der vollständige Scan auch an einem PICS-Standort nicht. Die Identifikation von PICS-Geräten und der Datenempfang auf dem Mac müssen weiterhin vor Ort geprüft werden. Dies sind Ergebnisse aus den getesteten Umgebungen und keine Garantie für alle Android-Geräte oder Macs.

## Scan ohne PICS-Ampel in der Nähe prüfen

1. Schalte den „Debug-Modus“ ein.
2. Drücke „Scan starten“ und erteile die Berechtigung. Der Modus kann auch bei laufendem Scan eingeschaltet werden.
3. Prüfe den Bereich „Empfangsprüfung des BLE-Scans“. Steigt die Zahl der empfangenen Ereignisse und erscheint „BLE-Advertisement-Empfang bestätigt“, funktioniert der echte BLE-Empfang.

Der Debug-Modus zeichnet alle Advertisement-Ereignisse auf, auch die von Nicht-PICS-Geräten. Ereignisse ohne Hersteller- oder Servicedaten werden ebenfalls gezählt. Die Geräteliste zeigt Name, Geräte-ID des Browsers, RSSI, Hersteller-IDs, Anzahl und letzten Empfangszeitpunkt. Das detaillierte Log zeigt Hex-Dumps der Hersteller- und Servicedaten, Service-UUIDs und die Sendeleistung (falls von der API geliefert). Die Rohdaten sind die einzelnen von der API bereitgestellten Datenfelder, nicht das gesamte Funkpaket. Die Geräte-ID ist keine MAC-Adresse.

Aufgezeichnet werden die Ereignisse, die die gewählte Empfangsmethode liefert. Bei der Geräteauswahl ist das nur das gewählte Gerät.

Ein erfolgreicher Scanstart und ein bestätigter Advertisement-Empfang werden getrennt angezeigt. Null empfangene Ereignisse bedeuten nicht zwangsläufig einen Fehler; möglicherweise sendet einfach kein BLE-Gerät in der Nähe. Teste mit einem sendenden BLE-Beacon oder Entwicklungsboard in der Nähe. Gekoppelte Geräte senden nicht immer Advertisements. Prüfe bei Bedarf die Bluetooth-Berechtigungen von Betriebssystem und Browser.

Die Anzeige wird etwa jede Sekunde aktualisiert; die letzten 20 Ereignisse und bis zu 100 zuletzt gesehene Geräte werden im Speicher gehalten. Die Zahl „Mit Hersteller-ID 0x01CE“ ist die Anzahl der Ereignisse mit dieser Hersteller-ID und nicht unbedingt die Anzahl gültiger PICS-Pakete. Synthetische Demodaten sind nie enthalten. „Log löschen“ setzt die Zähler zurück, während der Scan weiterläuft. Nach dem Stoppen bleibt das Log erhalten und wird gelöscht, wenn der Debug-Modus ausgeschaltet, ein neuer Scan oder eine Demo gestartet oder die Seite neu geladen wird. Das Log wird weder extern gesendet noch dauerhaft gespeichert.

## Fehler beim Scanstart unter macOS

1. Prüfe unter „Systemeinstellungen → Bluetooth“, ob Bluetooth eingeschaltet ist.
2. Prüfe unter „Systemeinstellungen → Datenschutz & Sicherheit → Bluetooth“, ob Google Chrome erlaubt ist. Auch wenn Bluetooth am Mac eingeschaltet ist, ist die Berechtigung für Apps davon getrennt. [Anleitung von Apple](https://support.apple.com/de-de/guide/mac-help/mchl211c911f/mac)
3. Wenn du Einstellungen geändert hast, beende Chrome mit `⌘Q`, öffne es erneut und prüfe auch die Einstellung der experimentellen Funktionen.
4. Lass diese Seite sichtbar, drücke „Scan starten“ und erlaube den Scan, ohne den Berechtigungsdialog zu schließen.

Fehler werden mit einer Erklärung in der gewählten Sprache und den „Browser-Details“ angezeigt. `InvalidStateError` bedeutet nicht nur, dass Bluetooth ausgeschaltet ist; der Fehler tritt auch auf, wenn der Berechtigungsdialog abgebrochen wird oder die Seite nicht aktiv ist. [Fehlerdefinitionen in Chromium](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/modules/bluetooth/bluetooth_error.cc)

`User canceled the permission prompt.` wird nicht nur zurückgegeben, wenn der Nutzer den Dialog schließt, sondern auch, wenn Chrome den Berechtigungsdialog nicht erzeugen kann oder Scan-Anfragen sich überschneiden. Allein aus dieser Meldung lässt sich weder ein Abbruch noch eine verweigerte Bluetooth-Berechtigung ableiten. Beende Chrome vollständig, öffne es erneut und versuche es in einem normalen Tab. Erscheint kein Dialog, prüfe die Versionen von macOS und Chrome und ob das offizielle Beispiel denselben Fehler zeigt. [Dialogerzeugung](https://github.com/chromium/chromium/blob/main/content/browser/bluetooth/bluetooth_device_scanning_prompt_controller.cc), [Verarbeitung von Scan-Anfragen](https://github.com/chromium/chromium/blob/main/content/browser/bluetooth/web_bluetooth_service_impl.cc)

Besteht das Problem weiter, notiere die Versionen von macOS und Chrome sowie die vollständigen „Browser-Details“. Mit dem [offiziellen Chrome-Scan-Beispiel](https://googlechrome.github.io/samples/web-bluetooth/scan.html) und der Auswahl „All Advertisements“ lässt sich eingrenzen, ob Scannen auch außerhalb dieser App funktioniert.

Findet Pythons Bleak viele BLE-Geräte und erscheinen Geräte auch im [Device-Info-Beispiel](https://googlechrome.github.io/samples/web-bluetooth/device-info.html), bleibt aber nur der Dialog des vollständigen Scans leer, zeigt das einen Unterschied zwischen normaler Geräteerkennung und `requestLEScan()`. Probiere in diesem Fall „Gerät auswählen und Advertisements beobachten“. Dass die Ursache ein bestimmter Chrome-Fehler ist, lässt sich daraus nicht schließen.

## Angezeigte Inhalte

- Type 0: Bezeichnung der Kreuzung (UTF-8, max. 14 Bytes)
- Type 1: Breiten-/Längengrad (vorzeichenbehaftet 32 Bit, Big Endian, durch 1.000.000 geteilt)
- Type 2: Zustände und Restwerte von bis zu 6 Fußgängerampeln
- Empfangszeit, RSSI, Hex-Dump und dekodiertes JSON des letzten Pakets
- Ampel-Empfangsverlauf der letzten 30 Sekunden (max. 5 Einträge) für die gewählte Kreuzung

Die Hersteller-ID wird als Schlüssel von `manufacturerData` übergeben und ist nicht am Anfang des Werts enthalten. Die Offsets entsprechen `process_pics()` der Python-Version. Ungültige, zu kurze Pakete werden verworfen; Anzahl und Grund werden angezeigt. Bei unbekannten Nachrichtentypen wird nur der gemeinsame Header angezeigt.

Der Ampelzustand sind die unteren 4 Bits mit `0: NoSignal / 1: Red / 2: BlinkGreen / 3: Green / 4: None`. Beim Restwert wird 1 addiert, wenn die oberen 4 Bits 0–7 sind; 8 oder mehr bedeutet unbekannt (`—` auf dem Bildschirm, `-1` im JSON). Das entspricht der Python-Version; es gibt keine Umrechnung in Sekunden und keinen Countdown. Auch die Bezeichnungen „Ost–West“ / „Nord–Süd“ für Ampel 1 und 2 stammen aus der Python-Version; die tatsächlichen Richtungen hängen vom Standort ab.

Pro Kreuzungs-ID werden Name, Position und das letzte Type-2-Paket gespeichert, sodass die Ampelanzeige beim Empfang von Type 0/1 erhalten bleibt. Kommen 5 Sekunden oder länger keine Ampeldaten an, wird „Keine Aktualisierung“ angezeigt; nach dem Stoppen ausdrücklich „zuletzt empfangene Werte“, und das Blinken endet. Entscheide nicht anhand der Werte, ob du die Straße überqueren kannst – achte auf die echte Ampel.

## Demo, Stoppen und Umgang mit Daten

„Demo testen“ erzeugt jede Sekunde fiktive Kreuzungsdaten. Es werden dieselbe Dekodierung und Anzeige wie beim echten Empfang genutzt, eine Bluetooth-Berechtigung wird nicht angefordert. Auch nach dem Stoppen wird weiterhin angezeigt, dass es sich um Demodaten handelt.

„Stopp“, das Ausblenden und das Verlassen der Seite beenden Scan oder Demo. Es gibt keinen automatischen Neustart. Außerdem wird regelmäßig geprüft, ob der Browser den Scan beendet hat. Wird während des Wartens auf die Berechtigung gestoppt, wird ein später erlaubter Scan sofort wieder beendet.

Empfangene Daten werden nur im Speicher des Browsers verarbeitet und weder an externe Server gesendet noch dauerhaft gespeichert (gespeichert wird nur die Sprachauswahl). Beim Neuladen, beim Neustart des Empfangs, beim Wechsel der Empfangsmethode und beim Wechsel zwischen echtem Empfang und Demo werden die Daten gelöscht. Es werden bis zu 100 Kreuzungen gehalten; darüber hinaus wird die zuerst registrierte Kreuzung entfernt. Die bei der Geräteauswahl erteilten Website-Berechtigungen verwaltet der Browser unabhängig vom Empfangslog.

## Aufbau und Tests

- `index.html` / `styles.css`: responsive Oberfläche
- `i18n.mjs`: Übersetzungen der Oberfläche (Japanisch / Englisch / Deutsch)
- `app.mjs`: Steuerung von Empfang, Anzeige, Demo und Sprachwechsel
- `pics.mjs`: Paketdekodierung, Kreuzungsdaten, Verlauf, Erzeugung der Demodaten
- `bluetooth.mjs`: vollständiger Scan und Beobachtung eines gewählten Geräts, Start/Stopp, Abbruch asynchroner Berechtigungsanfragen
- `debug.mjs`: Debug-Aufzeichnung von Empfangsereignissen und Geräteinformationen aller Hersteller (begrenzt)

Mit Node.js 18 oder neuer lassen sich die Tests für Parser, Datenhaltung und Scan-Steuerung ausführen.

```bash
node --test web/tests/*.test.mjs
```

Die automatisierten Tests verwenden synthetische Pakete und Mocks der Bluetooth-API. Echter Advertisement-Empfang, Berechtigungsdialoge des Betriebssystems und die Browseroberfläche müssen separat geprüft werden.
