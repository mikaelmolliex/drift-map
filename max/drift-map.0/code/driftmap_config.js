/* DriftMap shared configuration (Max classic js / ES5). */

var DRIFTMAP_MIN_AVAILABLE_PATTERNS = 2;
var DRIFTMAP_MIN_LIKED_PATTERNS = 2;
var DRIFTMAP_MIN_ANCHORS = 2;
var DRIFTMAP_MAX_ANCHORS = 5;
/* Compatibility name used by the existing five-zone generator. */
var DRIFTMAP_MAX_SELECTED_PATTERNS = DRIFTMAP_MAX_ANCHORS;
var DRIFTMAP_MIN_BATCH_POINTS = 1;
var DRIFTMAP_MAX_BATCH_POINTS = 200;
/* Timing for the staged point-writing protocol. */
var DRIFTMAP_POINT_CYCLE_MS = 250;
var DRIFTMAP_XY_SETTLE_MS = 50;
var DRIFTMAP_FINAL_SETTLE_MS = 50;
var DRIFTMAP_MODEL_READY_MS = 900;

/* One authoritative set of editable MLP defaults. Automatic profiles below
 * are deliberate dataset-size presets, not duplicate default definitions. */
var DRIFTMAP_MLP_DEFAULTS = {
    name: "manual",
    hiddenLayers: [3, 3],
    activation: 3,
    outputActivation: 0,
    batchSize: 25,
    maxIter: 50,
    learnRate: 0.03,
    validation: 0.0,
    maxFitRounds: 40,
    patience: 4,
    minImprovement: 0.01
};

/* --------------------------------------------------------- */
/* MLP automatic profiles                                    */
/* --------------------------------------------------------- */

var DRIFTMAP_MLP_AUTO_PROFILES = [
    {
        name: "tiny",
        minPoints: 1,
        maxPoints: 4,
        hiddenLayers: [1],
        activation: 0,
        outputActivation: 0,
        batchSize: 1,
        maxIter: 50,
        learnRate: 0.05,
        validation: 0.0,
        maxFitRounds: 60
    },
    {
        name: "small",
        minPoints: 5,
        maxPoints: 10,
        hiddenLayers: [1],
        activation: 3,
        outputActivation: 0,
        batchSize: 2,
        maxIter: 50,
        learnRate: 0.05,
        validation: 0.0,
        maxFitRounds: 60
    },
    {
        name: "medium",
        minPoints: 11,
        maxPoints: 25,
        hiddenLayers: [2],
        activation: 3,
        outputActivation: 0,
        batchSize: 5,
        maxIter: 50,
        learnRate: 0.04,
        validation: 0.0,
        maxFitRounds: 50
    },
    {
        name: "large",
        minPoints: 26,
        maxPoints: 2147483647,
        hiddenLayers: [3, 3],
        activation: 3,
        outputActivation: 0,
        batchSize: 25,
        maxIter: 50,
        learnRate: 0.03,
        validation: 0.0,
        maxFitRounds: 40
    }
];

var DRIFTMAP_MLP_CONVERGENCE = {
    minFitRounds: 2,
    patience: 4,
    minImprovement: 0.01,
    epsilon: 0.000000000001
};

/* Five distinct four-dimensional zones: [xL, yL, xR, yR]. */
var AUTO_ZONE_CENTERS = [
    [0.1370, 0.0000, 0.9622, 0.9598],
    [0.0827, 0.9819, 0.9976, 0.0740],
    [0.7008, 1.0000, 0.4394, 1.0000],
    [0.3756, 0.0000, 0.6638, 0.0000],
    [0.4961, 0.4961, 0.4906, 0.4992]
];

/*
 * The 50-point bank is organized in five consecutive blocks of ten points.
 * Block 0 is zone A, block 1 zone B, and so on. Keeping the bank here makes
 * the controller deterministic and keeps all coordinate data out of JSUI.
 */
var AUTO_POINT_BANKS = {
    50: [
        [0.0970, 0.0000, 0.9422, 0.9298],
        [0.1770, 0.0000, 0.9822, 0.9898],
        [0.1170, 0.0000, 0.9922, 0.9398],
        [0.1570, 0.0000, 0.9322, 0.9798],
        [0.1070, 0.0000, 0.9722, 0.9698],
        [0.1670, 0.0000, 0.9522, 0.9498],
        [0.1270, 0.0000, 0.9422, 0.9898],
        [0.1470, 0.0000, 0.9822, 0.9298],
        [0.1370, 0.0000, 0.9772, 0.9448],
        [0.1370, 0.0000, 0.9472, 0.9748],

        [0.0427, 0.9669, 0.9956, 0.0340],
        [0.1227, 0.9969, 0.9996, 0.1140],
        [0.0627, 0.9719, 0.9991, 0.0540],
        [0.1027, 0.9919, 0.9961, 0.0940],
        [0.0527, 0.9769, 0.9981, 0.0840],
        [0.1127, 0.9869, 0.9971, 0.0640],
        [0.0727, 0.9699, 0.9958, 0.1040],
        [0.0927, 0.9939, 0.9994, 0.0440],
        [0.0827, 0.9789, 0.9966, 0.0690],
        [0.0827, 0.9849, 0.9986, 0.0790],

        [0.6508, 1.0000, 0.3994, 1.0000],
        [0.7508, 1.0000, 0.4794, 1.0000],
        [0.6808, 1.0000, 0.4694, 1.0000],
        [0.7208, 1.0000, 0.4094, 1.0000],
        [0.6608, 1.0000, 0.4494, 1.0000],
        [0.7408, 1.0000, 0.4294, 1.0000],
        [0.6908, 1.0000, 0.4144, 1.0000],
        [0.7108, 1.0000, 0.4644, 1.0000],
        [0.7008, 1.0000, 0.4344, 1.0000],
        [0.7008, 1.0000, 0.4444, 1.0000],

        [0.3256, 0.0000, 0.6238, 0.0000],
        [0.4256, 0.0000, 0.7038, 0.0000],
        [0.3456, 0.0000, 0.6938, 0.0000],
        [0.4056, 0.0000, 0.6338, 0.0000],
        [0.3356, 0.0000, 0.6738, 0.0000],
        [0.4156, 0.0000, 0.6538, 0.0000],
        [0.3656, 0.0000, 0.6388, 0.0000],
        [0.3856, 0.0000, 0.6888, 0.0000],
        [0.3756, 0.0000, 0.6588, 0.0000],
        [0.3756, 0.0000, 0.6688, 0.0000],

        [0.4461, 0.4461, 0.4406, 0.4492],
        [0.5461, 0.5461, 0.5406, 0.5492],
        [0.4661, 0.4761, 0.5206, 0.4692],
        [0.5261, 0.5161, 0.4606, 0.5292],
        [0.4561, 0.5061, 0.5006, 0.5392],
        [0.5361, 0.4861, 0.4806, 0.4592],
        [0.4861, 0.4561, 0.4656, 0.5192],
        [0.5061, 0.5361, 0.5156, 0.4792],
        [0.4961, 0.4661, 0.4856, 0.4892],
        [0.4961, 0.5261, 0.4956, 0.5092]
    ]
};
