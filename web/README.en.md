# PICS Viewer — Web Bluetooth edition

[日本語](README.md) | **English** | [Deutsch](README.de.md)

Receives and visualises Advanced PICS BLE advertisements in the browser. No library installation or build step is required.

## Start

Run the following in the repository root.

```bash
python3 -m http.server 8000 --bind 127.0.0.1 --directory web
```

Open <http://localhost:8000> in your browser. When using static hosting, serve the page over HTTPS. Opening it directly via `file://` does not work because ES modules cannot be loaded, so use an HTTP server.

## Language

The UI is available in Japanese, English and German. Use the language picker at the top right. The choice is stored in the browser (`localStorage`). Without a stored choice, the browser language is used, falling back to Japanese. You can also open the page with `?lang=ja`, `?lang=en` or `?lang=de`.

## Receiving with a real device

There are two reception methods. Both only receive advertisements; no GATT connection is made.

- **Scan all nearby advertisements**: uses the experimental Web Bluetooth Scanning API (`navigator.bluetooth.requestLEScan`).
- **Pick a device and watch its advertisements**: watches one device selected with `requestDevice()` using the experimental `watchAdvertisements()`. You can try it as an alternative if the full scan does not work.

1. Use a Chrome build that supports the scanning API. According to the official [implementation status](https://github.com/whatwg/bluetooth/blob/main/implementation-status.md) it is available experimentally on macOS / Android. Regular Web Bluetooth support alone does not guarantee that it works.
2. Enable `chrome://flags/#enable-experimental-web-platform-features` and restart Chrome. Depending on OS, browser version and adapter, scanning may still not work after enabling it.
3. Turn on Bluetooth on the device and allow the browser to access Bluetooth in the OS.
4. Open the page, press "Start scan" and grant the browser's scan permission.
5. Wait near an Advanced PICS traffic signal. If several intersections are received, you can switch between them with the selector at the top right of the monitor.

The page shows whether the API of the selected method is available. In unsupported environments the start button is disabled, but the demo can still be used. Even if the API exists, the platform may not implement it; start errors are also shown on screen. Real reception in Safari / Firefox is not supported.

Like the [official Chrome scan sample](https://googlechrome.github.io/samples/web-bluetooth/scan.html), the app receives repeatedly with `requestLEScan({ acceptAllAdvertisements: true, keepRepeatedDevices: true })` and decodes `manufacturerData.get(0x01CE)` of `advertisementreceived` as PICS. The permission covers all nearby advertisements. Data from other manufacturers is normally discarded and only kept and displayed for reception checks when debug mode is enabled. No GATT connection, reads/writes or control of traffic signals take place. This is not an API for requesting passive scanning at the radio level.

### Using the device selection method

Add `?mode=watch` to the URL to open the page with the device selection method preselected. The version shown at the bottom of the page is `2026.11.01.6`. In this mode the top notice shows `requestDevice / watchAdvertisements detected` and the start button shows "Pick device and watch". If the old notice "scan API detected" appears, an outdated page or script is loaded; check that the deployment has been updated and reload. Versioned URLs are used for the HTML and changed scripts/CSS to prevent different versions being mixed by the cache.

1. While stopped, change "Reception method" to "Pick a device and watch its advertisements".
2. To find a PICS device on site, keep the default target "PICS candidates (0x01CE)". To check reception with an ordinary BLE device, change it to "All devices (reception test)" and turn on "Debug mode".
3. Press "Pick device and watch", choose one device in Chrome's chooser and confirm.
4. Check that the number of received events in the debug panel increases. A device merely appearing in the chooser does not confirm advertisement reception.

The app uses the same API as the [official Chrome advertisement watch sample](https://googlechrome.github.io/samples/web-bluetooth/watch-advertisements.html). With "PICS candidates", `requestDevice({ filters: [{ manufacturerData: [{ companyIdentifier: 0x01CE }] }], optionalManufacturerData: [0x01CE] })` narrows candidates by the advertised manufacturer ID rather than by name. Even if the name is "Unknown or Unsupported Device", there is no need to guess names and search among all devices. Other devices with the same manufacturer ID may also be candidates, so after selecting, check that an intersection ID and signal information are received. If no candidates appear, it has not yet been confirmed whether the advertisement is visible in the browser on a Mac. "All devices" omits `filters` and uses `acceptAllDevices: true` instead. [Official Chrome description of manufacturer data filters](https://developer.chrome.com/docs/capabilities/bluetooth#manufacturer-data-filter)

Both request access to PICS manufacturer data and receive `advertisementreceived` events of the selected device. Watching is stopped via the AbortSignal of `watchAdvertisements({ signal })`. No GATT connection or reads/writes are performed.

Only the selected device can be watched; this is not equivalent to a full scan. It cannot be used if the PICS device does not appear in the chooser. Devices that stop advertising after selection will not increase the received count. With the target "All devices", debug mode lets you check non-PICS devices by name, RSSI and event count, but since manufacturer data permission is only requested for `0x01CE`, raw data from other manufacturers is not exposed. Service data may also be omitted depending on permissions.

In user tests, PICS information was obtained on Android with the full scan, and advertisements of a selected ordinary BLE device were received on a Mac. On a Mac the full scan did not work even at a PICS location. Identifying PICS devices and receiving their data on a Mac still needs to be verified on site. These are results from the tested environments and do not guarantee operation on all Android devices or Macs.

## Checking the scan where there is no PICS signal

1. Turn on "Debug mode".
2. Press "Start scan" and grant permission. You can also turn it on while a scan is running.
3. Check the "BLE scan reception check" panel. If the number of received events increases and "BLE advertisement reception confirmed" is shown, real BLE reception works.

Debug mode records all advertisement events, including non-PICS ones. Events without manufacturer or service data are counted too. The device list shows name, the browser's device ID, RSSI, manufacturer IDs, count and last reception time. The detailed log shows hex dumps of manufacturer and service data, service UUIDs and transmit power (if provided by the API). The raw data consists of the individual data fields exposed by the API, not the whole radio packet. The device ID is not a MAC address.

Recorded are the events returned by the selected reception method. With the device selection method only the selected device is recorded.

A successful scan start and confirmed advertisement reception are shown separately. Zero received events does not necessarily mean failure; there may simply be no advertising BLE devices nearby. Check with an advertising BLE beacon or development board nearby. Paired devices do not always advertise. Check the OS and browser Bluetooth permissions if necessary.

The display updates about once per second and keeps the latest 20 events and up to 100 recently seen devices in memory. The "Containing manufacturer ID 0x01CE" count is the number of events containing this manufacturer ID and not necessarily the number of valid PICS packets. Synthetic demo data is never included. "Clear log" resets the counts while scanning continues. After stopping, the log is kept and is cleared when debug mode is turned off, when a new scan or demo is started, or on reload. The log is never sent externally or stored persistently.

## If an error occurs when starting a scan on macOS

1. Check that Bluetooth is on in "System Settings → Bluetooth".
2. Check that Google Chrome is allowed in "System Settings → Privacy & Security → Bluetooth". Even if Bluetooth is on for the Mac, app permission is separate. [Apple's instructions](https://support.apple.com/guide/mac-help/mchl211c911f/mac)
3. If you changed settings, quit Chrome with `⌘Q`, reopen it and also check the experimental features setting.
4. Keep this page visible, press "Start scan" and allow the scan without closing the permission dialog.

Errors show a localised explanation together with "Browser details". `InvalidStateError` does not only mean Bluetooth is off; it is also used when the permission dialog is cancelled or the page is not active. [Chromium error definitions](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/modules/bluetooth/bluetooth_error.cc)

`User canceled the permission prompt.` is returned not only when the user closes the dialog, but also when Chrome cannot create the permission dialog or when scan requests overlap. This message alone does not prove a cancel action or a denied Bluetooth permission. Quit Chrome completely, reopen it and try in a normal tab. If no dialog appears, check the macOS and Chrome versions and whether the official sample shows the same error. [Dialog creation](https://github.com/chromium/chromium/blob/main/content/browser/bluetooth/bluetooth_device_scanning_prompt_controller.cc), [scan request handling](https://github.com/chromium/chromium/blob/main/content/browser/bluetooth/web_bluetooth_service_impl.cc)

If the problem persists, note the macOS and Chrome versions and the full "Browser details". Running the [official Chrome scan sample](https://googlechrome.github.io/samples/web-bluetooth/scan.html) with "All Advertisements" selected helps determine whether scanning works outside this app.

If Python's Bleak detects many BLE devices and devices also appear in the [Device Info sample](https://googlechrome.github.io/samples/web-bluetooth/device-info.html), but only the full scan dialog stays empty, this shows a difference between normal device discovery and `requestLEScan()`. In that case try "Pick a device and watch its advertisements". It cannot be concluded that the cause is a specific Chrome bug.

## What is displayed

- Type 0: identifying name of the intersection (UTF-8, up to 14 bytes)
- Type 1: latitude / longitude (signed 32-bit, big endian, divided by 1,000,000)
- Type 2: pedestrian signal states and remaining values for up to 6 signals
- Reception time, RSSI, hex dump and decoded JSON of the latest packet
- Signal reception history of the last 30 seconds (up to 5 entries) for the selected intersection

The manufacturer ID is passed as the key of `manufacturerData` and is not included at the start of the value. Decoding offsets are the same as `process_pics()` in the Python version. Invalid short packets are discarded and their count and reason are shown. For unknown message types only the common header is shown.

The signal state is the lower 4 bits interpreted as `0: NoSignal / 1: Red / 2: BlinkGreen / 3: Green / 4: None`. For the remaining value, 1 is added if the upper 4 bits are 0–7; 8 or more means unknown (`—` on screen, `-1` in JSON). This follows the Python version; no conversion assuming seconds and no countdown is performed. The "east–west" / "north–south" labels of signals 1 and 2 also follow the Python version; actual directions depend on the installation site.

Name, position and the last Type 2 are kept per intersection ID, so the signal display stays when Type 0/1 is received. If no signal data is received for 5 seconds or more, "No updates" is shown; after stopping, "last received values" is shown explicitly and blinking stops. Do not decide whether it is safe to cross from the signal values; check the actual signal.

## Demo, stopping and data handling

"Try demo" generates fictional intersection data every second. It uses the same decoding and display as real reception and does not request Bluetooth permission. It keeps indicating demo data after stopping.

"Stop", hiding the page and leaving the page stop the scan or demo. There is no automatic restart. The app also periodically checks whether the browser ended the scan. If stopped while waiting for permission, a scan granted later is stopped immediately.

Received data is processed only in browser memory and never sent to external servers or stored persistently (only the language choice is stored). Data is cleared on reload, when reception is newly started, when the reception method is changed, and when switching between real reception and demo. Up to 100 intersections are kept; beyond that, the earliest registered intersection is removed. Site access permissions granted during device selection are managed by the browser, separately from the reception log.

## Structure and testing

- `index.html` / `styles.css`: responsive UI
- `i18n.mjs`: UI translations (Japanese / English / German)
- `app.mjs`: reception, display and demo control, language switching
- `pics.mjs`: packet decoding, intersection state, history, demo data generation
- `bluetooth.mjs`: full scan and watching a selected device, start/stop, cancellation of asynchronous permission requests
- `debug.mjs`: debug recording of received events and device information from all manufacturers (bounded)

With Node.js 18 or later you can run tests for the parser, state handling and scan control.

```bash
node --test web/tests/*.test.mjs
```

The automated tests use synthetic packets and mocks of the Bluetooth API. Real advertisement reception, OS permission dialogs and the browser UI need to be checked separately.
