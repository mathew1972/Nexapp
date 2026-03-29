window.detect_intent = function (text) {

    text = text.toLowerCase();

    if (text.includes("feasibility")) return "feasibility";
    if (text.includes("lead")) return "lead";

    return "unknown";
};