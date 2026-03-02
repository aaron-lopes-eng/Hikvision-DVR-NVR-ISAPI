# Hikvision DVR Monitoring via ISAPI (Zabbix Template)

A Zabbix template for monitoring various system and channel information from Hikvision DVRs using the proprietary **ISAPI** protocol.

## Compatibility

This template was created and tested on the **DS-7204HGHI-K1**, but it should work on other Hikvision DVR models that support ISAPI.

## Requirements

To use this template:

1. Create a dedicated user in both these fields:
   - **Account Management**
   - **Network → Advanced Settings → Integration Protocol (ISAPI)**

2. Replace all instances of:
   - `YOUR_USERNAME`
   - `YOUR_PASSWORD`

   with the credentials of the user created above.

## How It Works

This template works by:

- Sending **HTTP GET** requests to the DVR's ISAPI endpoints.
- Creating **master items** prefixed with:

  ```
  ISAPI:
  ```

- Parsing the returned XML data.
- Creating **dependent items** by extracting specific values from the XML response.

This approach reduces the number of HTTP requests and improves efficiency by relying on dependent items instead of multiple direct HTTP calls.

## Low-Level Discovery (LLD)

For per-channel information (such as):

- Channel enabled/disabled status  
- Resolution  
- Retention days  (default trigger is < 30 days)

A **Low-Level Discovery (LLD)** rule is used.

The discovery process works by:

- Sending an **HTTP POST** request to the ISAPI endpoint.
- Including an **XML body** in the request.
- Using a **unique `searchID` for each channel** to properly retrieve channel-specific data.

This allows the template to:

- Automatically detect the number of available channels
- Query each channel individually
- Dynamically create monitoring items per channel

The use of POST with structured XML ensures accurate channel-level data retrieval directly from the DVR.
