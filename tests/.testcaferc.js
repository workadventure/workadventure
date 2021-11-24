const BROWSER = process.env.BROWSER || "chrome --use-fake-device-for-media-stream";

module.exports = {
  "browsers": BROWSER,
  "hostname": "localhost",
  //"skipJsErrors": true,
  "src": "tests/",
  "screenshots": {
    "path": "screenshots/",
    "takeOnFails": true,
    "thumbnails": false,
  }
}
