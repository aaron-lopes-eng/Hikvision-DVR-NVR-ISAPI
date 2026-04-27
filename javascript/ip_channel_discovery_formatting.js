// At this point, 'value' is already the array of channels due to the JSONPath
var data = JSON.parse(value);

// Ensure data is treated as an array to avoid errors if only one channel exists
if (!Array.isArray(data)) {
    data = [data];
}

for (var i = 0; i < data.length; i++) {
    // 1. Ensure the ID is a string for Zabbix processing
    var rawId = String(data[i].id);
    data[i]["{#CHID}"] = rawId;

    // 2. Create the Padded ID (e.g., "9" -> "09", "10" -> "10")
    // This maintains compatibility with your search ID requirements
    data[i]["{#CHID_PADDED}"] = rawId.length < 2 ? "0" + rawId : rawId;
}

return JSON.stringify(data);