autowatch = 1;

inlets = 1;
outlets = 2;

mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;


// ============================================================
// MODES
// ============================================================

var MODE_HANDS = "hands";
var MODE_CLUSTERS = "clusters";
var MODE_GAMEPAD = "gamepad";
var MODE_MOUSE = "mouse";
var MODE_WEARABLE = "wearable";

var UI_MODE = MODE_HANDS;


// ============================================================
// CORE
// ============================================================

var NUM_PARAMS = 12;
var MAX_SOURCES_PER_SIDE = 21;
var MAX_AXES = 4;

var handLandmarkNames = [
    "wrist",

    "thumb_cmc",
    "thumb_mcp",
    "thumb_ip",
    "thumb_tip",

    "index_mcp",
    "index_pip",
    "index_dip",
    "index_tip",

    "middle_mcp",
    "middle_pip",
    "middle_dip",
    "middle_tip",

    "ring_mcp",
    "ring_pip",
    "ring_dip",
    "ring_tip",

    "pinky_mcp",
    "pinky_pip",
    "pinky_dip",
    "pinky_tip"
];


// ============================================================
// GLOBAL LAYOUT
// ============================================================

var OUTER_MARGIN_X = 10;
var OUTER_MARGIN_Y = 6;

// 0 = fond transparent
var DRAW_BACKGROUND = 0;

var COL_BG =
    [0.19, 0.19, 0.19, 1.0];


// ============================================================
// LARGE MATRICES
// ============================================================

var LARGE_W = 185;
var LARGE_H = 300;

var LARGE_DOT_D = 21;
var LARGE_DOT_R =
    LARGE_DOT_D / 2;

var LARGE_Y = 100;

// cadre externe
var LARGE_FRAME_W = 191;
var LARGE_FRAME_H = 310;

var LARGE_FRAME_RADIUS = 14;

// espace central pour caméra / logo
var LARGE_CENTER_GAP = 500;


// ============================================================
// SMALL MATRICES
// ============================================================

var SMALL_W = 45;
var SMALL_H = 73;

var SMALL_DOT_D = 5.1;
var SMALL_DOT_R =
    SMALL_DOT_D / 2;

var SMALL_CONTENT_W = 24;
var SMALL_CONTENT_H = 58;

var SMALL_TOP_Y = 6;
var SMALL_BOTTOM_Y = 421;

var SMALL_RADIUS = 5;


// ============================================================
// HAND DISPLAY
// ============================================================

var HAND_AREA_W = 145;
var HAND_AREA_H = 270;

var HAND_CENTER_Y = 250;
var HAND_SCALE = 1.50;

var HAND_LED_OFF =
    [0.31, 0.31, 0.31, 1.0];

var HAND_LINE =
    [0.40, 0.40, 0.40, 0.75];


// ============================================================
// CONTEXT TEXT
// ============================================================
//
// exemple:
//
// MIDDLE TIP
// Param 1 · X · ON
//
// ============================================================

var SOURCE_TEXT_SIZE = 14;
var ACTION_TEXT_SIZE = 12;

// espace entre les 2 lignes
var TEXT_LINE_GAP = 18;

// espace lateral entre le texte et le bord exterieur du cadre
var TEXT_OUTER_GAP = 24;

// position des textes pres du bas du cadre
var TEXT_BOTTOM_INSET = 0;


// ============================================================
// COLORS
// ============================================================

// inactive
var COL_DOT_OFF =
    [0.31, 0.31, 0.31, 1.0];

// Couleurs par cote et par etat.
var COL_LEFT_BORDER_ACTIVE =
    [0.882, 0.588, 0.008, 1.000];

var COL_RIGHT_BORDER_ACTIVE =
    [0.365, 0.420, 0.886, 1.000];

var COL_LEFT_BORDER_INACTIVE =
    [0.329, 0.376, 0.451, 1.000];

var COL_RIGHT_BORDER_INACTIVE =
    [0.329, 0.376, 0.451, 1.000];

var COL_LEFT_BG_ACTIVE =
    [0.882, 0.588, 0.008, 0.16];

var COL_RIGHT_BG_ACTIVE =
    [0.365, 0.420, 0.886, 0.16];

var COL_LEFT_BG_INACTIVE =
    [0.22, 0.22, 0.22, 0.0];

var COL_RIGHT_BG_INACTIVE =
    [0.22, 0.22, 0.22, 0.0];

var COL_TEXT =
    [0.78, 0.78, 0.78, 1.0];

var COL_TEXT_DIM =
    [0.58, 0.58, 0.58, 1.0];


// ============================================================
// OUTPUT
// ============================================================
//
// outlet 0:
// left_index_tip 0 11 1
//
// outlet 1:
// ledleft 9 1
// ledright 13 0
//
// ============================================================

var OUTPUT_SIDE_PREFIX = 1;


// ============================================================
// MODE STATE
// ============================================================
//
// Chaque mode possède SON état:
// - mappings
// - sélection
// - active
// - dernier message UI
//
// Donc changer de mode ne détruit rien.
//
// ============================================================

var modeStates = {};

var smallRects =
    [[], []];

var handLedRects =
    [[], []];


// ============================================================
// MODE PROPERTIES
// ============================================================

function getAxisCountForMode(modeName)
{
    if (modeName === MODE_MOUSE)
        return 2;

    if (modeName === MODE_GAMEPAD)
        return 4;

    return 3;
}


function getAxisNamesForMode(modeName)
{
    if (modeName === MODE_MOUSE)
        return [
            "X",
            "Y"
        ];

    if (modeName === MODE_GAMEPAD)
        return [
            "X",
            "Y",
            "Radius",
            "Rotary"
        ];

    return [
        "X",
        "Y",
        "Z"
    ];
}


function getSourceCountForMode(modeName)
{
    if (modeName === MODE_HANDS)
        return 21;

    if (modeName === MODE_CLUSTERS)
        return 12;

    // mouse / gamepad / wearable
    return 1;
}


function modeHasSmallRows(modeName)
{
    return (
        modeName === MODE_HANDS ||
        modeName === MODE_CLUSTERS
    );
}


// ============================================================
// CREATE MODE STATE
// ============================================================

function makeModeState(modeName)
{
    var state = {
        selected: [-1, -1],
        active: [[], []],
        mappings: [[], []],
        lastAction: [[], []]
    };

    var h;
    var s;
    var p;

    for (h = 0; h < 2; h++)
    {
        for (
            s = 0;
            s < MAX_SOURCES_PER_SIDE;
            s++
        )
        {
            state.active[h][s] = 0;

            state.mappings[h][s] = [];

            state.lastAction[h][s] =
                null;

            for (
                p = 0;
                p < NUM_PARAMS;
                p++
            )
            {
                state.mappings[h][s][p] =
                    [0, 0, 0, 0];
            }
        }
    }

    return state;
}


// ============================================================
// INIT ALL MODES
// ============================================================

function initializeModeStates()
{
    modeStates[MODE_HANDS] =
        makeModeState(MODE_HANDS);

    modeStates[MODE_CLUSTERS] =
        makeModeState(MODE_CLUSTERS);

    modeStates[MODE_GAMEPAD] =
        makeModeState(MODE_GAMEPAD);

    modeStates[MODE_MOUSE] =
        makeModeState(MODE_MOUSE);

    modeStates[MODE_WEARABLE] =
        makeModeState(MODE_WEARABLE);
}

initializeModeStates();


function currentState()
{
    return modeStates[UI_MODE];
}


// ============================================================
// MODE MESSAGE
//
// mode hands
// mode clusters
// mode gamepad
// mode mouse
// mode wearable
//
// ============================================================

function normalizedModeName(name)
{
    name =
        ("" + name).toLowerCase();

    if (name === MODE_CLUSTERS)
        return MODE_CLUSTERS;

    if (name === MODE_GAMEPAD)
        return MODE_GAMEPAD;

    if (name === MODE_MOUSE)
        return MODE_MOUSE;

    if (name === MODE_WEARABLE)
        return MODE_WEARABLE;

    return MODE_HANDS;
}


function mode()
{
    var a =
        arrayfromargs(arguments);

    if (a.length < 1)
        return;

    UI_MODE =
        normalizedModeName(a[0]);

    // resynchronise les gates
    // quand on revient sur hands
    if (UI_MODE === MODE_HANDS)
        emitAllHandLedStates();
    notifyPattr();
    mgraphics.redraw();
}


// ============================================================
// HELPERS
// ============================================================

function handIndex(name)
{
    name =
        ("" + name).toLowerCase();

    if (
        name === "right" ||
        name === "r"
    )
        return 1;

    return 0;
}


function getBorderColor(
    hand,
    active
)
{
    if (hand === 0)
        return active
            ? COL_LEFT_BORDER_ACTIVE
            : COL_LEFT_BORDER_INACTIVE;

    return active
        ? COL_RIGHT_BORDER_ACTIVE
        : COL_RIGHT_BORDER_INACTIVE;
}


function getBackgroundColor(
    hand,
    active
)
{
    if (hand === 0)
        return active
            ? COL_LEFT_BG_ACTIVE
            : COL_LEFT_BG_INACTIVE;

    return active
        ? COL_RIGHT_BG_ACTIVE
        : COL_RIGHT_BG_INACTIVE;
}


function setColorValue(
    color,
    args
)
{
    if (args.length < 3)
        return false;

    color[0] = parseFloat(args[0]);
    color[1] = parseFloat(args[1]);
    color[2] = parseFloat(args[2]);
    color[3] =
        args.length >= 4
        ? parseFloat(args[3])
        : 1.0;

    mgraphics.redraw();

    return true;
}


function leftborderactive()
{
    setColorValue(
        COL_LEFT_BORDER_ACTIVE,
        arrayfromargs(arguments)
    );
}


function rightborderactive()
{
    setColorValue(
        COL_RIGHT_BORDER_ACTIVE,
        arrayfromargs(arguments)
    );
}


function leftborderinactive()
{
    setColorValue(
        COL_LEFT_BORDER_INACTIVE,
        arrayfromargs(arguments)
    );
}


function rightborderinactive()
{
    setColorValue(
        COL_RIGHT_BORDER_INACTIVE,
        arrayfromargs(arguments)
    );
}


function leftbgactive()
{
    setColorValue(
        COL_LEFT_BG_ACTIVE,
        arrayfromargs(arguments)
    );
}


function rightbgactive()
{
    setColorValue(
        COL_RIGHT_BG_ACTIVE,
        arrayfromargs(arguments)
    );
}


function leftbginactive()
{
    setColorValue(
        COL_LEFT_BG_INACTIVE,
        arrayfromargs(arguments)
    );
}


function rightbginactive()
{
    setColorValue(
        COL_RIGHT_BG_INACTIVE,
        arrayfromargs(arguments)
    );
}


// Raccourci: change les deux contours inactifs.
function inactivebordercolor()
{
    var args =
        arrayfromargs(arguments);

    if (args.length < 3)
        return;

    setColorValue(
        COL_LEFT_BORDER_INACTIVE,
        args
    );

    setColorValue(
        COL_RIGHT_BORDER_INACTIVE,
        args
    );
}


// Compatibilite avec les messages precedents.
// Ils changent la couleur active du contour et le RGB du fond.
function updateSideColor(
    hand,
    args
)
{
    var border =
        hand === 0
        ? COL_LEFT_BORDER_ACTIVE
        : COL_RIGHT_BORDER_ACTIVE;

    var background =
        hand === 0
        ? COL_LEFT_BG_ACTIVE
        : COL_RIGHT_BG_ACTIVE;

    if (!setColorValue(border, args))
        return;

    background[0] = border[0];
    background[1] = border[1];
    background[2] = border[2];
}


function leftcolor()
{
    updateSideColor(
        0,
        arrayfromargs(arguments)
    );
}


function rightcolor()
{
    updateSideColor(
        1,
        arrayfromargs(arguments)
    );
}


function roundedRect(
    g,
    x,
    y,
    w,
    h,
    radius
)
{
    var r =
        Math.min(
            radius,
            w / 2,
            h / 2
        );

    g.move_to(
        x + r,
        y
    );

    g.line_to(
        x + w - r,
        y
    );

    g.curve_to(
        x + w - r * 0.45,
        y,

        x + w,
        y + r * 0.45,

        x + w,
        y + r
    );

    g.line_to(
        x + w,
        y + h - r
    );

    g.curve_to(
        x + w,
        y + h - r * 0.45,

        x + w - r * 0.45,
        y + h,

        x + w - r,
        y + h
    );

    g.line_to(
        x + r,
        y + h
    );

    g.curve_to(
        x + r * 0.45,
        y + h,

        x,
        y + h - r * 0.45,

        x,
        y + h - r
    );

    g.line_to(
        x,
        y + r
    );

    g.curve_to(
        x,
        y + r * 0.45,

        x + r * 0.45,
        y,

        x + r,
        y
    );

    g.close_path();
}


// ============================================================
// LARGE POSITION
// ============================================================

function getLargeX(hand)
{
    var W =
        box.rect[2] -
        box.rect[0];

    var center =
        W / 2;

    if (hand === 0)
    {
        return (
            center -
            LARGE_CENTER_GAP / 2 -
            LARGE_W
        );
    }

    return (
        center +
        LARGE_CENTER_GAP / 2
    );
}


// ============================================================
// SOURCE LABEL
// ============================================================

function getSourceLabel(
    hand,
    sourceIndex
)
{
    var side =
        hand === 0
        ? "left"
        : "right";


    if (UI_MODE === MODE_HANDS)
    {
        var base =
            handLandmarkNames[
                sourceIndex
            ];

        if (OUTPUT_SIDE_PREFIX)
            return side + "_" + base;

        return base;
    }


    if (UI_MODE === MODE_CLUSTERS)
    {
        return (
            side +
            "_cluster_" +
            (sourceIndex + 1)
        );
    }


    if (UI_MODE === MODE_GAMEPAD)
    {
        return (
            "gamepad_" +
            side
        );
    }


    if (UI_MODE === MODE_MOUSE)
    {
        return (
            "mouse_" +
            side
        );
    }


    if (UI_MODE === MODE_WEARABLE)
    {
        return (
            "wearable_" +
            side
        );
    }


    return (
        side +
        "_source_" +
        (sourceIndex + 1)
    );
}


// ============================================================
// DISPLAY LABEL
// ============================================================

function getDisplayLabel(
    hand,
    sourceIndex
)
{
    if (sourceIndex < 0)
        return "";


    if (UI_MODE === MODE_HANDS)
    {
        return handLandmarkNames[
            sourceIndex
        ]
        .replace(/_/g, " ")
        .toUpperCase();
    }


    if (UI_MODE === MODE_CLUSTERS)
    {
        return (
            "CLUSTER " +
            (sourceIndex + 1)
        );
    }


    if (UI_MODE === MODE_GAMEPAD)
    {
        return hand === 0
            ? "GAMEPAD LEFT"
            : "GAMEPAD RIGHT";
    }


    if (UI_MODE === MODE_MOUSE)
    {
        return hand === 0
            ? "MOUSE LEFT"
            : "MOUSE RIGHT";
    }


    if (UI_MODE === MODE_WEARABLE)
    {
        return hand === 0
            ? "WEARABLE LEFT"
            : "WEARABLE RIGHT";
    }


    return "";
}

// ============================================================
// PAINT
// ============================================================

function paint()
{
    var g = mgraphics;

    var W =
        box.rect[2] -
        box.rect[0];

    var H =
        box.rect[3] -
        box.rect[1];


    if (DRAW_BACKGROUND)
    {
        g.set_source_rgba(
            COL_BG
        );

        g.rectangle(
            0,
            0,
            W,
            H
        );

        g.fill();
    }


    smallRects = [[], []];
    handLedRects = [[], []];


    // petites matrices
    if (modeHasSmallRows(UI_MODE))
    {
        drawSmallRow(
            0,
            SMALL_TOP_Y
        );

        drawSmallRow(
            1,
            SMALL_BOTTOM_Y
        );
    }


    // mains uniquement MediaPipe
    if (UI_MODE === MODE_HANDS)
    {
        drawHandDiagram(0);
        drawHandDiagram(1);
    }


    // grandes matrices
    drawLargeGrid(
        0,
        getLargeX(0),
        LARGE_Y
    );

    drawLargeGrid(
        1,
        getLargeX(1),
        LARGE_Y
    );
}


// ============================================================
// SMALL ROW
// ============================================================

function drawSmallRow(
    hand,
    y
)
{
    var W =
        box.rect[2] -
        box.rect[0];

    var count =
        getSourceCountForMode(
            UI_MODE
        );

    var totalW =
        count *
        SMALL_W;

    var availableGap =
        W -
        OUTER_MARGIN_X * 2 -
        totalW;

    var gap =
        count > 1
        ? availableGap /
          (count - 1)
        : 0;

    var x =
        OUTER_MARGIN_X;


    for (
        var s = 0;
        s < count;
        s++
    )
    {
        drawSmallGrid(
            hand,
            s,
            x,
            y
        );

        x +=
            SMALL_W +
            gap;
    }
}


// ============================================================
// SMALL GRID
// ============================================================

function drawSmallGrid(
    hand,
    sourceIndex,
    x,
    y
)
{
    var g = mgraphics;

    var state =
        currentState();

    var selected =
        state.selected[hand] ===
        sourceIndex;

    var active =
        state.active[hand][sourceIndex]
        ? 1
        : 0;


    smallRects[hand][sourceIndex] =
        [
            x,
            y,
            SMALL_W,
            SMALL_H
        ];


    // --------------------------------------------------------
    // BACKGROUND
    // --------------------------------------------------------

    g.set_source_rgba(
        getBackgroundColor(
            hand,
            active
        )
    );

    roundedRect(
        g,
        x,
        y,
        SMALL_W,
        SMALL_H,
        SMALL_RADIUS
    );

    g.fill();


    // --------------------------------------------------------
    // BORDER
    // --------------------------------------------------------

    if (selected)
    {
        g.set_source_rgba(
            getBorderColor(
                hand,
                1
            )
        );

        g.set_line_width(1.2);
    }
    else
    {
        g.set_source_rgba(
            getBorderColor(
                hand,
                0
            )
        );

        g.set_line_width(0.8);
    }

    roundedRect(
        g,
        x,
        y,
        SMALL_W,
        SMALL_H,
        SMALL_RADIUS
    );

    g.stroke();


    // --------------------------------------------------------
    // AXES
    // --------------------------------------------------------

    var axisCount =
        getAxisCountForMode(
            UI_MODE
        );


    // --------------------------------------------------------
    // LED FIELD
    // --------------------------------------------------------

    var contentX =
        x +
        (
            SMALL_W -
            SMALL_CONTENT_W
        ) / 2;

    var contentY =
        y +
        (
            SMALL_H -
            SMALL_CONTENT_H
        ) / 2;


    var usableW =
        SMALL_CONTENT_W -
        SMALL_DOT_D;

    var usableH =
        SMALL_CONTENT_H -
        SMALL_DOT_D;


    var stepX =
        axisCount > 1
        ? usableW /
          (axisCount - 1)
        : 0;


    var stepY =
        usableH /
        (NUM_PARAMS - 1);


    for (
        var p = 0;
        p < NUM_PARAMS;
        p++
    )
    {
        for (
            var a = 0;
            a < axisCount;
            a++
        )
        {
            var cx =
                contentX +
                SMALL_DOT_R +
                a * stepX;


            var cy =
                contentY +
                SMALL_DOT_R +
                p * stepY;


            if (
                state.mappings
                    [hand]
                    [sourceIndex]
                    [p]
                    [a]
            )
            {
                g.set_source_rgba(
                    getBorderColor(
                        hand,
                        1
                    )
                );
            }
            else
            {
                g.set_source_rgba(
                    COL_DOT_OFF
                );
            }


            g.ellipse(
                cx - SMALL_DOT_R,
                cy - SMALL_DOT_R,
                SMALL_DOT_D,
                SMALL_DOT_D
            );

            g.fill();
        }
    }
}


// ============================================================
// LARGE GRID
// ============================================================

function drawLargeGrid(
    hand,
    x,
    y
)
{
    var g = mgraphics;

    var state =
        currentState();

    var sourceIndex =
        state.selected[hand];

    // Même sans sélection,
    // on affiche une matrice vide.
    var displaySource =
        sourceIndex >= 0
        ? sourceIndex
        : 0;


    var axisCount =
        getAxisCountForMode(
            UI_MODE
        );


    // --------------------------------------------------------
    // FRAME POSITION
    // --------------------------------------------------------

    var frameX =
        x -
        (
            LARGE_FRAME_W -
            LARGE_W
        ) / 2;


    var frameY =
        y -
        (
            LARGE_FRAME_H -
            LARGE_H
        ) / 2;


    // --------------------------------------------------------
    // FRAME
    // --------------------------------------------------------

    g.set_source_rgba(
        sourceIndex >= 0
        ? getBorderColor(hand, 1)
        : getBorderColor(hand, 0)
    );

    g.set_line_width(
        sourceIndex >= 0
        ? 2
        : 1.2
    );


    roundedRect(
        g,
        frameX,
        frameY,
        LARGE_FRAME_W,
        LARGE_FRAME_H,
        LARGE_FRAME_RADIUS
    );

    g.stroke();


    // --------------------------------------------------------
    // LED GEOMETRY
    // --------------------------------------------------------

    var horizontalPadding = 25;


    var horizontalFree =
        LARGE_W -
        horizontalPadding * 2 -
        LARGE_DOT_D *
        axisCount;


    var horizontalGap =
        axisCount > 1
        ? horizontalFree /
          (axisCount - 1)
        : 0;


    var verticalFree =
        LARGE_H -
        LARGE_DOT_D *
        NUM_PARAMS;


    var verticalGap =
        verticalFree /
        (NUM_PARAMS + 1);


    var stepX =
        LARGE_DOT_D +
        horizontalGap;


    var stepY =
        LARGE_DOT_D +
        verticalGap;


    // --------------------------------------------------------
    // DOTS
    // --------------------------------------------------------

    for (
        var p = 0;
        p < NUM_PARAMS;
        p++
    )
    {
        var cy =
            y +
            verticalGap +
            LARGE_DOT_R +
            p * stepY;


        for (
            var a = 0;
            a < axisCount;
            a++
        )
        {
            var cx =
                x +
                horizontalPadding +
                LARGE_DOT_R +
                a * stepX;


            if (
                state.mappings
                    [hand]
                    [displaySource]
                    [p]
                    [a]
            )
            {
                g.set_source_rgba(
                    getBorderColor(
                        hand,
                        1
                    )
                );
            }
            else
            {
                g.set_source_rgba(
                    COL_DOT_OFF
                );
            }


            g.ellipse(
                cx - LARGE_DOT_R,
                cy - LARGE_DOT_R,
                LARGE_DOT_D,
                LARGE_DOT_D
            );

            g.fill();
        }
    }


    // --------------------------------------------------------
    // TEXT
    // --------------------------------------------------------

    drawContextText(
        hand,
        sourceIndex,
        frameX,
        frameY,
        LARGE_FRAME_W
    );
}


// ============================================================
// CONTEXT TEXT
// ============================================================

function drawContextText(
    hand,
    sourceIndex,
    frameX,
    frameY,
    frameW
)
{
    if (sourceIndex < 0)
        return;


    var g = mgraphics;

    var state =
        currentState();


    var title =
        getDisplayLabel(
            hand,
            sourceIndex
        );


    if (UI_MODE === MODE_HANDS)
    {
        title +=
            state.active[hand][sourceIndex]
            ? " · ON"
            : " · OFF";
    }


    var action =
        state.lastAction
            [hand]
            [sourceIndex];


    var actionText =
        action
        ? action.text
        : "";


    var y1 =
        frameY +
        LARGE_FRAME_H -
        TEXT_BOTTOM_INSET -
        TEXT_LINE_GAP;


    var y2 =
        frameY +
        LARGE_FRAME_H -
        TEXT_BOTTOM_INSET;


    g.select_font_face(
        "Arial"
    );


    // --------------------------------------------------------
    // LEFT
    // --------------------------------------------------------

    if (hand === 0)
    {
        g.set_source_rgba(
            COL_TEXT
        );

        g.set_font_size(
            SOURCE_TEXT_SIZE
        );

        var tw =
            g.text_measure(
                title
            )[0];

        g.move_to(
            frameX -
            TEXT_OUTER_GAP -
            tw,
            y1
        );

        g.show_text(
            title
        );


        if (
            actionText.length > 0
        )
        {
            g.set_source_rgba(
                COL_TEXT_DIM
            );

            g.set_font_size(
                ACTION_TEXT_SIZE
            );

            var aw =
                g.text_measure(
                    actionText
                )[0];

            g.move_to(
                frameX -
                TEXT_OUTER_GAP -
                aw,
                y2
            );

            g.show_text(
                actionText
            );
        }
    }


    // --------------------------------------------------------
    // RIGHT
    // --------------------------------------------------------

    else
    {
        g.set_source_rgba(
            COL_TEXT
        );

        g.set_font_size(
            SOURCE_TEXT_SIZE
        );


        g.move_to(
            frameX +
            frameW +
            TEXT_OUTER_GAP,
            y1
        );

        g.show_text(
            title
        );


        if (
            actionText.length > 0
        )
        {
            g.set_source_rgba(
                COL_TEXT_DIM
            );

            g.set_font_size(
                ACTION_TEXT_SIZE
            );


            g.move_to(
                frameX +
                frameW +
                TEXT_OUTER_GAP,
                y2
            );

            g.show_text(
                actionText
            );
        }
    }
}


// ============================================================
// HAND DIAGRAM
//
// uniquement mode hands
// ============================================================

function drawHandDiagram(hand)
{
    var g = mgraphics;

    var W =
        box.rect[2] -
        box.rect[0];


    var frameExtraX =
        (
            LARGE_FRAME_W -
            LARGE_W
        ) / 2;


    var leftLargeEdge =
        getLargeX(0) -
        frameExtraX;


    var rightLargeEdge =
        getLargeX(1) +
        LARGE_W +
        frameExtraX;


    // A mi-chemin entre la bordure du JSUI et la grande matrice.
    var centerX =
        hand === 0
        ? (
            OUTER_MARGIN_X +
            leftLargeEdge
          ) / 2
        : (
            rightLargeEdge +
            W -
            OUTER_MARGIN_X
          ) / 2;


    var centerY =
        HAND_CENTER_Y;


    var mirror =
        hand === 0
        ? -1
        : 1;


    var scale =
        HAND_SCALE;


    // MediaPipe-like layout

    var pts = [
        [0, 58],

        [-28, 30],
        [-43, 15],
        [-55, 2],
        [-67, -8],

        [-23, 19],
        [-27, -14],
        [-29, -40],
        [-30, -62],

        [-7, 16],
        [-7, -22],
        [-7, -51],
        [-7, -77],

        [10, 18],
        [13, -18],
        [16, -46],
        [18, -69],

        [27, 25],
        [34, -5],
        [39, -28],
        [43, -47]
    ];


    var edges = [
        [0,1],
        [1,2],
        [2,3],
        [3,4],

        [0,5],
        [5,6],
        [6,7],
        [7,8],

        [0,9],
        [9,10],
        [10,11],
        [11,12],

        [0,13],
        [13,14],
        [14,15],
        [15,16],

        [0,17],
        [17,18],
        [18,19],
        [19,20],

        [5,9],
        [9,13],
        [13,17]
    ];


    // --------------------------------------------------------
    // BONES
    // --------------------------------------------------------

    g.set_source_rgba(
        HAND_LINE
    );

    g.set_line_width(1.2);


    for (
        var e = 0;
        e < edges.length;
        e++
    )
    {
        var i0 =
            edges[e][0];

        var i1 =
            edges[e][1];


        var x0 =
            centerX +
            pts[i0][0] *
            scale *
            mirror;


        var y0 =
            centerY +
            pts[i0][1] *
            scale;


        var x1 =
            centerX +
            pts[i1][0] *
            scale *
            mirror;


        var y1 =
            centerY +
            pts[i1][1] *
            scale;


        g.move_to(
            x0,
            y0
        );

        g.line_to(
            x1,
            y1
        );

        g.stroke();
    }


    // --------------------------------------------------------
    // LEDs
    // --------------------------------------------------------

    var state =
        currentState();


    for (
        var i = 0;
        i < 21;
        i++
    )
    {
        var px =
            centerX +
            pts[i][0] *
            scale *
            mirror;


        var py =
            centerY +
            pts[i][1] *
            scale;


        var active =
            state.active[hand][i];


        var selected =
            state.selected[hand] ===
            i;


        var r =
            active
            ? 4.5
            : 3.6;


        if (active)
        {
            g.set_source_rgba(
                getBorderColor(
                    hand,
                    1
                )
            );
        }
        else
        {
            g.set_source_rgba(
                HAND_LED_OFF
            );
        }


        g.ellipse(
            px - r,
            py - r,
            r * 2,
            r * 2
        );

        g.fill();


        // La couleur de remplissage indique ACTIVE.
        // Le cercle exterieur indique SELECTED.
        if (selected)
        {
            var selectedR = 5.8;

            g.set_source_rgba(
                getBorderColor(
                    hand,
                    1
                )
            );

            g.set_line_width(1.2);

            g.ellipse(
                px - selectedR,
                py - selectedR,
                selectedR * 2,
                selectedR * 2
            );

            g.stroke();
        }


        handLedRects[hand][i] =
            [
                px - 9,
                py - 9,
                18,
                18
            ];
    }
}


// ============================================================
// LED OUTPUT
// ============================================================

function emitHandLedState(
    hand,
    sourceNumber,
    state
)
{
    if (UI_MODE !== MODE_HANDS)
        return;


    outlet(
        1,

        hand === 0
        ? "ledleft"
        : "ledright",

        sourceNumber,
        state
    );
}


function emitAllHandLedStates()
{
    var state =
        modeStates[
            MODE_HANDS
        ];


    for (
        var h = 0;
        h < 2;
        h++
    )
    {
        for (
            var i = 0;
            i < 21;
            i++
        )
        {
            emitHandLedState(
                h,
                i + 1,
                state.active[h][i]
            );
        }
    }
}

// ============================================================
// INPUT
//
// set 1 1
// set left 1 1
// set right 1 1
//
// ============================================================

function set()
{
    var a =
        arrayfromargs(arguments);


    if (a.length === 2)
    {
        setSource(
            0,
            parseInt(a[0]),
            parseInt(a[1])
        );

        return;
    }


    if (a.length >= 3)
    {
        setSource(
            handIndex(a[0]),
            parseInt(a[1]),
            parseInt(a[2])
        );
    }
}


// ============================================================
// RAW LIST
// ============================================================

function list()
{
    var a =
        arrayfromargs(arguments);


    if (a.length === 2)
    {
        setSource(
            0,
            parseInt(a[0]),
            parseInt(a[1])
        );

        return;
    }


    if (a.length >= 3)
    {
        setSource(
            handIndex(a[0]),
            parseInt(a[1]),
            parseInt(a[2])
        );
    }
}


// ============================================================
// DIRECT LEFT / RIGHT
// ============================================================

function left()
{
    var a =
        arrayfromargs(arguments);

    if (a.length < 2)
        return;


    setSource(
        0,
        parseInt(a[0]),
        parseInt(a[1])
    );
}


function right()
{
    var a =
        arrayfromargs(arguments);

    if (a.length < 2)
        return;


    setSource(
        1,
        parseInt(a[0]),
        parseInt(a[1])
    );
}


// ============================================================
// ACTIVE SOURCE
// ============================================================

function setSource(
    hand,
    sourceNumber,
    stateValue
)
{
    var sourceIndex =
        sourceNumber - 1;


    var count =
        getSourceCountForMode(
            UI_MODE
        );


    if (
        sourceIndex < 0 ||
        sourceIndex >= count
    )
        return;


    var state =
        currentState();


    var on =
        stateValue
        ? 1
        : 0;


    state.active
        [hand]
        [sourceIndex] =
        on;


    // active → selected
    if (on)
    {
        state.selected[hand] =
            sourceIndex;
    }

    // selected source off
    // → no selection
    else if (
        state.selected[hand] ===
        sourceIndex
    )
    {
        state.selected[hand] =
            -1;
    }


    // hands only:
    // output LED/gate state
    if (UI_MODE === MODE_HANDS)
    {
        emitHandLedState(
            hand,
            sourceNumber,
            on
        );
    }

    notifyPattr();
    mgraphics.redraw();
}


// ============================================================
// MANUAL SELECT
//
// select left 9
// select right 9
//
// ============================================================

function select()
{
    var a =
        arrayfromargs(arguments);


    if (a.length < 2)
        return;


    var hand =
        handIndex(a[0]);


    var sourceIndex =
        parseInt(a[1]) - 1;


    var count =
        getSourceCountForMode(
            UI_MODE
        );


    if (
        sourceIndex < 0 ||
        sourceIndex >= count
    )
        return;


    currentState()
        .selected[hand] =
        sourceIndex;

    notifyPattr();
    mgraphics.redraw();
}


// ============================================================
// CLICK
// ============================================================

function onclick(
    x,
    y,
    button,
    cmd,
    shift,
    capslock,
    option,
    ctrl
)
{
    var state =
        currentState();

    var h;
    var s;


    // --------------------------------------------------------
    // HAND LEDs
    // --------------------------------------------------------

    if (UI_MODE === MODE_HANDS)
    {
        for (
            h = 0;
            h < 2;
            h++
        )
        {
            for (
                s = 0;
                s < 21;
                s++
            )
            {
                var lr =
                    handLedRects[h][s];


                if (!lr)
                    continue;


                if (
                    x >= lr[0] &&
                    x <= lr[0] + lr[2] &&

                    y >= lr[1] &&
                    y <= lr[1] + lr[3]
                )
                {
                    // Une LED de main controle ACTIVE.
                    // setSource conserve l'etat, selectionne la
                    // source a l'activation et emet ledleft/right.
                    setSource(
                        h,
                        s + 1,
                        state.active[h][s]
                            ? 0
                            : 1
                    );

                    return;
                }
            }
        }
    }


    // --------------------------------------------------------
    // SMALL MATRICES
    // --------------------------------------------------------

    if (
        modeHasSmallRows(
            UI_MODE
        )
    )
    {
        var count =
            getSourceCountForMode(
                UI_MODE
            );


        for (
            h = 0;
            h < 2;
            h++
        )
        {
            for (
                s = 0;
                s < count;
                s++
            )
            {
                var r =
                    smallRects[h][s];


                if (!r)
                    continue;


                if (
                    x >= r[0] &&
                    x <= r[0] + r[2] &&

                    y >= r[1] &&
                    y <= r[1] + r[3]
                )
                {
                    state.selected[h] =
                        s;


                    mgraphics.redraw();

                    return;
                }
            }
        }
    }


    // --------------------------------------------------------
    // LARGE LEFT
    // --------------------------------------------------------

    if (
        checkLargeClick(
            0,
            getLargeX(0),
            LARGE_Y,
            x,
            y
        )
    )
        return;


    // --------------------------------------------------------
    // LARGE RIGHT
    // --------------------------------------------------------

    checkLargeClick(
        1,
        getLargeX(1),
        LARGE_Y,
        x,
        y
    );
}


// ============================================================
// LARGE CLICK
// ============================================================

function checkLargeClick(
    hand,
    gx,
    gy,
    mx,
    my
)
{
    var state =
        currentState();


    var sourceIndex =
        state.selected[hand];


    // --------------------------------------------------------
    // MODES AVEC UNE SEULE SOURCE
    //
    // mouse / gamepad / wearable
    //
    // clic = selection
    // --------------------------------------------------------

    if (
        sourceIndex < 0 &&
        getSourceCountForMode(
            UI_MODE
        ) === 1
    )
    {
        sourceIndex = 0;

        state.selected[hand] = 0;

        mgraphics.redraw();
    }


    // hands / clusters sans selection
    if (sourceIndex < 0)
        return false;


    // --------------------------------------------------------
    // HIT TEST
    // --------------------------------------------------------

    if (
        mx < gx ||
        mx > gx + LARGE_W ||

        my < gy ||
        my > gy + LARGE_H
    )
        return false;


    // --------------------------------------------------------
    // AXES
    // --------------------------------------------------------

    var axisCount =
        getAxisCountForMode(
            UI_MODE
        );


    // --------------------------------------------------------
    // GEOMETRY
    // --------------------------------------------------------

    var horizontalPadding = 25;


    var horizontalFree =
        LARGE_W -
        horizontalPadding * 2 -
        LARGE_DOT_D *
        axisCount;


    var horizontalGap =
        axisCount > 1
        ? horizontalFree /
          (axisCount - 1)
        : 0;


    var verticalFree =
        LARGE_H -
        LARGE_DOT_D *
        NUM_PARAMS;


    var verticalGap =
        verticalFree /
        (NUM_PARAMS + 1);


    var stepX =
        LARGE_DOT_D +
        horizontalGap;


    var stepY =
        LARGE_DOT_D +
        verticalGap;


    // --------------------------------------------------------
    // FIND CELL
    // --------------------------------------------------------

    var bestAxis = 0;
    var bestParam = 0;

    var bestDistance =
        999999;


    for (
        var p = 0;
        p < NUM_PARAMS;
        p++
    )
    {
        var cy =
            gy +
            verticalGap +
            LARGE_DOT_R +
            p * stepY;


        for (
            var a = 0;
            a < axisCount;
            a++
        )
        {
            var cx =
                gx +
                horizontalPadding +
                LARGE_DOT_R +
                a * stepX;


            var dx =
                mx - cx;


            var dy =
                my - cy;


            var distance =
                dx * dx +
                dy * dy;


            if (
                distance <
                bestDistance
            )
            {
                bestDistance =
                    distance;

                bestAxis =
                    a;

                bestParam =
                    p;
            }
        }
    }


    // --------------------------------------------------------
    // TOGGLE
    //
    // Une seule pastille peut etre ON par ligne de parametre.
    // Activer un axe coupe les autres axes de cette ligne.
    // --------------------------------------------------------

    var wasOn =
        state.mappings
            [hand]
            [sourceIndex]
            [bestParam]
            [bestAxis]
        ? 1
        : 0;

    var clearedAxes = [];

    if (!wasOn)
    {
        for (
            var otherAxis = 0;
            otherAxis < axisCount;
            otherAxis++
        )
        {
            if (
                otherAxis !== bestAxis &&
                state.mappings
                    [hand]
                    [sourceIndex]
                    [bestParam]
                    [otherAxis]
            )
            {
                state.mappings
                    [hand]
                    [sourceIndex]
                    [bestParam]
                    [otherAxis] = 0;

                clearedAxes.push(
                    otherAxis
                );
            }
        }
    }

    state.mappings
        [hand]
        [sourceIndex]
        [bestParam]
        [bestAxis] =
        wasOn
        ? 0
        : 1;


    var on =
        state.mappings
            [hand]
            [sourceIndex]
            [bestParam]
            [bestAxis];


    // --------------------------------------------------------
    // CONTEXT FEEDBACK
    // --------------------------------------------------------

    var axisNames =
        getAxisNamesForMode(
            UI_MODE
        );


    state.lastAction
        [hand]
        [sourceIndex] =
    {
        param: bestParam,
        axis: bestAxis,
        state: on,

        text:
            "Param " +
            (bestParam + 1) +
            " · " +
            axisNames[bestAxis] +
            " · " +
            (
                on
                ? "ON"
                : "OFF"
            )
    };
    
    notifyPattr();

    // --------------------------------------------------------
    // OUTPUT MAPPING
    //
    // source axis param state
    // --------------------------------------------------------

    var sourceLabel =
        getSourceLabel(
            hand,
            sourceIndex
        );

    // Informe aussi Max des axes coupes par l'exclusivite.
    for (
        var clearedIndex = 0;
        clearedIndex < clearedAxes.length;
        clearedIndex++
    )
    {
        outlet(
            0,
            sourceLabel,
            clearedAxes[clearedIndex],
            bestParam,
            0
        );
    }

    outlet(
        0,
        sourceLabel,
        bestAxis,
        bestParam,
        on
    );


    mgraphics.redraw();

    return true;
}


// ============================================================
// CLEAR CURRENT MODE
// ============================================================

function clear()
{
    modeStates[UI_MODE] =
        makeModeState(
            UI_MODE
        );


    if (UI_MODE === MODE_HANDS)
        emitAllHandLedStates();

    notifyPattr();
    mgraphics.redraw();
}


// ============================================================
// CLEAR ALL MODES
// ============================================================

function clearall()
{
    initializeModeStates();


    if (UI_MODE === MODE_HANDS)
        emitAllHandLedStates();

    notifyPattr();
    mgraphics.redraw();
}


// ============================================================
// CLEAR MAPPINGS CURRENT MODE
// ============================================================

function clearmappings()
{
    var state =
        currentState();

    var h;
    var s;
    var p;


    for (
        h = 0;
        h < 2;
        h++
    )
    {
        for (
            s = 0;
            s < MAX_SOURCES_PER_SIDE;
            s++
        )
        {
            state.lastAction[h][s] =
                null;


            for (
                p = 0;
                p < NUM_PARAMS;
                p++
            )
            {
                state.mappings
                    [h]
                    [s]
                    [p] =
                    [0, 0, 0, 0];
            }
        }
    }

    notifyPattr();
    mgraphics.redraw();
}


// ============================================================
// DEBUG
// ============================================================

function status()
{
    var state =
        currentState();


    post(
        "gesture_mapper_ui mode=" +
        UI_MODE +

        " axes=" +
        getAxisCountForMode(
            UI_MODE
        ) +

        " sources/side=" +
        getSourceCountForMode(
            UI_MODE
        ) +

        " selected_left=" +
        state.selected[0] +

        " selected_right=" +
        state.selected[1] +

        "\n"
    );
}


 // ============================================================
// PATTR SERIALIZATION
// ============================================================

function getvalueof()
{
    var data = [];

    // version
    data.push(1);

    // mode
    data.push(UI_MODE);

    var modes = [
        MODE_HANDS,
        MODE_CLUSTERS,
        MODE_GAMEPAD,
        MODE_MOUSE,
        MODE_WEARABLE
    ];

    for (var m = 0; m < modes.length; m++)
    {
        var modeName = modes[m];
        var state = modeStates[modeName];

        // selected left / right
        data.push(state.selected[0]);
        data.push(state.selected[1]);

        for (var h = 0; h < 2; h++)
        {
            for (var s = 0; s < MAX_SOURCES_PER_SIDE; s++)
            {
                // active
                data.push(
                    state.active[h][s]
                );

                // mappings
                for (var p = 0; p < NUM_PARAMS; p++)
                {
                    for (var a = 0; a < MAX_AXES; a++)
                    {
                        data.push(
                            state.mappings[h][s][p][a]
                        );
                    }
                }
            }
        }
    }

    return data;
}


// ============================================================
// PATTR RESTORE
// ============================================================

function setvalueof()
{
    var data =
        arrayfromargs(arguments);

    if (!data || data.length < 2)
        return;

    try
    {
        var index = 0;

        // version
        var version =
            parseInt(data[index++]);

        // mode
        UI_MODE =
            normalizedModeName(
                data[index++]
            );

        var modes = [
            MODE_HANDS,
            MODE_CLUSTERS,
            MODE_GAMEPAD,
            MODE_MOUSE,
            MODE_WEARABLE
        ];

        for (var m = 0; m < modes.length; m++)
        {
            var modeName =
                modes[m];

            var state =
                modeStates[modeName];

            // selection
            state.selected[0] =
                parseInt(data[index++]);

            state.selected[1] =
                parseInt(data[index++]);

            for (var h = 0; h < 2; h++)
            {
                for (
                    var s = 0;
                    s < MAX_SOURCES_PER_SIDE;
                    s++
                )
                {
                    state.active[h][s] =
                        parseInt(
                            data[index++]
                        );

                    for (
                        var p = 0;
                        p < NUM_PARAMS;
                        p++
                    )
                    {
                        for (
                            var a = 0;
                            a < MAX_AXES;
                            a++
                        )
                        {
                            state.mappings
                                [h]
                                [s]
                                [p]
                                [a] =
                                parseInt(
                                    data[index++]
                                );
                        }
                    }
                }
            }
        }


        // rebuild contextual text from mappings
        // rather than trying to store JS objects/strings
        rebuildLastActions();


        // restore gates if necessary
        if (UI_MODE === MODE_HANDS)
            emitAllHandLedStates();


        mgraphics.redraw();
    }
    catch (e)
    {
        post(
            "gesture_mapper pattr restore error: " +
            e +
            "\n"
        );
    }
}


// ============================================================
// REBUILD UI FEEDBACK AFTER RECALL
// ============================================================

function rebuildLastActions()
{
    var modes = [
        MODE_HANDS,
        MODE_CLUSTERS,
        MODE_GAMEPAD,
        MODE_MOUSE,
        MODE_WEARABLE
    ];

    for (var m = 0; m < modes.length; m++)
    {
        var modeName =
            modes[m];

        var state =
            modeStates[modeName];

        var axisNames =
            getAxisNamesForMode(
                modeName
            );

        var axisCount =
            getAxisCountForMode(
                modeName
            );

        for (var h = 0; h < 2; h++)
        {
            for (
                var s = 0;
                s < MAX_SOURCES_PER_SIDE;
                s++
            )
            {
                state.lastAction[h][s] =
                    null;

                // Find the last active mapping
                // simply to restore meaningful UI text.
                for (
                    var p = 0;
                    p < NUM_PARAMS;
                    p++
                )
                {
                    for (
                        var a = 0;
                        a < axisCount;
                        a++
                    )
                    {
                        if (
                            state.mappings[h][s][p][a]
                        )
                        {
                            state.lastAction[h][s] =
                            {
                                param: p,
                                axis: a,
                                state: 1,

                                text:
                                    "Param " +
                                    (p + 1) +
                                    " · " +
                                    axisNames[a] +
                                    " · ON"
                            };
                        }
                    }
                }
            }
        }
    }
}


// ============================================================
// NOTIFY PATTR
// ============================================================

function notifyPattr()
{
    notifyclients();
}
