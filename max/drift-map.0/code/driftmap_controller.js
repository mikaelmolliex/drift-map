/* DriftMap controller -- business logic and single source of truth.
 * Compatible with Max's classic [js] object (ES5, no dependencies).
 */

autowatch = 1;
inlets = 3;
outlets = 6;

include("driftmap_config.js");

setinletassist(0, "Commands from JSUI or Max");
setinletassist(1, "Live coordinates: xL yL xR yR");
setinletassist(2, "Feedback from Max");
setoutletassist(0, "Structured events for JSUI");
setoutletassist(1, "Pattern id");
setoutletassist(2, "Four input coordinates");
setoutletassist(3, "Unique point id");
setoutletassist(4, "Commands for Max: datasets, model, gates and blockslots");
setoutletassist(5, "State bus for the external Max UI");

var state = createInitialState();
var emitTask = null;
var scheduledStep = null;
var trainingTask = null;
var scheduledTrainingStep = null;
var overlayTask = null;

function createInitialState() {
    return {
        view: "explore",
        mode: "auto",
        phase: "idle",
        realModelState: "train_to_start",
        modelBypass: false,
        showMapPoints: true,
        showExplorePoints: true,
        showLearnPoints: true,
        showExploreMap: false,
        showLearnMap: true,
        overlay: "none",
        interactionLocked: false,
        slotsBlocked: false,

        slotList: [],
        slotListDeclared: false,

        minLikedPatterns: DRIFTMAP_MIN_LIKED_PATTERNS,
        effectiveMinLikedPatterns: 0,
        maxAnchors: DRIFTMAP_MAX_ANCHORS,
        questionnaireActive: false,
        questionnaireCurrentPattern: 0,
        questionnaireAwaitingPreset: false,
        bankEnded: false,
        availablePatternCount: 0,
        questionnaireIndex: -1,
        answers: [],
        likedPatterns: [],
        selectedPatterns: [],

        currentPattern: 0,
        presetReady: false,
        awaitingPreset: false,

        currentPosition: [0.5, 0.5, 0.5, 0.5],
        positionValid: false,

        autoTotalPoints: 50,
        semiBatchPoints: 10,
        spread: 0.05,

        pointCounter: 0,
        datasetSize: 0,

        queue: [],
        batchCurrent: 0,
        batchTotal: 0,
        batchPattern: 0,
        pendingPoint: null,

        autoFit: false,
        seed: 1,
        rngState: 1,
        debug: false,

        pendingClearReason: "",
        autoGroups: [],
        autoGroupIndex: -1,
        autoTargetSize: 0,

        mlp: cloneModelConfig(DRIFTMAP_MLP_DEFAULTS),
        modelConfigSource: "auto",
        modelConfigRevision: 0,
        appliedConfigRevision: -1,
        architectureRevision: 0,
        appliedArchitectureRevision: -1,
        architectureDirty: false,
        datasetDirty: false,
        modelHasWeights: false,
        modelResetConfirmed: false,

        trainingActive: false,
        trainingMode: "from_scratch",
        pendingFitRound: 0,
        fitInFlight: false,
        previousLoss: null,
        stopRequested: false,
        training: {
            currentLoss: null,
            bestLoss: null,
            fitRound: 0,
            plateau: 0
        },

        pendingMlp: {},
        architectureChangeDuringTraining: false,

        pendingTrainingAction: "",
        pendingMode: "",

        resetInProgress: false,
        resetDatasetConfirmed: false,
        resetModelConfirmed: false
    };
}

function anything() {
    var args = arrayfromargs(arguments);
    if (inlet === 0) {
        handleCommand(messagename, args);
    } else if (inlet === 1 && (messagename === "coordinates" || messagename === "position")) {
        receivePosition(args);
    } else if (inlet === 2) {
        handleFeedback(messagename, args);
    } else {
        emitError("invalid_position", false);
    }
}

function list() {
    var args = arrayfromargs(arguments);
    if (inlet === 1) {
        receivePosition(args);
    } else if (inlet === 0 && args.length > 0) {
        handleCommand(String(args[0]), args.slice(1));
    } else if (inlet === 2 && args.length > 0) {
        handleFeedback(String(args[0]), args.slice(1));
    }
}

function msg_int(value) {
    if (inlet === 1) {
        emitError("invalid_position", false);
    } else {
        emitError("unknown_command", false);
    }
}

function msg_float(value) {
    msg_int(value);
}

function handleCommand(name, args) {
    if (name === "reset") {
        resetController();
    } else if (name === "clear_dataset") {
        requestDatasetClear("manual");
    } else if (name === "debug") {
        state.debug = readBoolean(args[0]);
    } else if (name === "seed") {
        setSeed(args[0]);
    } else if (name === "spread") {
        setSpread(args[0]);
    } else if (name === "autofit") {
        state.autoFit = readBoolean(args[0]);
    } else if (name === "reduce_motion") {
        emitUi(["reduce_motion", readBoolean(args[0]) ? 1 : 0]);
    } else if (name === "modelbypass") {
        setModelBypass(args[0]);
    } else if (name === "showmappoints") {
        setShowMapPoints(args[0]);
    } else if (name === "showexplorepoints") {
        setPointVisibility("explore", args[0]);
    } else if (name === "showlearnpoints") {
        setPointVisibility("learn", args[0]);
    } else if (name === "showexploremap") {
        setMapVisibility("explore", args[0]);
    } else if (name === "showlearnmap") {
        setMapVisibility("learn", args[0]);
    } else if (name === "minlikes" || name === "minlikedpatterns") {
        setMinLikedPatterns(args[0]);
    } else if (name === "maxanchors") {
        setMaxAnchors(args[0]);
    } else if (name === "coordinates" || name === "position") {
        receivePosition(args);
    } else if (name === "mode") {
        setMode(args[0]);
    } else if (name === "view") {
        setView(args[0]);
    } else if (name === "explore" || name === "learn") {
        setView(name);
    } else if (name === "uipage") {
        setView(String(args[0] || "").toLowerCase() === "params" ? "learn" : "explore");
    } else if (name === "slotlist") {
        setSlotList(args);
    } else if (name === "back_to_modes") {
        returnToModeMenu();
    } else if (name === "start_questionnaire") {
        startQuestionnaire();
    } else if (name === "restart_questionnaire") {
        startQuestionnaire();
    } else if (name === "cancel_questionnaire") {
        cancelQuestionnaire();
    } else if (name === "like") {
        saveAnswer(1);
    } else if (name === "dislike") {
        saveAnswer(0);
    } else if (name === "replay_pattern") {
        replayPattern();
    } else if (name === "auto_points") {
        setAutoPoints(args[0]);
    } else if (name === "select_pattern") {
        selectPattern(args[0]);
    } else if (name === "batch_points") {
        setBatchPoints(args[0]);
    } else if (name === "map_here") {
        mapHere();
    } else if (name === "add_point") {
        addFreePoint();
    } else if (name === "train") {
        handleLegacyTrain();
    } else if (name === "train_from_scratch") {
        beginManagedTraining("from_scratch");
    } else if (name === "continue_training") {
        beginManagedTraining("continue");
    } else if (name === "stop_training") {
        stopManagedTraining();
    } else if (name === "reset_model") {
        requestModelReset();
    } else if (name === "clear_map") {
        requestDatasetClear("manual");
    } else if (name === "mlp_hiddenlayers" || name === "mlp_activation" ||
            name === "mlp_outputactivation" || name === "mlp_batchsize" ||
            name === "mlp_maxiter" || name === "mlp_learnrate" ||
            name === "mlp_validation" || name === "mlp_max_fit_rounds" ||
            name === "mlp_patience" || name === "mlp_min_improvement") {
        setManualModelParameter(name, args);
    } else if (name === "mlp_defaults") {
        restoreFreeModelDefaults();
    } else if (name === "get_state") {
        emitStateSnapshot();
    } else if (name === "request_new_bank") {
        outlet(4, "request_new_bank");
        emitEvent("request_new_bank", []);
        emitStateEvent("request_new_bank", []);
    } else if (isJsuiVisualCommand(name)) {
        emitUi([name].concat(args));
    } else {
        emitError("unknown_command", false);
    }
}

function isJsuiVisualCommand(name) {
    var commands = {
        resetcolors: true, resettheme: true,
        backgroundcolor: true, questionnairebgcolor: true,
        mapbackgroundcolor: true, mapbordercolor: true, mapgridcolor: true,
        leftcolor: true, rightcolor: true, orbcolor: true,
        orbprimarycolor: true, orbsecondarycolor: true, orbpointcolor: true,
        orbthirdcolor: true, orbfourthcolor: true, orbfifthcolor: true,
        leftmappointcolor: true, rightmappointcolor: true,
        mappointprimarycolor: true, mappointsecondarycolor: true,
        mappointthirdcolor: true, mappointfourthcolor: true,
        mappointfifthcolor: true,
        bulletcolor: true, bulletansweredcolor: true,
        bulletselectedcolor: true, bulletselectedbordercolor: true,
        canceltextcolor: true, textcolor: true, mutedtextcolor: true,
        successcolor: true, importantcolor: true, warningcolor: true,
        errorcolor: true, iconcolor: true, likeiconcolor: true,
        dislikeiconcolor: true, buttonbgcoloron: true, buttonbgcoloroff: true,
        buttonbordercolor: true, buttonpressedbordercolor: true,
        buttonborderfocuscolor: true, buttontextcoloron: true,
        buttontextcoloroff: true, buttonhovercolor: true,
        buttonpressedcolor: true, stepbuttonbgcolor: true,
        stepbuttonhovercolor: true, stepbuttonpressedcolor: true,
        stepbuttonbordercolor: true, stepbuttontextcolor: true,
        accentcolor: true, panelcolor: true, panelaltcolor: true,
        mutedcolor: true, gridcolor: true, neutralcolor: true,
        readycolor: true, focuscolor: true,
        leftcursorsize: true, rightcursorsize: true, cursorsize: true,
        orbsize: true, maproundness: true, buttonroundness: true,
        roundedcorner: true, mapborderwidth: true, mapframestyle: true,
        mappointsize: true, mappointcolormode: true,
        questionbuttonwidth: true, questionbuttonheight: true,
        questiontextsize: true, questioniconsize: true,
        cancelbuttonwidth: true, cancelbuttonheight: true,
        canceltextsize: true, bulletsize: true, bulletgap: true,
        bulletselectedborderwidth: true, bulletselectedpadding: true,
        statustextsize: true, smalltextsize: true,
        leftlabel: true, rightlabel: true, creatingmaplabel: true,
        traininglabel: true, readylabel: true, cancellabel: true,
        likelabel: true, dislikelabel: true,
        audiolevel: true, debughitboxes: true
    };
    return commands.hasOwnProperty(name);
}

function handleFeedback(name, args) {
    if (name === "preset_ready") {
        handlePresetReady(args[0]);
    } else if (name === "end_of_bank") {
        handleEndOfBank(args[0]);
    } else if (name === "questionnaire_error" || name === "preset_timeout") {
        if (state.questionnaireActive) {
            abortQuestionnaireWithError(name);
        } else {
            emitError(name, false);
        }
    } else if (name === "dataset_cleared") {
        handleDatasetCleared();
    } else if (name === "model_reset_done") {
        handleModelResetDone();
    } else if (name === "mlp_config_applied") {
        handleModelConfigApplied(args[0]);
    } else if (name === "fit_result") {
        handleFitResult(args[0], args[1]);
    } else if (name === "fit_error") {
        handleFitError(args[0], args[1]);
    } else if (name === "training_started") {
        emitEvent("engine_training_started", args);
        emitStateEvent("engine_training_started", args);
    } else if (name === "training_done") {
        emitEvent("engine_training_done", args);
        emitStateEvent("engine_training_done", args);
    } else if (name === "training_error") {
        handleExternalTrainingError(args[0]);
    } else if (name === "bank_ready") {
        emitEvent("bank_ready", []);
    } else {
        emitError("unknown_feedback", false);
    }
}

function resetController() {
    if (state.trainingActive) {
        deferTrainingAction("reset_controller", "");
        return;
    }
    stopEmitTask();
    cancelTrainingTask();
    cancelOverlayTask();
    state = createInitialState();
    state.pendingClearReason = "reset";
    state.resetInProgress = true;
    state.resetDatasetConfirmed = false;
    state.resetModelConfirmed = false;
    state.modelResetConfirmed = false;

    outlet(4, ["blockslots", 0]);
    outlet(4, ["play_gate", 0]);
    outlet(4, ["modelbypass", 0]);
    emitUi(["mode", "auto"]);
    emitUi(["liked"]);
    emitUi(["selected"]);
    emitUi(["dataset_points", 0]);
    emitUi(["modelstate", "empty"]);
    emitUi(["modelbypass", 0]);
    emitUi(["minlikes", state.minLikedPatterns]);
    emitUi(["maxanchors", state.maxAnchors]);
    emitUi(["questionnaire_reset"]);
    emitUi(["view", "explore"]);
    emitUi(["showexploremap", 0]);
    emitUi(["showlearnmap", 1]);
    emitUi(["showexplorepoints", 1]);
    emitUi(["showlearnpoints", 1]);
    setPhase("idle");
    emitStateSnapshot();
    outlet(4, "clear_map");
    outlet(4, "reset_model");
}

function setMode(value) {
    var next = String(value || "").toLowerCase();
    if (next === "play") {
        setView("explore");
        return;
    }
    if (next !== "auto" && next !== "semi" && next !== "free") {
        emitError("invalid_mode", false);
        return;
    }

    /* A repeated mode message is navigation noise, not a request to reload
     * the current preset or cancel work already running in that mode. */
    if (next === state.mode) {
        return;
    }

    if (state.trainingActive) {
        deferTrainingAction("mode", next);
        return;
    }

    if (state.questionnaireActive) {
        cancelQuestionnaire();
    }

    applyMode(next);
}

function applyMode(next) {
    var readyPattern = state.presetReady && !state.awaitingPreset &&
        validPattern(state.currentPattern) ? state.currentPattern : 0;
    stopEmitTask();
    state.queue = [];
    state.batchCurrent = 0;
    state.batchTotal = 0;
    state.pendingClearReason = "";
    state.awaitingPreset = false;
    state.presetReady = readyPattern > 0;
    outlet(4, ["play_gate", 0]);
    state.mode = next;
    emitUi(["mode", next]);
    emitState(["ui", "mode", next]);

    if (next === "free") {
        ensureFreeModelConfig();
        emitModelStatus();
    }

    if (next === "auto") {
        setPhase("idle");
    } else if (next === "semi") {
        if (readyPattern > 0) {
            emitUi(["pattern_ready", readyPattern]);
            setPhase("semi_ready");
        } else {
            setPhase("semi_waiting");
        }
    } else if (next === "free") {
        if (readyPattern > 0) {
            emitUi(["pattern_ready", readyPattern]);
            setPhase("free_ready");
        } else {
            setPhase("free_waiting");
        }
    }
    emitModelState();
}

function returnToModeMenu() {
    /* Navigation only: mapping mode, datasets and model remain untouched. */
    setView("explore");
}

function setView(value) {
    var next = String(value || "").toLowerCase();
    if (next === "play") {
        next = "explore";
    } else if (next === "params") {
        next = "learn";
    }
    if (next !== "explore" && next !== "learn") {
        emitError("invalid_view", false);
        return;
    }
    state.view = next;
    emitUi(["view", next]);
    emitState(["ui", "view", next]);
}

function setModelBypass(value) {
    state.modelBypass = readBoolean(value);
    emitUi(["modelbypass", state.modelBypass ? 1 : 0]);
    outlet(4, ["modelbypass", state.modelBypass ? 1 : 0]);
    emitModelState();
}

function setShowMapPoints(value) {
    state.showMapPoints = readBoolean(value);
    state.showExplorePoints = state.showMapPoints;
    state.showLearnPoints = state.showMapPoints;
    emitUi(["showmappoints", state.showMapPoints ? 1 : 0]);
    emitState(["dataset", "showmappoints", state.showMapPoints ? 1 : 0]);
    emitState(["dataset", "showexplorepoints", state.showExplorePoints ? 1 : 0]);
    emitState(["dataset", "showlearnpoints", state.showLearnPoints ? 1 : 0]);
}

function setPointVisibility(view, value) {
    var visible = readBoolean(value);
    if (view === "learn") {
        state.showLearnPoints = visible;
        emitUi(["showlearnpoints", visible ? 1 : 0]);
        emitState(["dataset", "showlearnpoints", visible ? 1 : 0]);
    } else {
        state.showExplorePoints = visible;
        emitUi(["showexplorepoints", visible ? 1 : 0]);
        emitState(["dataset", "showexplorepoints", visible ? 1 : 0]);
    }
    state.showMapPoints = state.showExplorePoints && state.showLearnPoints;
    emitState(["dataset", "showmappoints", state.showMapPoints ? 1 : 0]);
}

function setMapVisibility(view, value) {
    var visible = readBoolean(value);
    if (view === "learn") {
        state.showLearnMap = visible;
        emitUi(["showlearnmap", visible ? 1 : 0]);
        emitState(["dataset", "showlearnmap", visible ? 1 : 0]);
    } else {
        state.showExploreMap = visible;
        emitUi(["showexploremap", visible ? 1 : 0]);
        emitState(["dataset", "showexploremap", visible ? 1 : 0]);
    }
}

function setSlotList(args) {
    var next = [];
    var seen = {};
    var interrupted = state.questionnaireActive;
    var i;
    var patternId;
    for (i = 0; i < args.length; i += 1) {
        patternId = toInteger(args[i]);
        if (!isFiniteNumber(patternId) || patternId < 1) {
            emitWarning("invalid_slot_id", [args[i]]);
        } else if (seen[patternId]) {
            emitWarning("duplicate_slot_id", [patternId]);
        } else {
            seen[patternId] = true;
            next.push(patternId);
        }
    }
    state.slotList = next;
    state.slotListDeclared = true;
    state.availablePatternCount = next.length;
    state.effectiveMinLikedPatterns = Math.min(state.minLikedPatterns, next.length);
    if (interrupted) {
        stopEmitTask();
        setSlotsBlocked(false, true);
        resetQuestionnaireSession();
        emitUi(["questionnaire_reset"]);
        emitUi(["questionnaire_total", next.length]);
        emitUi(["questionnaire_progress", 0, next.length, 0, 0]);
        setPhase("idle");
        emitEvent("questionnaire_cancelled", ["slotlist_changed"]);
        emitStateEvent("questionnaire_cancelled", ["slotlist_changed"]);
    } else {
        emitUi(["questionnaire_total", next.length]);
    }
    emitSlotsState();
    emitState(["dataset", "effective_minlikes", state.effectiveMinLikedPatterns]);
    emitQuestionnaireState();
    emitEvent("slotlist_updated", [next.length]);
}

function setSlotsBlocked(blocked, force) {
    var next = !!blocked;
    if (force || state.slotsBlocked !== next) {
        state.slotsBlocked = next;
        outlet(4, ["blockslots", next ? 1 : 0]);
        emitUi(["blockslots", next ? 1 : 0]);
    }
}

function setMinLikedPatterns(value) {
    var parsed = toInteger(value);
    if (!isFiniteNumber(parsed) || parsed < DRIFTMAP_MIN_ANCHORS ||
            parsed > DRIFTMAP_MAX_ANCHORS) {
        emitError("invalid_minlikes", false);
        return;
    }
    state.minLikedPatterns = parsed;
    state.effectiveMinLikedPatterns = Math.min(parsed, state.slotList.length);
    emitUi(["minlikes", parsed]);
    emitState(["dataset", "minlikes", parsed]);
    emitState(["dataset", "effective_minlikes", state.effectiveMinLikedPatterns]);
    emitQuestionnaireState();
}

function setMaxAnchors(value) {
    var parsed = toInteger(value);
    if (!isFiniteNumber(parsed) || parsed < DRIFTMAP_MIN_ANCHORS ||
            parsed > DRIFTMAP_MAX_ANCHORS) {
        emitError("invalid_maxanchors", false);
        return;
    }
    state.maxAnchors = parsed;
    emitUi(["maxanchors", parsed]);
    emitState(["dataset", "maxanchors", parsed]);
}

function isQuestionnairePhase(phase) {
    return phase === "questionnaire_loading" || phase === "questionnaire_waiting" ||
        phase === "questionnaire_complete" || phase === "not_enough_patterns" ||
        phase === "not_enough_likes";
}

function startQuestionnaire() {
    if (state.mode !== "auto") {
        emitError("invalid_mode", false);
        return;
    }
    stopEmitTask();
    resetQuestionnaireSession();
    state.availablePatternCount = state.slotList.length;
    state.effectiveMinLikedPatterns = Math.min(state.minLikedPatterns, state.slotList.length);
    state.answers = filledAnswers(state.slotList.length);
    state.questionnaireIndex = 0;
    state.questionnaireActive = true;
    state.rngState = normalizeSeed(state.seed);
    setSlotsBlocked(true, true);
    emitUi(["questionnaire_reset"]);
    emitUi(["questionnaire_total", state.slotList.length]);
    emitUi(["questionnaire_progress", state.slotList.length > 0 ? 1 : 0,
        state.slotList.length, 0, 0]);
    emitEvent("questionnaire_started", []);
    emitStateEvent("questionnaire_started", []);
    emitQuestionnaireState();
    if (state.slotList.length < DRIFTMAP_MIN_AVAILABLE_PATTERNS) {
        state.questionnaireActive = false;
        setSlotsBlocked(false, true);
        emitUi(["not_enough_patterns", state.slotList.length,
            DRIFTMAP_MIN_AVAILABLE_PATTERNS]);
        emitEvent("not_enough_patterns", [state.slotList.length,
            DRIFTMAP_MIN_AVAILABLE_PATTERNS]);
        emitQuestionnaireState();
        emitError("not_enough_patterns", false);
        setPhase("not_enough_patterns");
        return;
    }
    loadPattern(state.slotList[0], "questionnaire_loading");
}

function resetQuestionnaireSession() {
    state.questionnaireActive = false;
    state.questionnaireCurrentPattern = 0;
    state.questionnaireAwaitingPreset = false;
    state.bankEnded = false;
    state.availablePatternCount = state.slotList.length;
    state.effectiveMinLikedPatterns = Math.min(state.minLikedPatterns, state.slotList.length);
    state.answers = [];
    state.likedPatterns = [];
    state.questionnaireIndex = -1;
    state.currentPattern = 0;
    state.presetReady = false;
    state.awaitingPreset = false;
}

function cancelQuestionnaire() {
    if (state.mode !== "auto") {
        emitError("invalid_mode", false);
        return;
    }
    if (!isQuestionnairePhase(state.phase)) {
        emitError("questionnaire_not_active", false);
        return;
    }
    stopEmitTask();
    setSlotsBlocked(false, true);
    resetQuestionnaireSession();
    emitUi(["questionnaire_reset"]);
    emitUi(["questionnaire_total", state.slotList.length]);
    emitUi(["questionnaire_progress", 0, state.slotList.length, 0, 0]);
    emitUi(["liked"]);
    emitEvent("questionnaire_cancelled", []);
    emitStateEvent("questionnaire_cancelled", []);
    emitQuestionnaireState();
    setView("explore");
    setPhase("idle");
}

function saveAnswer(value) {
    var patternId;
    var position;
    if (state.mode !== "auto" || state.phase !== "questionnaire_waiting" ||
            !state.presetReady || state.awaitingPreset) {
        emitError("answer_not_available", false);
        return;
    }

    patternId = state.questionnaireCurrentPattern;
    if (state.questionnaireIndex < 0 || state.questionnaireIndex >= state.slotList.length ||
            patternId !== state.slotList[state.questionnaireIndex] ||
            state.answers[state.questionnaireIndex] !== -1) {
        return;
    }

    /* Lock immediately so a double click cannot save twice. */
    state.presetReady = false;
    state.answers[state.questionnaireIndex] = value;
    position = state.questionnaireIndex + 1;
    emitUi(["answer_saved", patternId, value, position]);
    emitUi(["questionnaire_progress", position, state.slotList.length,
        countAnsweredPatterns(), 0]);
    emitEvent("answer_saved", [patternId, value]);
    emitQuestionnaireState();
    state.questionnaireCurrentPattern = 0;
    if (state.questionnaireIndex >= state.slotList.length - 1) {
        state.awaitingPreset = false;
        state.questionnaireAwaitingPreset = false;
        state.bankEnded = true;
        state.availablePatternCount = state.slotList.length;
        emitUi(["questionnaire_bank_end", state.slotList.length]);
        emitUi(["questionnaire_progress", position, state.slotList.length,
            countAnsweredPatterns(), 1]);
        finishQuestionnaire();
        return;
    }
    state.questionnaireIndex += 1;
    emitUi(["questionnaire_progress", state.questionnaireIndex + 1,
        state.slotList.length, countAnsweredPatterns(), 0]);
    loadPattern(state.slotList[state.questionnaireIndex], "questionnaire_loading");
}

function replayPattern() {
    if (state.mode !== "auto" ||
            (state.phase !== "questionnaire_waiting" && state.phase !== "questionnaire_loading") ||
            !validPattern(state.currentPattern)) {
        emitError("answer_not_available", false);
        return;
    }
    loadPattern(state.currentPattern, "questionnaire_loading");
}

function finishQuestionnaire() {
    var i;
    var selectedCount;
    state.questionnaireActive = false;
    state.phase = "questionnaire_complete";
    state.likedPatterns = [];
    for (i = 0; i < state.answers.length; i += 1) {
        if (state.answers[i] === 1) {
            state.likedPatterns.push(state.slotList[i]);
        }
    }
    emitUi(["liked"].concat(state.likedPatterns));
    emitEvent("questionnaire_complete", [state.availablePatternCount]);
    emitStateEvent("questionnaire_complete", [state.availablePatternCount]);
    emitQuestionnaireState();

    if (state.availablePatternCount < DRIFTMAP_MIN_AVAILABLE_PATTERNS) {
        setSlotsBlocked(false, true);
        emitUi(["not_enough_patterns", state.availablePatternCount,
            DRIFTMAP_MIN_AVAILABLE_PATTERNS]);
        emitEvent("not_enough_patterns", [state.availablePatternCount,
            DRIFTMAP_MIN_AVAILABLE_PATTERNS]);
        emitError("not_enough_patterns", false);
        setPhase("not_enough_patterns");
        return;
    }

    state.effectiveMinLikedPatterns = Math.min(state.minLikedPatterns, state.slotList.length);
    if (state.likedPatterns.length < state.effectiveMinLikedPatterns) {
        setSlotsBlocked(false, true);
        emitUi(["not_enough_likes", state.likedPatterns.length,
            state.effectiveMinLikedPatterns]);
        emitEvent("not_enough_likes", [state.likedPatterns.length,
            state.effectiveMinLikedPatterns]);
        emitError("not_enough_likes", false);
        setPhase("not_enough_likes");
        return;
    }

    selectedCount = Math.min(state.likedPatterns.length, state.maxAnchors);
    if (state.likedPatterns.length <= state.maxAnchors) {
        state.selectedPatterns = state.likedPatterns.slice(0);
    } else {
        state.selectedPatterns = shuffledCopy(state.likedPatterns).slice(0, selectedCount);
    }
    emitUi(["selected"].concat(state.selectedPatterns));
    requestDatasetClear("auto");
}

function countAnsweredPatterns() {
    var count = 0;
    var i;
    for (i = 0; i < state.answers.length; i += 1) {
        if (state.answers[i] !== -1) {
            count += 1;
        }
    }
    return count;
}

function filledAnswers(total) {
    var result = [];
    var i;
    for (i = 0; i < total; i += 1) {
        result.push(-1);
    }
    return result;
}

function requestDatasetClear(reason) {
    if (state.trainingActive) {
        deferTrainingAction("clear_map", reason || "manual");
        emitError("clear_deferred", false);
        return;
    }
    stopEmitTask();
    state.queue = [];
    state.pendingClearReason = reason || "manual";
    state.presetReady = false;
    state.awaitingPreset = false;
    outlet(4, ["play_gate", 0]);
    setPhase("clearing_dataset");
    outlet(4, "clear_map");
}

function handleDatasetCleared() {
    var reason = state.pendingClearReason;
    var fullReset = state.resetInProgress && reason === "reset";
    stopEmitTask();
    state.queue = [];
    state.pointCounter = 0;
    state.datasetSize = 0;
    state.batchCurrent = 0;
    state.batchTotal = 0;
    state.pendingClearReason = fullReset ? "reset" : "";
    state.modelHasWeights = false;
    state.realModelState = "train_to_start";
    state.datasetDirty = false;
    resetTrainingMetrics();
    state.modelResetConfirmed = fullReset ? state.resetModelConfirmed : false;
    state.architectureDirty = false;
    state.appliedConfigRevision = -1;
    state.appliedArchitectureRevision = -1;
    emitUi(["dataset_points", 0]);
    emitUi(["model_reset"]);
    emitUi(["map_cleared"]);
    emitModelStatus();
    emitEvent("dataset_cleared", []);
    emitState(["dataset", "size", 0]);
    emitStateEvent("dataset_cleared", []);
    emitTrainingState();

    if (fullReset) {
        state.resetDatasetConfirmed = true;
        completeControllerResetIfReady();
        return;
    } else if (reason === "auto" && state.mode === "auto" && state.selectedPatterns.length > 0) {
        beginAutoBuild();
    } else if (state.mode === "semi") {
        if (validPattern(state.currentPattern)) {
            selectPattern(state.currentPattern);
        } else {
            setPhase("semi_waiting");
        }
    } else if (state.mode === "free") {
        if (validPattern(state.currentPattern)) {
            selectPattern(state.currentPattern);
        } else {
            setPhase("free_waiting");
        }
    } else {
        setPhase("idle");
    }
}

function beginAutoBuild() {
    var counts = distributePoints(state.autoTotalPoints, state.selectedPatterns.length);
    var zones = shuffledCopy([0, 1, 2, 3, 4]);
    var i;
    state.autoGroups = [];
    state.autoTargetSize = state.autoTotalPoints;
    for (i = 0; i < state.selectedPatterns.length; i += 1) {
        state.autoGroups.push({
            patternId: state.selectedPatterns[i],
            zoneIndex: zones[i],
            count: counts[i]
        });
    }
    state.autoGroupIndex = 0;
    setPhase("auto_building");
    emitUi(["mapping_progress", 0, state.autoTargetSize, 0]);
    loadCurrentAutoGroup();
}

function loadCurrentAutoGroup() {
    var group;
    if (state.autoGroupIndex < 0 || state.autoGroupIndex >= state.autoGroups.length) {
        finishAutoBuild();
        return;
    }
    group = state.autoGroups[state.autoGroupIndex];
    loadPattern(group.patternId, "auto_building");
}

function prepareCurrentAutoBatch() {
    var group = state.autoGroups[state.autoGroupIndex];
    var points = pointsForZone(group.zoneIndex, group.count);
    prepareBatch(group.patternId, points);
}

function finishAutoBuild() {
    stopEmitTask();
    state.queue = [];
    if (state.datasetSize !== state.autoTargetSize) {
        emitError("dataset_size_mismatch", true);
        return;
    }
    emitUi(["mapping_progress", state.datasetSize, state.autoTargetSize, 1]);
    emitEvent("dataset_complete", [state.datasetSize]);
    beginManagedTraining("from_scratch");
}

function selectPattern(value) {
    var patternId = toInteger(value);
    if (state.mode !== "semi" && state.mode !== "free") {
        emitError("invalid_mode", false);
        return;
    }
    if (state.trainingActive) {
        emitError("fit_already_running", false);
        return;
    }
    if (!validPattern(patternId)) {
        emitError("invalid_pattern", false);
        return;
    }
    stopEmitTask();
    state.queue = [];
    loadPattern(patternId, state.mode === "semi" ? "semi_loading" : "free_loading");
}

function reportPresetHandshakeStopped(action) {
    emitEvent("preset_handshake", [
        "stopped_waiting_for_preset_ready",
        state.currentPattern,
        action
    ]);
}

function mapHere() {
    var points = [];
    var center;
    var i;
    var axis;
    var point;
    if (state.mode !== "semi") {
        emitError("invalid_mode", false);
        return;
    }
    if (!state.presetReady || state.awaitingPreset) {
        reportPresetHandshakeStopped("map_here");
        emitError("preset_not_ready", false);
        return;
    }
    if (state.phase !== "semi_ready") {
        emitError("invalid_mode", false);
        return;
    }
    if (!state.positionValid) {
        emitError("invalid_position", false);
        return;
    }
    if (state.queue.length > 0 || emitTask !== null) {
        emitError("batch_in_progress", false);
        return;
    }

    center = state.currentPosition.slice(0);
    points.push(center);
    for (i = 1; i < state.semiBatchPoints; i += 1) {
        point = [];
        for (axis = 0; axis < 4; axis += 1) {
            point.push(clip01(center[axis] + ((nextRandom() * 2.0) - 1.0) * state.spread));
        }
        points.push(point);
    }
    setPhase("semi_building");
    prepareBatch(state.currentPattern, points);
}

function addFreePoint() {
    if (state.mode !== "free") {
        emitError("invalid_mode", false);
        return;
    }
    if (!state.presetReady || state.awaitingPreset) {
        reportPresetHandshakeStopped("add_point");
        emitError("preset_not_ready", false);
        return;
    }
    if (state.phase !== "free_ready") {
        emitError("invalid_mode", false);
        return;
    }
    if (!state.positionValid) {
        emitError("invalid_position", false);
        return;
    }
    setPhase("free_building");
    prepareBatch(state.currentPattern, [state.currentPosition.slice(0)]);
}

function prepareBatch(patternId, coordinates) {
    var i;
    state.queue = [];
    for (i = 0; i < coordinates.length; i += 1) {
        state.queue.push({
            patternId: patternId,
            coordinates: coordinates[i].slice(0)
        });
    }
    state.batchCurrent = 0;
    state.batchTotal = coordinates.length;
    state.batchPattern = patternId;
    emitUi(["batch_started", patternId, state.batchTotal]);
    emitEvent("batch_started", [patternId, state.batchTotal]);
    startEmitTask();
}

function startEmitTask() {
    stopEmitTask();
    if (state.queue.length === 0) {
        finishBatch();
        return;
    }
    beginNextPoint();
}

function beginNextPoint() {
    var item;
    if (state.queue.length === 0) {
        finishBatch();
        return;
    }
    item = state.queue.shift();
    state.pendingPoint = item;

    /* Stage 1: write xybuf now. The id is deliberately emitted later. */
    outlet(2, item.coordinates);
    emitUi([
        "point_writing",
        item.patternId,
        item.coordinates[0],
        item.coordinates[1],
        item.coordinates[2],
        item.coordinates[3]
    ]);
    scheduleStep(commitPendingPoint, DRIFTMAP_XY_SETTLE_MS);
}

function commitPendingPoint() {
    var item = state.pendingPoint;
    var pointId;
    var remainingDelay;
    if (item === null) {
        return;
    }
    state.pendingPoint = null;
    state.pointCounter += 1;
    pointId = formatPointId(state.pointCounter);

    /* Stage 2: this id triggers both addpoint messages in Max. */
    outlet(3, pointId);

    state.datasetSize += 1;
    state.batchCurrent += 1;
    state.realModelState = "train_to_start";
    state.datasetDirty = true;
    emitUi([
        "point_added",
        pointId,
        item.patternId,
        item.coordinates[0],
        item.coordinates[1],
        item.coordinates[2],
        item.coordinates[3]
    ]);
    emitUi(["dataset_points", state.datasetSize]);
    if (state.mode === "auto" && state.phase === "auto_building") {
        emitUi(["mapping_progress", state.datasetSize, state.autoTargetSize, 0]);
    }
    emitUi(["batch_progress", state.batchCurrent, state.batchTotal]);
    emitState(["dataset", "size", state.datasetSize]);
    emitStateEvent("point_added", [pointId]);
    emitModelState();

    if (state.queue.length === 0) {
        scheduleStep(finishBatch, DRIFTMAP_FINAL_SETTLE_MS);
    } else {
        remainingDelay = Math.max(0, DRIFTMAP_POINT_CYCLE_MS - DRIFTMAP_XY_SETTLE_MS);
        scheduleStep(beginNextPoint, remainingDelay);
    }
}

function finishBatch() {
    var finishedPattern = state.batchPattern;
    var finishedTotal = state.batchTotal;
    stopEmitTask();
    state.queue = [];
    emitUi(["batch_finished", finishedPattern, finishedTotal]);
    emitEvent("batch_finished", [finishedPattern, finishedTotal]);

    if (state.mode === "auto" && state.phase === "auto_building") {
        state.autoGroupIndex += 1;
        if (state.autoGroupIndex < state.autoGroups.length) {
            /* The 250 ms point cadence must also survive a preset boundary.
             * The batch already consumed XY settle + final settle, so wait
             * only the remaining part before requesting the next preset. */
            scheduleStep(loadCurrentAutoGroup, Math.max(0,
                DRIFTMAP_POINT_CYCLE_MS - DRIFTMAP_XY_SETTLE_MS -
                DRIFTMAP_FINAL_SETTLE_MS));
        } else {
            loadCurrentAutoGroup();
        }
    } else if (state.mode === "semi") {
        setPhase("semi_ready");
        if (state.autoFit) {
            handleLegacyTrain();
        }
    } else if (state.mode === "free") {
        setPhase("free_ready");
        if (state.autoFit) {
            handleLegacyTrain();
        }
    }
}

function cancelScheduledTask() {
    if (emitTask !== null) {
        emitTask.cancel();
        emitTask = null;
    }
    scheduledStep = null;
}

function stopEmitTask() {
    cancelScheduledTask();
    state.pendingPoint = null;
}

function scheduleStep(step, delayMs) {
    cancelScheduledTask();
    scheduledStep = step;
    emitTask = new Task(runScheduledStep, this);
    emitTask.schedule(Math.max(0, delayMs));
}

function runScheduledStep() {
    var step = scheduledStep;
    emitTask = null;
    scheduledStep = null;
    if (step !== null) {
        step();
    }
}

function notifydeleted() {
    stopEmitTask();
    cancelTrainingTask();
    cancelOverlayTask();
}

function scheduleTrainingStep(step) {
    cancelTrainingTask();
    scheduledTrainingStep = step;
    trainingTask = new Task(runScheduledTrainingStep, this);
    trainingTask.schedule(0);
}

function runScheduledTrainingStep() {
    var step = scheduledTrainingStep;
    trainingTask = null;
    scheduledTrainingStep = null;
    if (step !== null) {
        step();
    }
}

function cancelTrainingTask() {
    if (trainingTask !== null) {
        trainingTask.cancel();
        trainingTask = null;
    }
    scheduledTrainingStep = null;
}

function loadPattern(patternId, phase) {
    if (!validPattern(patternId)) {
        emitError("invalid_pattern", false);
        return;
    }
    state.currentPattern = patternId;
    state.presetReady = false;
    state.awaitingPreset = true;
    state.questionnaireAwaitingPreset = phase === "questionnaire_loading";
    if (phase === "questionnaire_loading") {
        state.questionnaireCurrentPattern = patternId;
    }
    setPhase(phase);
    emitUi(["pattern_loading", patternId]);
    emitEvent("pattern_loading", [patternId]);
    emitEvent("preset_handshake", [
        "select_pattern_sent",
        patternId,
        "waiting_for_preset_ready"
    ]);
    if (phase === "questionnaire_loading") {
        emitUi(["questionnaire_progress", state.questionnaireIndex + 1,
            state.slotList.length,
            countAnsweredPatterns(), 0]);
        emitQuestionnaireState();
    }
    outlet(1, patternId);
}

function handlePresetReady(value) {
    var patternId = toInteger(value);
    var externallySelected = !state.questionnaireActive && !state.awaitingPreset &&
        ((state.mode === "semi" || state.mode === "free") ||
        (state.mode === "auto" && state.phase === "idle" &&
        !state.slotsBlocked && !state.trainingActive));
    if (!validPattern(patternId)) {
        emitEvent("preset_handshake", [
            "stopped_invalid_preset_ready",
            patternId,
            state.currentPattern
        ]);
        emitError("preset_not_ready", false);
        return;
    }
    if (externallySelected && state.slotListDeclared &&
            !patternInSlotList(patternId)) {
        emitWarning("preset_not_in_slotlist", [patternId]);
    }
    if (!state.awaitingPreset && !externallySelected) {
        emitEvent("preset_handshake", [
            "stopped_no_active_request",
            patternId,
            state.currentPattern
        ]);
        emitError("preset_not_ready", false);
        return;
    }
    if (state.awaitingPreset && patternId !== state.currentPattern) {
        emitEvent("preset_handshake", [
            "stopped_wrong_pattern",
            patternId,
            state.currentPattern
        ]);
        emitError("preset_not_ready", false);
        return;
    }
    state.currentPattern = patternId;
    state.awaitingPreset = false;
    state.questionnaireAwaitingPreset = false;
    state.presetReady = true;
    emitEvent("preset_handshake", [
        "preset_ready_received",
        patternId,
        "pattern_ready_confirmed"
    ]);
    emitUi(["pattern_ready", patternId]);
    emitEvent("pattern_ready", [patternId]);
    emitState(["dataset", "pattern", patternId]);

    if (state.phase === "questionnaire_loading") {
        state.questionnaireCurrentPattern = patternId;
        emitUi(["questionnaire_progress", state.questionnaireIndex + 1,
            state.slotList.length,
            countAnsweredPatterns(), 0]);
        setPhase("questionnaire_waiting");
        emitQuestionnaireState();
    } else if (state.mode === "auto" && state.phase === "auto_building") {
        prepareCurrentAutoBatch();
    } else if (state.mode === "semi") {
        setPhase("semi_ready");
    } else if (state.mode === "free") {
        setPhase("free_ready");
    }
}

function handleEndOfBank(value) {
    var lastValidPatternId = toInteger(value);
    if (!isFiniteNumber(lastValidPatternId) || lastValidPatternId < 0) {
        emitWarning("invalid_legacy_end_of_bank", [value]);
        return;
    }
    emitWarning("legacy_end_of_bank_ignored", [lastValidPatternId]);
    emitEvent("legacy_end_of_bank_ignored", [lastValidPatternId]);
}

function handleExternalTrainingError(value) {
    var code = String(value || "unknown");
    cancelTrainingTask();
    state.trainingActive = false;
    state.fitInFlight = false;
    state.pendingFitRound = 0;
    state.stopRequested = false;
    state.pendingTrainingAction = "";
    state.realModelState = "failed";
    emitUi(["modelstate", "failed"]);
    emitUi(["training_error", code]);
    emitEvent("engine_training_error", [code]);
    emitStateEvent("engine_training_error", [code]);
    emitModelState();
    emitError("training_error", true);
}

function abortQuestionnaireWithError(reason) {
    stopEmitTask();
    setSlotsBlocked(false, true);
    resetQuestionnaireSession();
    emitUi(["questionnaire_reset"]);
    emitUi(["questionnaire_total", state.slotList.length]);
    emitUi(["questionnaire_progress", 0, state.slotList.length, 0, 0]);
    emitEvent("questionnaire_error", [reason]);
    emitQuestionnaireState();
    emitError(reason === "preset_timeout" ? "preset_timeout" : "questionnaire_error", true);
}

function handleLegacyTrain() {
    var automatic;
    if (state.mode === "auto") {
        beginManagedTraining("from_scratch");
    } else if (state.mode === "semi") {
        automatic = getAutomaticProfile(state.datasetSize);
        if (state.modelHasWeights && !state.architectureDirty &&
                state.mlp !== null && sameArchitecture(state.mlp, automatic)) {
            beginManagedTraining("continue");
        } else {
            beginManagedTraining("from_scratch");
        }
    } else if (state.mode === "free") {
        beginManagedTraining("from_scratch");
    } else {
        emitError("invalid_mode", false);
    }
}

function beginManagedTraining(mode) {
    var automatic;
    var requestedMode = mode === "continue" ? "continue" : "from_scratch";
    if (state.datasetSize <= 0) {
        emitError("empty_dataset", false);
        return;
    }
    if (state.queue.length > 0 || emitTask !== null) {
        emitError("batch_in_progress", false);
        return;
    }
    if (state.trainingActive) {
        emitError("fit_already_running", false);
        return;
    }

    if (state.mode === "auto" || state.mode === "semi") {
        automatic = getAutomaticProfile(state.datasetSize);
        if (requestedMode === "continue" && state.mlp !== null &&
                !sameArchitecture(state.mlp, automatic)) {
            emitError("architecture_reset_required", false);
            return;
        }
        selectAutomaticModelConfig();
    } else if (state.mode === "free") {
        ensureFreeModelConfig();
    } else {
        emitError("invalid_mode", false);
        return;
    }

    if (requestedMode === "continue" &&
            (!state.modelHasWeights || state.architectureDirty)) {
        emitError("architecture_reset_required", false);
        return;
    }

    setSlotsBlocked(true, false);
    state.trainingActive = true;
    state.trainingMode = requestedMode;
    state.pendingFitRound = 0;
    state.fitInFlight = false;
    if (requestedMode === "from_scratch") {
        resetTrainingMetrics();
    } else {
        /* CONTINUE is a new fitting session with the current weights. Keep
         * the historical losses, but give convergence a fresh round budget. */
        state.training.fitRound = 0;
        state.training.plateau = 0;
        state.previousLoss = state.training.currentLoss;
    }
    state.stopRequested = false;
    state.architectureChangeDuringTraining = false;
    state.pendingTrainingAction = "";
    state.pendingMode = "";
    state.modelConfigRevision += 1;
    state.realModelState = "training";

    outlet(4, ["play_gate", 0]);
    setPhase("training");
    emitUi(["modelstate", "training"]);
    emitUi(["training_started", state.datasetSize, requestedMode]);
    emitEvent("training_started", [state.datasetSize, requestedMode]);
    emitStateEvent("training_started", [state.datasetSize, requestedMode]);
    emitTrainingState();
    emitModelState();

    if (requestedMode === "from_scratch") {
        state.modelResetConfirmed = false;
        state.pendingTrainingAction = "train_after_reset";
        outlet(4, "reset_model");
    } else {
        state.pendingTrainingAction = "fit_after_config";
        applyModelConfiguration();
    }
}

function getAutomaticProfile(datasetSize) {
    var i;
    var size = Math.max(1, toInteger(datasetSize));
    for (i = 0; i < DRIFTMAP_MLP_AUTO_PROFILES.length; i += 1) {
        if (size >= DRIFTMAP_MLP_AUTO_PROFILES[i].minPoints &&
                size <= DRIFTMAP_MLP_AUTO_PROFILES[i].maxPoints) {
            return cloneModelConfig(DRIFTMAP_MLP_AUTO_PROFILES[i]);
        }
    }
    return cloneModelConfig(DRIFTMAP_MLP_AUTO_PROFILES[DRIFTMAP_MLP_AUTO_PROFILES.length - 1]);
}

function selectAutomaticModelConfig() {
    var profile = getAutomaticProfile(state.datasetSize);
    installModelConfig(profile, "auto");
    return profile;
}

function ensureFreeModelConfig() {
    if (state.mlp === null || state.modelConfigSource !== "manual") {
        installModelConfig(cloneModelConfig(DRIFTMAP_MLP_DEFAULTS), "manual");
    }
}

function restoreFreeModelDefaults() {
    var defaults = DRIFTMAP_MLP_DEFAULTS;
    setMlpParameter("mlp_hiddenlayers", defaults.hiddenLayers, "defaults");
    setMlpParameter("mlp_activation", [defaults.activation], "defaults");
    setMlpParameter("mlp_outputactivation", [defaults.outputActivation], "defaults");
    setMlpParameter("mlp_batchsize", [defaults.batchSize], "defaults");
    setMlpParameter("mlp_maxiter", [defaults.maxIter], "defaults");
    setMlpParameter("mlp_learnrate", [defaults.learnRate], "defaults");
    setMlpParameter("mlp_validation", [defaults.validation], "defaults");
    setMlpParameter("mlp_max_fit_rounds", [defaults.maxFitRounds], "defaults");
    setMlpParameter("mlp_patience", [defaults.patience], "defaults");
    setMlpParameter("mlp_min_improvement", [defaults.minImprovement], "defaults");
    emitUi(["model_defaults_restored"]);
    emitEvent("model_defaults_restored", []);
}

function installModelConfig(config, source) {
    var previous = state.mlp;
    var next = cloneModelConfig(config);
    var changedArchitecture = previous === null || !sameArchitecture(previous, next);
    next.patience = config.patience !== undefined ? config.patience : DRIFTMAP_MLP_CONVERGENCE.patience;
    next.minImprovement = config.minImprovement !== undefined ?
        config.minImprovement : DRIFTMAP_MLP_CONVERGENCE.minImprovement;
    next.minFitRounds = DRIFTMAP_MLP_CONVERGENCE.minFitRounds;
    next.epsilon = DRIFTMAP_MLP_CONVERGENCE.epsilon;
    state.mlp = next;
    state.modelConfigSource = source;
    state.modelConfigRevision += 1;
    if (changedArchitecture) {
        state.architectureRevision += 1;
        state.architectureDirty = previous !== null && state.modelHasWeights;
    }
    emitMlpState();
    emitModelStatus();
}

function cloneModelConfig(source) {
    return {
        name: source.name || "manual",
        minPoints: source.minPoints,
        maxPoints: source.maxPoints,
        hiddenLayers: source.hiddenLayers.slice(0),
        activation: Number(source.activation),
        outputActivation: Number(source.outputActivation),
        batchSize: Number(source.batchSize),
        maxIter: Number(source.maxIter),
        learnRate: Number(source.learnRate),
        validation: Number(source.validation),
        maxFitRounds: Number(source.maxFitRounds),
        patience: source.patience,
        minImprovement: source.minImprovement
    };
}

function sameArchitecture(first, second) {
    var i;
    if (first === null || second === null ||
            first.activation !== second.activation ||
            first.outputActivation !== second.outputActivation ||
            first.hiddenLayers.length !== second.hiddenLayers.length) {
        return false;
    }
    for (i = 0; i < first.hiddenLayers.length; i += 1) {
        if (first.hiddenLayers[i] !== second.hiddenLayers[i]) {
            return false;
        }
    }
    return true;
}

function applyModelConfiguration() {
    emitMlpConfigurationToEngine(true);
}

function emitMlpConfigurationToEngine(includeCommit) {
    var config = state.mlp;
    var effectiveBatchSize;
    if (config === null || (includeCommit && !state.trainingActive)) {
        return;
    }
    effectiveBatchSize = state.datasetSize > 0 ?
        Math.min(config.batchSize, state.datasetSize) : config.batchSize;
    if (effectiveBatchSize !== config.batchSize) {
        emitUi(["model_config_adjusted", "batchsize", effectiveBatchSize]);
    }
    outlet(4, ["mlp_hiddenlayers"].concat(config.hiddenLayers));
    outlet(4, ["mlp_activation", config.activation]);
    outlet(4, ["mlp_outputactivation", config.outputActivation]);
    outlet(4, ["mlp_batchsize", effectiveBatchSize]);
    outlet(4, ["mlp_maxiter", config.maxIter]);
    outlet(4, ["mlp_learnrate", config.learnRate]);
    outlet(4, ["mlp_validation", config.validation]);
    if (includeCommit) {
        outlet(4, ["mlp_config_commit", state.modelConfigRevision]);
        emitEvent("model_config_sent", [state.modelConfigRevision]);
    }
}

function handleModelConfigApplied(value) {
    var revision = toInteger(value);
    if (!state.trainingActive || revision !== state.modelConfigRevision) {
        emitError("stale_config_ack", false);
        return;
    }
    state.appliedConfigRevision = revision;
    state.appliedArchitectureRevision = state.architectureRevision;
    if (state.trainingMode === "from_scratch" && state.modelResetConfirmed) {
        state.architectureDirty = false;
    }
    emitUi(["model_config_applied", revision]);
    emitEvent("model_config_applied", [revision]);
    emitPendingMlpApplied();
    if (state.stopRequested) {
        finishManagedTraining(state.architectureChangeDuringTraining ?
            "architecture_changed" : "user_stop");
        return;
    }
    state.pendingTrainingAction = "";
    scheduleTrainingStep(requestNextFit);
}

function requestNextFit() {
    if (!state.trainingActive || state.fitInFlight) {
        return;
    }
    if (state.stopRequested) {
        finishManagedTraining("user_stop");
        return;
    }
    state.training.fitRound += 1;
    state.pendingFitRound = state.training.fitRound;
    state.fitInFlight = true;
    outlet(4, ["fit_request", state.training.fitRound]);
    emitUi(["fit_started", state.training.fitRound, state.mlp.maxFitRounds]);
    emitEvent("fit_started", [state.training.fitRound, state.mlp.maxFitRounds]);
    emitTrainingState();
}

function handleFitResult(roundValue, lossValue) {
    var round = toInteger(roundValue);
    var loss = Number(lossValue);
    var improvement = 0;
    var previousBest;
    var stopReason;
    if (!state.trainingActive || !state.fitInFlight ||
            round !== state.pendingFitRound || !isFiniteNumber(loss)) {
        emitError("stale_fit_result", false);
        return;
    }

    state.fitInFlight = false;
    state.training.currentLoss = loss;
    state.modelHasWeights = true;
    if (state.training.bestLoss === null) {
        state.training.bestLoss = loss;
        state.previousLoss = loss;
        state.training.plateau = 0;
    } else {
        previousBest = state.training.bestLoss;
        improvement = previousBest - loss;
        if (improvement >= state.mlp.minImprovement) {
            state.training.bestLoss = loss;
            state.training.plateau = 0;
        } else {
            state.training.plateau += 1;
            if (loss < state.training.bestLoss) {
                state.training.bestLoss = loss;
            }
        }
        state.previousLoss = loss;
    }

    emitUi([
        "fit_result",
        round,
        loss,
        state.training.bestLoss,
        improvement,
        state.training.plateau,
        state.mlp.patience
    ]);
    emitEvent("fit_result", [round, loss, state.training.bestLoss, improvement]);
    emitTrainingState();

    if (state.architectureChangeDuringTraining) {
        finishManagedTraining("architecture_changed");
        return;
    }
    stopReason = evaluateConvergence();
    if (stopReason !== "") {
        finishManagedTraining(stopReason);
    } else if (state.appliedConfigRevision !== state.modelConfigRevision) {
        state.pendingTrainingAction = "fit_after_config";
        applyModelConfiguration();
    } else {
        scheduleTrainingStep(requestNextFit);
    }
}

function evaluateConvergence() {
    if (state.stopRequested) {
        return "user_stop";
    }
    if (state.training.fitRound >= state.mlp.maxFitRounds) {
        return "max_rounds";
    }
    if (state.training.fitRound >= state.mlp.minFitRounds &&
            state.training.plateau >= state.mlp.patience) {
        return "plateau";
    }
    return "";
}

function handleFitError(roundValue, errorValue) {
    var round = toInteger(roundValue);
    var code = String(errorValue || "unknown");
    if (!state.trainingActive || !state.fitInFlight || round !== state.pendingFitRound) {
        emitError("stale_fit_result", false);
        return;
    }
    state.fitInFlight = false;
    state.trainingActive = false;
    state.stopRequested = false;
    state.pendingTrainingAction = "";
    state.realModelState = "failed";
    emitUi(["modelstate", "failed"]);
    emitUi(["training_error", code]);
    emitModelState();
    emitError("training_error", true);
}

function finishManagedTraining(reason) {
    var action = state.pendingTrainingAction;
    var actionValue = state.pendingMode;
    var hasResult = state.training.bestLoss !== null;
    var successful = reason === "plateau" || reason === "max_rounds" ||
        (reason === "user_stop" && hasResult);

    state.trainingActive = false;
    state.fitInFlight = false;
    state.pendingFitRound = 0;
    state.stopRequested = false;
    state.pendingTrainingAction = "";
    state.pendingMode = "";
    cancelTrainingTask();
    setSlotsBlocked(false, true);

    if (successful && action === "") {
        state.architectureDirty = false;
        state.datasetDirty = false;
        state.realModelState = "ready";
        emitUi(["training_done", reason, state.training.fitRound, state.training.bestLoss]);
        emitEvent("training_done", [reason, state.training.fitRound, state.training.bestLoss]);
        emitStateEvent("training_done", [reason, state.training.fitRound, state.training.bestLoss]);
        if (reason === "user_stop") {
            emitStateEvent("training_stopped", [reason]);
        }
        emitModelStatus();
        if (state.mode === "auto") {
            setView("explore");
        }
        restoreModePhase();
        showModelReadyState();
        outlet(4, ["play_gate", 1]);
    } else if (reason === "architecture_changed") {
        state.realModelState = "train_to_start";
        state.architectureDirty = true;
        emitModelState();
        restoreModePhase();
    } else {
        state.realModelState = state.modelHasWeights && !state.architectureDirty ?
            "ready" : "train_to_start";
        emitStateEvent("training_stopped", [reason]);
        emitModelState();
        restoreModePhase();
    }
    executeDeferredAction(action, actionValue);
}

function requestTrainingStop() {
    if (!state.trainingActive) {
        emitError("training_not_active", false);
        return;
    }
    state.stopRequested = true;
    emitUi(["training_stop_requested"]);
    if (!state.fitInFlight && state.pendingTrainingAction === "") {
        finishManagedTraining("user_stop");
    }
}

function stopManagedTraining() {
    requestTrainingStop();
}

function requestModelReset() {
    if (state.trainingActive) {
        deferTrainingAction("reset_model", "");
        emitError("reset_deferred", false);
        return;
    }
    state.modelResetConfirmed = false;
    state.pendingTrainingAction = "manual_reset";
    outlet(4, "reset_model");
}

function handleModelResetDone() {
    var action = state.pendingTrainingAction;
    state.modelHasWeights = false;
    state.datasetDirty = false;
    state.modelResetConfirmed = true;
    state.appliedConfigRevision = -1;
    state.appliedArchitectureRevision = -1;
    resetTrainingMetrics();
    state.realModelState = "train_to_start";
    if (action === "manual_reset") {
        state.architectureDirty = false;
    }
    emitUi(["model_reset"]);
    emitModelStatus();
    emitTrainingState();
    emitStateEvent("model_reset", []);

    if (state.resetInProgress) {
        state.resetModelConfirmed = true;
        completeControllerResetIfReady();
        return;
    }

    if (state.trainingActive && state.stopRequested) {
        finishManagedTraining("user_stop");
    } else if (action === "train_after_reset" && state.trainingActive) {
        state.pendingTrainingAction = "fit_after_config";
        applyModelConfiguration();
    } else if (action === "manual_reset") {
        state.pendingTrainingAction = "";
        restoreModePhase();
    }
}

function completeControllerResetIfReady() {
    if (!state.resetInProgress || !state.resetDatasetConfirmed ||
            !state.resetModelConfirmed) {
        emitOverlayState();
        return;
    }
    state.resetInProgress = false;
    state.pendingClearReason = "";
    state.modelResetConfirmed = true;
    state.realModelState = "train_to_start";
    emitMlpConfigurationToEngine(false);
    emitAllMlpApplied();
    emitMlpState();
    emitUi(["reset_complete"]);
    emitEvent("reset_complete", []);
    emitStateEvent("reset_complete", []);
    setPhase("idle");
}

function deferTrainingAction(action, value) {
    state.stopRequested = true;
    state.pendingTrainingAction = action;
    state.pendingMode = value || "";
    emitUi(["training_stop_requested"]);
}

function executeDeferredAction(action, value) {
    if (action === "reset_controller") {
        resetController();
    } else if (action === "clear_map") {
        requestDatasetClear(value || "manual");
    } else if (action === "reset_model") {
        requestModelReset();
    } else if (action === "mode") {
        applyMode(value);
    }
}

function restoreModePhase() {
    if (state.mode === "semi") {
        setPhase(state.presetReady && validPattern(state.currentPattern) ? "semi_ready" : "semi_waiting");
    } else if (state.mode === "free") {
        setPhase(state.presetReady && validPattern(state.currentPattern) ? "free_ready" : "free_waiting");
    } else {
        setPhase("idle");
    }
}

function receivePosition(args) {
    var result = [];
    var i;
    var value;
    if (args.length !== 4) {
        emitError("invalid_position", false);
        return;
    }
    for (i = 0; i < 4; i += 1) {
        value = Number(args[i]);
        if (!isFiniteNumber(value) || value < 0 || value > 1) {
            emitError("invalid_position", false);
            return;
        }
        result.push(value);
    }
    state.currentPosition = result;
    state.positionValid = true;
    /* `position` is reserved by Max UI boxes and moves a jsui object. */
    emitUi(["coordinates"].concat(result));
}

function setPhase(phase) {
    var publicState;
    state.phase = phase;
    if (phase === "questionnaire_loading" || phase === "questionnaire_waiting" ||
            phase === "questionnaire_complete") {
        publicState = "questionnaire";
    } else if (phase === "clearing_dataset") {
        publicState = state.mode === "semi" ? "semi" : (state.mode === "free" ? "free" : "auto_building");
    } else if (phase === "auto_building") {
        publicState = "auto_building";
    } else if (phase === "semi_waiting" || phase === "semi_loading" ||
            phase === "semi_ready" || phase === "semi_building") {
        publicState = "semi";
    } else if (phase === "free_waiting" || phase === "free_loading" ||
            phase === "free_ready" || phase === "free_building") {
        publicState = "free";
    } else {
        publicState = phase;
    }
    emitUi(["state", publicState]);
    setOverlay(overlayForPhase(phase));
}

function overlayForPhase(phase) {
    if (phase === "questionnaire_loading" || phase === "questionnaire_waiting" ||
            phase === "questionnaire_complete") {
        return "questionnaire";
    }
    if (phase === "auto_building" ||
            (phase === "clearing_dataset" && state.pendingClearReason === "auto")) {
        return "creating_map";
    }
    if (phase === "training") {
        return "training";
    }
    if (phase === "not_enough_patterns" || phase === "not_enough_likes" ||
            phase === "error") {
        return phase;
    }
    return "none";
}

function interactionShouldLock() {
    return state.resetInProgress || state.overlay !== "none" ||
        state.phase === "clearing_dataset" || state.phase === "semi_loading" ||
        state.phase === "free_loading" || state.phase === "semi_building" ||
        state.phase === "free_building";
}

function setOverlay(value) {
    var next = String(value || "none");
    if (next !== "model_ready") {
        cancelOverlayTask();
    }
    state.overlay = next;
    state.interactionLocked = interactionShouldLock();
    emitUi(["overlay", next]);
    emitState(["ui", "overlay", next]);
    emitState(["ui", "interaction_locked", state.interactionLocked ? 1 : 0]);
}

function emitOverlayState() {
    state.interactionLocked = interactionShouldLock();
    emitState(["ui", "overlay", state.overlay]);
    emitState(["ui", "interaction_locked", state.interactionLocked ? 1 : 0]);
}

function showModelReadyState() {
    cancelOverlayTask();
    setOverlay("model_ready");
    overlayTask = new Task(finishModelReadyState, this);
    overlayTask.schedule(DRIFTMAP_MODEL_READY_MS);
}

function finishModelReadyState() {
    if (overlayTask !== null) {
        overlayTask.cancel();
        overlayTask = null;
    }
    if (state.overlay === "model_ready") {
        setOverlay("none");
    }
}

function cancelOverlayTask() {
    if (overlayTask !== null) {
        overlayTask.cancel();
        overlayTask = null;
    }
}

function setSeed(value) {
    var parsed = toInteger(value);
    if (!isFiniteNumber(parsed)) {
        emitError("invalid_seed", false);
        return;
    }
    state.seed = normalizeSeed(parsed);
    state.rngState = state.seed;
}

function setSpread(value) {
    var parsed = Number(value);
    if (!isFiniteNumber(parsed) || parsed < 0 || parsed > 1) {
        emitError("invalid_spread", false);
        return;
    }
    state.spread = parsed;
    emitUi(["spread", parsed]);
}

function setAutoPoints(value) {
    var parsed = toInteger(value);
    if (!isFiniteNumber(parsed) || parsed < 1 || parsed > DRIFTMAP_MAX_BATCH_POINTS) {
        emitError("invalid_point_count", false);
        return;
    }
    state.autoTotalPoints = parsed;
    emitUi(["auto_points", parsed]);
    emitState(["dataset", "auto_points", parsed]);
}

function setBatchPoints(value) {
    var parsed = toInteger(value);
    if (!isFiniteNumber(parsed) || parsed < DRIFTMAP_MIN_BATCH_POINTS ||
            parsed > DRIFTMAP_MAX_BATCH_POINTS) {
        emitError("invalid_point_count", false);
        return;
    }
    state.semiBatchPoints = parsed;
    emitUi(["batch_points", parsed]);
    emitState(["dataset", "batch_points", parsed]);
}

function setManualModelParameter(name, args) {
    setMlpParameter(name, args, "command");
}

function setMlpParameter(name, args, source) {
    var meta = mlpParameterMeta(name);
    var value = validateMlpValue(name, args);
    var changed;
    if (meta === null || value === null) {
        emitError("invalid_mlp_parameter", false);
        return false;
    }
    changed = meta.property === "hiddenLayers" ?
        !sameNumberList(state.mlp.hiddenLayers, value) : state.mlp[meta.property] !== value;
    state.mlp[meta.property] = meta.property === "hiddenLayers" ? value.slice(0) : value;
    state.modelConfigSource = source === "automatic" ? "auto" : "manual";
    if (!changed) {
        emitMlpState();
        return true;
    }
    if (meta.engine) {
        state.modelConfigRevision += 1;
    }
    if (meta.category === "architecture") {
        state.architectureRevision += 1;
        state.architectureDirty = state.modelHasWeights || state.trainingActive;
    }

    if (state.trainingActive) {
        if (meta.category === "architecture") {
            state.architectureChangeDuringTraining = true;
            state.stopRequested = true;
            markMlpPending(meta.stateName);
        } else if (meta.category === "learning") {
            markMlpPending(meta.stateName);
            if (!state.fitInFlight) {
                applyModelConfiguration();
            }
        } else {
            emitMlpApplied(meta.stateName);
        }
    } else {
        if (meta.engine) {
            outlet(4, [meta.command].concat(valueAsList(value)));
        }
        emitMlpApplied(meta.stateName);
    }
    emitMlpState();
    emitModelStatus();
    return true;
}

function mlpParameterMeta(name) {
    var table = {
        mlp_hiddenlayers: {property: "hiddenLayers", stateName: "hiddenlayers", command: "mlp_hiddenlayers", category: "architecture", engine: true},
        mlp_activation: {property: "activation", stateName: "activation", command: "mlp_activation", category: "architecture", engine: true},
        mlp_outputactivation: {property: "outputActivation", stateName: "outputactivation", command: "mlp_outputactivation", category: "architecture", engine: true},
        mlp_batchsize: {property: "batchSize", stateName: "batchsize", command: "mlp_batchsize", category: "learning", engine: true},
        mlp_maxiter: {property: "maxIter", stateName: "maxiter", command: "mlp_maxiter", category: "learning", engine: true},
        mlp_learnrate: {property: "learnRate", stateName: "learnrate", command: "mlp_learnrate", category: "learning", engine: true},
        mlp_validation: {property: "validation", stateName: "validation", command: "mlp_validation", category: "learning", engine: true},
        mlp_max_fit_rounds: {property: "maxFitRounds", stateName: "max_fit_rounds", command: "", category: "convergence", engine: false},
        mlp_patience: {property: "patience", stateName: "patience", command: "", category: "convergence", engine: false},
        mlp_min_improvement: {property: "minImprovement", stateName: "min_improvement", command: "", category: "convergence", engine: false}
    };
    return table.hasOwnProperty(name) ? table[name] : null;
}

function validateMlpValue(name, args) {
    var value;
    var layers;
    var i;
    if (name === "mlp_hiddenlayers") {
        if (args.length < 1 || args.length > 2) {
            return null;
        }
        layers = [];
        for (i = 0; i < args.length; i += 1) {
            value = Number(args[i]);
            if (!isFiniteNumber(value) || Math.floor(value) !== value || value <= 0) {
                return null;
            }
            layers.push(value);
        }
        return layers;
    }
    value = Number(args[0]);
    if (!isFiniteNumber(value)) {
        return null;
    }
    if (name === "mlp_activation" || name === "mlp_outputactivation") {
        return Math.floor(value) === value && value >= 0 && value <= 3 ? value : null;
    }
    if (name === "mlp_batchsize" || name === "mlp_maxiter" ||
            name === "mlp_max_fit_rounds" || name === "mlp_patience") {
        return Math.floor(value) === value && value > 0 ? value : null;
    }
    if (name === "mlp_learnrate") {
        return value > 0 ? value : null;
    }
    if (name === "mlp_validation") {
        return value >= 0 && value < 1 ? value : null;
    }
    if (name === "mlp_min_improvement") {
        return value >= 0 ? value : null;
    }
    return null;
}

function emitModelStatus() {
    var status;
    var uiState;
    if (state.architectureDirty) {
        status = "reset_required";
    } else if (state.modelHasWeights && !state.datasetDirty && !state.architectureDirty) {
        status = "trained";
    } else {
        status = "untrained";
    }
    emitUi(["model_status", status]);
    if (state.trainingActive) {
        uiState = "training";
        state.realModelState = "training";
    } else if (state.realModelState === "failed") {
        uiState = "failed";
    } else if (state.modelHasWeights) {
        uiState = "ready";
        state.realModelState = "ready";
    } else {
        uiState = "empty";
        state.realModelState = "train_to_start";
    }
    emitUi(["modelstate", uiState]);
    emitModelState();
}

function resetTrainingMetrics() {
    state.training.fitRound = 0;
    state.pendingFitRound = 0;
    state.training.currentLoss = null;
    state.previousLoss = null;
    state.training.bestLoss = null;
    state.training.plateau = 0;
}

function emitState(message) {
    outlet(5, message);
}

function emitStateEvent(name, args) {
    emitState(["event", name].concat(args || []));
}

function emitStateSnapshot() {
    emitState(["ui", "view", state.view]);
    emitState(["ui", "mode", state.mode]);
    emitModelState();
    emitOverlayState();
    emitSlotsState();
    emitState(["dataset", "size", state.datasetSize]);
    emitState(["dataset", "pattern", state.currentPattern]);
    emitState(["dataset", "auto_points", state.autoTotalPoints]);
    emitState(["dataset", "batch_points", state.semiBatchPoints]);
    emitState(["dataset", "minlikes", state.minLikedPatterns]);
    emitState(["dataset", "effective_minlikes", state.effectiveMinLikedPatterns]);
    emitState(["dataset", "maxanchors", state.maxAnchors]);
    emitState(["dataset", "showmappoints", state.showMapPoints ? 1 : 0]);
    emitState(["dataset", "showexplorepoints", state.showExplorePoints ? 1 : 0]);
    emitState(["dataset", "showlearnpoints", state.showLearnPoints ? 1 : 0]);
    emitState(["dataset", "showexploremap", state.showExploreMap ? 1 : 0]);
    emitState(["dataset", "showlearnmap", state.showLearnMap ? 1 : 0]);
    emitMlpState();
    emitTrainingState();
    emitQuestionnaireState();
}

function emitSlotsState() {
    emitState(["slots", "list"].concat(state.slotList));
    emitState(["slots", "count", state.slotList.length]);
}

function emitModelState() {
    var display = modelDisplayState();
    emitState(["ui", "model", display]);
    emitState(["status_text", statusTextFor(display)]);
}

function modelDisplayState() {
    if (state.modelBypass) {
        return "off";
    }
    if (state.trainingActive || state.realModelState === "training") {
        return "training";
    }
    if (state.realModelState === "failed") {
        return "failed";
    }
    if (state.modelHasWeights && !state.architectureDirty && !state.datasetDirty &&
            state.realModelState === "ready") {
        return "ready";
    }
    return "train_to_start";
}

function statusTextFor(display) {
    var modeLabel = state.mode === "semi" ? "GUIDED" :
        (state.mode === "free" ? "FREE MAPPING" : "AUTONOMOUS");
    if (display === "off") {
        return "MODEL OFF";
    }
    if (display === "training") {
        return modeLabel + " • MODEL TRAINING";
    }
    if (display === "ready") {
        return modeLabel + " • MODEL READY";
    }
    if (display === "failed") {
        return modeLabel + " • MODEL FAILED";
    }
    return modeLabel + " • TRAIN TO START";
}

function emitMlpState() {
    var config = state.mlp;
    emitState(["mlp", "hiddenlayers"].concat(config.hiddenLayers));
    emitState(["mlp", "activation", config.activation]);
    emitState(["mlp", "outputactivation", config.outputActivation]);
    emitState(["mlp", "batchsize", config.batchSize]);
    emitState(["mlp", "maxiter", config.maxIter]);
    emitState(["mlp", "learnrate", config.learnRate]);
    emitState(["mlp", "validation", config.validation]);
    emitState(["mlp", "max_fit_rounds", config.maxFitRounds]);
    emitState(["mlp", "patience", config.patience]);
    emitState(["mlp", "min_improvement", config.minImprovement]);
}

function emitTrainingState() {
    emitState(["training", "current_loss", nullableAtom(state.training.currentLoss)]);
    emitState(["training", "best_loss", nullableAtom(state.training.bestLoss)]);
    emitState(["training", "fit_round", state.training.fitRound]);
    emitState(["training", "plateau", state.training.plateau]);
    emitState(["training", "patience", state.mlp.patience]);
}

function emitQuestionnaireState() {
    emitState(["questionnaire", "active", state.questionnaireActive ? 1 : 0]);
    emitState(["questionnaire", "index", state.questionnaireIndex]);
    emitState(["questionnaire", "pattern", state.questionnaireCurrentPattern]);
    emitState(["questionnaire", "total", state.slotList.length]);
    emitState(["questionnaire", "answered", countAnsweredPatterns()]);
    emitState(["questionnaire", "liked_count", countLikedAnswers()]);
    emitState(["questionnaire", "required_likes", state.effectiveMinLikedPatterns]);

    /* Compatibility state selectors retained for existing Max patches. */
    emitState(["questionnaire", "current", state.questionnaireCurrentPattern]);
    emitState(["questionnaire", "discovered", state.slotList.length]);
    emitState(["questionnaire", "awaiting_pattern",
        state.questionnaireAwaitingPreset ? state.currentPattern : 0]);
    emitState(["questionnaire", "ended", state.bankEnded ? state.availablePatternCount : 0]);
}

function countLikedAnswers() {
    var count = 0;
    var i;
    for (i = 0; i < state.answers.length; i += 1) {
        if (state.answers[i] === 1) {
            count += 1;
        }
    }
    return count;
}

function nullableAtom(value) {
    return value === null ? "none" : value;
}

function markMlpPending(stateName) {
    state.pendingMlp[stateName] = true;
    emitState(["mlp_pending", stateName].concat(valueAsList(mlpValue(stateName))));
}

function emitMlpApplied(stateName) {
    delete state.pendingMlp[stateName];
    emitState(["mlp_applied", stateName].concat(valueAsList(mlpValue(stateName))));
}

function emitPendingMlpApplied() {
    var name;
    for (name in state.pendingMlp) {
        if (state.pendingMlp.hasOwnProperty(name)) {
            emitMlpApplied(name);
        }
    }
}

function emitAllMlpApplied() {
    var names = ["hiddenlayers", "activation", "outputactivation", "batchsize",
        "maxiter", "learnrate", "validation", "max_fit_rounds", "patience",
        "min_improvement"];
    var i;
    for (i = 0; i < names.length; i += 1) {
        emitMlpApplied(names[i]);
    }
}

function mlpValue(stateName) {
    var properties = {
        hiddenlayers: "hiddenLayers",
        activation: "activation",
        outputactivation: "outputActivation",
        batchsize: "batchSize",
        maxiter: "maxIter",
        learnrate: "learnRate",
        validation: "validation",
        max_fit_rounds: "maxFitRounds",
        patience: "patience",
        min_improvement: "minImprovement"
    };
    return state.mlp[properties[stateName]];
}

function valueAsList(value) {
    return Object.prototype.toString.call(value) === "[object Array]" ? value.slice(0) : [value];
}

function sameNumberList(first, second) {
    var i;
    if (first.length !== second.length) {
        return false;
    }
    for (i = 0; i < first.length; i += 1) {
        if (first[i] !== second[i]) {
            return false;
        }
    }
    return true;
}

function pointsForZone(zoneIndex, count) {
    var bank = AUTO_POINT_BANKS[50];
    var start = zoneIndex * 10;
    var result = [];
    var i;
    for (i = 0; i < count; i += 1) {
        result.push(bank[start + (i % 10)].slice(0));
    }
    return result;
}

function distributePoints(total, groups) {
    var base = Math.floor(total / groups);
    var remainder = total % groups;
    var result = [];
    var i;
    for (i = 0; i < groups; i += 1) {
        result.push(base + (i < remainder ? 1 : 0));
    }
    return result;
}

function shuffledCopy(source) {
    var result = source.slice(0);
    var i;
    var j;
    var temp;
    for (i = result.length - 1; i > 0; i -= 1) {
        j = Math.floor(nextRandom() * (i + 1));
        temp = result[i];
        result[i] = result[j];
        result[j] = temp;
    }
    return result;
}

/* Park-Miller LCG. Its multiplication stays exactly representable in a double. */
function nextRandom() {
    state.rngState = (state.rngState * 16807) % 2147483647;
    return (state.rngState - 1) / 2147483646;
}

function normalizeSeed(value) {
    var result = Math.abs(toInteger(value)) % 2147483647;
    return result === 0 ? 1 : result;
}

function formatPointId(value) {
    return "point-" + String(value);
}

function validPattern(value) {
    return value >= 1 && Math.floor(value) === value;
}

function patternInSlotList(patternId) {
    var i;
    for (i = 0; i < state.slotList.length; i += 1) {
        if (state.slotList[i] === patternId) {
            return true;
        }
    }
    return false;
}

function toInteger(value) {
    var numeric = Number(value);
    if (!isFiniteNumber(numeric) || Math.floor(numeric) !== numeric) {
        return NaN;
    }
    return numeric;
}

function readBoolean(value) {
    return Number(value) !== 0;
}

function isFiniteNumber(value) {
    return typeof value === "number" && isFinite(value) && !isNaN(value);
}

function clip01(value) {
    return Math.max(0, Math.min(1, value));
}

function emitUi(message) {
    outlet(0, message);
}

function emitEvent(name, args) {
    emitUi(["event", name].concat(args || []));
}

function emitWarning(code, args) {
    var message = ["warning", code].concat(args || []);
    emitUi(message);
    emitState(message);
    if (state.debug) {
        post("DriftMap warning: " + code + "\n");
    }
}

function emitError(code, fatal) {
    emitUi(["error", code]);
    emitState(["error", code]);
    if (state.debug) {
        post("DriftMap error: " + code + "\n");
    }
    if (fatal) {
        stopEmitTask();
        state.queue = [];
        setSlotsBlocked(false, true);
        outlet(4, ["play_gate", 0]);
        setPhase("error");
    }
}
