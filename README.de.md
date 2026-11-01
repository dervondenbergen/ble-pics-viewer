# ble-pics-viewer

[日本語](README.md) | [English](README.en.md) | **Deutsch**

Dieses Programm empfängt und visualisiert die BLE-Advertisements von **Advanced PICS (Pedestrian Information and Communication System)**, die von Ampelsteuergeräten an Kreuzungen gesendet werden. Es zeigt die per BLE-Scan empfangenen Ampelzustände (Rot / Grün / Grün blinkend usw.) in Echtzeit an.

## Was ist Advanced PICS (Informations- und Kommunikationssystem zur Fußgängerunterstützung)?
- Ein Informations- und Kommunikationssystem zur Unterstützung von Fußgängern
- Die Informationen lassen sich mit der App „信GO！“ (Shin-GO!) für iOS / Android abrufen
- Da BLE-Advertisements verwendet werden, können sie auch mit anderen BLE-Geräten als Smartphones empfangen werden
    - [信号の時刻表をつくる 2025 (1/2) :: デイリーポータルZ](https://dailyportalz.jp/kiji/shingo-jikokuhyo2025) (Japanisch)
- Die Standorte der Advanced-PICS-Ampeln werden im e-Gov-Datenportal als [高度化PICS整備交差点_csv](https://data.e-gov.go.jp/data/dataset/npa_20221124_0054/resource/6f7e83e1-be28-4030-961f-3b489c9f6ad8) veröffentlicht (Japanisch)

## Vorbereitung
- Richte eine Python-Umgebung ein
  - Getestet mit Python 3.14.0
- Installiere die folgenden Pakete mit pip
```bash
pip install pyyaml bleak
```

## Starten
```bash
python ble-pics-viewer.py
```

## Demo
https://github.com/user-attachments/assets/71077409-656c-471e-b071-970c37c89461

## Web-Bluetooth-Version

Öffentliche URL: [Web-Bluetooth-Version öffnen](https://yumu19.github.io/ble-pics-viewer/web/)

Im Verzeichnis `web` gibt es eine Version, die im Browser läuft. Zusätzliche Bibliotheken oder ein Build-Schritt sind nicht nötig. Die Oberfläche ist auf Japanisch, Englisch und Deutsch verfügbar (Sprachauswahl oben rechts).

```bash
python3 -m http.server 8000 --bind 127.0.0.1 --directory web
```

Öffne <http://localhost:8000>. Für echten Empfang wird ein Chrome benötigt, der die experimentellen Web-Bluetooth-APIs für Advertisements unterstützt, und die experimentellen Funktionen müssen aktiviert sein. Du kannst zwischen `requestLEScan`, das alle Advertisements in der Umgebung empfängt, und `watchAdvertisements`, das ein ausgewähltes Gerät beobachtet, wechseln. Normale Web-Bluetooth-Unterstützung allein reicht für den Empfang von Advertisements nicht aus. Außerdem gibt es eine Demo, mit der sich die Oberfläche ohne Bluetooth ausprobieren lässt.

Unterstützte Umgebungen, Einstellungen, die Dekodierungsspezifikation und das Ausführen der Tests sind in [web/README.de.md](web/README.de.md) beschrieben.

## Rechtlicher Hinweis (Legal Notice)

Die PICS-BLE-Advertisement-Signale, die dieses Programm empfängt, sind **öffentliche Funkaussendungen an eine unbestimmte Vielzahl von Empfängern**, die von öffentlicher Infrastruktur wie Ampelanlagen gesendet werden. Sie enthalten weder personenbezogene Daten noch vertrauliche Kommunikationsinhalte und fallen daher nicht unter das „Kommunikationsgeheimnis“ oder die „personenbezogenen Informationen“, die durch die folgenden japanischen Gesetze geschützt sind.

- Funkgesetz (電波法), Artikel 109 (Kommunikationsgeheimnis)
  - Schützt das Geheimnis von Funkkommunikation, die an bestimmte Empfänger gerichtet ist. Der Empfang von an die Allgemeinheit gesendeter Funkkommunikation (z. B. BLE-Beacons) fällt nicht unter diese Vorschrift.
- Telekommunikationsgesetz (電気通信事業法), Artikel 4 (Kommunikationsgeheimnis)
  - Schützt das Geheimnis der von Telekommunikationsanbietern übermittelten Kommunikation. Der Empfang von BLE-Advertisements als einseitige Broadcast-Kommunikation fällt nicht unter diese Vorschrift.
- Gesetz zum Schutz personenbezogener Informationen (個人情報保護法)
  - Die von diesem Programm empfangenen und dekodierten Daten enthalten keine Informationen, mit denen sich Personen identifizieren lassen (Name, Adresse, Gerätekennungen usw.), und sind daher keine „personenbezogenen Informationen“, „personenbezogenen Daten“ oder „persönlichen Identifikationscodes“ im Sinne dieses Gesetzes.

Außerdem ist dieses Programm **reiner Empfänger (receive-only)** und enthält keinerlei Funktionen, um Signale zu senden, zu verändern, erneut auszusenden oder zu stören.

*Diese Übersetzung dient der Information; maßgeblich ist das japanische Original [README.md](README.md).*
