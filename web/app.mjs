import {
  MANUFACTURER_ID, STALE_AFTER_MS, signalLabel, processPics, hexDump,
  updateIntersection, recentHistory, demoPackets,
} from './pics.mjs';
import { AdvertisementScanner, DeviceAdvertisementWatcher, scanErrorMessage } from './bluetooth.mjs?v=20261101-2';
import { LANGUAGES, DEFAULT_LANGUAGE, t, setLanguage, getLanguage, locale, matchLanguage } from './i18n.mjs';
import { AdvertisementDiagnostics } from './debug.mjs';

const $ = id => document.getElementById(id);
const intersections = new Map();
const diagnostics = new AdvertisementDiagnostics();
const LANGUAGE_STORAGE_KEY = 'pics-viewer-language';
const makeTimeFormat = () => new Intl.DateTimeFormat(locale(), {
  hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3,
  hourCycle: 'h23',
});
let timeFormat = makeTimeFormat();

// Priority: ?lang= parameter, saved choice, browser languages, Japanese.
function initialLanguage() {
  const requested = new URLSearchParams(window.location.search).get('lang');
  if (requested && Object.hasOwn(LANGUAGES, requested)) return requested;
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved && Object.hasOwn(LANGUAGES, saved)) return saved;
  } catch {
    // Storage may be unavailable (private mode, blocked site data).
  }
  return matchLanguage(navigator.languages ?? [navigator.language]) ?? DEFAULT_LANGUAGE;
}
setLanguage(initialLanguage());

// Static texts live in index.html with data-i18n attributes. HTML variants
// only contain fixed markup from i18n.mjs, never received data.
function translatePage() {
  document.documentElement.lang = getLanguage();
  for (const element of document.querySelectorAll('[data-i18n]')) element.textContent = t(element.dataset.i18n);
  for (const element of document.querySelectorAll('[data-i18n-html]')) element.innerHTML = t(element.dataset.i18nHtml);
  for (const element of document.querySelectorAll('[data-i18n-aria]')) element.setAttribute('aria-label', t(element.dataset.i18nAria));
  for (const element of document.querySelectorAll('[data-i18n-content]')) element.setAttribute('content', t(element.dataset.i18nContent));
  $('language').value = getLanguage();
}
translatePage();
const scanSupported = window.isSecureContext && typeof navigator.bluetooth?.requestLEScan === 'function';
const watchSupported = window.isSecureContext && typeof navigator.bluetooth?.requestDevice === 'function'
  && typeof window.BluetoothDevice?.prototype.watchAdvertisements === 'function';
const requestedMethod = new URLSearchParams(window.location.search).get('mode');
if (requestedMethod === 'watch' || requestedMethod === 'scan') {
  $('reception-method').value = requestedMethod;
} else if (!scanSupported && watchSupported) {
  $('reception-method').value = 'watch';
}
const watchingDevice = () => $('reception-method').value === 'watch';
const picsOnly = () => $('watch-target').value === 'pics';
const supported = () => watchingDevice() ? watchSupported : scanSupported;
let mode = 'idle';
let selectedId = '';
let packetCount = 0;
let invalidCount = 0;
let demoTimer = null;
let demoStep = 0;
let demoData = false;
let lastInvalidMessage = '';

const signalCards = Array.from({ length: 6 }, (_, index) => {
  const card = document.createElement('article');
  card.className = 'signal';
  // Only fixed markup is used here. All received values are assigned via textContent.
  card.innerHTML = '<h3 class="signal-heading"></h3><div class="signal-body"><span class="lamp" aria-hidden="true"></span><div><span class="signal-state"></span><p class="remaining"></p></div></div>';
  $('signals').append(card);
  return {
    card,
    heading: card.querySelector('.signal-heading'),
    state: card.querySelector('.signal-state'),
    remaining: card.querySelector('.remaining'),
  };
});

function renderSignalHeadings() {
  for (const [index, { heading }] of signalCards.entries()) {
    const direction = index < 2 ? ` · ${t(['monitor.eastWest', 'monitor.northSouth'][index])}` : '';
    heading.textContent = `${t('monitor.signal', { n: index + 1 })}${direction}`;
  }
}
renderSignalHeadings();

function updateCompatibility() {
  const api = watchingDevice() ? 'requestDevice / watchAdvertisements' : 'requestLEScan';
  $('watch-notice').hidden = !watchingDevice();
  $('watch-target-control').hidden = !watchingDevice();
  $('watch-notice').textContent = t(picsOnly() ? 'watch.notice.pics' : 'watch.notice.all');
  if (!window.isSecureContext) {
    $('compatibility').textContent = t('compat.insecure');
  } else if (!supported()) {
    $('compatibility').textContent = t('compat.unsupported', { api });
  } else {
    $('compatibility').textContent = t('compat.detected', { api });
  }
}
updateCompatibility();

function setMode(next) {
  mode = next;
  $('mode').dataset.mode = mode;
  const method = watchingDevice() ? 'watch' : 'scan';
  $('mode').textContent = t(mode === 'scanning' ? `mode.scanning.${method}` : `mode.${mode}`);
  $('start').textContent = t(`controls.start.${method}`);
  $('start').disabled = !supported() || mode === 'scanning' || mode === 'requesting';
  $('reception-method').disabled = mode !== 'idle';
  $('watch-target').disabled = mode !== 'idle';
  $('demo').disabled = mode === 'demo' || mode === 'requesting';
  $('stop').disabled = mode === 'idle';
  $('status').textContent = {
    idle: () => t('status.idle'),
    requesting: () => (watchingDevice()
      ? t('status.requesting.watch', { target: t(picsOnly() ? 'status.requesting.targetPics' : 'status.requesting.targetAll') })
      : t('status.requesting.scan')),
    scanning: () => (watchingDevice()
      ? t('status.scanning.watch', { name: receiver().device?.name || t('debug.noName') })
      : t('status.scanning.scan')),
    demo: () => t('status.demo'),
  }[mode]();
  render();
}

const receiverCallbacks = {
  onState: setMode,
  onAdvertisement(event) {
    if ($('debug-enabled').checked) diagnostics.record(event);
    const data = event.manufacturerData?.get(MANUFACTURER_ID);
    if (!data) return;
    receive(data, {
      deviceName: event.name || event.device?.name || '',
      rssi: Number.isFinite(event.rssi) ? event.rssi : null,
    });
  },
};
const receivers = {
  scan: new AdvertisementScanner(navigator.bluetooth, receiverCallbacks),
  watch: new DeviceAdvertisementWatcher(navigator.bluetooth, receiverCallbacks),
};
const receiver = () => receivers[$('reception-method').value];

function resetData(isDemo = false) {
  demoData = isDemo;
  intersections.clear();
  selectedId = '';
  packetCount = 0;
  invalidCount = 0;
  diagnostics.clear();
  $('error').hidden = true;
  updateOptions();
  render();
}

function receive(raw, metadata) {
  try {
    const info = processPics(raw);
    const id = info.intersection_id;
    // Bound memory even if many distinct intersections are observed during a session.
    if (!intersections.has(id) && intersections.size >= 100) {
      const oldest = intersections.keys().next().value;
      intersections.delete(oldest);
      if (selectedId === oldest) selectedId = '';
    }
    const previous = intersections.get(id);
    const entry = updateIntersection(previous, info, raw, Date.now(), metadata);
    intersections.set(id, entry);
    packetCount++;
    if (!selectedId) selectedId = id;
    if (!previous || previous.identifier !== entry.identifier) updateOptions();
    render();
  } catch (error) {
    invalidCount++;
    lastInvalidMessage = error.message;
    $('invalid-count').textContent = t('packet.invalidLatest', { count: invalidCount, message: error.message });
  }
}

function updateOptions() {
  const options = Array.from(intersections, ([id, entry]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = entry.identifier ? `${entry.identifier} / ${id}` : id;
    return option;
  });
  if (!options.length) {
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = t('monitor.waiting');
    options.push(placeholder);
  }
  $('intersection').replaceChildren(...options);
  $('intersection').value = selectedId;
  $('intersection').disabled = intersections.size === 0;
}

function formatRemaining(signal) {
  return !signal || signal.remaining_time < 0 ? '—' : String(signal.remaining_time);
}

function render() {
  $('demo-notice').hidden = !demoData;
  const entry = intersections.get(selectedId);
  const now = Date.now();
  const running = mode === 'scanning' || mode === 'demo';
  const hasSignals = entry?.signalTimestamp != null;
  const stale = hasSignals && (!running || now - entry.signalTimestamp >= STALE_AFTER_MS);
  $('signals').classList.toggle('is-stale', Boolean(stale));
  $('freshness').classList.toggle('stale', Boolean(stale));
  $('freshness').textContent = hasSignals
    ? t('freshness.line', {
      state: t(stale ? (running ? 'freshness.noUpdates' : 'freshness.stopped') : 'freshness.live'),
      time: timeFormat.format(entry.signalTimestamp),
      age: Math.max(0, Math.floor((now - entry.signalTimestamp) / 1000)),
    })
    : t('monitor.waitingType2');

  for (const [index, { card, state, remaining }] of signalCards.entries()) {
    const signal = entry?.pedestrian_signals?.[index];
    card.dataset.state = signal?.signal_state ?? '';
    state.textContent = signal ? signalLabel(signal.signal_state) : t('monitor.notReceived');
    remaining.textContent = t('monitor.remaining', { value: formatRemaining(signal) });
  }
  $('intersection-name').textContent = entry
    ? (entry.identifier || entry.deviceName || t('monitor.intersectionFallback', { id: selectedId }))
    : t('monitor.waitingInfo');
  $('coordinates').textContent = entry?.latitude != null && entry?.longitude != null
    ? `${entry.latitude.toFixed(6)}, ${entry.longitude.toFixed(6)}` : t('monitor.noPosition');
  $('received-at').textContent = entry ? timeFormat.format(entry.timestamp) : '—';
  $('message-type').textContent = entry ? `Type ${entry.latest.message_type} / ID ${entry.latest.message_id}` : '—';
  $('rssi').textContent = entry?.rssi != null ? `${entry.rssi} dBm` : '—';
  $('packet-count').textContent = String(packetCount);
  $('raw').textContent = entry ? hexDump(entry.raw) : t('packet.none');
  $('parsed').textContent = entry ? JSON.stringify(entry.latest, null, 2) : '{}';
  $('invalid-count').textContent = invalidCount
    ? t('packet.invalidLatest', { count: invalidCount, message: lastInvalidMessage })
    : t('packet.invalid', { count: 0 });
  renderHistory(entry, now);
  renderDebug(now);
}

function renderDebug(now = Date.now()) {
  const enabled = $('debug-enabled').checked;
  $('debug-panel').hidden = !enabled;
  if (!enabled) return;
  const { count, picsCount, lastTimestamp, devices, events } = diagnostics;
  $('debug-count').textContent = String(count);
  $('debug-devices').textContent = String(devices.size);
  $('debug-pics-count').textContent = String(picsCount);
  const age = lastTimestamp == null ? null : Math.max(0, Math.floor((now - lastTimestamp) / 1000));
  $('debug-last').textContent = lastTimestamp == null ? '—' : `${timeFormat.format(lastTimestamp)} · ${t('time.secondsAgo', { age })}`;
  let status;
  if (mode === 'demo') {
    status = t('debug.status.demo');
  } else if (!supported()) {
    status = t('debug.status.unsupported');
  } else if (mode === 'requesting') {
    status = t(watchingDevice() ? 'debug.status.requesting.watch' : 'debug.status.requesting.scan');
  } else if (mode === 'scanning' && count === 0) {
    status = t(watchingDevice() ? 'debug.status.waiting.watch' : 'debug.status.waiting.scan');
  } else if (mode === 'scanning') {
    status = age < 5
      ? t('debug.status.received')
      : t('debug.status.quiet', { age });
  } else {
    status = count
      ? t('debug.status.stoppedWithLog')
      : t('debug.status.stoppedEmpty');
  }
  $('debug-status').textContent = status;
  $('debug-status').dataset.received = String(mode === 'scanning' && count > 0 && age < 5);
  const rows = Array.from(devices.values()).reverse().map(device => {
    const row = document.createElement('tr');
    const values = [
      timeFormat.format(device.timestamp), device.name,
      device.rssi == null ? '—' : `${device.rssi} dBm`,
      device.manufacturerData.map(data => data.companyIdentifier).join(', ') || t('debug.none'),
      String(device.count),
    ];
    values.forEach((value, index) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      if (index === 1) {
        cell.className = 'device-name';
        const id = document.createElement('small');
        id.textContent = device.deviceId;
        cell.append(id);
      }
      row.append(cell);
    });
    return row;
  });
  if (!rows.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.className = 'empty';
    cell.textContent = t(count ? 'debug.noDeviceIdEvents' : 'debug.noBle');
    row.append(cell);
    rows.push(row);
  }
  $('debug-device-list').replaceChildren(...rows);
  $('debug-log').textContent = events.length
    ? JSON.stringify(events.slice().reverse().map(event => ({ ...event, receivedAt: timeFormat.format(event.timestamp) })), null, 2)
    : t('debug.noAdvertisements');
}

function renderHistory(entry, now) {
  const entries = recentHistory(entry?.history ?? [], now).reverse();
  const rows = entries.map(item => {
    const row = document.createElement('tr');
    const values = [timeFormat.format(item.timestamp), ...item.signals.slice(0, 2).map(signal => signalLabel(signal.signal_state))];
    while (values.length < 3) values.push(t('monitor.notReceived'));
    values.push(`${formatRemaining(item.signals[0])} / ${formatRemaining(item.signals[1])}`);
    values.forEach((value, index) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      if (index === 1 || index === 2) {
        cell.className = 'state-label';
        cell.dataset.state = item.signals[index - 1]?.signal_state ?? '';
      }
      row.append(cell);
    });
    return row;
  });
  if (!rows.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.className = 'empty';
    cell.textContent = t('history.emptyRecent');
    row.append(cell);
    rows.push(row);
  }
  $('history').replaceChildren(...rows);
}

function stopReception(message) {
  clearInterval(demoTimer);
  demoTimer = null;
  receiver().stop();
  if (message) $('status').textContent = message;
}

$('start').addEventListener('click', async () => {
  if (!supported() || mode === 'requesting' || mode === 'scanning') return;
  stopReception();
  resetData();
  try {
    // Called directly in this click handler to preserve transient user activation.
    await receiver().start({ picsOnly: picsOnly() });
  } catch (error) {
    $('error').textContent = scanErrorMessage(error);
    $('error').hidden = false;
  }
});

$('demo').addEventListener('click', () => {
  stopReception();
  resetData(true);
  demoStep = 0;
  setMode('demo');
  const tick = () => {
    for (const packet of demoPackets(demoStep++)) receive(packet, { deviceName: t('demo.deviceName'), rssi: null });
  };
  tick();
  demoTimer = setInterval(tick, 1000);
});
$('stop').addEventListener('click', () => stopReception());
function receptionSettingsChanged() {
  resetData(demoData);
  updateCompatibility();
  setMode(mode);
}
$('reception-method').addEventListener('change', receptionSettingsChanged);
$('watch-target').addEventListener('change', receptionSettingsChanged);
$('debug-enabled').addEventListener('change', () => {
  diagnostics.clear();
  // Remove rendered data as well when disabling diagnostics.
  $('debug-device-list').replaceChildren();
  $('debug-log').textContent = t('debug.noAdvertisements');
  renderDebug();
});
$('debug-clear').addEventListener('click', () => {
  diagnostics.clear();
  renderDebug();
});
$('intersection').addEventListener('change', event => {
  selectedId = event.target.value;
  render();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && mode !== 'idle') stopReception(t('status.hidden'));
});
window.addEventListener('pagehide', () => stopReception());
setInterval(() => {
  if (mode === 'scanning' && receiver().scan && !receiver().scan.active) {
    stopReception(t('status.browserStopped'));
  }
  render();
}, 1000);
$('language').addEventListener('change', event => {
  setLanguage(event.target.value);
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, getLanguage());
  } catch {
    // The choice still applies to this page view.
  }
  timeFormat = makeTimeFormat();
  // Status messages from events (errors, stop reasons) are not re-rendered,
  // so the current mode message is regenerated in the new language.
  translatePage();
  renderSignalHeadings();
  updateCompatibility();
  setMode(mode);
  if (mode === 'idle' && !packetCount && !demoData) $('status').textContent = t('status.initial');
});
setMode('idle');
$('status').textContent = t('status.initial');
