// 'value' is the dynamic date string coming from your XPath (e.g., the oldest recording)
var oldestRecording = new Date(value);
var currentTime = new Date();

// Calculate the difference in milliseconds between 'now' and the 'oldest recording'
var diffInMilliseconds = currentTime.getTime() - oldestRecording.getTime();

// Convert milliseconds to days
var days = diffInMilliseconds / (1000 * 60 * 60 * 24);

// Return the result as a number with 2 decimal places
return days.toFixed(2);
