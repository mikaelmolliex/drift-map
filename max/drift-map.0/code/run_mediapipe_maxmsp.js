const Max = require("max-api");
const { spawn, exec } = require("child_process");

let tracker = null;

const path = require("path");

const TRACKER_PATH = path.join(
    __dirname,
    "..",
    "dist",
    "doublehand_mp",
    "doublehand_mp"
);

Max.addHandler("camera_on", () => {

    if (tracker)
        return;

    tracker = spawn(TRACKER_PATH);

    tracker.stderr.on("data", (data) => {
        Max.post(data.toString());
    });

    tracker.on("close", () => {
        tracker = null;
    });
});

Max.addHandler("camera_off", () => {

    exec("pkill -f doublehand_mp");

    tracker = null;
});