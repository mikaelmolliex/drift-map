inlets = 1;
outlets = 1;

var pts = [];

var CONNECTIONS = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12],
    [0,13],[13,14],[14,15],[15,16],
    [0,17],[17,18],[18,19],[19,20],
    [5,9],[9,13],[13,17]
];

function list()
{
    pts = arrayfromargs(arguments);

    if (pts.length < 63)
        return;

    outlet(0, "reset");
    outlet(0, "glcolor", 0, 1, 0, 1);

    // squelette

    for(var i = 0; i < CONNECTIONS.length; i++)
    {
        var a = CONNECTIONS[i][0];
        var b = CONNECTIONS[i][1];

        var ax = (pts[a * 3] * 2) - 1;
        var ay = (pts[a * 3 + 1] * 2) - 1;

        var bx = (pts[b * 3] * 2) - 1;
        var by = (pts[b * 3 + 1] * 2) - 1;

        outlet(0, "moveto", ax, ay, 0);
        outlet(0, "lineto", bx, by, 0);
    }

    // points

    for(var i = 0; i < 21; i++)
    {
        var x = (pts[i * 3] * 2) - 1;
        var y = (pts[i * 3 + 1] * 2) - 1;

        outlet(0, "moveto", x, y, 0);
        outlet(0, "circle", 0.02);
    }
}