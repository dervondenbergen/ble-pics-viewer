# ble-pics-viewer

[日本語](README.md) | **English** | [Deutsch](README.de.md)

This program receives and visualises the BLE advertisements of **Advanced PICS (Pedestrian Information and Communication System)** that are broadcast by traffic signal controllers at intersections. It shows the signal states received via BLE scanning (red / green / flashing green etc.) in real time.

## What is Advanced PICS (Pedestrian Information and Communication System)?
- An information and communication system to support pedestrians
- The information can be obtained with the "信GO！" (Shin-GO!) app for iOS / Android
- Because it uses BLE advertisements, it can also be received by BLE devices other than smartphones
    - [信号の時刻表をつくる 2025 (1/2) :: デイリーポータルZ](https://dailyportalz.jp/kiji/shingo-jikokuhyo2025) (Japanese)
- The locations of Advanced PICS traffic signals are published on the e-Gov data portal as [高度化PICS整備交差点_csv](https://data.e-gov.go.jp/data/dataset/npa_20221124_0054/resource/6f7e83e1-be28-4030-961f-3b489c9f6ad8) (Japanese)

## Prerequisites
- Set up a Python environment
  - Tested with Python 3.14.0
- Install the following packages with pip
```bash
pip install pyyaml bleak
```

## Run
```bash
python ble-pics-viewer.py
```

## Demo
https://github.com/user-attachments/assets/71077409-656c-471e-b071-970c37c89461

## Web Bluetooth version

Public URL: [Open the Web Bluetooth version](https://dervondenbergen.github.io/ble-pics-viewer/web/)

The `web` directory contains a version that runs in the browser. No additional libraries or build steps are required. The user interface is available in Japanese, English and German (language picker at the top right).

```bash
python3 -m http.server 8000 --bind 127.0.0.1 --directory web
```

Open <http://localhost:8000>. Real reception requires a Chrome build that supports the experimental Web Bluetooth advertisement APIs, with experimental features enabled. You can switch between `requestLEScan`, which receives all nearby advertisements, and `watchAdvertisements`, which watches one selected device. Regular Web Bluetooth support alone is not enough to receive advertisements. There is also a demo that lets you try the UI without Bluetooth.

For supported environments, settings, the decoding specification and how to run the tests, see [web/README.en.md](web/README.en.md).

## Legal Notice

The PICS BLE advertisement signals that this program receives are **public radio transmissions sent to an unspecified number of recipients** by public infrastructure such as traffic signals. They contain no personally identifiable information and no confidential communication content, and therefore do not fall under "secrecy of communications" or "personal information" as protected by the following Japanese laws.

- Radio Act, Article 109 (secrecy of communications)
  - Protects the secrecy of radio communications addressed to specific parties. Receiving radio communications broadcast to the public (such as BLE beacons) does not fall under this provision.
- Telecommunications Business Act, Article 4 (secrecy of communications)
  - Protects the secrecy of communications handled by telecommunications carriers. Receiving BLE advertisements, which are one-way broadcasts, does not fall under this provision.
- Act on the Protection of Personal Information
  - The data received and decoded by this program contains no information that can identify an individual (name, address, device identifiers etc.) and is therefore not "personal information", "personal data" or an "individual identification code" as defined by this act.

In addition, this program is **receive-only**: it contains no functionality whatsoever to transmit, modify, retransmit or interfere with signals.

*This translation is provided for convenience; the Japanese [README.md](README.md) is the original.*
