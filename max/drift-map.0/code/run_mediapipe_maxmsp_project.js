const Max = require("max-api");
const { spawn } = require("child_process");
const path = require("path");

let tracker = null;

const TRACKER_PATH = path.resolve(
    __dirname,
    "..",
    "..",
    "..",
    "tracker",
    "doublehand_mp",
    "doublehand_mp"
);

Max.addHandler("camera_on", () => {
    if (tracker)
        return;

    tracker = spawn(TRACKER_PATH, [], {
        detached: process.platform !== "win32"
    });

    tracker.stderr.on("data", (data) => {
        Max.post(data.toString());
    });

    tracker.on("close", () => {
        tracker = null;
        Max.post("MediaPipe tracker stopped");
    });

    tracker.on("error", (error) => {
        Max.post("Tracker error: " + error.message);
        tracker = null;
    });
});

Max.addHandler("camera_off", () => {
    if (!tracker)
        return;

    try {
        if (process.platform === "win32") {
            tracker.kill("SIGTERM");
        } else {
            process.kill(-tracker.pid, "SIGTERM");
        }
    } catch (error) {
        Max.post("Could not stop tracker group: " + error.message);
        tracker.kill("SIGTERM");
    }

    // Keep the reference until the "close" event confirms termination.
});