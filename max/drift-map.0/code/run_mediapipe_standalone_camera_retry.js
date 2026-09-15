const Max = require("max-api");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const TRACKER_PATH = path.join(
    "/Applications",
    "DriftMap.app",
    "Contents",
    "Resources",
    "tracker",
    "doublehand_mp",
    "doublehand_mp"
);

// The retry window is intended for the first macOS camera authorization.
// OpenCV can take tens of seconds to report that the first capture failed,
// so camera-related diagnostics are detected explicitly instead of relying
// only on the process runtime.
const PERMISSION_WAIT_MS = 60000;
const RETRY_DELAY_MS = 3000;
const EARLY_EXIT_MS = 5000;
const STABLE_RUN_MS = 30000;
const CAMERA_FAILURE_PATTERNS = [
    /not authorized to capture video/i,
    /camera failed to properly initialize/i,
    /could not open webcam/i,
    /failed list devices.*avfoundation/i
];

let tracker = null;
let cameraRequested = false;
let permissionDeadline = 0;
let retryTimer = null;
let stableTimer = null;
let launchNumber = 0;
let nodeIsShuttingDown = false;

function postStatus(status, detail) {
    Max.outlet("tracker_status", status, detail || "");
}

function clearTimer(timer) {
    if (timer) {
        clearTimeout(timer);
    }
    return null;
}

function terminateTrackerGroup(child, signal) {
    if (!child) {
        return;
    }

    const stopSignal = signal || "SIGTERM";

    // The tracker is spawned as the leader of a dedicated Unix process group.
    // Signalling the negative PID stops its PyInstaller worker processes too.
    if (child.pid) {
        try {
            process.kill(-child.pid, stopSignal);
            return;
        } catch (error) {
            if (error.code !== "ESRCH") {
                Max.post(
                    "Tracker process-group stop error: " + error.toString()
                );
            }
        }
    }

    try {
        child.kill(stopSignal);
    } catch (error) {
        if (error.code !== "ESRCH") {
            Max.post("Tracker stop error: " + error.toString());
        }
    }
}

function trackerIsExecutable() {
    if (!fs.existsSync(TRACKER_PATH)) {
        Max.post("Tracker does not exist: " + TRACKER_PATH);
        postStatus("error", "tracker_missing");
        return false;
    }

    try {
        fs.accessSync(TRACKER_PATH, fs.constants.X_OK);
        return true;
    } catch (error) {
        Max.post("Tracker is not executable: " + TRACKER_PATH);
        Max.post(error.toString());
        postStatus("error", "tracker_not_executable");
        return false;
    }
}

function stopWaiting(reason) {
    retryTimer = clearTimer(retryTimer);
    stableTimer = clearTimer(stableTimer);
    cameraRequested = false;
    permissionDeadline = 0;
    postStatus("stopped", reason || "stopped");
}

function scheduleRetry() {
    if (!cameraRequested || tracker || retryTimer) {
        return;
    }

    const remaining = permissionDeadline - Date.now();

    if (remaining <= 0) {
        Max.post(
            "Camera startup timed out. Check System Settings > " +
            "Privacy & Security > Camera, then toggle Camera On again."
        );
        stopWaiting("camera_timeout");
        return;
    }

    const delay = Math.min(RETRY_DELAY_MS, remaining);
    Max.post(
        "Tracker stopped before the camera became available. " +
        "Retrying in " + Math.ceil(delay / 1000) + " seconds..."
    );
    postStatus("waiting", "camera_permission");

    retryTimer = setTimeout(() => {
        retryTimer = null;
        startTracker();
    }, delay);
}

function startTracker() {
    if (!cameraRequested || tracker) {
        return;
    }

    if (Date.now() >= permissionDeadline) {
        scheduleRetry();
        return;
    }

    if (!trackerIsExecutable()) {
        stopWaiting("tracker_unavailable");
        return;
    }

    launchNumber += 1;
    const startedAt = Date.now();
    let finished = false;
    let cameraFailureDetected = false;
    let diagnosticText = "";

    Max.post("Starting MediaPipe tracker (attempt " + launchNumber + ")...");
    postStatus("starting", String(launchNumber));

    const child = spawn(TRACKER_PATH, [], {
        cwd: path.dirname(TRACKER_PATH),
        detached: true,
        stdio: ["ignore", "pipe", "pipe"]
    });

    tracker = child;

    stableTimer = setTimeout(() => {
        stableTimer = null;

        if (
            cameraRequested &&
            tracker === child &&
            !cameraFailureDetected
        ) {
            Max.post("MediaPipe tracker is running.");
            postStatus("running", "");
        }
    }, STABLE_RUN_MS);

    function handleOutput(data) {
        const message = data.toString().trimEnd();

        if (!message) {
            return;
        }

        diagnosticText = (diagnosticText + "\n" + message).slice(-8192);

        if (
            !cameraFailureDetected &&
            CAMERA_FAILURE_PATTERNS.some((pattern) =>
                pattern.test(diagnosticText)
            )
        ) {
            cameraFailureDetected = true;
            Max.post(
                "Camera authorization/startup failure detected. " +
                "The tracker will be restarted after it exits."
            );
            postStatus("waiting", "camera_permission");
        }

        Max.post(message);
    }

    child.stdout.on("data", (data) => {
        handleOutput(data);
    });

    child.stderr.on("data", (data) => {
        handleOutput(data);
    });

    function finish(kind, value, fatalLaunchError) {
        if (finished) {
            return;
        }
        finished = true;

        const runtime = Date.now() - startedAt;
        stableTimer = clearTimer(stableTimer);

        if (tracker === child) {
            tracker = null;
        }

        // A PyInstaller parent can exit while one of its camera or inference
        // workers remains alive. Clean up the complete process group.
        terminateTrackerGroup(child, "SIGTERM");

        Max.post(
            "Tracker " + kind + ". " + value +
            " (runtime " + runtime + " ms)"
        );

        if (!cameraRequested) {
            return;
        }

        if (fatalLaunchError) {
            stopWaiting("tracker_launch_error");
            return;
        }

        if (cameraFailureDetected) {
            scheduleRetry();
            return;
        }

        if (runtime < EARLY_EXIT_MS) {
            scheduleRetry();
            return;
        }

        Max.post(
            "Tracker stopped after starting successfully. " +
            "Toggle Camera On again to restart it."
        );
        stopWaiting("tracker_stopped");
    }

    child.on("error", (error) => {
        Max.post("Tracker launch error: " + error.toString());
        finish(
            "could not be launched",
            error.code || error.message,
            true
        );
    });

    child.on("close", (code, signal) => {
        const detail = signal
            ? "signal " + signal
            : "exit code " + String(code);
        finish("stopped", detail);
    });
}

Max.post("Tracker path:");
Max.post(TRACKER_PATH);
Max.post("Tracker exists: " + fs.existsSync(TRACKER_PATH));

Max.addHandler("camera_on", () => {
    if (tracker) {
        Max.post("Tracker already running.");
        postStatus("running", "already_running");
        return;
    }

    if (cameraRequested && retryTimer) {
        Max.post("Tracker is already waiting for camera access.");
        postStatus("waiting", "camera_permission");
        return;
    }

    cameraRequested = true;
    permissionDeadline = Date.now() + PERMISSION_WAIT_MS;
    launchNumber = 0;
    startTracker();
});

Max.addHandler("camera_off", () => {
    Max.post("Stopping MediaPipe tracker...");

    cameraRequested = false;
    permissionDeadline = 0;
    retryTimer = clearTimer(retryTimer);
    stableTimer = clearTimer(stableTimer);

    const child = tracker;
    tracker = null;

    terminateTrackerGroup(child, "SIGTERM");

    postStatus("stopped", "camera_off");
});

function prepareNodeShutdown() {
    if (nodeIsShuttingDown) {
        return;
    }

    nodeIsShuttingDown = true;
    cameraRequested = false;
    permissionDeadline = 0;
    retryTimer = clearTimer(retryTimer);
    stableTimer = clearTimer(stableTimer);

    const child = tracker;
    tracker = null;
    terminateTrackerGroup(child, "SIGTERM");
}

process.once("SIGTERM", () => {
    prepareNodeShutdown();
    process.exit(0);
});

process.once("SIGINT", () => {
    prepareNodeShutdown();
    process.exit(0);
});

process.once("SIGHUP", () => {
    prepareNodeShutdown();
    process.exit(0);
});

process.on("exit", () => {
    prepareNodeShutdown();
});
