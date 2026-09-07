mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;

var leftHand = [];
var rightHand = [];

var trackerReady = false;
var spin = 0;

var CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [0, 9], [9, 10], [10, 11], [11, 12],
    [0, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [17, 18], [18, 19], [19, 20],
    [5, 9], [9, 13], [13, 17]
];

function left()
{
    leftHand = arrayfromargs(arguments);
    trackerReady = true;
    refresh();
}

function right()
{
    rightHand = arrayfromargs(arguments);
    trackerReady = true;
    refresh();
}

function clear()
{
    leftHand = [];
    rightHand = [];
    trackerReady = false;
    refresh();
}

function bang()
{
    spin += 0.25;
    refresh();
}

function paint()
{
    var w = box.rect[2] - box.rect[0];
    var h = box.rect[3] - box.rect[1];

    // Transparent background

    if (!trackerReady)
    {
        drawLoader(w, h);
        return;
    }

    // Left hand — light green
    drawHand(
        leftHand,
        w,
        h,
        0.729,
        0.816,
        0.620,
        1.000
    );

    // Right hand — orange
    drawHand(
        rightHand,
        w,
        h,
        0.851,
        0.371,
        0.220,
        1.000
    );
}

function drawLoader(w, h)
{
    var cx = w * 0.5;
    var cy = h * 0.5;
    var radius = 50;

    // Neutral palette
    var darkR = 0.28;
    var darkG = 0.28;
    var darkB = 0.27;

    var creamR = 0.96;
    var creamG = 0.94;
    var creamB = 0.88;

    for (var i = 0; i < 12; i++)
    {
        var angle = spin + (i * Math.PI * 2 / 12);

        var x = cx + Math.cos(angle) * radius;
        var y = cy + Math.sin(angle) * radius;

        var fade = (i + 1) / 12.0;
        var alpha = 0.30 + fade * 0.70;

        var r = darkR + (creamR - darkR) * fade;
        var g = darkG + (creamG - darkG) * fade;
        var b = darkB + (creamB - darkB) * fade;

        // Subtle outline for visibility on light backgrounds
        mgraphics.set_source_rgba(0.12, 0.12, 0.12, 0.28);
        mgraphics.arc(x, y, 7, 0, Math.PI * 2);
        mgraphics.fill();

        // Neutral inner dot
        mgraphics.set_source_rgba(r, g, b, alpha);
        mgraphics.arc(x, y, 5.5, 0, Math.PI * 2);
        mgraphics.fill();
    }
}

function drawHand(hand, w, h, r, g, b, a)
{
    if (hand.length < 63)
        return;

    mgraphics.set_source_rgba(r, g, b, a);
    mgraphics.set_line_width(2);

    // Skeleton

    for (var i = 0; i < CONNECTIONS.length; i++)
    {
        var p1 = CONNECTIONS[i][0];
        var p2 = CONNECTIONS[i][1];

        var x1 = hand[p1 * 3] * w;
        var y1 = (1 - hand[p1 * 3 + 1]) * h;

        var x2 = hand[p2 * 3] * w;
        var y2 = (1 - hand[p2 * 3 + 1]) * h;

        mgraphics.move_to(x1, y1);
        mgraphics.line_to(x2, y2);
    }

    mgraphics.stroke();

    // Landmarks

    for (var i = 0; i < 21; i++)
    {
        var x = hand[i * 3] * w;
        var y = (1 - hand[i * 3 + 1]) * h;

        mgraphics.arc(
            x,
            y,
            4,
            0,
            Math.PI * 2
        );

        mgraphics.fill();
    }
}