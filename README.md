# Hikvision DVR/NVR Monitoring via ISAPI (Zabbix Template)

A Zabbix **7.4** template for monitoring Hikvision **DVR and NVR** devices using the proprietary **ISAPI** protocol. No agents, no SNMP — just authenticated HTTP calls directly to the device.

---

## Compatibility

Originally created and tested on the **DS-7204HGHI-K1** and **DS-7204HGHI-M1**  (DVR), the template now also supports **NVR** devices, tested on **DS-9632NI-I8**, and any Hikvision hybrid unit that exposes the ISAPI interface.

It covers two types of video input channels:

- **Analog / TVI channels** — discovered via `/ISAPI/System/Video/inputs/channels`
- **IP proxy channels** — discovered via `/ISAPI/ContentMgmt/InputProxy/channels`

Devices that only have one type will simply have an empty discovery for the other. Both discoveries can coexist on hybrid DVR/NVR units.

---

## Requirements

1. On the device, create a dedicated user under:
   - **Account Management**
   - **Network → Advanced Settings → Integration Protocol (ISAPI)**

2. In the template, replace every instance of `YOUR_USERNAME` and `YOUR_PASSWORD` with the credentials of that user.

> All HTTP requests use **Digest Authentication**, which is the ISAPI standard.

---

## What It Monitors

### Device Info
Collected once per hour from `/ISAPI/System/deviceInfo`:

| Item | Key |
|------|-----|
| Device name | `hikvision.dvr.name` |
| Device model | `hikvision.dvr.model` |
| Serial number | `hikvision.dvr.serial` |
| MAC address | `hikvision.dvr.mac` |
| Firmware version | `hikvision.dvr.firmware` |
| Firmware release date | `hikvision.dvr.firmware.date` |

### Network
Collected once per hour from `/ISAPI/System/Network/interfaces`:

| Item | Key |
|------|-----|
| IPv4 address | `hikvision.dvr.net.ipv4` |
| Subnet mask | `hikvision.dvr.net.subnet` |
| Default gateway | `hikvision.dvr.net.gateway` |
| Primary DNS | `hikvision.dvr.net.dns.primary` |
| Secondary DNS | `hikvision.dvr.net.dns.secondary` |
| Interface MTU | `hikvision.dvr.net.mtu` |

### Time
Collected every 5 minutes from `/ISAPI/System/time`:

| Item | Key |
|------|-----|
| Local time (text) | `hikvision.dvr.time.local` |
| Local time (Unix epoch) | `hikvision.dvr.time.epoch` |
| Time mode (NTP / manual) | `hikvision.dvr.time.mode` |
| Time zone | `hikvision.dvr.time.zone` |

### Storage
Collected every minute from `/ISAPI/ContentMgmt/Storage`:

| Item | Key |
|------|-----|
| Storage work mode | `hikvision.dvr.storage.workmode` |
| Per-HDD/NAS: Capacity | `hikvision.hdd.capacity[{#HDD_ID}]` |
| Per-HDD/NAS: Free space | `hikvision.hdd.freespace[{#HDD_ID}]` |
| Per-HDD/NAS: Property | `hikvision.hdd.property[{#HDD_ID}]` |
| Per-HDD/NAS: Status | `hikvision.hdd.status[{#HDD_ID}]` |

Capacity and free space values are returned by the device in **MB** and are multiplied by `1,048,576` so Zabbix stores and displays them in **bytes**.

### Analog / TVI Channels
Discovered from `/ISAPI/System/Video/inputs/channels`:

| Item | Key |
|------|-----|
| Channel name | `hikvision.dvr.channel.name[{#CHID}]` |
| Channel enabled | `hikvision.dvr.channel.enabled[{#CHID}]` |
| Resolution / signal state | `hikvision.dvr.channel.res[{#CHID}]` |
| Recording retention (days) | `hikvision.retention[{#CHID}]` |

### IP Proxy Channels (NVR)
Discovered from `/ISAPI/ContentMgmt/InputProxy/channels`:

| Item | Key |
|------|-----|
| Channel name | `hikvision.ip.name[{#CHID}]` |
| Camera IP address | `hikvision.ip.address[{#CHID}]` |
| Management port | `hikvision.ip.port[{#CHID}]` |
| Protocol | `hikvision.ip.protocol[{#CHID}]` |
| Camera model | `hikvision.ip.model[{#CHID}]` |
| Camera firmware version | `hikvision.ip.firmware[{#CHID}]` |
| Camera serial number | `hikvision.ip.serial[{#CHID}]` |
| Recording retention (days) | `hikvision.ip.retention[{#CHID}]` |

---

## Triggers

| Trigger | Severity | Notes |
|---------|----------|-------|
| DVR has been replaced | Info | Fires when **both** serial number and model change at the same time |
| DVR Firmware has changed | Info | Manual close |
| DVR Time drift > 60 s | Average | **Disabled by default** — enable if your device syncs to NTP |
| HDD/NAS status is not OK | Disaster | Ignores `ok`, `idle`, and `notexist`; auto-recovers when status returns to `ok` |
| Low retention on analog channel | Warning | Fires when retention < `{$RETENTION_MIN_DAYS}` (default: 28.5 days) |
| Low retention on IP channel | Warning | Same threshold, applied to NVR IP proxy channels |
| No video signal on enabled channel | High | Fires when a channel is enabled but reports `NO VIDEO` as its resolution |

---

## Macros

| Macro | Default | Description |
|-------|---------|-------------|
| `{$RETENTION_DAYS}` | `30` | Reference value shown in trigger names and descriptions |
| `{$RETENTION_MIN_DAYS}` | `28.5` | Actual threshold used in trigger expressions |

Using two separate macros lets you display a round number to users while triggering slightly before the hard deadline, to avoid false triggers.

---

## How It Works

### Master Items + Dependent Items

The template is built around a small set of **master items**, HTTP Agent items that poll the ISAPI endpoints directly. All other items are **dependent items** that extract their values from the cached XML or JSON returned by a master item.

```
ISAPI Endpoint (HTTP GET or POST)
        │
        ▼
  Master Item  (raw XML/JSON — history disabled)
        │
        ├── Dependent Item A  ← XPath / JSONPath
        ├── Dependent Item B  ← XPath / JSONPath
        └── Dependent Item C  ← XPath + JavaScript
```

This means the device is queried as few times as possible. The master item's raw response is never stored long-term (history is set to `0`); only the parsed dependent items retain history.

### Master Item Poll Intervals

| Master Item | Endpoint | Interval |
|-------------|----------|----------|
| `hikvision.dvr.system.deviceinfo` | `GET /ISAPI/System/deviceInfo` | 1 h |
| `hikvision.dvr.network.interfaces` | `GET /ISAPI/System/Network/interfaces` | 1 h |
| `hikvision.dvr.storage` | `GET /ISAPI/ContentMgmt/Storage` | Default |
| `hikvision.dvr.system.status` | `GET /ISAPI/System/status` | 30 s |
| `hikvision.dvr.system.time` | `GET /ISAPI/System/time` | 5 min |
| `hikvision.dvr.video.inputs` | `GET /ISAPI/System/Video/inputs/channels` | Default |
| `hikvision.dvr.video.inputs.ip` | `GET /ISAPI/ContentMgmt/InputProxy/channels` | Default |

### XML Parsing with Namespace-Safe XPath

Most dependent items use XPath with `local-name()` to extract values:

```xpath
string(//*[local-name()='firmwareVersion'])
string((//*[local-name()='NetworkInterface'])[1]//*[local-name()='ipAddress'][1])
```

Using `local-name()` instead of referencing elements directly makes the expressions namespace-agnostic. Different Hikvision firmware versions may include or omit XML namespace declarations, and this approach handles both.

### XML → JSON Conversion for Low-Level Discovery

The two video input endpoints return XML, but Zabbix's LLD engine works best with JSON. Before discovery runs, each response goes through two preprocessing steps:

**Step 1 — JavaScript:** Strips all `xmlns="..."` attributes from the XML string. Zabbix's built-in XML-to-JSON converter fails on namespaced XML, so this must be removed first.

```javascript
return value.replace(/xmlns="[^"]+"/g, "");
```

**Step 2 — XML to JSON:** Converts the cleaned XML to a JSON object, which can then be traversed with JSONPath in item prototypes.

### Channel ID Padding (`{#CHID_PADDED}`)

The ISAPI content search endpoint requires a unique `searchID` per request. The template builds this ID by embedding a zero-padded channel number. A JavaScript preprocessing step adds a `{#CHID_PADDED}` macro to each discovered channel:

```javascript
var rawId = data[i].id.toString();
data[i]["{#CHID_PADDED}"] = rawId.length < 2 ? "0" + rawId : rawId;
```

This ensures channel `1` becomes `01` in the search ID, channel `10` stays `10`, and so on.

### How Retention is Calculated

Recording retention is **not** reported directly by the device, it must be derived. For each discovered channel, the template sends a **POST** request to `/ISAPI/ContentMgmt/search` with an XML body that asks for the **earliest recorded segment** on that channel:

```xml
<CMSearchDescription xmlns="http://www.hikvision.com/ver20/XMLSchema">
  <searchID>D9834571-7965-4D46-9524-0000000000{#CHID_PADDED}</searchID>
  <trackList><trackID>{#CHID}01</trackID></trackList>
  <timeSpanList>
    <timeSpan>
      <startTime>2026-01-01T00:00:00Z</startTime>
      <endTime>2035-12-31T23:59:59Z</endTime>
    </timeSpan>
  </timeSpanList>
  <maxResults>1</maxResults>
  ...
</CMSearchDescription>
```

The `startTime` of the oldest result is extracted via XPath, then a JavaScript step computes how many days ago that recording was made:

```javascript
var oldestRecording = new Date(value);
var currentTime = new Date();
var diffInMilliseconds = currentTime.getTime() - oldestRecording.getTime();
var days = diffInMilliseconds / (1000 * 60 * 60 * 24);
return days.toFixed(2);
```

The result is stored in days (as a float), polled once per day, and compared against `{$RETENTION_MIN_DAYS}` in the trigger.

### HDD and NAS Discovery

The HDD discovery rule parses the storage XML response using a JavaScript regex that handles both `<hdd>` and `<nas>` block types in a single pass:

```javascript
var blockPattern = /<(hdd|nas)[^>]*>([\s\S]*?)<\/\1>/g;
```

This allows the same discovery rule to find internal hard drives **and** network-attached storage volumes. The `{#HDD_KIND}` macro (`hdd` or `nas`) records which type each discovered device is, and NAS entries get a prefixed name (`nas1`, `nas2`, ...) to avoid ID collisions with HDDs.

### Unix Epoch Conversion for Time Drift

The device reports its local time as a formatted string (e.g., `2025-04-27T14:32:00+03:00`). To make time-drift detection possible, a JavaScript preprocessing step converts this to a Unix timestamp:

```javascript
var d = new Date(value);
return Math.floor(d.getTime() / 1000);
```

The time-drift trigger then compares this against Zabbix's built-in `now()` function:

```
abs(last(hikvision.dvr.time.epoch) - now()) > 60
```

This trigger is **disabled by default** because many DVRs are not NTP-synced and would generate constant false alerts.

---

## Repository Structure

```
├── template/
│   └── Template_Hikvision_DVR-NVR_ISAPI.yaml   # The Zabbix template (import this)
├── javascript/
│   └── *.js                                      # Standalone copies of the JS preprocessing scripts
└── README.md
```

---

## Setup Summary

1. Import `template/Template_Hikvision_DVR-NVR_ISAPI.yaml` into Zabbix (Configuration → Templates → Import).
2. Create a dedicated ISAPI user on the device (Account Management + ISAPI Integration Protocol).
3. Update `YOUR_USERNAME` and `YOUR_PASSWORD` in the template macros or directly in each HTTP Agent item.
4. Link the template to your host. Set the host's interface to the device IP.
5. Adjust `{$RETENTION_DAYS}` and `{$RETENTION_MIN_DAYS}` per host if your retention targets differ.
6. Optionally enable the **DVR Time drift** trigger if the device is NTP-synced.

---

## Changelog

### [2.0.0] — 2026-04-27
- Added **NVR support**: new Low-Level Discovery rule and item prototypes for IP proxy channels via `/ISAPI/ContentMgmt/InputProxy/channels`
- Added **HDD/NAS discovery**: new Low-Level Discovery rule covering both internal drives and network-attached storage, with capacity, free space, property, and status per device
- Template renamed from `Template_Hikvision_DVR_ISAPI` to `Template_Hikvision_DVR-NVR_ISAPI`
- Tested on **DS-9632NI-I8** (NVR) in addition to existing DVR models

### [1.0.0] — 2026-03-02
- Initial release
- Tested on **DS-7204HGHI-K1** and **DS-7204HGHI-M1** (DVR)
- Device info, network, time, and system status monitoring
- Analog / TVI channel discovery with resolution, enabled state, and recording retention
- Recording retention calculation via ISAPI content search POST
