/* DriftMap theme -- shared mutable palette for the JSUI.
 * Max owns persistence (for example through pattrstorage); this file only
 * validates and applies live colour messages.
 */

var DEFAULT_COLORS = {
    background: [0.000, 0.000, 0.000, 0.0],
    questionnaireBackground: [0.000, 0.000, 0.000, 0.0],
    mapBackground: [0.000, 0.000, 0.000, 0.0],
    mapBorder:     [0.365, 0.357, 0.333, 1.0],
    mapGrid:       [0.365, 0.357, 0.333, 0.28],

    text:       [0.921, 0.902, 0.840, 1.0],
    muted:      [0.365, 0.357, 0.333, 1.0],

    left:       [0.882, 0.588, 0.008, 1.0],
    right:      [0.365, 0.420, 0.886, 1.0],
    orb:        [0.921, 0.902, 0.840, 1.0],
    orbSecondary: [0.365, 0.357, 0.333, 1.0],
    orbPoint:   [0.827, 0.365, 0.216, 1.0],
    orbFourth:  [0.062, 0.216, 0.192, 1.0],
    orbFifth:   [0.365, 0.420, 0.886, 1.0],
    leftMapPoint: [0.882, 0.588, 0.008, 1.0],
    rightMapPoint: [0.365, 0.420, 0.886, 1.0],
    mapPointPrimary: [0.882, 0.588, 0.008, 1.0],
    mapPointSecondary: [0.365, 0.420, 0.886, 1.0],
    mapPointThird: [0.827, 0.365, 0.216, 1.0],
    mapPointFourth: [0.062, 0.216, 0.192, 1.0],
    mapPointFifth: [0.921, 0.902, 0.840, 1.0],
    freePoint: [0.827, 0.365, 0.216, 1.0],

    bullet: [0.365, 0.357, 0.333, 1.0],
    bulletAnswered: [0.062, 0.216, 0.192, 1.0],
    bulletSelected: [0.827, 0.365, 0.216, 1.0],
    bulletSelectedBorder: [0.921, 0.902, 0.840, 1.0],
    cancelText: [0.365, 0.357, 0.333, 1.0],

    success:    [0.062, 0.216, 0.192, 1.0],
    important:  [0.827, 0.365, 0.216, 1.0],
    warning:    [0.827, 0.365, 0.216, 1.0],
    error:      [0.827, 0.365, 0.216, 1.0],
    icon:       [0.921, 0.902, 0.840, 1.0],
    likeIcon:   [0.921, 0.902, 0.840, 1.0],
    dislikeIcon:[0.921, 0.902, 0.840, 1.0],

    buttonBgOn:          [0.545, 0.224, 0.008, 0.369],
    buttonBgOff:         [0.074, 0.078, 0.086, 0.0],
    buttonBorder:        [0.365, 0.357, 0.333, 1.0],
    buttonPressedBorder: [0.827, 0.365, 0.216, 1.0],
    buttonBorderFocus:   [0.827, 0.365, 0.216, 0.2],
    buttonTextOn:        [0.827, 0.365, 0.216, 1.0],
    buttonTextOff:       [0.502, 0.490, 0.459, 1.0],
    buttonHover:         [0.612, 0.255, 0.027, 0.43],
    buttonPressed:       [0.612, 0.255, 0.027, 0.43],

    stepButtonBg:        [0.074, 0.078, 0.086, 0.0],
    stepButtonHover:     [0.612, 0.255, 0.027, 0.43],
    stepButtonPressed:   [0.612, 0.255, 0.027, 0.43],
    stepButtonBorder:    [0.365, 0.357, 0.333, 1.0],
    stepButtonText:      [0.827, 0.365, 0.216, 1.0]
};

var DRIFTMAP_COLOR_MESSAGES = {
    leftcolor: "left",
    rightcolor: "right",
    orbcolor: "orb",
    orbprimarycolor: "orb",
    orbsecondarycolor: "orbSecondary",
    orbpointcolor: "orbPoint",
    orbthirdcolor: "orbPoint",
    orbfourthcolor: "orbFourth",
    orbfifthcolor: "orbFifth",
    backgroundcolor: "background",
    questionnairebgcolor: "questionnaireBackground",
    mapbackgroundcolor: "mapBackground",
    mapbordercolor: "mapBorder",
    mapgridcolor: "mapGrid",
    leftmappointcolor: "leftMapPoint",
    rightmappointcolor: "rightMapPoint",
    mappointprimarycolor: "mapPointPrimary",
    mappointfirstcolor: "mapPointPrimary",
    mappointsecondarycolor: "mapPointSecondary",
    mappointsecondcolor: "mapPointSecondary",
    mappointthirdcolor: "mapPointThird",
    mappointfourthcolor: "mapPointFourth",
    mappointfifthcolor: "mapPointFifth",
    freepointcolor: "freePoint",
    bulletcolor: "bullet",
    bulletansweredcolor: "bulletAnswered",
    bulletselectedcolor: "bulletSelected",
    bulletselectedbordercolor: "bulletSelectedBorder",
    canceltextcolor: "cancelText",
    textcolor: "text",
    mutedtextcolor: "muted",
    successcolor: "success",
    importantcolor: "important",
    warningcolor: "warning",
    errorcolor: "error",
    iconcolor: "icon",
    likeiconcolor: "likeIcon",
    dislikeiconcolor: "dislikeIcon",
    buttonbgcoloron: "buttonBgOn",
    buttonbgcoloroff: "buttonBgOff",
    buttonbordercolor: "buttonBorder",
    buttonpressedbordercolor: "buttonPressedBorder",
    buttonborderfocuscolor: "buttonBorderFocus",
    buttontextcoloron: "buttonTextOn",
    buttontextcoloroff: "buttonTextOff",
    buttonhovercolor: "buttonHover",
    buttonpressedcolor: "buttonPressed",
    stepbuttonbgcolor: "stepButtonBg",
    stepbuttonhovercolor: "stepButtonHover",
    stepbuttonpressedcolor: "stepButtonPressed",
    stepbuttonbordercolor: "stepButtonBorder",
    stepbuttontextcolor: "stepButtonText",

    /* Compatibility aliases from the previous pass. */
    accentcolor: "important",
    panelcolor: "mapBackground",
    panelaltcolor: "buttonBgOff",
    mutedcolor: "muted",
    gridcolor: "mapGrid",
    neutralcolor: "orbSecondary",
    readycolor: "success",
    focuscolor: "buttonBorderFocus"
};

function cloneColors(source) {
    var clone = {};
    var key;
    for (key in source) {
        if (source.hasOwnProperty(key)) {
            clone[key] = source[key].slice(0);
        }
    }
    return clone;
}

var COLORS = cloneColors(DEFAULT_COLORS);

function clipThemeUnit(value) {
    return Math.max(0, Math.min(1, value));
}

function parseThemeColor(args) {
    var result = [];
    var i;
    var value;
    if (!args || (args.length !== 3 && args.length !== 4)) {
        return null;
    }
    for (i = 0; i < args.length; i += 1) {
        value = Number(args[i]);
        if (!isFinite(value)) {
            return null;
        }
        result.push(clipThemeUnit(value));
    }
    if (result.length === 3) {
        result.push(1.0);
    }
    return result;
}

function applyThemeColor(messageName, args) {
    var key = DRIFTMAP_COLOR_MESSAGES[messageName];
    var parsed;
    if (!key) {
        return false;
    }
    parsed = parseThemeColor(args);
    if (parsed === null) {
        return false;
    }
    COLORS[key] = parsed;
    return true;
}

function resetThemeColors() {
    COLORS = cloneColors(DEFAULT_COLORS);
}

function themeColorWithAlpha(color, alpha) {
    return [color[0], color[1], color[2], clipThemeUnit(alpha)];
}
