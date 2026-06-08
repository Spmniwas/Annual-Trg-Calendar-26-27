// Paste your published Google Sheets CSV URL between the single quotes below:
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS9Xl8OLV8KSgH5XrxPZN0v_t3rSUq8y1_zuYOqabT-ND_L9SvTMBcwBB0GMPhj2iNH0cqQTZ5YkC3J/pub?gid=1038942149&single=true&output=csv';

let currentData = [];

// Fetch and parse the data from Google Sheets
function loadData() {
    Papa.parse(SHEET_CSV_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            currentData = results.data;
            setupDropdowns(currentData);
            renderTable(currentData);
        },
        error: function(err) {
            console.error("Error loading spreadsheet data:", err);
        }
    });
}

// Dynamically fill the dropdown filters with unique values from your sheet
function setupDropdowns(data) {
    const programSelect = document.getElementById('program-select');
    const modeSelect = document.getElementById('mode-select');
    
    programSelect.innerHTML = '<option value="all">All Programs</option>';
    modeSelect.innerHTML = '<option value="all">All Modes</option>';

    const programs = new Set();
    const modes = new Set();

    data.forEach(row => {
        if (row['Programme Title']) programs.add(row['Programme Title'].trim());
        if (row['Mode of training']) modes.add(row['Mode of training'].trim());
    });

    programs.forEach(p => { if(p) programSelect.add(new Option(p, p)); });
    modes.forEach(m => { if(m) modeSelect.add(new Option(m, m)); });
}

// Display the data inside the HTML table
function renderTable(data) {
    const headersRow = document.getElementById('table-headers');
    const tableBody = document.getElementById('table-body');
    
    headersRow.innerHTML = '';
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="12" style="text-align:center;">No training records found matching those filters.</td></tr>';
        return;
    }

    // Use your exact column list for the table headers
    const headers = ['Sr. No.', 'Program Name', 'From', 'To', 'Duration', 'Course code', 'Batch', 'Programme Title', 'Mode of training', 'Location', 'Status', 'Link'];
    
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headersRow.appendChild(th);
    });

    // Populate data rows
    data.forEach(row => {
        const tr = document.createElement('tr');
        headers.forEach(header => {
            const td = document.createElement('td');
            // If it's the link column and contains a URL, make it clickable
            if (header === 'Link' && row[header] && row[header].startsWith('http')) {
                td.innerHTML = `<a href="${row[header]}" target="_blank">View Link</a>`;
            } else {
                td.textContent = row[header] || '';
            }
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
}

// Filter data when a user changes a dropdown selection
function filterData() {
    const programFilter = document.getElementById('program-select').value;
    const modeFilter = document.getElementById('mode-select').value;

    const filtered = currentData.filter(row => {
        const matchesProgram = programFilter === 'all' || row['Programme Title']?.trim() === programFilter;
        const matchesMode = modeFilter === 'all' || row['Mode of training']?.trim() === modeFilter;
        return matchesProgram && matchesMode;
    });

    renderTable(filtered);
}

// Listen for dropdown changes
document.getElementById('program-select').addEventListener('change', filterData);
document.getElementById('mode-select').addEventListener('change', filterData);

// Load data immediately when page opens
window.addEventListener('DOMContentLoaded', loadData);
