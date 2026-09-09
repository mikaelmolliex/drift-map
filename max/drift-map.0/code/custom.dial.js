/*
    mk.dial.final.js
    Max jsui dial / mapping visualizer

    Designed for a 124 x 112 px jsui, but fully resizable.

    --------------------------------------------------
    OUTLETS (left -> right)
    --------------------------------------------------

    outlet 0 : normalized output 0-1
    outlet 1 : converted output value
    outlet 2 : unit symbol
    outlet 3 : MIN trigger bang
    outlet 4 : MAX trigger bang

    --------------------------------------------------
    MESSAGES
    --------------------------------------------------

    input 0.25
    setinput 0.25

    calibrationon
    calibrationoff
    setnear 0.10
    setfar 0.90

    invert 0
    invert 1

    exponent 1.0

    rangemin 0.0
    rangemax 1.0

    unit normalized
    unit percent
    unit hz
    unit decibel
    unit semitone
    unit cents

    triggerenable 0
    triggerenable 1
    triggerlow 0.01
    triggerhigh 0.99
    hysteresis 0.04

    inputleds always
    inputleds activity
    inputleds hidden

    outputdisplay always
    outputdisplay activity
    outputdisplay hidden
    outputvaluesize 1.0

    backgroundcolor r g b [a]
    dialbodycolor r g b [a]
    dialinnercolor r g b [a]
    trackcolor r g b [a]
    outputcolor r g b [a]
    inputinactivecolor r g b [a]
    inputactivecolor r g b [a]
    rangecolor r g b [a]
    nearfarcolor r g b [a]
    textcolor r g b [a]
    triggercolor r g b [a]

    sensitivity 160
    reset
*/


autowatch = 1;

inlets = 1;
outlets = 5;

mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;


// ==================================================
// MAIN STATE
// ==================================================

var rawInput = 0.0;
var outputValue = 0.0;

var nearValue = 0.0;
var farValue = 1.0;

var rangeMin = 0.0;
var rangeMax = 1.0;

var inverted = 0;
var curveExponent = 1.0;


// ==================================================
// UNITS
// ==================================================

var displayUnitNames = [
    "percent",
    "normalized",
    "hz",
    "decibel",
    "semitone",
    "cents"
];

var displayUnitIndex = 1;

var displayMinimum = 0.0;
var displayMaximum = 1.0;


// ==================================================
// TRIGGERS
// ==================================================

var triggerEnabled = 0;

var triggerLow = 0.01;
var triggerHigh = 0.99;
var triggerHysteresis = 0.04;

var lowTriggerArmed = 1;
var highTriggerArmed = 1;

var lowFlash = 0;
var highFlash = 0;


// ==================================================
// UI STATE
// ==================================================

var calibrationActive = 0;

var calibrationPreview = 0;
var calibrationPreviewTask = null;
var calibrationPreviewHoldMs = 700;

var inputLedMode = "always";
var inputActivity = 0;
var inputActivityTask = null;
var inputActivityDuration = 300;

var outputDisplayMode = "activity";
var valueDisplayVisible = 0;
var valueDisplayHoldMs = 650;
var valueDisplayTask = null;
var outputValueTextScale = 1.0;

/*
    Play Range preview.
*/

var rangePreviewVisible = 0;
var rangePreviewTask = null;
var rangePreviewHoldMs = 900;
var rangePreviewSuppressedUntil = 0;
var rangePreviewPresetGuardMs = 100;

/*
    Pattr can restore the first dial before restoring its mapping
    parameters. Apply its value on the next scheduler pass so those
    parameters cannot immediately overwrite it.
*/

var pendingPattrValue = null;
var pattrRestoreTask = null;
var pattrRestoreDelayMs = 1;


// ==================================================
// INTERACTION
// ==================================================

var dragMode = "";
var dragStartY = 0;
var dragStartValue = 0;
var dragSensitivity = 160;
var hoverZone = "";


// ==================================================
// COLORS
// ==================================================

var colorBackground =
    [0.105, 0.110, 0.125, 0.0];

var colorDialBody =
    [0.165, 0.175, 0.205, 1.0];

var colorDialInner =
    [0.125, 0.130, 0.150, 1.0];

var colorTrack =
    [0.245, 0.260, 0.300, 1.0];

var colorOutput =
    [0.430, 0.520, 0.950, 1.0];

var colorInputInactive =
    [0.290, 0.310, 0.355, 1.0];

var colorInputActive =
    [0.770, 0.830, 1.000, 1.0];

var colorRange =
    [1.000, 0.585, 0.100, 1.0];

var colorNearFar =
    [0.150, 0.850, 0.900, 1.0];

var colorTextBright =
    [0.900, 0.910, 0.950, 1.0];

var colorTrigger =
    [1.000, 0.230, 0.310, 1.0];


// ==================================================
// COLOR MESSAGES
// ==================================================

function colorComponent(v)
{
    var value = Number(v);

    if (!isFinite(value))
    {
        return null;
    }

    return clip(value, 0, 1);
}


function updateUiColor(currentColor, args)
{
    if (args.length < 3)
    {
        return currentColor;
    }

    var r = colorComponent(args[0]);
    var g = colorComponent(args[1]);
    var b = colorComponent(args[2]);

    if (
        r === null ||
        g === null ||
        b === null
    )
    {
        return currentColor;
    }

    var a = currentColor[3];

    if (args.length >= 4)
    {
        var requestedAlpha = colorComponent(args[3]);

        if (requestedAlpha !== null)
        {
            a = requestedAlpha;
        }
    }

    currentColor[0] = r;
    currentColor[1] = g;
    currentColor[2] = b;
    currentColor[3] = a;

    mgraphics.redraw();

    return currentColor;
}


function backgroundcolor()
{
    colorBackground =
        updateUiColor(
            colorBackground,
            arrayfromargs(arguments)
        );
}


function dialbodycolor()
{
    colorDialBody =
        updateUiColor(
            colorDialBody,
            arrayfromargs(arguments)
        );
}


function dialinnercolor()
{
    colorDialInner =
        updateUiColor(
            colorDialInner,
            arrayfromargs(arguments)
        );
}


function trackcolor()
{
    colorTrack =
        updateUiColor(
            colorTrack,
            arrayfromargs(arguments)
        );
}


function outputcolor()
{
    colorOutput =
        updateUiColor(
            colorOutput,
            arrayfromargs(arguments)
        );
}


function inputinactivecolor()
{
    colorInputInactive =
        updateUiColor(
            colorInputInactive,
            arrayfromargs(arguments)
        );
}


function inputactivecolor()
{
    colorInputActive =
        updateUiColor(
            colorInputActive,
            arrayfromargs(arguments)
        );
}


function rangecolor()
{
    colorRange =
        updateUiColor(
            colorRange,
            arrayfromargs(arguments)
        );
}


function nearfarcolor()
{
    colorNearFar =
        updateUiColor(
            colorNearFar,
            arrayfromargs(arguments)
        );
}


function textcolor()
{
    colorTextBright =
        updateUiColor(
            colorTextBright,
            arrayfromargs(arguments)
        );
}


function triggercolor()
{
    colorTrigger =
        updateUiColor(
            colorTrigger,
            arrayfromargs(arguments)
        );
}


// ==================================================
// GEOMETRY
// ==================================================

var startAngle = degreesToRadians(135);
var endAngle = degreesToRadians(405);

/*
    33 points:

    Major:
    0 / 25 / 50 / 75 / 100 %

    Medium:
    12.5 / 37.5 / 62.5 / 87.5 %
*/

var tickCount = 33;


function getGeometry(width, height)
{
    var size =
        Math.min(width, height);

    var cx =
        width * 0.5;

    var cy =
        height * 0.5;

    var bodyRadius =
        size * 0.335;

    var outputWidth =
        Math.max(
            1.4,
            size * 0.010
        );

    var outputGap =
        size * 0.002;

    var outputRadius =
    bodyRadius +
    outputGap +
    outputWidth * 0.5;


    var inputRadius =
    size * 0.450;


/*
    Play Range placé exactement
    entre Output et Input.
*/

    var rangeRadius =
    (
        outputRadius +
        inputRadius
    ) * 0.5;

    var inputRadius =
        size * 0.450;

    return {
    width: width,
    height: height,

    size: size,

    cx: cx,
    cy: cy,

    bodyRadius: bodyRadius,

    outputRadius: outputRadius,
    outputWidth: outputWidth,

    rangeRadius: rangeRadius,
    inputRadius: inputRadius
}; 
}


// ==================================================
// PAINT
// ==================================================

function paint()
{
    var width =
        box.rect[2] -
        box.rect[0];

    var height =
        box.rect[3] -
        box.rect[1];

    var g =
        getGeometry(
            width,
            height
        );


    drawBackground(
        width,
        height
    );


    /*
        INPUT
    */

    drawInputTicks(g);


    /*
        Rainure knob.
    */

    drawKnobGroove(g);


    /*
        OUTPUT.
    */

    drawOutputTrack(g);


    /*
        PLAY RANGE temporaire.
    */

    if (rangePreviewVisible)
    {
        drawRangeOverlay(g);
    }


    /*
        Corps du dial par-dessus.
    */

    drawDialBody(g);

    drawPointer(g);

    drawTriggerIndicators(g);

    drawOutputText(g);
}

// ==================================================
// BACKGROUND
// ==================================================

function drawBackground(
    width,
    height
)
{
    setColor(
        colorBackground
    );

    mgraphics.rectangle(
        0,
        0,
        width,
        height
    );

    mgraphics.fill();
}


// ==================================================
// INPUT LED ARC
// ==================================================

function drawInputTicks(g)
{
    if (inputLedMode === "hidden")
        return;

    var showActiveInput =
        inputLedMode === "always" ||
        (
            inputLedMode === "activity" &&
            inputActivity
        );

    var calibrationVisible =
        calibrationActive ||
        calibrationPreview;

    var activePosition =
        clip(
            rawInput,
            0,
            1
        );

    var i;

    for (i = 0; i < tickCount; i++)
    {
        var normalized =
            i / (tickCount - 1);

        var angle =
            valueToAngle(normalized);

        /*
            0 / 25 / 50 / 75 / 100 %
        */

        var isMajor =
            i % 8 === 0;

        /*
            12.5 / 37.5 / 62.5 / 87.5 %
        */

        var isMedium =
            !isMajor &&
            i % 4 === 0;

        var tickRadius;

        if (isMajor)
            tickRadius = g.size * 0.0145;

        else if (isMedium)
            tickRadius = g.size * 0.0090;

        else
            tickRadius = g.size * 0.0056;


        var x =
            g.cx +
            Math.cos(angle) *
            g.inputRadius;

        var y =
            g.cy +
            Math.sin(angle) *
            g.inputRadius;


        var insideCalibration =
            normalized >= nearValue &&
            normalized <= farValue;


        /*
            Hors Near / Far.
        */

        if (!insideCalibration)
        {
            setColor([
                colorInputInactive[0] * 0.25,
                colorInputInactive[1] * 0.25,
                colorInputInactive[2] * 0.25,
                0.55
            ]);
        }


        /*
            Calibration active ou preview
            après édition manuelle.
        */

        else if (calibrationVisible)
        {
            setColor(
                colorNearFar
            );
        }


        /*
            Always ou Activity réellement active.
        */

        else if (
            showActiveInput &&
            normalized <= activePosition
        )
        {
            setColor(
                colorInputActive
            );
        }


        /*
            Arc toujours présent en gris sombre.
        */

        else
        {
            setColor(
                colorInputInactive
            );
        }


        mgraphics.arc(
            x,
            y,
            tickRadius,
            0,
            Math.PI * 2
        );

        mgraphics.fill();
    }
}


// ==================================================
// KNOB GROOVE
// ==================================================

function drawKnobGroove(g)
{
    drawArc(
        g.cx,
        g.cy,

        g.outputRadius +
        g.outputWidth * 1.0,

        0,
        Math.PI * 2,

        g.outputWidth * 1.3,

        [
            0.115,
            0.120,
            0.135,
            0.55
        ]
    );


    drawArc(
        g.cx,
        g.cy,

        g.outputRadius,

        0,
        Math.PI * 2,

        g.outputWidth * 2.2,

        [
            0.010,
            0.012,
            0.016,
            1.0
        ]
    );


    drawArc(
        g.cx,
        g.cy,

        g.outputRadius -
        g.outputWidth * 0.9,

        0,
        Math.PI * 2,

        g.outputWidth * 0.7,

        [
            0.025,
            0.028,
            0.034,
            1.0
        ]
    );
}


// ==================================================
// OUTPUT LED ARC
// ==================================================

function drawOutputTrack(g)
{
    var outputStartAngle =
        valueToAngle(
            rangeMin
        );

    var outputAngle =
        valueToAngle(
            outputValue
        );

    if (
        outputValue <=
        rangeMin
    )
    {
        return;
    }


    // Glow

    drawArc(
        g.cx,
        g.cy,

        g.outputRadius,

        outputStartAngle,
        outputAngle,

        g.outputWidth * 2.2,

        [
            colorOutput[0],
            colorOutput[1],
            colorOutput[2],
            0.10
        ]
    );


    // LED

    drawArc(
        g.cx,
        g.cy,

        g.outputRadius,

        outputStartAngle,
        outputAngle,

        g.outputWidth,

        colorOutput
    );


    // Coeur clair

    drawArc(
        g.cx,
        g.cy,

        g.outputRadius,

        outputStartAngle,
        outputAngle,

        Math.max(
            0.7,
            g.outputWidth * 0.28
        ),

        [
            0.92,
            0.94,
            1.0,
            0.82
        ]
    );
}


// ==================================================
// DIAL BODY
// ==================================================

function drawDialBody(g)
{
    setColor(
        colorDialBody
    );

    mgraphics.arc(
        g.cx,
        g.cy,
        g.bodyRadius,
        0,
        Math.PI * 2
    );

    mgraphics.fill();


    setColor(
        colorDialInner
    );

    mgraphics.arc(
        g.cx,
        g.cy,
        g.bodyRadius * 0.91,
        0,
        Math.PI * 2
    );

    mgraphics.fill();
}


// ==================================================
// POINTER
// ==================================================

function drawPointer(g)
{
    var angle =
        valueToAngle(
            outputValue
        );

    var innerRadius =
        g.bodyRadius * 0.80;

    var outerRadius =
        g.bodyRadius * 0.93;

    var x1 =
        g.cx +
        Math.cos(angle) *
        innerRadius;

    var y1 =
        g.cy +
        Math.sin(angle) *
        innerRadius;

    var x2 =
        g.cx +
        Math.cos(angle) *
        outerRadius;

    var y2 =
        g.cy +
        Math.sin(angle) *
        outerRadius;

    var pointerWidth =
        g.size * 0.014;

    var roundRadius =
        pointerWidth * 0.5;

    setColor(
        colorTextBright
    );

    mgraphics.set_line_width(
        pointerWidth
    );

    mgraphics.move_to(
        x1,
        y1
    );

    mgraphics.line_to(
        x2,
        y2
    );

    mgraphics.stroke();


    mgraphics.arc(
        x1,
        y1,
        roundRadius,
        0,
        Math.PI * 2
    );

    mgraphics.fill();


    mgraphics.arc(
        x2,
        y2,
        roundRadius,
        0,
        Math.PI * 2
    );

    mgraphics.fill();
}


// ==================================================
// OUTPUT TEXT
// ==================================================

function drawOutputText(g)
{
    var visible = false;

    if (
        outputDisplayMode === "always"
    )
    {
        visible = true;
    }

    else if (
        outputDisplayMode === "activity" &&
        valueDisplayVisible
    )
    {
        visible = true;
    }

    if (!visible)
    {
        return;
    }

    drawCenteredText(
        formatDisplayValue(
            outputValue
        ),

        g.cx,

        g.cy,

        g.size * 0.079 *
        outputValueTextScale,

        colorTextBright
    );
}


// ==================================================
// TRIGGER INDICATORS
// ==================================================

function drawTriggerIndicators(g)
{
    if (!triggerEnabled)
        return;

    /*
        Les LEDs sont FIXES.

        Elles indiquent MIN / MAX,
        elles ne représentent pas graphiquement
        la valeur précise du threshold.
    */

    drawTriggerDot(
        g,
        startAngle,
        lowFlash
    );

    drawTriggerDot(
        g,
        endAngle,
        highFlash
    );
}


function drawTriggerDot(
    g,
    angle,
    active
)
{
    /*
        Quelques pixels supplémentaires
        autour de l'arc Input.
    */

    var radius =
        g.inputRadius +
        g.size * 0.065;

    var x =
        g.cx +
        Math.cos(angle) *
        radius;

    var y =
        g.cy +
        Math.sin(angle) *
        radius;

    if (active)
    {
        setColor(
            colorTrigger
        );
    }
    else
    {
        setColor([
            colorTrigger[0],
            colorTrigger[1],
            colorTrigger[2],
            0.28
        ]);
    }

    mgraphics.arc(
        x,
        y,

        g.size * 0.014,

        0,
        Math.PI * 2
    );

    if (active)
        mgraphics.fill();

    else
        mgraphics.stroke();
}

// ==================================================
// CALCULATION
// ==================================================

function calculateOutput(
    sendOutput
)
{
    // 1. Near / Far

    var normalized =
        normalizeInput(
            rawInput
        );


    // 2. Invert

    if (inverted)
    {
        normalized =
            1 -
            normalized;
    }


    // 3. Exponent

    normalized =
        applyCurve(
            normalized
        );


    // 4. Playable range

    outputValue =
        rangeMin +
        normalized *
        (
            rangeMax -
            rangeMin
        );

    outputValue =
        clip(
            outputValue,
            rangeMin,
            rangeMax
        );


    // 5. Triggers and outlets
    // Silent updates must not emit normal values or trigger bangs.
    if (sendOutput)
    {
        checkTriggers();
        sendOutputs();
    }


    mgraphics.redraw();
}


// ==================================================
// NEAR / FAR NORMALIZATION
// ==================================================

function normalizeInput(v)
{
    var denominator =
        farValue -
        nearValue;

    if (
        Math.abs(
            denominator
        ) <
        0.000001
    )
    {
        return 0;
    }

    var result =
        (
            v -
            nearValue
        ) /
        denominator;

    return clip(
        result,
        0,
        1
    );
}


// ==================================================
// EXPONENT
// ==================================================

function applyCurve(v)
{
    v =
        clip(
            v,
            0,
            1
        );

    var exponentValue =
        Math.max(
            0.001,
            curveExponent
        );

    return Math.pow(
        v,
        exponentValue
    );
}


// ==================================================
// TRIGGER LOGIC
// ==================================================

function checkTriggers()
{
    if (!triggerEnabled)
    {
        return;
    }

    /*
        Trigger thresholds are normalized
        INSIDE playable range.

        0 = rangeMin
        1 = rangeMax
    */

    var span =
        rangeMax -
        rangeMin;

    if (
        Math.abs(span) <
        0.000001
    )
    {
        return;
    }

    var position =
        clip(
            (
                outputValue -
                rangeMin
            ) /
            span,
            0,
            1
        );


    // MIN

    if (
        position <= triggerLow &&
        lowTriggerArmed
    )
    {
        lowTriggerArmed = 0;

        lowFlash = 1;

        outlet(
            3,
            "bang"
        );

        scheduleFlashReset(
            "low"
        );
    }


    if (
        position >
        triggerLow +
        triggerHysteresis
    )
    {
        lowTriggerArmed = 1;
    }


    // MAX

    if (
        position >= triggerHigh &&
        highTriggerArmed
    )
    {
        highTriggerArmed = 0;

        highFlash = 1;

        outlet(
            4,
            "bang"
        );

        scheduleFlashReset(
            "high"
        );
    }


    if (
        position <
        triggerHigh -
        triggerHysteresis
    )
    {
        highTriggerArmed = 1;
    }
}


function scheduleFlashReset(
    which
)
{
    var task =
        new Task(
            function()
            {
                if (
                    which === "low"
                )
                {
                    lowFlash = 0;
                }
                else
                {
                    highFlash = 0;
                }

                mgraphics.redraw();
            },
            this
        );

    task.schedule(
        220
    );
}

// ==================================================
// INPUT
// ==================================================

function msg_float(v)
{
    input(v);
}


function msg_int(v)
{
    input(v);
}


function normalizedInputValue(v)
{
    var value = Number(v);

    if (!isFinite(value))
    {
        return null;
    }

    return clip(
        value,
        0,
        1
    );
}


function input(v)
{
    var value = normalizedInputValue(v);

    if (value === null)
    {
        return;
    }

    rawInput = value;

    if (
        inputLedMode === "activity"
    )
    {
        showInputActivity();
    }

    showValueDisplayTimed();

    calculateOutput(1);

    notifyclients();
}


function setinput(v)
{
    var value = normalizedInputValue(v);

    if (value === null)
    {
        return;
    }

    rawInput = value;

    calculateOutput(0);

    notifyclients();
}


// ==================================================
// CALIBRATION
// ==================================================

function calibrationon()
{
    calibrationActive = 1;

    calibrationPreview = 0;

    if (calibrationPreviewTask !== null)
        calibrationPreviewTask.cancel();

    mgraphics.redraw();
}


function calibrationoff()
{
    calibrationActive = 0;
    calibrationPreview = 0;

    mgraphics.redraw();
}


function showCalibrationPreview()
{
    /*
        Si REC est réellement actif,
        inutile d'utiliser un timer :
        calibrationon contrôle l'affichage.
    */

    if (calibrationActive)
    {
        mgraphics.redraw();
        return;
    }

    calibrationPreview = 1;

    if (calibrationPreviewTask === null)
    {
        calibrationPreviewTask =
            new Task(
                function()
                {
                    calibrationPreview = 0;
                    mgraphics.redraw();
                },
                this
            );
    }
    else
    {
        calibrationPreviewTask.cancel();
    }

    calibrationPreviewTask.schedule(
        calibrationPreviewHoldMs
    );

    mgraphics.redraw();
}


// ==================================================
// NEAR / FAR
// ==================================================

function setnear(v)
{
    nearValue =
        clip(
            Number(v),
            0,
            1
        );

    if (nearValue > farValue)
        nearValue = farValue;

    /*
        Mapping preview only. Keep the current visible output stable;
        the new Near value is applied on the next input or manual drag.
    */
    showCalibrationPreview();
}


function setfar(v)
{
    farValue =
        clip(
            Number(v),
            0,
            1
        );

    if (farValue < nearValue)
        farValue = nearValue;

    /*
        Mapping preview only. Keep the current visible output stable;
        the new Far value is applied on the next input or manual drag.
    */
    showCalibrationPreview();
}

// ==================================================
// INVERT
// ==================================================

function invert(v)
{
    inverted =
        v ? 1 : 0;

    calculateOutput(1);

    notifyclients();
}


// ==================================================
// EXPONENT
// ==================================================

function exponent(v)
{
    curveExponent =
        Math.max(
            0.001,
            Number(v)
        );

    calculateOutput(1);

    notifyclients();
}


// ==================================================
// PLAYABLE RANGE
// ==================================================

function normalizeRangeValue(v)
{
    var value =
        Number(v);

    /*
        Accepte :

        rangemin 0.20
        rangemin 20

        Les deux = 20 %
    */

    if (Math.abs(value) > 1)
    {
        value *= 0.01;
    }

    return clip(
        value,
        0,
        1
    );
}


function rangemin(v)
{
    rangeMin =
        normalizeRangeValue(v);

    if (rangeMin > rangeMax)
    {
        rangeMin = rangeMax;
    }

    /*
        Mapping preview only. Keep the current visible output stable;
        the new Range is applied on the next input or manual drag.
    */
    showRangePreviewTimed();
}


function rangemax(v)
{
    rangeMax =
        normalizeRangeValue(v);

    if (rangeMax < rangeMin)
    {
        rangeMax = rangeMin;
    }

    /*
        Mapping preview only. Keep the current visible output stable;
        the new Range is applied on the next input or manual drag.
    */
    showRangePreviewTimed();
}


// ==================================================
// RANGE PREVIEW TIMER
// ==================================================

function rangePreviewIsSuppressed()
{
    return (
        pendingPattrValue !== null ||
        (new Date()).getTime() <
            rangePreviewSuppressedUntil
    );
}


function cancelRangePreview()
{
    if (rangePreviewTask !== null)
    {
        rangePreviewTask.cancel();
    }

    rangePreviewVisible = 0;

    mgraphics.redraw();
}


function beginRangePreview()
{
    if (rangePreviewIsSuppressed())
    {
        cancelRangePreview();
        return;
    }

    rangePreviewVisible = 1;

    if (rangePreviewTask === null)
    {
        rangePreviewTask =
            new Task(
                function()
                {
                    rangePreviewVisible = 0;

                    mgraphics.redraw();
                },
                this
            );
    }
    else
    {
        rangePreviewTask.cancel();
    }

    rangePreviewTask.schedule(
        rangePreviewHoldMs
    );

    mgraphics.redraw();
}


function showRangePreviewTimed()
{
    if (rangePreviewIsSuppressed())
    {
        cancelRangePreview();
        return;
    }

    beginRangePreview();
}


// ==================================================
// PLAY RANGE DRAWING
// ==================================================

function drawRangeOverlay(g)
{
    /*
        Moins de traits que l'Input,
        mais plus grands et plus épais.
    */

    var rangeTickCount = 17;

    var i;

    for (
        i = 0;
        i < rangeTickCount;
        i++
    )
    {
        var value =
            i /
            (rangeTickCount - 1);

        var angle =
            valueToAngle(
                value
            );

        var inside =
            value >= rangeMin &&
            value <= rangeMax;


        /*
            Gros traits :
            0 / 25 / 50 / 75 / 100
        */

        var isMajor =
            i % 4 === 0;


        /*
            Traits moyens :
            12.5 / 37.5 / etc.
        */

        var isMedium =
            !isMajor &&
            i % 2 === 0;


        var barLength;

        if (isMajor)
        {
            barLength =
                g.size * 0.050;
        }
        else if (isMedium)
        {
            barLength =
                g.size * 0.037;
        }
        else
        {
            barLength =
                g.size * 0.025;
        }


        var innerRadius =
            g.rangeRadius -
            barLength * 0.5;

        var outerRadius =
            g.rangeRadius +
            barLength * 0.5;


        var x1 =
            g.cx +
            Math.cos(angle) *
            innerRadius;

        var y1 =
            g.cy +
            Math.sin(angle) *
            innerRadius;


        var x2 =
            g.cx +
            Math.cos(angle) *
            outerRadius;

        var y2 =
            g.cy +
            Math.sin(angle) *
            outerRadius;


        /*
            Zone active orange.
        */

        if (inside)
        {
            setColor(
                colorRange
            );
        }

        /*
            Partie hors Play Range :
            orange très sombre.
        */

        else
        {
            setColor([
                colorRange[0] * 0.15,
                colorRange[1] * 0.15,
                colorRange[2] * 0.15,
                0.38
            ]);
        }


        var lineWidth;

        if (isMajor)
        {
            lineWidth =
                g.size * 0.010;
        }
        else if (isMedium)
        {
            lineWidth =
                g.size * 0.007;
        }
        else
        {
            lineWidth =
                g.size * 0.0048;
        }


        mgraphics.set_line_width(
            lineWidth
        );

        mgraphics.move_to(
            x1,
            y1
        );

        mgraphics.line_to(
            x2,
            y2
        );

        mgraphics.stroke();
    }
}

// ==================================================
// UNIT
// ==================================================

function unit()
{
    var args =
        arrayfromargs(
            arguments
        );

    if (!args.length)
    {
        return;
    }

    var name =
        String(
            args[0]
        ).toLowerCase();

    var index = -1;


    if (
        name === "%" ||
        name === "percent"
    )
    {
        index = 0;
    }

    else if (
        name === "0-1" ||
        name === "normalized" ||
        name === "normalised"
    )
    {
        index = 1;
    }

    else if (
        name === "hz" ||
        name === "freq" ||
        name === "frequency"
    )
    {
        index = 2;
    }

    else if (
        name === "db" ||
        name === "decibel"
    )
    {
        index = 3;
    }

    else if (
        name === "st" ||
        name === "semitone" ||
        name === "semitones"
    )
    {
        index = 4;
    }

    else if (
        name === "ct" ||
        name === "cent" ||
        name === "cents"
    )
    {
        index = 5;
    }


    if (
        index >= 0
    )
    {
        setDisplayUnitByIndex(
            index
        );
    }
}


function setDisplayUnitByIndex(
    index
)
{
    displayUnitIndex =
        Math.round(
            clip(
                index,
                0,
                displayUnitNames.length - 1
            )
        );


    // %

    if (
        displayUnitIndex === 0
    )
    {
        displayMinimum = 0;
        displayMaximum = 100;
    }


    // normalized

    else if (
        displayUnitIndex === 1
    )
    {
        displayMinimum = 0;
        displayMaximum = 1;
    }


    // Hz

    else if (
        displayUnitIndex === 2
    )
    {
        displayMinimum = 20;
        displayMaximum = 20000;
    }


    // dB

    else if (
        displayUnitIndex === 3
    )
    {
        displayMinimum = -60;
        displayMaximum = 0;
    }


    // semitones

    else if (
        displayUnitIndex === 4
    )
    {
        displayMinimum = -24;
        displayMaximum = 24;
    }


    // cents

    else
    {
        displayMinimum = -2400;
        displayMaximum = 2400;
    }

    sendOutputs();

    notifyclients();

    mgraphics.redraw();
}


// ==================================================
// OPTIONAL CUSTOM UNIT RANGE
// ==================================================

function displayrange(
    minimum,
    maximum
)
{
    displayMinimum =
        Number(
            minimum
        );

    displayMaximum =
        Number(
            maximum
        );

    sendOutputs();

    notifyclients();

    mgraphics.redraw();
}


// ==================================================
// TRIGGER MESSAGES
// ==================================================

function triggerenable(v)
{
    triggerEnabled =
        v ? 1 : 0;

    lowTriggerArmed = 1;
    highTriggerArmed = 1;

    lowFlash = 0;
    highFlash = 0;

    notifyclients();

    mgraphics.redraw();
}


function triggerlow(v)
{
    triggerLow =
        clip(
            Number(v),
            0,
            1
        );

    /*
        Garantit :
        low <= high
    */

    if (
        triggerLow >
        triggerHigh
    )
    {
        triggerLow =
            triggerHigh;
    }

    lowTriggerArmed = 1;

    notifyclients();

    mgraphics.redraw();
}


function triggerhigh(v)
{
    triggerHigh =
        clip(
            Number(v),
            0,
            1
        );

    if (
        triggerHigh <
        triggerLow
    )
    {
        triggerHigh =
            triggerLow;
    }

    highTriggerArmed = 1;

    notifyclients();

    mgraphics.redraw();
}


function hysteresis(v)
{
    triggerHysteresis =
        clip(
            Number(v),
            0,
            1
        );

    notifyclients();
}


// ==================================================
// INPUT LED DISPLAY
// ==================================================

function inputleds()
{
    var args =
        arrayfromargs(
            arguments
        );

    if (!args.length)
    {
        return;
    }

    var mode =
        String(
            args[0]
        ).toLowerCase();

    if (
        mode !== "always" &&
        mode !== "activity" &&
        mode !== "hidden"
    )
    {
        return;
    }

    inputLedMode =
        mode;

    inputActivity = 0;

    mgraphics.redraw();
}


function showInputActivity()
{
    inputActivity = 1;

    if (
        inputActivityTask === null
    )
    {
        inputActivityTask =
            new Task(
                function()
                {
                    inputActivity = 0;

                    mgraphics.redraw();
                },
                this
            );
    }
    else
    {
        inputActivityTask.cancel();
    }

    inputActivityTask.schedule(
        inputActivityDuration
    );

    mgraphics.redraw();
}


// ==================================================
// OUTPUT DISPLAY
// ==================================================

function outputdisplay()
{
    var args =
        arrayfromargs(
            arguments
        );

    if (!args.length)
    {
        return;
    }

    var mode =
        String(
            args[0]
        ).toLowerCase();

    if (
        mode !== "always" &&
        mode !== "activity" &&
        mode !== "hidden"
    )
    {
        return;
    }

    outputDisplayMode =
        mode;

    if (
        mode !== "activity"
    )
    {
        valueDisplayVisible = 0;
    }

    mgraphics.redraw();
}


function outputvaluesize(v)
{
    var value = Number(v);

    if (!isFinite(value))
    {
        return;
    }

    outputValueTextScale =
        clip(
            value,
            0.25,
            3.0
        );

    mgraphics.redraw();
}


function showValueDisplay()
{
    if (
        outputDisplayMode !== "activity"
    )
    {
        return;
    }

    valueDisplayVisible = 1;

    mgraphics.redraw();
}


function hideValueDisplay()
{
    if (
        outputDisplayMode !== "activity"
    )
    {
        return;
    }

    valueDisplayVisible = 0;

    mgraphics.redraw();
}


function hideValueDisplayIfIdle()
{
    if (
        outputDisplayMode === "activity" &&
        hoverZone !== "dial" &&
        dragMode !== "dial"
    )
    {
        valueDisplayVisible = 0;

        mgraphics.redraw();
    }
}


function showValueDisplayTimed()
{
    if (
        outputDisplayMode !== "activity"
    )
    {
        return;
    }

    valueDisplayVisible = 1;

    if (
        valueDisplayTask === null
    )
    {
        valueDisplayTask =
            new Task(
                hideValueDisplayIfIdle,
                this
            );
    }
    else
    {
        valueDisplayTask.cancel();
    }

    valueDisplayTask.schedule(
        valueDisplayHoldMs
    );

    mgraphics.redraw();
}


// ==================================================
// SENSITIVITY
// ==================================================

function sensitivity(v)
{
    dragSensitivity =
        Math.max(
            20,
            Number(v)
        );
}


// ==================================================
// RESET
// ==================================================

function reset()
{
    rawInput = 0.0;
    outputValue = 0.0;

    nearValue = 0.0;
    farValue = 1.0;

    rangeMin = 0.0;
    rangeMax = 1.0;

    inverted = 0;
    curveExponent = 1.0;

    displayUnitIndex = 1;
    displayMinimum = 0;
    displayMaximum = 1;

    triggerEnabled = 0;

    triggerLow = 0.01;
    triggerHigh = 0.99;
    triggerHysteresis = 0.04;

    lowTriggerArmed = 1;
    highTriggerArmed = 1;

    lowFlash = 0;
    highFlash = 0;

    calibrationActive = 0;

    inputLedMode = "always";
    inputActivity = 0;

    outputDisplayMode = "activity";
    valueDisplayVisible = 0;

    rangePreviewVisible = 0;

    calculateOutput(1);

    notifyclients();

    mgraphics.redraw();
}

// ==================================================
// MOUSE
// ==================================================

function onclick(
    x,
    y,
    button,
    command,
    shift,
    capslock,
    option,
    control
)
{
    updateHover(
        x,
        y
    );

    if (
        hoverZone !== "dial"
    )
    {
        return;
    }

    dragMode = "dial";

    dragStartY = y;

    dragStartValue =
        rawInput;

    showValueDisplay();
}


function ondrag(
    x,
    y,
    button,
    command,
    shift,
    capslock,
    option,
    control
)
{
    if (
        dragMode !== "dial"
    )
    {
        return;
    }

    var distance =
        dragStartY -
        y;

    var currentSensitivity =
        dragSensitivity;

    /*
        Shift = fine adjustment.
    */

    if (shift)
    {
        currentSensitivity *= 8;
    }

    var delta =
        distance /
        currentSensitivity;

    rawInput =
        clip(
            dragStartValue +
            delta,
            0,
            1
        );

    if (
        inputLedMode === "activity"
    )
    {
        showInputActivity();
    }

    showValueDisplay();

    calculateOutput(1);

    notifyclients();
}


function onmouseup(
    x,
    y,
    button,
    command,
    shift,
    capslock,
    option,
    control
)
{
    dragMode = "";

    updateHover(
        x,
        y
    );

    if (
        hoverZone !== "dial"
    )
    {
        hideValueDisplay();
    }

    mgraphics.redraw();
}


function ondblclick(
    x,
    y,
    button,
    command,
    shift,
    capslock,
    option,
    control
)
{
    updateHover(
        x,
        y
    );

    if (
        hoverZone !== "dial"
    )
    {
        return;
    }

    rawInput = 0.5;

    if (
        inputLedMode === "activity"
    )
    {
        showInputActivity();
    }

    showValueDisplay();

    calculateOutput(1);

    notifyclients();
}


function onidle(
    x,
    y,
    button,
    command,
    shift,
    capslock,
    option,
    control
)
{
    updateHover(
        x,
        y
    );
}


function onidleout()
{
    hoverZone = "";

    if (
        dragMode === ""
    )
    {
        hideValueDisplay();
    }

    mgraphics.redraw();
}


function updateHover(
    x,
    y
)
{
    var width =
        box.rect[2] -
        box.rect[0];

    var height =
        box.rect[3] -
        box.rect[1];

    var g =
        getGeometry(
            width,
            height
        );

    var previous =
        hoverZone;

    hoverZone =
        hitTest(
            x,
            y,
            g
        );

    if (
        previous !== "dial" &&
        hoverZone === "dial"
    )
    {
        showValueDisplay();
    }

    else if (
        previous === "dial" &&
        hoverZone !== "dial"
    )
    {
        hideValueDisplay();
    }

    if (
        previous !== hoverZone
    )
    {
        mgraphics.redraw();
    }
}


function hitTest(
    x,
    y,
    g
)
{
    var dx =
        x -
        g.cx;

    var dy =
        y -
        g.cy;

    var distance =
        Math.sqrt(
            dx * dx +
            dy * dy
        );

    if (
        distance <=
        g.bodyRadius * 1.18
    )
    {
        return "dial";
    }

    return "";
}


// ==================================================
// OUTPUT CONVERSION
// ==================================================

function getDisplayOutputAtoms(v)
{
    v =
        clip(
            v,
            0,
            1
        );


    // Percent

    if (
        displayUnitIndex === 0
    )
    {
        return [
            v * 100,
            "%"
        ];
    }


    // Normalized

    if (
        displayUnitIndex === 1
    )
    {
        return [
            v,
            "0-1"
        ];
    }


    /*
        Conversion linéaire pour l'instant.

        On pourra ensuite introduire
        le mapping perceptuel Hz/dB
        sans changer le protocole Max.
    */

    var displayedValue =
        displayMinimum +
        v *
        (
            displayMaximum -
            displayMinimum
        );


    // Hz

    if (
        displayUnitIndex === 2
    )
    {
        return [
            displayedValue,
            "Hz"
        ];
    }


    // dB

    if (
        displayUnitIndex === 3
    )
    {
        return [
            displayedValue,
            "dB"
        ];
    }


    // Semitone

    if (
        displayUnitIndex === 4
    )
    {
        return [
            displayedValue,
            "st"
        ];
    }


    // Cents

    return [
        displayedValue,
        "ct"
    ];
}


// ==================================================
// SEND OUTPUTS
// ==================================================

function sendOutputs()
{
    var atoms =
        getDisplayOutputAtoms(
            outputValue
        );

    /*
        Max : émission droite -> gauche.

        outlet 2 = symbole
        outlet 1 = valeur convertie
        outlet 0 = valeur normalisée
    */

    outlet(
        2,
        atoms[1]
    );

    outlet(
        1,
        atoms[0]
    );

    outlet(
        0,
        outputValue
    );
}


// ==================================================
// DISPLAY FORMAT
// ==================================================

function formatRoundedValue(
    value,
    maximumDecimals,
    minimumDecimals
)
{
    var text =
        Number(value).toFixed(
            maximumDecimals
        );

    while (
        maximumDecimals >
            minimumDecimals &&
        text.charAt(
            text.length - 1
        ) === "0"
    )
    {
        text =
            text.substring(
                0,
                text.length - 1
            );

        maximumDecimals--;
    }

    if (
        maximumDecimals === 0 &&
        text.charAt(
            text.length - 1
        ) === "."
    )
    {
        text =
            text.substring(
                0,
                text.length - 1
            );
    }

    return text;
}


function formatDisplayValue(v)
{
    var atoms =
        getDisplayOutputAtoms(
            v
        );

    var value =
        atoms[0];

    var symbol =
        atoms[1];


    if (
        symbol === "%"
    )
    {
        return (
            formatRoundedValue(
                value,
                2,
                0
            ) +
            "%"
        );
    }


    if (
        symbol === "0-1"
    )
    {
        return formatRoundedValue(
            value,
            3,
            1
        );
    }


    if (
        symbol === "Hz"
    )
    {
        if (
            Math.abs(value) >= 1000
        )
        {
            return (
                formatRoundedValue(
                    value / 1000,
                    2,
                    0
                ) +
                "kHz"
            );
        }

        if (
            Math.abs(value) >= 100
        )
        {
            return (
                formatRoundedValue(
                    value,
                    0,
                    0
                ) +
                "Hz"
            );
        }

        return (
            formatRoundedValue(
                value,
                2,
                0
            ) +
            "Hz"
        );
    }


    if (
        symbol === "dB"
    )
    {
        return (
            formatRoundedValue(
                value,
                2,
                0
            ) +
            "dB"
        );
    }


    if (
        symbol === "st"
    )
    {
        var stPrefix =
            value > 0
            ? "+"
            : value < 0
            ? "-"
            : "";

        return (
            stPrefix +
            formatRoundedValue(
                Math.abs(value),
                2,
                0
            ) +
            "st"
        );
    }


    var ctPrefix =
        value > 0
        ? "+"
        : value < 0
        ? "-"
        : "";

    return (
        ctPrefix +
        formatRoundedValue(
            Math.abs(value),
            0,
            0
        ) +
        "ct"
    );
}


// ==================================================
// DRAW ARC
// ==================================================

function drawArc(
    cx,
    cy,
    radius,
    angle1,
    angle2,
    width,
    color
)
{
    if (
        angle2 <
        angle1
    )
    {
        var temporary =
            angle1;

        angle1 =
            angle2;

        angle2 =
            temporary;
    }

    var difference =
        angle2 -
        angle1;

    if (
        difference <= 0
    )
    {
        return;
    }

    var segments = 100;

    setColor(
        color
    );

    mgraphics.set_line_width(
        width
    );

    var i;

    for (
        i = 0;
        i <= segments;
        i++
    )
    {
        var ratio =
            i /
            segments;

        var angle =
            angle1 +
            difference *
            ratio;

        var x =
            cx +
            Math.cos(angle) *
            radius;

        var y =
            cy +
            Math.sin(angle) *
            radius;

        if (
            i === 0
        )
        {
            mgraphics.move_to(
                x,
                y
            );
        }
        else
        {
            mgraphics.line_to(
                x,
                y
            );
        }
    }

    mgraphics.stroke();
}


// ==================================================
// CENTERED TEXT
// ==================================================

function drawCenteredText(
    text,
    centerX,
    centerY,
    fontSize,
    color
)
{
    text =
        String(
            text
        );

    mgraphics.select_font_face(
        "Arial"
    );

    mgraphics.set_font_size(
        fontSize
    );

    var measurement =
        mgraphics.text_measure(
            text
        );

    setColor(
        color
    );

    mgraphics.move_to(
        centerX -
        measurement[0] *
        0.5,

        centerY +
        fontSize *
        0.33
    );

    mgraphics.show_text(
        text
    );
}


// ==================================================
// UTILITIES
// ==================================================

function valueToAngle(v)
{
    v =
        clip(
            v,
            0,
            1
        );

    return (
        startAngle +
        v *
        (
            endAngle -
            startAngle
        )
    );
}


function setColor(color)
{
    mgraphics.set_source_rgba(
        color[0],
        color[1],
        color[2],
        color[3]
    );
}


function clip(
    v,
    minimum,
    maximum
)
{
    return Math.max(
        minimum,
        Math.min(
            maximum,
            v
        )
    );
}


function degreesToRadians(
    degrees
)
{
    return (
        degrees *
        Math.PI /
        180
    );
}


// ==================================================
// PATTR VALUE
// ==================================================

function getvalueof()
{
    if (pendingPattrValue !== null)
    {
        return pendingPattrValue;
    }

    return outputValue;
}


function applyPendingPattrValue()
{
    if (pendingPattrValue === null)
    {
        return;
    }

    var recalledOutput = pendingPattrValue;
    pendingPattrValue = null;

    /*
        pattr stores the final visible value. Rebuild rawInput by
        undoing Range, Exponent, Invert, then Near/Far so the next
        drag starts from the recalled physical position.
    */

    var rangeSpan =
        rangeMax -
        rangeMin;

    var normalized = 0;

    if (Math.abs(rangeSpan) >= 0.000001)
    {
        normalized =
            clip(
                (
                    recalledOutput -
                    rangeMin
                ) /
                rangeSpan,
                0,
                1
            );
    }

    normalized =
        Math.pow(
            normalized,
            1 /
            Math.max(
                0.001,
                curveExponent
            )
        );

    if (inverted)
    {
        normalized =
            1 -
            normalized;
    }

    rawInput =
        clip(
            nearValue +
            normalized *
            (
                farValue -
                nearValue
            ),
            0,
            1
        );

    calculateOutput(0);

    /*
        The deferred recall must publish the restored value once.
        Use sendOutputs() directly so MIN/MAX trigger bangs remain
        silent during preset recall.
    */
    sendOutputs();
}


function setvalueof(v)
{
    var value = normalizedInputValue(v);

    if (value === null)
    {
        return;
    }

    pendingPattrValue = value;

    rangePreviewSuppressedUntil =
        (new Date()).getTime() +
        rangePreviewPresetGuardMs;

    cancelRangePreview();

    if (pattrRestoreTask === null)
    {
        pattrRestoreTask =
            new Task(
                applyPendingPattrValue,
                this
            );
    }
    else
    {
        pattrRestoreTask.cancel();
    }

    pattrRestoreTask.schedule(
        pattrRestoreDelayMs
    );
}

// ==================================================
// RESIZE / LOAD
// ==================================================

function onresize(
    width,
    height
)
{
    mgraphics.redraw();
}


function loadbang()
{
    calculateOutput(0);

    mgraphics.redraw();
}
