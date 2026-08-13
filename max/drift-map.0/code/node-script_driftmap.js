const Max = require("max-api");
const { spawn, exec } = require("child_process");

let tracker = null;

const TRACKER_PATH =
"/Volumes/SanDisk_A_2T/DropBox_Cloud/Dropbox/BackUP/PROJET_BackUp/GitHub_Projets/gesturecap2025/dist/doublehand_mp/doublehand_mp";

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