// Optional in-field sensor: ESP32 + capacitive soil-moisture probe (v1.2) + DHT22.
// Posts a reading every 30 min to POST /api/sensors/ingest with header X-Device-Key.
// Calibrate DRY_RAW / WET_RAW in your own soil (probe in air-dried soil, then saturated) - don't copy these.
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <time.h>

const char* WIFI_SSID = "<ssid>";
const char* WIFI_PASS = "<password>";
const char* API_URL   = "https://<api-url>/api/sensors/ingest";
const char* DEVICE_ID = "esp32-01";
const char* DEVICE_KEY = "<printed by: uv run python -m scripts.admin register-sensor>";

const int SOIL_PIN = 34, DHT_PIN = 4;
int DRY_RAW = 0, WET_RAW = 0;          // set from your calibration
DHT dht(DHT_PIN, DHT22);

void setup() {
  Serial.begin(115200);
  dht.begin();
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  configTime(0, 0, "pool.ntp.org");    // UTC timestamps
}

void loop() {
  int raw = analogRead(SOIL_PIN);
  float pct = (DRY_RAW == WET_RAW) ? NAN : constrain(100.0 * (DRY_RAW - raw) / (DRY_RAW - WET_RAW), 0, 100);
  float t = dht.readTemperature(), h = dht.readHumidity();
  time_t now; time(&now);
  char ts[25]; strftime(ts, sizeof ts, "%Y-%m-%dT%H:%M:%SZ", gmtime(&now));
  if (!isnan(pct)) {
    String body = String("{\"device_id\":\"") + DEVICE_ID + "\",\"soil_moisture_pct\":" + String(pct, 1) +
                  (isnan(t) ? "" : ",\"temp_c\":" + String(t, 1)) + (isnan(h) ? "" : ",\"rh_pct\":" + String(h, 1)) +
                  ",\"ts\":\"" + ts + "\"}";
    HTTPClient http;
    http.begin(API_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Device-Key", DEVICE_KEY);
    Serial.printf("POST %d\n", http.POST(body));
    http.end();
  }
  delay(30UL * 60UL * 1000UL);
}
