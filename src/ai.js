// ai.js
// Fix API endpoint mismatch
// Updated client call to match server expectation
function analyzeData(data) {
    return fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data),
    });
}

// export the function
export { analyzeData };