var result = [];
var blockPattern = /<(hdd|nas)[^>]*>([\s\S]*?)<\/\1>/g;
var fieldPattern = /<(\w+)>(.*?)<\/\1>/g;
var match;

while ((match = blockPattern.exec(value)) !== null) {
    var blockType = match[1];
    var block = match[2];
    var fields = {};
    var field;

    fieldPattern.lastIndex = 0;
    while ((field = fieldPattern.exec(block)) !== null) {
        fields[field[1]] = field[2];
    }

    result.push({
        '{#HDD_ID}': fields['id'],
        '{#HDD_NAME}': blockType === 'nas' ? 'nas' + fields['id'] : fields['hddName'],
        '{#HDD_TYPE}': blockType === 'nas' ? fields['nasType'] : fields['hddType'],
        '{#HDD_KIND}': blockType
    });
}

return JSON.stringify(result);