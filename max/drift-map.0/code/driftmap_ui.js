/* DriftMap JSUI -- visualisation only, plus questionnaire interactions.
 * Business logic, controls and persistent state belong to Max and
 * driftmap_controller.js. Compatible with Max classic [jsui] (ES5).
 */

autowatch = 1;
inlets = 1;
outlets = 1;

mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;

include("driftmap_theme.js");

var JSUI_WIDTH = 1489;
var JSUI_HEIGHT = 542;
var LOGICAL_WIDTH = JSUI_WIDTH;
var LOGICAL_HEIGHT = JSUI_HEIGHT;
var LEARN_EMPTY_RATIO = 0.30;
var LEARN_VISUAL_RATIO = 0.70;
var EXPLORE_MAP_SIZE = 320;
var LEARN_MAP_SIZE = 380;
var LEARN_MAP_TOP = 90;
var LEARN_MAP_SHIFT_X = 50;
var DEFAULT_CURSOR_SIZE = 14;
var THUMBS_UP_RESOURCE = "thumbs-up.svg";
var THUMBS_DOWN_RESOURCE = "thumbs-down.svg";
var canvasTransform = {scale: 1, x: 0, y: 0};

var viewState = {
    mainView: "explore",
    mappingMode: "auto",
    screen: "idle",
    modelState: "empty",
    modelBypass: false,
    showModelReady: false,
    showMapPoints: true,
    showExplorePoints: true,
    showLearnPoints: true,
    showExploreMap: false,
    showLearnMap: true,

    position: [0.5, 0.5, 0.5, 0.5],
    positionValid: false,
    points: [],
    pendingPoint: null,
    patternColorIndices: {},
    nextPatternColorIndex: 0,
    datasetSize: 0,
    autoPoints: 50,
    mappingCurrent: 0,
    mappingTotal: 50,
    mappingComplete: false,
    creatingMapFeedbackActive: false,
    creatingMapDuration: 12000,
    creatingMapStartFrame: 0,

    currentPattern: 0,
    patternReady: false,
    questionnaireCurrentIndex: 0,
    questionnaireCurrentPattern: 0,
    questionnaireTotal: 0,
    questionnaireComplete: false,
    answeredCount: 0,
    answers: [],

    audioLevel: 0,
    reduceMotion: false,
    frame: 0,
    leftCursorSize: DEFAULT_CURSOR_SIZE,
    rightCursorSize: DEFAULT_CURSOR_SIZE,
    orbSize: 330,
    mapRoundness: 14,
    buttonRoundness: 12,
    mapBorderWidth: 2,
    mapFrameStyle: "corners",
    mapPointSize: 6,
    mapPointColorMode: 1,

    questionButtonWidth: 250,
    questionButtonHeight: 58,
    questionTextSize: 15,
    questionIconSize: 24,
    cancelButtonWidth: 120,
    cancelButtonHeight: 30,
    cancelTextSize: 12,
    bulletSize: 4,
    bulletGap: 30,
    bulletSelectedBorderWidth: 1.8,
    bulletSelectedPadding: 4,
    statusTextSize: 22,
    smallTextSize: 8,

    leftLabel: "LEFT",
    rightLabel: "RIGHT",
    creatingMapLabel: "CREATING MAP",
    trainingLabel: "THE MODEL IS TRAINING…",
    readyLabel: "MODEL IS READY",
    cancelLabel: "CANCEL",
    likeLabel: "LIKE",
    dislikeLabel: "DISLIKE",

    fitRound: 0,
    maxFitRounds: 40,
    currentLoss: null,
    bestLoss: null,
    plateau: 0,
    patience: 4,
    errorCode: "",
    statusAvailable: 0,
    statusRequired: 2,
    debugHitboxes: false,
    debugMouseX: 0,
    debugMouseY: 0
};

var controls = [];
var hoveredControl = "";
var pressedControl = "";
var focusedControl = "";
var projectResourceCache = {};
var animationTask = null;
var pressedReleaseTask = null;

function anything() {
    receiveMessage(messagename, arrayfromargs(arguments));
}

function list() {
    var args = arrayfromargs(arguments);
    if (args.length > 0) {
        receiveMessage(String(args[0]), args.slice(1));
    }
}

/* `error` is a native Max JS function name, so intercept the selector explicitly. */
function error() {
    receiveMessage("error", arrayfromargs(arguments));
}

/* Dedicated selectors prevent Max from treating position as a box command. */
function position() {
    receiveLiveCoordinates(arrayfromargs(arguments));
}

function coordinates() {
    receiveLiveCoordinates(arrayfromargs(arguments));
}

function view() {
    setMainView(arrayfromargs(arguments)[0]);
    updateAnimation();
    mgraphics.redraw();
}

function explore() {
    setMainView("explore");
    updateAnimation();
    mgraphics.redraw();
}

function learn() {
    setMainView("learn");
    updateAnimation();
    mgraphics.redraw();
}

function receiveLiveCoordinates(args) {
    var next = normalizedCoordinates(args, 0);
    if (next === null) {
        return false;
    }
    viewState.position = next;
    viewState.positionValid = true;
    mgraphics.redraw();
    return true;
}

function receiveMessage(name, args) {
    var numeric;
    if (name === "position" || name === "coordinates") {
        receiveLiveCoordinates(args);
        return;
    }
    if (DRIFTMAP_COLOR_MESSAGES[name]) {
        applyThemeColor(name, args);
    } else if (name === "resetcolors" || name === "resettheme") {
        resetThemeColors();
    } else if (name === "view") {
        setMainView(args[0]);
    } else if (name === "explore" || name === "learn") {
        setMainView(name);
    } else if (name === "uipage") {
        setMainView(String(args[0]) === "params" ? "learn" : "explore");
    } else if (name === "mode") {
        setMappingMode(args[0]);
    } else if (name === "state") {
        setScreen(String(args[0] || "idle"));
    } else if (name === "overlay") {
        setOverlayScreen(args[0]);
    } else if (name === "modelstate") {
        setModelState(args[0]);
    } else if (name === "modelbypass") {
        viewState.modelBypass = Number(args[0]) !== 0;
    } else if (name === "showmappoints") {
        viewState.showMapPoints = Number(args[0]) !== 0;
        viewState.showExplorePoints = viewState.showMapPoints;
        viewState.showLearnPoints = viewState.showMapPoints;
    } else if (name === "showexplorepoints") {
        viewState.showExplorePoints = Number(args[0]) !== 0;
    } else if (name === "showlearnpoints") {
        viewState.showLearnPoints = Number(args[0]) !== 0;
    } else if (name === "showexploremap") {
        viewState.showExploreMap = Number(args[0]) !== 0;
    } else if (name === "showlearnmap") {
        viewState.showLearnMap = Number(args[0]) !== 0;
    } else if (name === "leftcursorsize") {
        viewState.leftCursorSize = boundedNumber(args[0], viewState.leftCursorSize, 4, 80);
    } else if (name === "rightcursorsize") {
        viewState.rightCursorSize = boundedNumber(args[0], viewState.rightCursorSize, 4, 80);
    } else if (name === "cursorsize") {
        numeric = boundedNumber(args[0], viewState.leftCursorSize, 4, 80);
        viewState.leftCursorSize = numeric;
        viewState.rightCursorSize = numeric;
    } else if (name === "orbsize") {
        viewState.orbSize = boundedNumber(args[0], viewState.orbSize, 120, 430);
    } else if (name === "maproundness") {
        viewState.mapRoundness = boundedNumber(args[0], viewState.mapRoundness, 0, 60);
    } else if (name === "buttonroundness" || name === "roundedcorner") {
        viewState.buttonRoundness = boundedNumber(args[0], viewState.buttonRoundness, 0, 30);
    } else if (name === "mapborderwidth") {
        viewState.mapBorderWidth = boundedNumber(args[0], viewState.mapBorderWidth, 0, 12);
    } else if (name === "mapframestyle") {
        setMapFrameStyle(args[0]);
    } else if (name === "mappointsize") {
        viewState.mapPointSize = boundedNumber(args[0], viewState.mapPointSize, 2, 30);
    } else if (name === "mappointcolormode") {
        numeric = Number(args[0]);
        if (numeric === 1 || numeric === 2 || numeric === 3 || numeric === 4) {
            viewState.mapPointColorMode = numeric;
        }
    } else if (name === "questionbuttonwidth") {
        viewState.questionButtonWidth = boundedNumber(args[0], viewState.questionButtonWidth, 120, 360);
    } else if (name === "questionbuttonheight") {
        viewState.questionButtonHeight = boundedNumber(args[0], viewState.questionButtonHeight, 34, 90);
    } else if (name === "questiontextsize") {
        viewState.questionTextSize = boundedNumber(args[0], viewState.questionTextSize, 8, 28);
    } else if (name === "questioniconsize") {
        viewState.questionIconSize = boundedNumber(args[0], viewState.questionIconSize, 8, 48);
    } else if (name === "cancelbuttonwidth") {
        viewState.cancelButtonWidth = boundedNumber(args[0], viewState.cancelButtonWidth, 60, 240);
    } else if (name === "cancelbuttonheight") {
        viewState.cancelButtonHeight = boundedNumber(args[0], viewState.cancelButtonHeight, 20, 60);
    } else if (name === "canceltextsize") {
        viewState.cancelTextSize = boundedNumber(args[0], viewState.cancelTextSize, 7, 22);
    } else if (name === "bulletsize") {
        viewState.bulletSize = boundedNumber(args[0], viewState.bulletSize, 2, 14);
    } else if (name === "bulletgap") {
        viewState.bulletGap = boundedNumber(args[0], viewState.bulletGap, 8, 60);
    } else if (name === "bulletselectedborderwidth") {
        viewState.bulletSelectedBorderWidth = boundedNumber(args[0], viewState.bulletSelectedBorderWidth, 0, 8);
    } else if (name === "bulletselectedpadding") {
        viewState.bulletSelectedPadding = boundedNumber(args[0], viewState.bulletSelectedPadding, 0, 12);
    } else if (name === "statustextsize") {
        viewState.statusTextSize = boundedNumber(args[0], viewState.statusTextSize, 8, 36);
    } else if (name === "smalltextsize") {
        viewState.smallTextSize = boundedNumber(args[0], viewState.smallTextSize, 6, 24);
    } else if (name === "leftlabel" || name === "rightlabel" ||
            name === "creatingmaplabel" || name === "traininglabel" ||
            name === "readylabel" || name === "cancellabel" ||
            name === "likelabel" || name === "dislikelabel") {
        setUiLabel(name, args);
    } else if (name === "reduce_motion") {
        viewState.reduceMotion = Number(args[0]) !== 0;
    } else if (name === "audiolevel") {
        numeric = Number(args[0]);
        if (isFinite(numeric)) {
            viewState.audioLevel = clip01(numeric);
        }
    } else if (name === "debughitboxes") {
        viewState.debugHitboxes = Number(args[0]) !== 0;
    } else if (name === "questionnaire_reset") {
        receiveQuestionnaireReset();
    } else if (name === "questionnaire_total") {
        viewState.questionnaireTotal = Math.max(0, Number(args[0]) || 0);
        ensureUiAnswers(viewState.questionnaireTotal);
    } else if (name === "questionnaire_progress") {
        receiveQuestionnaireProgress(args);
    } else if (name === "questionnaire_bank_end") {
        viewState.questionnaireComplete = true;
        viewState.questionnaireTotal = Math.max(0, Number(args[0]) ||
            viewState.questionnaireTotal);
        ensureUiAnswers(viewState.questionnaireTotal);
    } else if (name === "answer_saved") {
        receiveAnswerSaved(args);
        viewState.patternReady = false;
    } else if (name === "pattern_loading") {
        viewState.currentPattern = positiveNumber(args[0], 0);
        viewState.patternReady = false;
        pressedControl = "";
    } else if (name === "pattern_ready") {
        viewState.currentPattern = positiveNumber(args[0], 0);
        viewState.patternReady = true;
    } else if (name === "point_writing") {
        receivePointWriting(args);
    } else if (name === "point_added") {
        receivePointAdded(args);
    } else if (name === "dataset_points") {
        viewState.datasetSize = Math.max(0, Number(args[0]) || 0);
    } else if (name === "mapping_progress") {
        viewState.mappingCurrent = Math.max(0, Number(args[0]) || 0);
        viewState.mappingTotal = Math.max(1, Number(args[1]) || viewState.autoPoints);
        viewState.mappingComplete = Number(args[2]) !== 0;
    } else if (name === "creating_map_feedback") {
        viewState.creatingMapFeedbackActive = Number(args[0]) !== 0;
        viewState.creatingMapDuration = Math.max(1000,
            Number(args[1]) || viewState.creatingMapDuration);
        if (viewState.creatingMapFeedbackActive) {
            viewState.creatingMapStartFrame = viewState.frame;
        }
    } else if (name === "dataset_cleared" || name === "map_cleared") {
        clearVisualDataset();
    } else if (name === "auto_points") {
        viewState.autoPoints = positiveNumber(args[0], viewState.autoPoints);
        viewState.mappingTotal = viewState.autoPoints;
    } else if (name === "fit_started") {
        viewState.fitRound = Math.max(0, Number(args[0]) || 0);
        viewState.maxFitRounds = Math.max(1, Number(args[1]) || viewState.maxFitRounds);
    } else if (name === "fit_result") {
        receiveFitResult(args);
    } else if (name === "loss") {
        viewState.currentLoss = finiteOrNull(args[0]);
    } else if (name === "training_started") {
        if (String(args[1] || "from_scratch") === "from_scratch") {
            resetTrainingMetrics();
        } else {
            viewState.fitRound = 0;
            viewState.plateau = 0;
        }
        viewState.modelState = "training";
    } else if (name === "training_done") {
        if (args.length > 2) {
            viewState.bestLoss = finiteOrNull(args[2]);
        }
        viewState.modelState = "ready";
    } else if (name === "model_reset") {
        viewState.modelState = "empty";
        resetTrainingMetrics();
    } else if (name === "not_enough_patterns" || name === "not_enough_likes") {
        viewState.statusAvailable = Math.max(0, Number(args[0]) || 0);
        viewState.statusRequired = Math.max(1, Number(args[1]) || 2);
    } else if (name === "error") {
        viewState.errorCode = String(args[0] || "unknown");
        if (viewState.errorCode === "training_error") {
            viewState.modelState = "failed";
        }
    } else if (name === "event" && String(args[0] || "") === "dataset_cleared") {
        clearVisualDataset();
    }
    updateAnimation();
    mgraphics.redraw();
}

function setMainView(value) {
    var next = String(value || "").toLowerCase();
    if (next === "play") {
        next = "explore";
    } else if (next === "params") {
        next = "learn";
    }
    if (next === "explore" || next === "learn") {
        viewState.mainView = next;
    }
}

function setMappingMode(value) {
    var next = String(value || "auto").toLowerCase();
    if (next === "auto" || next === "semi" || next === "free") {
        viewState.mappingMode = next;
    }
}

function setOverlayScreen(value) {
    var next = String(value || "none").toLowerCase();
    viewState.showModelReady = next === "model_ready";
    if (next === "creating_map") {
        viewState.screen = "auto_building";
    } else if (next === "questionnaire" || next === "training" ||
            next === "not_enough_patterns" || next === "not_enough_likes" ||
            next === "error") {
        viewState.screen = next;
    } else if (next === "model_ready" || next === "none") {
        viewState.screen = "idle";
    }
}

function setScreen(value) {
    var next = String(value || "idle");
    if (next === "auto") {
        next = "idle";
    } else if (next === "semi" || next === "free") {
        next = "idle";
    } else if (next === "ready") {
        next = "idle";
    }
    viewState.screen = next;
}

function setModelState(value) {
    var next = String(value || "").toLowerCase();
    if (next === "train_to_start") {
        next = "empty";
    }
    if (next === "empty" || next === "training" || next === "ready" || next === "failed") {
        viewState.modelState = next;
    }
}

function receivePointWriting(args) {
    var coordinates = normalizedCoordinates(args, 1);
    var patternId;
    if (coordinates === null) {
        return;
    }
    patternId = Math.max(0, Number(args[0]) || 0);
    viewState.pendingPoint = {
        patternId: patternId,
        colorIndex: colorIndexForPattern(patternId),
        freePoint: viewState.mappingMode === "free",
        left: [coordinates[0], coordinates[1]],
        right: [coordinates[2], coordinates[3]],
        createdFrame: viewState.frame
    };
}

function receivePointAdded(args) {
    var coordinates = normalizedCoordinates(args, 2);
    var id = String(args[0] || "");
    var patternId = Math.max(0, Number(args[1]) || 0);
    var i;
    if (!id || coordinates === null) {
        return;
    }
    for (i = viewState.points.length - 1; i >= 0; i -= 1) {
        if (viewState.points[i].id === id) {
            viewState.points.splice(i, 1);
        }
    }
    viewState.points.push({
        id: id,
        patternId: patternId,
        colorIndex: colorIndexForPattern(patternId),
        freePoint: viewState.mappingMode === "free",
        left: [coordinates[0], coordinates[1]],
        right: [coordinates[2], coordinates[3]],
        createdFrame: viewState.frame
    });
    viewState.pendingPoint = null;
    viewState.datasetSize = Math.max(viewState.datasetSize, viewState.points.length);
}

function clearVisualDataset() {
    viewState.points = [];
    viewState.pendingPoint = null;
    viewState.patternColorIndices = {};
    viewState.nextPatternColorIndex = 0;
    viewState.datasetSize = 0;
    viewState.mappingCurrent = 0;
    viewState.mappingTotal = viewState.autoPoints;
    viewState.mappingComplete = false;
}

function colorIndexForPattern(patternId) {
    var key = String(Math.max(0, Number(patternId) || 0));
    if (!viewState.patternColorIndices.hasOwnProperty(key)) {
        viewState.patternColorIndices[key] = viewState.nextPatternColorIndex % 5;
        viewState.nextPatternColorIndex += 1;
    }
    return viewState.patternColorIndices[key];
}

function receiveFitResult(args) {
    viewState.fitRound = Math.max(0, Number(args[0]) || 0);
    viewState.currentLoss = finiteOrNull(args[1]);
    viewState.bestLoss = finiteOrNull(args[2]);
    viewState.plateau = Math.max(0, Number(args[4]) || 0);
    viewState.patience = Math.max(1, Number(args[5]) || viewState.patience);
}

function resetTrainingMetrics() {
    viewState.fitRound = 0;
    viewState.currentLoss = null;
    viewState.bestLoss = null;
    viewState.plateau = 0;
}

function receiveQuestionnaireReset() {
    viewState.currentPattern = 0;
    viewState.patternReady = false;
    viewState.questionnaireCurrentIndex = 0;
    viewState.questionnaireCurrentPattern = 0;
    viewState.questionnaireTotal = 0;
    viewState.questionnaireComplete = false;
    viewState.answeredCount = 0;
    viewState.answers = [];
    pressedControl = "";
}

function receiveQuestionnaireProgress(args) {
    var currentIndex = Math.max(0, Number(args[0]) || 0);
    var total = Math.max(0, Number(args[1]) || 0);
    viewState.questionnaireCurrentIndex = currentIndex;
    viewState.answeredCount = Math.max(0, Number(args[2]) || 0);
    viewState.questionnaireTotal = total;
    viewState.questionnaireComplete = Number(args[3]) !== 0;
    ensureUiAnswers(total);
}

function receiveAnswerSaved(args) {
    var patternId = Math.max(0, Number(args[0]) || 0);
    var value = Number(args[1]);
    var position = args.length > 2 ? Math.max(0, Number(args[2]) || 0) : patternId;
    ensureUiAnswers(viewState.questionnaireTotal);
    if (position >= 1 && position <= viewState.answers.length && (value === 0 || value === 1)) {
        viewState.answers[position - 1] = value;
    }
    viewState.answeredCount = countUiAnswers();
}

function ensureUiAnswers(total) {
    var nextTotal = Math.max(0, Number(total) || 0);
    var next = [];
    var i;
    for (i = 0; i < nextTotal; i += 1) {
        next.push(i < viewState.answers.length ? viewState.answers[i] : -1);
    }
    viewState.answers = next;
}

function countUiAnswers() {
    var count = 0;
    var i;
    for (i = 0; i < viewState.answers.length; i += 1) {
        if (viewState.answers[i] !== -1) {
            count += 1;
        }
    }
    return count;
}

function updateAnimation() {
    var animated = !viewState.reduceMotion &&
        (viewState.screen === "questionnaire" || viewState.screen === "auto_building" ||
        viewState.screen === "training" || viewState.showModelReady ||
        viewState.pendingPoint !== null ||
        (viewState.mainView === "explore" && !viewState.modelBypass));
    if (animated && animationTask === null) {
        animationTask = new Task(animate, this);
        animationTask.interval = 33;
        animationTask.repeat();
    } else if (!animated) {
        stopAnimation();
    }
}

function animate() {
    viewState.frame += 1;
    mgraphics.redraw();
}

function stopAnimation() {
    if (animationTask !== null) {
        animationTask.cancel();
        animationTask = null;
    }
}

function notifydeleted() {
    stopAnimation();
    if (pressedReleaseTask !== null) {
        pressedReleaseTask.cancel();
        pressedReleaseTask = null;
    }
}

function paint() {
    var size = mgraphics.size;
    var actualWidth = size[0];
    var actualHeight = size[1];
    controls = [];
    updateCanvasTransform(actualWidth, actualHeight);
    fillRect(0, 0, actualWidth, actualHeight, COLORS.background);
    mgraphics.save();
    if (!canvasUsesDirectCoordinates()) {
        mgraphics.translate(canvasTransform.x, canvasTransform.y);
        mgraphics.scale(canvasTransform.scale, canvasTransform.scale);
        fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT, COLORS.background);
    }
    if (viewState.showModelReady && viewState.mappingMode !== "auto") {
        drawCurrentMapView(LOGICAL_WIDTH, LOGICAL_HEIGHT);
        drawReadyOnMaps(LOGICAL_WIDTH, LOGICAL_HEIGHT);
    } else if (isOverlayActive()) {
        drawOverlay(LOGICAL_WIDTH, LOGICAL_HEIGHT);
    } else {
        drawCurrentMapView(LOGICAL_WIDTH, LOGICAL_HEIGHT);
    }
    normalizeControlState();
    if (viewState.debugHitboxes && controls.length > 0) {
        drawDebugHitboxes();
    }
    mgraphics.restore();
}

function drawCurrentMapView(width, height) {
    if (viewState.mainView === "learn") {
        drawLearnView(width, height);
    } else {
        drawExploreView(width, height);
    }
}

function canvasUsesDirectCoordinates() {
    return canvasTransform.scale === 1 && canvasTransform.x === 0 && canvasTransform.y === 0;
}

function updateCanvasTransform(actualWidth, actualHeight) {
    canvasTransform.scale = Math.min(actualWidth / LOGICAL_WIDTH, actualHeight / LOGICAL_HEIGHT);
    if (!isFinite(canvasTransform.scale) || canvasTransform.scale <= 0) {
        canvasTransform.scale = 1;
    }
    canvasTransform.x = (actualWidth - LOGICAL_WIDTH * canvasTransform.scale) * 0.5;
    canvasTransform.y = (actualHeight - LOGICAL_HEIGHT * canvasTransform.scale) * 0.5;
}

function isOverlayActive() {
    return viewState.showModelReady || viewState.screen === "questionnaire" ||
        viewState.screen === "auto_building" || viewState.screen === "training" ||
        viewState.screen === "error" || viewState.screen === "not_enough_patterns" ||
        viewState.screen === "not_enough_likes";
}

function drawExploreView(width, height) {
    var centerY = height * 0.5;
    var leftMap = mapField(width / 6, centerY, EXPLORE_MAP_SIZE);
    var rightMap = mapField(width * 5 / 6, centerY, EXPLORE_MAP_SIZE);
    if (viewState.showExploreMap) {
        drawMapPlane(leftMap);
        drawMapPlane(rightMap);
    }
    if (viewState.showExplorePoints && !viewState.modelBypass) {
        drawDatasetProjection(leftMap, "left");
        drawDatasetProjection(rightMap, "right");
        drawPendingPoint(leftMap, "left");
        drawPendingPoint(rightMap, "right");
    }
    drawLiveMapCursor(leftMap, [viewState.position[0], viewState.position[1]],
        viewState.leftCursorSize, COLORS.left);
    if (!viewState.modelBypass) {
        drawParticleOrb(width * 0.5, centerY,
            Math.min(viewState.orbSize * 0.5, Math.min(width, height) * 0.34),
            viewState.modelState);
    }
    drawLiveMapCursor(rightMap, [viewState.position[2], viewState.position[3]],
        viewState.rightCursorSize, COLORS.right);
}

function drawLearnView(width, height) {
    var layout = learnMapLayout(width, height);
    var leftMap = layout.left;
    var rightMap = layout.right;
    /* Everything left of the external Max control area remains transparent. */
    if (viewState.showLearnMap) {
        drawMapPlane(leftMap);
        drawMapPlane(rightMap);
    }
    if (viewState.showLearnPoints && !viewState.modelBypass) {
        drawDatasetProjection(leftMap, "left");
        drawDatasetProjection(rightMap, "right");
        drawPendingPoint(leftMap, "left");
        drawPendingPoint(rightMap, "right");
    }
    drawLiveMapCursor(leftMap, [viewState.position[0], viewState.position[1]],
        viewState.leftCursorSize, COLORS.left);
    drawLiveMapCursor(rightMap, [viewState.position[2], viewState.position[3]],
        viewState.rightCursorSize, COLORS.right);
    if (viewState.showLearnMap) {
        drawMapLabels(leftMap, rightMap);
    }
}

function learnMapLayout(width, height) {
    var visualX = width * LEARN_EMPTY_RATIO;
    var visualWidth = width * LEARN_VISUAL_RATIO;
    var gap = 36;
    var mapSize = Math.min(LEARN_MAP_SIZE, height - LEARN_MAP_TOP,
        (visualWidth - gap) * 0.5);
    var totalWidth = mapSize * 2 + gap;
    var startX = visualX + (visualWidth - totalWidth) * 0.5 + LEARN_MAP_SHIFT_X;
    var mapY = LEARN_MAP_TOP;
    var leftMap = {x: startX, y: mapY, width: mapSize, height: mapSize};
    var rightMap = {x: startX + mapSize + gap, y: mapY, width: mapSize, height: mapSize};
    return {left: leftMap, right: rightMap};
}

function mapField(cx, cy, size) {
    return {x: cx - size * 0.5, y: cy - size * 0.5, width: size, height: size};
}

function drawMapPlane(zone) {
    fillRoundedRect(zone.x, zone.y, zone.width, zone.height,
        viewState.mapRoundness, COLORS.mapBackground);
    drawMapFrame(zone);
}

function drawMapFrame(zone) {
    if (viewState.mapFrameStyle === "none" || viewState.mapBorderWidth <= 0) {
        return;
    }
    if (viewState.mapFrameStyle === "full") {
        strokeRoundedRect(zone.x, zone.y, zone.width, zone.height,
            viewState.mapRoundness, COLORS.mapBorder, viewState.mapBorderWidth);
        return;
    }
    drawCornerFrame(zone);
}

function drawCornerFrame(zone) {
    var length = Math.min(34, zone.width * 0.16);
    var radius = Math.min(viewState.mapRoundness, length * 0.7);
    drawRoundedCorner(zone.x, zone.y, length, radius, 0);
    drawRoundedCorner(zone.x + zone.width, zone.y, length, radius, 1);
    drawRoundedCorner(zone.x + zone.width, zone.y + zone.height, length, radius, 2);
    drawRoundedCorner(zone.x, zone.y + zone.height, length, radius, 3);
}

function drawRoundedCorner(x, y, length, radius, corner) {
    var r = Math.max(0, radius);
    mgraphics.set_source_rgba(COLORS.mapBorder);
    mgraphics.set_line_width(viewState.mapBorderWidth);
    if (corner === 0) {
        mgraphics.move_to(x, y + length); mgraphics.line_to(x, y + r);
        mgraphics.curve_to(x, y, x, y, x + r, y); mgraphics.line_to(x + length, y);
    } else if (corner === 1) {
        mgraphics.move_to(x - length, y); mgraphics.line_to(x - r, y);
        mgraphics.curve_to(x, y, x, y, x, y + r); mgraphics.line_to(x, y + length);
    } else if (corner === 2) {
        mgraphics.move_to(x, y - length); mgraphics.line_to(x, y - r);
        mgraphics.curve_to(x, y, x, y, x - r, y); mgraphics.line_to(x - length, y);
    } else {
        mgraphics.move_to(x + length, y); mgraphics.line_to(x + r, y);
        mgraphics.curve_to(x, y, x, y, x, y - r); mgraphics.line_to(x, y - length);
    }
    mgraphics.stroke();
}

function drawDatasetProjection(zone, side) {
    var color;
    var i;
    var coordinate;
    var marker;
    for (i = 0; i < viewState.points.length; i += 1) {
        coordinate = side === "left" ? viewState.points[i].left : viewState.points[i].right;
        color = mapPointColor(side, viewState.points[i].patternId,
            viewState.points[i].colorIndex, viewState.points[i].freePoint);
        marker = projectMapCursor(coordinate, zone, viewState.mapPointSize * 0.5);
        fillCircle(marker[0], marker[1], viewState.mapPointSize * 0.5,
            themeColorWithAlpha(color, color[3] * 0.62));
    }
}

function drawPendingPoint(zone, side) {
    var coordinate;
    var marker;
    var color;
    var pulse;
    if (viewState.pendingPoint === null) {
        return;
    }
    coordinate = side === "left" ? viewState.pendingPoint.left : viewState.pendingPoint.right;
    marker = projectMapCursor(coordinate, zone, viewState.mapPointSize * 0.5);
    color = mapPointColor(side, viewState.pendingPoint.patternId,
        viewState.pendingPoint.colorIndex, viewState.pendingPoint.freePoint);
    pulse = viewState.reduceMotion ? 1 : 1 + 0.55 * Math.sin(viewState.frame * 0.25);
    fillCircle(marker[0], marker[1], viewState.mapPointSize * 0.75, color);
    strokeCircle(marker[0], marker[1], viewState.mapPointSize * (1.5 + pulse),
        themeColorWithAlpha(color, 0.35), 1.5);
}

function mapPointColor(side, patternId, logicalIndex, freePoint) {
    var palette;
    var index;
    if (freePoint) {
        return COLORS.freePoint;
    }
    if (viewState.mapPointColorMode === 2) {
        return COLORS.orbPoint;
    }
    if (viewState.mapPointColorMode === 3) {
        return side === "left" ? COLORS.leftMapPoint : COLORS.rightMapPoint;
    }
    if (viewState.mapPointColorMode === 4) {
        palette = [COLORS.mapPointPrimary, COLORS.mapPointSecondary,
            COLORS.mapPointThird, COLORS.mapPointFourth, COLORS.mapPointFifth];
        index = Number(logicalIndex);
        if (!isFinite(index) || index < 0) {
            index = colorIndexForPattern(patternId);
        }
        index = Math.floor(index) % palette.length;
        return palette[index];
    }
    return side === "left" ? COLORS.left : COLORS.right;
}

function drawLiveMapCursor(zone, coordinate, cursorSize, color) {
    var marker;
    if (!viewState.positionValid) {
        return;
    }
    marker = projectMapCursor(coordinate, zone, cursorSize * 0.5);
    fillCircle(marker[0], marker[1], cursorSize * 0.5, color);
}

function projectMapCursor(coordinate, zone, cursorHalfSize) {
    var minX = zone.x + cursorHalfSize;
    var maxX = zone.x + zone.width - cursorHalfSize;
    var minY = zone.y + cursorHalfSize;
    var maxY = zone.y + zone.height - cursorHalfSize;
    return [
        minX + clip01(coordinate[0]) * (maxX - minX),
        maxY - clip01(coordinate[1]) * (maxY - minY)
    ];
}

function drawMapLabels(leftMap, rightMap) {
    var y = Math.max(leftMap.y + leftMap.height, rightMap.y + rightMap.height) + 20;
    drawText(viewState.leftLabel + " · XL YL", leftMap.x, y,
        viewState.smallTextSize, COLORS.muted, "left");
    drawText("XR YR · " + viewState.rightLabel, rightMap.x + rightMap.width, y,
        viewState.smallTextSize, COLORS.muted, "right");
}

function drawOverlay(width, height) {
    fillRect(0, 0, width, height,
        viewState.screen === "questionnaire" ? COLORS.questionnaireBackground : COLORS.background);
    if (viewState.showModelReady) {
        drawReady(width, height);
    } else if (viewState.screen === "questionnaire") {
        drawQuestionnaire(width, height);
    } else if (viewState.screen === "auto_building") {
        drawBuilding(width, height);
    } else if (viewState.screen === "training") {
        drawTraining(width, height);
    } else if (viewState.screen === "not_enough_patterns" || viewState.screen === "not_enough_likes") {
        drawQuestionnaireRequirement(width, height);
    } else {
        drawError(width, height);
    }
}

function drawQuestionnaire(width, height) {
    var gap = 24;
    var buttonWidth = viewState.questionButtonWidth;
    var buttonX = (width - buttonWidth * 2 - gap) * 0.5;
    var cancelY = height - 62;
    drawParticleOrb(width * 0.5, 166, Math.min(116, viewState.orbSize * 0.36),
        viewState.patternReady ? "listening" : "loading");
    drawQuestionnaireChoice(buttonX, 314, buttonWidth, viewState.questionButtonHeight,
        viewState.dislikeLabel, THUMBS_DOWN_RESOURCE, "left", "dislike", viewState.patternReady);
    drawQuestionnaireChoice(buttonX + buttonWidth + gap, 314, buttonWidth,
        viewState.questionButtonHeight, viewState.likeLabel, THUMBS_UP_RESOURCE,
        "right", "like", viewState.patternReady);
    drawQuestionnaireDots(width * 0.5, 408, 980);
    drawCancelControl(width * 0.5 - viewState.cancelButtonWidth * 0.5, cancelY,
        viewState.cancelButtonWidth, viewState.cancelButtonHeight);
}

function drawQuestionnaireChoice(x, y, width, height, fallback, resourceName, side, command, enabled) {
    var hasResource = projectResourceAvailable(resourceName);
    var iconX = side === "left" ? x + 42 : x + width - 42;
    drawButton(x, y, width, height, fallback, command, enabled, viewState.questionTextSize);
    if (hasResource) {
        drawProjectSvg(resourceName, iconX, y + height * 0.5, viewState.questionIconSize);
    }
}

function drawQuestionnaireDots(cx, cy, availableWidth) {
    var count = viewState.questionnaireTotal;
    var gap = count > 1 ? Math.min(viewState.bulletGap,
        availableWidth / Math.max(1, count - 1)) : 0;
    var startX = cx - gap * Math.max(0, count - 1) * 0.5;
    var i;
    var x;
    var current;
    var answered;
    for (i = 0; i < count; i += 1) {
        x = startX + i * gap;
        current = i + 1 === viewState.questionnaireCurrentIndex;
        answered = i < viewState.answers.length && viewState.answers[i] !== -1;
        fillCircle(x, cy, viewState.bulletSize,
            answered ? COLORS.bulletAnswered : COLORS.bullet);
        if (current) {
            strokeCircle(x, cy, viewState.bulletSize + viewState.bulletSelectedPadding,
                COLORS.bulletSelectedBorder, viewState.bulletSelectedBorderWidth);
        }
    }
}

function drawBuilding(width, height) {
    var ratio = clip01(viewState.mappingCurrent / Math.max(1, viewState.mappingTotal));
    var barWidth = 360;
    if (viewState.creatingMapFeedbackActive) {
        ratio = clip01(((viewState.frame - viewState.creatingMapStartFrame) * 33) /
            Math.max(1, viewState.creatingMapDuration));
    }
    /* The final segment means that every point and the final settle step have
     * completed; emitting the last point id alone is not completion. */
    if (!viewState.mappingComplete) {
        ratio = Math.min(ratio, 0.97);
    }
    drawStatusText(viewState.creatingMapLabel, width * 0.5, 104, COLORS.important);
    drawParticleOrb(width * 0.5, 260, Math.min(112, viewState.orbSize * 0.34), "loading");
    fillRoundedRect(width * 0.5 - barWidth * 0.5, 420, barWidth, 3, 1.5,
        themeColorWithAlpha(COLORS.muted, 0.38));
    fillRoundedRect(width * 0.5 - barWidth * 0.5, 420, barWidth * ratio, 3, 1.5,
        COLORS.important);
}

function drawTraining(width, height) {
    drawStatusText(viewState.trainingLabel, width * 0.5, 84, COLORS.important);
    drawParticleOrb(width * 0.5, 250, Math.min(122, viewState.orbSize * 0.38), "training");
    drawText(viewState.fitRound > 0 ?
        "FIT ROUND " + String(viewState.fitRound) + " / " + String(viewState.maxFitRounds) :
        "PREPARING MODEL", width * 0.5, 414, 10, COLORS.text, "center");
    drawText("LOSS  " + (viewState.currentLoss === null ? "--" : formatFloat(viewState.currentLoss, 6)) +
        "    ·    PLATEAU  " + String(viewState.plateau) + " / " + String(viewState.patience),
        width * 0.5, 438, viewState.smallTextSize, COLORS.muted, "center");
}

function drawReady(width, height) {
    drawStatusText(viewState.readyLabel, width * 0.5, 104, COLORS.success);
    drawParticleOrb(width * 0.5, 270, Math.min(150, viewState.orbSize * 0.46), "ready");
}

function drawReadyOnMaps(width, height) {
    var centerX = width * 0.5;
    var centerY = height * 0.5;
    var layout;
    if (viewState.mainView === "learn") {
        layout = learnMapLayout(width, height);
        centerX = (layout.left.x + layout.right.x + layout.right.width) * 0.5;
        centerY = layout.left.y + layout.left.height * 0.5;
    }
    drawStatusText(viewState.readyLabel, centerX, centerY, COLORS.success);
}

function drawQuestionnaireRequirement(width, height) {
    var patterns = viewState.screen === "not_enough_patterns";
    var cancelY = height - 62;
    drawParticleOrb(width * 0.5, 245, 108, "failed");
    drawStatusText(patterns ? "NOT ENOUGH PATTERNS" : "NOT ENOUGH LIKED PATTERNS",
        width * 0.5, 106, COLORS.warning);
    drawText(String(viewState.statusAvailable) + " / " + String(viewState.statusRequired),
        width * 0.5, cancelY - 12, 14, COLORS.text, "center");
    drawCancelControl(width * 0.5 - viewState.cancelButtonWidth * 0.5, cancelY,
        viewState.cancelButtonWidth, viewState.cancelButtonHeight);
}

function drawError(width, height) {
    drawParticleOrb(width * 0.5, 245, 108, "failed");
    drawStatusText(viewState.errorCode === "training_error" ? "TRAINING FAILED" : "ERROR",
        width * 0.5, 106, COLORS.error);
    drawText(friendlyError(viewState.errorCode), width * 0.5, 410, 10, COLORS.text, "center");
}

function drawStatusText(label, x, y, color) {
    drawText(label, x, y, viewState.statusTextSize, color, "center");
}

function drawButton(x, y, width, height, label, command, enabled, textSize) {
    var control = registerControl(command, x, y, width, height, command, enabled);
    var id = control.id;
    var fill = id === pressedControl ? COLORS.buttonPressed :
        (id === hoveredControl ? COLORS.buttonHover : COLORS.buttonBgOff);
    var border = id === pressedControl ? COLORS.buttonPressedBorder : COLORS.buttonBorder;
    fillRoundedRect(control.x, control.y, control.width, control.height,
        viewState.buttonRoundness, fill);
    strokeRoundedRect(control.x, control.y, control.width, control.height,
        viewState.buttonRoundness, border, 1.5);
    drawText(label, control.x + control.width * 0.5,
        control.y + control.height * 0.5 + 5,
        textSize, enabled ? COLORS.buttonTextOn : COLORS.muted, "center");
}

function drawCancelControl(x, y, width, height) {
    var control = registerControl("cancel_questionnaire", x, y, width, height,
        "cancel_questionnaire", true);
    var color = hoveredControl === "cancel_questionnaire" || pressedControl === "cancel_questionnaire" ?
        COLORS.text : COLORS.cancelText;
    drawText(viewState.cancelLabel, control.x + control.width * 0.5,
        control.y + control.height * 0.5 + 4,
        viewState.cancelTextSize, color, "center");
}

function registerControl(id, x, y, width, height, command, enabled) {
    var control = {id: id, x: x, y: y, width: width, height: height,
        command: command, enabled: !!enabled};
    controls.push(control);
    if (!control.enabled) {
        if (hoveredControl === id) { hoveredControl = ""; }
        if (pressedControl === id) { pressedControl = ""; }
        if (focusedControl === id) { focusedControl = ""; }
    }
    return control;
}

function projectResourceAvailable(resourceName) {
    var svg;
    if (projectResourceCache.hasOwnProperty(resourceName)) {
        return projectResourceCache[resourceName] !== false;
    }
    if (typeof mgraphics.svg_render !== "function") {
        projectResourceCache[resourceName] = false;
        return false;
    }
    if (typeof MGraphicsSVG !== "function") {
        projectResourceCache[resourceName] = resourceName;
        return true;
    }
    try {
        svg = new MGraphicsSVG(resourceName);
        if (svg && Number(svg.loaded) === 1) {
            projectResourceCache[resourceName] = svg;
            return true;
        }
    } catch (error) {
    }
    projectResourceCache[resourceName] = false;
    return false;
}

function drawProjectSvg(resourceName, cx, cy, size) {
    var source = projectResourceCache[resourceName] || resourceName;
    try {
        mgraphics.svg_render(source, cx - size * 0.5, cy - size * 0.5, size, size, 1);
        return true;
    } catch (error) {
        projectResourceCache[resourceName] = false;
        return false;
    }
}

function drawParticleOrb(cx, cy, radius, orbState) {
    var shellCount = 144;
    var coreCount = 72;
    var total = shellCount + coreCount;
    var particles = [];
    var phase = viewState.reduceMotion ? 0 : viewState.frame * orbSpeed(orbState);
    var cosY = Math.cos(phase);
    var sinY = Math.sin(phase);
    var cosX = Math.cos(phase * 0.43);
    var sinX = Math.sin(phase * 0.43);
    var breath = viewState.reduceMotion ? 0 : Math.sin(viewState.frame * 0.055) * orbBreath(orbState);
    var audioExpansion = viewState.audioLevel * (orbState === "listening" ? 0.11 : 0.045);
    var i;
    var localIndex;
    var shell;
    var z;
    var radial;
    var angle;
    var volume;
    var x;
    var y;
    var rotatedX;
    var rotatedY;
    var rotatedZ;
    var depth;
    var perspective;
    var particleRadius;
    for (i = 0; i < total; i += 1) {
        shell = i < shellCount;
        localIndex = shell ? i : i - shellCount;
        if (shell) {
            z = 1 - 2 * ((localIndex + 0.5) / shellCount);
            radial = Math.sqrt(Math.max(0, 1 - z * z));
            angle = localIndex * 2.399963229728653;
            volume = 0.94 + deterministicUnit(localIndex, 3) * 0.08;
        } else {
            z = 1 - 2 * deterministicUnit(localIndex, 5);
            radial = Math.sqrt(Math.max(0, 1 - z * z));
            angle = localIndex * 2.399963229728653 + deterministicUnit(localIndex, 7) * 0.7;
            volume = Math.pow(deterministicUnit(localIndex, 11), 0.333333) * 0.67;
        }
        volume *= 1 + breath + audioExpansion * (0.35 + deterministicUnit(i, 13) * 0.65);
        x = Math.cos(angle) * radial * volume;
        y = Math.sin(angle) * radial * volume;
        z *= volume;
        rotatedX = x * cosY + z * sinY;
        rotatedZ = -x * sinY + z * cosY;
        rotatedY = y * cosX - rotatedZ * sinX;
        rotatedZ = y * sinX + rotatedZ * cosX;
        depth = clip01((rotatedZ + 1.15) / 2.3);
        perspective = 0.82 + depth * 0.28;
        particleRadius = (shell ? 1.15 : 1.55) + depth * (shell ? 2.65 : 3.25);
        particles.push({
            x: cx + rotatedX * radius * perspective,
            y: cy + rotatedY * radius * perspective,
            z: depth,
            radius: particleRadius,
            alpha: (shell ? 0.14 : 0.19) + depth * (shell ? 0.55 : 0.62),
            color: orbParticleColor(i, shell, orbState)
        });
    }
    particles.sort(function (a, b) { return a.z - b.z; });
    for (i = 0; i < particles.length; i += 1) {
        fillCircle(particles[i].x, particles[i].y, particles[i].radius,
            themeColorWithAlpha(particles[i].color, particles[i].alpha));
    }
}

function orbSpeed(stateName) {
    if (stateName === "training") { return 0.027; }
    if (stateName === "loading") { return 0.019; }
    if (stateName === "ready") { return 0.006; }
    if (stateName === "failed") { return 0.0015; }
    return 0.009;
}

function orbBreath(stateName) {
    if (stateName === "training") { return 0.045; }
    if (stateName === "ready") { return 0.008; }
    if (stateName === "loading") { return 0.018; }
    if (stateName === "failed") { return 0.004; }
    return 0.032;
}

function orbParticleColor(index, shell, stateName) {
    if (stateName === "training" && index % 17 === 0) { return COLORS.important; }
    if (stateName === "ready" && index % 19 === 0) { return COLORS.success; }
    if (stateName === "failed" && index % 13 === 0) { return COLORS.error; }
    if (index % 37 === 0) { return COLORS.orbFifth; }
    if (index % 31 === 0) { return COLORS.orbFourth; }
    if (index % 23 === 0) { return COLORS.orbPoint; }
    if (index % 29 === 0) { return COLORS.orbSecondary; }
    return shell ? COLORS.orb : COLORS.orbSecondary;
}

function deterministicUnit(index, salt) {
    var value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
    return value - Math.floor(value);
}

function onclick(x, y) {
    var logical = screenToLogical(x, y);
    var control = controlById(hitTestControl(logical.x, logical.y));
    viewState.debugMouseX = logical.x;
    viewState.debugMouseY = logical.y;
    if (control !== null && control.enabled) {
        pressedControl = control.id;
        focusedControl = control.id;
        sendCommand(control.command, []);
        schedulePressedRelease();
    } else {
        pressedControl = "";
    }
    mgraphics.redraw();
}

function onmouseup() {
    if (pressedReleaseTask !== null) {
        pressedReleaseTask.cancel();
        pressedReleaseTask = null;
    }
    pressedControl = "";
    mgraphics.redraw();
}

function schedulePressedRelease() {
    if (pressedReleaseTask !== null) {
        pressedReleaseTask.cancel();
    }
    pressedReleaseTask = new Task(releasePressedControl, this);
    pressedReleaseTask.schedule(110);
}

function releasePressedControl() {
    pressedControl = "";
    pressedReleaseTask = null;
    mgraphics.redraw();
}

function onidle(x, y) {
    var logical = screenToLogical(x, y);
    var next = hitTestControl(logical.x, logical.y);
    viewState.debugMouseX = logical.x;
    viewState.debugMouseY = logical.y;
    if (next !== hoveredControl || viewState.debugHitboxes) {
        hoveredControl = next;
        mgraphics.redraw();
    }
}

function onidleout() {
    hoveredControl = "";
    mgraphics.redraw();
}

function onkeydown(key) {
    var lower = String.fromCharCode(key).toLowerCase();
    if (viewState.screen === "questionnaire" && lower === "l" && controlEnabled("like")) {
        sendCommand("like", []);
    } else if (viewState.screen === "questionnaire" && lower === "d" && controlEnabled("dislike")) {
        sendCommand("dislike", []);
    } else if (viewState.screen === "questionnaire" && key === 27) {
        sendCommand("cancel_questionnaire", []);
    }
    return 1;
}

function screenToLogical(x, y) {
    var size = mgraphics.size;
    var scale;
    updateCanvasTransform(size[0], size[1]);
    if (canvasUsesDirectCoordinates()) {
        return {x: x, y: y};
    }
    scale = canvasTransform.scale > 0 ? canvasTransform.scale : 1;
    return {x: (x - canvasTransform.x) / scale, y: (y - canvasTransform.y) / scale};
}

function hitTestControl(x, y) {
    var i;
    for (i = controls.length - 1; i >= 0; i -= 1) {
        if (controls[i].enabled && inside(controls[i], x, y)) {
            return controls[i].id;
        }
    }
    return "";
}

function controlById(id) {
    var i;
    for (i = 0; i < controls.length; i += 1) {
        if (controls[i].id === id) {
            return controls[i];
        }
    }
    return null;
}

function controlEnabled(id) {
    var control = controlById(id);
    return control !== null && control.enabled;
}

function normalizeControlState() {
    if (!controlEnabled(hoveredControl)) { hoveredControl = ""; }
    if (!controlEnabled(pressedControl)) { pressedControl = ""; }
    if (!controlEnabled(focusedControl)) { focusedControl = ""; }
}

function drawDebugHitboxes() {
    var i;
    for (i = 0; i < controls.length; i += 1) {
        strokeRect(controls[i].x, controls[i].y, controls[i].width, controls[i].height,
            controls[i].enabled ? COLORS.success : COLORS.error, 1);
        drawText(controls[i].id, controls[i].x + 3, controls[i].y + 11,
            7, COLORS.text, "left");
    }
    drawText("mouse: " + formatFloat(viewState.debugMouseX, 1) + ", " +
        formatFloat(viewState.debugMouseY, 1), 8, 12, 7, COLORS.text, "left");
}

function sendCommand(name, args) {
    outlet(0, [name].concat(args || []));
}

function inside(control, x, y) {
    return x >= control.x && x <= control.x + control.width &&
        y >= control.y && y <= control.y + control.height;
}

function setMapFrameStyle(value) {
    var next = String(value || "").toLowerCase();
    if (next === "corners" || next === "full" || next === "none") {
        viewState.mapFrameStyle = next;
    }
}

function setUiLabel(name, args) {
    var properties = {
        leftlabel: "leftLabel", rightlabel: "rightLabel",
        creatingmaplabel: "creatingMapLabel", traininglabel: "trainingLabel",
        readylabel: "readyLabel", cancellabel: "cancelLabel",
        likelabel: "likeLabel", dislikelabel: "dislikeLabel"
    };
    var text = args && args.length > 0 ? args.join(" ") : "";
    if (properties[name] && text.length > 0) {
        viewState[properties[name]] = text;
    }
}

function normalizedCoordinates(args, offset) {
    var result = [];
    var i;
    var value;
    if (!args || args.length < offset + 4) {
        return null;
    }
    for (i = 0; i < 4; i += 1) {
        value = Number(args[offset + i]);
        if (!isFinite(value)) {
            return null;
        }
        result.push(clip01(value));
    }
    return result;
}

function positiveNumber(value, fallback) {
    var numeric = Number(value);
    return isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function boundedNumber(value, fallback, minimum, maximum) {
    var numeric = Number(value);
    return isFinite(numeric) ? Math.max(minimum, Math.min(maximum, numeric)) : fallback;
}

function finiteOrNull(value) {
    var numeric = Number(value);
    return isFinite(numeric) ? numeric : null;
}

function clip01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
}

function friendlyError(code) {
    var messages = {
        invalid_position: "Position must contain four values between 0 and 1.",
        invalid_pattern: "The selected pattern is invalid.",
        preset_not_ready: "The selected preset is not ready.",
        empty_dataset: "Add points before training.",
        batch_in_progress: "Point writing is already active.",
        not_enough_patterns: "Not enough patterns are available.",
        not_enough_likes: "Not enough patterns were liked.",
        training_error: "Max reported a training error."
    };
    return messages[code] || String(code || "unknown").replace(/_/g, " ");
}

function drawText(value, x, y, size, color, alignment) {
    var measurement;
    mgraphics.set_source_rgba(color);
    mgraphics.select_font_face("Arial");
    mgraphics.set_font_size(size);
    measurement = mgraphics.text_measure(String(value));
    if (alignment === "center") {
        x -= measurement[0] * 0.5;
    } else if (alignment === "right") {
        x -= measurement[0];
    }
    mgraphics.move_to(x, y);
    mgraphics.show_text(String(value));
}

function fillRect(x, y, width, height, color) {
    mgraphics.set_source_rgba(color);
    mgraphics.rectangle(x, y, width, height);
    mgraphics.fill();
}

function strokeRect(x, y, width, height, color, lineWidth) {
    mgraphics.set_source_rgba(color);
    mgraphics.set_line_width(lineWidth);
    mgraphics.rectangle(x, y, width, height);
    mgraphics.stroke();
}

function fillRoundedRect(x, y, width, height, radius, color) {
    mgraphics.set_source_rgba(color);
    mgraphics.rectangle_rounded(x, y, width, height, radius, radius);
    mgraphics.fill();
}

function strokeRoundedRect(x, y, width, height, radius, color, lineWidth) {
    mgraphics.set_source_rgba(color);
    mgraphics.set_line_width(lineWidth);
    mgraphics.rectangle_rounded(x, y, width, height, radius, radius);
    mgraphics.stroke();
}

function fillCircle(cx, cy, radius, color) {
    mgraphics.set_source_rgba(color);
    mgraphics.ellipse(cx - radius, cy - radius, radius * 2, radius * 2);
    mgraphics.fill();
}

function strokeCircle(cx, cy, radius, color, lineWidth) {
    mgraphics.set_source_rgba(color);
    mgraphics.set_line_width(lineWidth);
    mgraphics.ellipse(cx - radius, cy - radius, radius * 2, radius * 2);
    mgraphics.stroke();
}

function formatFloat(value, digits) {
    var numeric = Number(value);
    return isFinite(numeric) ? numeric.toFixed(digits) : "--";
}

function onresize() {
    mgraphics.redraw();
}
