// Paste your published Google Sheets CSV URL inside the quotes below:
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS9Xl8OLV8KSgH5XrxPZN0v_t3rSUq8y1_zuYOqabT-ND_L9SvTMBcwBB0GMPhj2iNH0cqQTZ5YkC3J/pub?gid=1038942149&single=true&output=csv';

let spreadsheetData = [];

// Fetch data from the Google Sheet CSV link
function fetchSheetData() {
    Papa.parse(SHEET_CSV_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            spreadsheetData = results.data;
            populateDropdowns(spreadsheetData);
            displayTable(spreadsheetData);
        },
        error: function(err) {
            console.error("Error parsing CSV data: ", err);
        }
    });
}

// Dynamically fill the dropdown filters with unique options from your sheet
function populateDropdowns(data) {
    const programSelect = document.getElementById('program-select');
    const modeSelect = document.getElementById('mode-select');

    // Keep only the default "All" options initially
    programSelect.innerHTML = '<option value="all">All Programs</option>';
    modeSelect.innerHTML = '<option value="all">All Modes</option>';

    const uniquePrograms = new Set();
    const uniqueModes = new Set();

    data.forEach(row => {
        if (row['Programme Title']) uniquePrograms.add(row['Programme Title'].trim());
        if (row['Mode of training']) uniqueModes.add(row['Mode of training'].trim());
    });

    // Add sorted options to dropdowns
    Array.from(uniquePrograms).sort().forEach(prog => {
        programSelect.add(new Option(prog, prog));
    });
    Array.from(uniqueModes).sort().forEach(mode => {
        modeSelect.add(new Option(mode, mode));
    });
}

// Generate and display the table records
function displayTable(data) {
    const headersRow = document.getElementById('table-headers');
    const tableBody = document.getElementById('table-body');

    headersRow.innerHTML = '';
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="11" style="text-align:center;">No training schedules found matching these filters.</td></tr>';
        return;
    }

    // Build Table Headers from your columns
    const headers = Object.keys(data[0]);
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headersRow.appendChild(th);
    });

    // Build Table Rows
    data.forEach(row => {
        const tr = document.createElement('tr');
        headers.forEach(header => {
            const td = document.createElement('td');
            td.textContent = row[header] || '';
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
}

// Filter the table records when a dropdown selection changes
function applyFilters() {
    const selectedProgram = document.getElementById('program-select').value;
    const selectedMode = document.getElementById('mode-select').value;

    const filteredData = spreadsheetData.filter(row => {
        const matchesProgram = selectedProgram === 'all' || row['Programme Title']?.trim() === selectedProgram;
        const matchesMode = selectedMode === 'all' || row['Mode of training']?.trim() === selectedMode;
        return matchesProgram && matchesMode;
    });

    displayTable(filteredData);
}

// Event Listeners for Dropdowns
document.getElementById('program-select').addEventListener('change', applyFilters);
document.getElementById('mode-select').addEventListener('change', applyFilters);

// Run the script as soon as the page loads
window.addEventListener('DOMContentLoaded', fetchSheetData);
