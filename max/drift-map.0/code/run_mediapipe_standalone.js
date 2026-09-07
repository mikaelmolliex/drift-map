const Max = require("max-api");
const { spawn, exec } = require("child_process");
const path = require("path");
const fs = require("fs");

let tracker = null;

const TRACKER_PATH = path.join(
    "/Applications",
    "DriftMap.app",
    "Contents",
    "Resources",
    "tracker",
    "doublehand_mp",
    "doublehand_mp"
);

Max.post("Tracker path:");
Max.post(TRACKER_PATH);

Max.post(
    "Tracker exists: " +
    fs.existsSync(TRACKER_PATH)
);

Max.addHandler("camera_on", () => {

    if (tracker) {
        Max.post("Tracker already running");
        return;
    }

    Max.post("Starting MediaPipe tracker...");

    tracker = spawn(TRACKER_PATH);

    tracker.stdout.on("data", (data) => {
        Max.post(data.toString());
    });

    tracker.stderr.on("data", (data) => {
        Max.post(data.toString());
    });

    tracker.on("close", (code) => {
        Max.post("Tracker stopped. Exit code: " + code);
        tracker = null;
    });

    tracker.on("error", (err) => {
        Max.post("Tracker launch error:");
        Max.post(err.toString());
        tracker = null;
    });
});

Max.addHandler("camera_off", () => {

    Max.post("Stopping MediaPipe tracker...");

    if (tracker) {
        try {
            tracker.kill("SIGTERM");
        } catch (e) {}
    }

    exec("pkill -f doublehand_mp");

    tracker = null;
});