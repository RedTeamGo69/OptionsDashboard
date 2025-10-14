// charts.js: Manages all chart instances and configurations.

// Store chart instances to manage their lifecycle
let chartInstances = {};

function destroyChart(name) {
    if (chartInstances[name]) {
        chartInstances[name].destroy();
        delete chartInstances[name];
    }
}

export function destroyAllCharts() {
    Object.keys(chartInstances).forEach(destroyChart);
}

export function createOrUpdateChart(name, elementId, config) {
    destroyChart(name);
    const ctx = document.getElementById(elementId).getContext('2d');
    chartInstances[name] = new Chart(ctx, config);
    return chartInstances[name];
}