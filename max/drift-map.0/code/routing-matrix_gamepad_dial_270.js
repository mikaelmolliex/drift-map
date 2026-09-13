inlets = 1;
outlets = 2;

/*
Outlet 0: dial value, 0..1
Outlet 1: state: active, dead, pickup, or center
*/

// Minimum radius before the joystick is considered active.
var deadRadius = 0.12;

// Distance allowed around the value that must be picked up.
var pickupThreshold = 0.035;

var lastValue = 0.5;
var armed = false;
var pickupTarget = 0.5;
var previousWasActiveArc = false;

function list(x, y)
{
    x = parseFloat(x);
    y = parseFloat(y);

    var dx = x - 0.5;
    var dy = y - 0.5;
    var radius = Math.sqrt(dx * dx + dy * dy) / 0.5;

    if (radius < deadRadius) {
        armed = false;
        pickupTarget = lastValue;
        previousWasActiveArc = false;

        outlet(0, lastValue);
        outlet(1, "center");
        return;
    }

    var angle = Math.atan2(dy, dx) * 180 / Math.PI;

    if (angle < 0) {
        angle += 360;
    }

    /*
    Active 270-degree arc:
    lower left (225 degrees) -> left -> top -> right -> lower right (315 degrees)
    */
    var phase = 225 - angle;

    while (phase < 0) {
        phase += 360;
    }

    while (phase >= 360) {
        phase -= 360;
    }

    var insideActiveArc = phase <= 270;

    if (!insideActiveArc) {
        if (previousWasActiveArc) {
            if (lastValue >= 0.5) {
                pickupTarget = 1;
                lastValue = 1;
            } else {
                pickupTarget = 0;
                lastValue = 0;
            }
        }

        armed = false;
        previousWasActiveArc = false;

        outlet(0, lastValue);
        outlet(1, "dead");
        return;
    }

    var value = phase / 270;

    if (!armed) {
        if (Math.abs(value - pickupTarget) <= pickupThreshold) {
            armed = true;
        } else {
            outlet(0, lastValue);
            outlet(1, "pickup");
            previousWasActiveArc = true;
            return;
        }
    }

    lastValue = clamp(value, 0, 1);
    previousWasActiveArc = true;

    outlet(0, lastValue);
    outlet(1, "active");
}

function clamp(value, minimum, maximum)
{
    return Math.max(minimum, Math.min(maximum, value));
}

function deadzone(value)
{
    deadRadius = Math.max(0, parseFloat(value));
}

function threshold(value)
{
    pickupThreshold = Math.max(0, parseFloat(value));
}

function reset(value)
{
    lastValue = clamp(parseFloat(value), 0, 1);
    pickupTarget = lastValue;
    armed = false;

    outlet(0, lastValue);
    outlet(1, "pickup");
}
