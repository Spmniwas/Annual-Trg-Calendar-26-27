// Paste your published Google Sheets CSV URL between the single quotes below:
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS9Xl8OLV8KSgH5XrxPZN0v_t3rSUq8y1_zuYOqabT-ND_L9SvTMBcwBB0GMPhj2iNH0cqQTZ5YkC3J/pub?gid=1038942149&single=true&output=csv';

let currentData = [];

// Fetch and parse the data from Google Sheets
// Fetch and parse the data from Google Sheets
function loadData() {
    Papa.parse(SHEET_CSV_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            currentData = results.data;
            setupDropdowns(currentData);
            filterData(); // Changed from renderTable(currentData) to apply default filters on load
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
    const statusSelect = document.getElementById('status-select');
    
    programSelect.innerHTML = '<option value="all">All Programs</option>';
    modeSelect.innerHTML = '<option value="all">All Modes</option>';
    statusSelect.innerHTML = '<option value="all">All Statuses</option>';

    const programs = new Set();
    const modes = new Set();
    const statuses = new Set();

    data.forEach(row => {
        if (row['Program Name']) programs.add(row['Program Name'].trim());
        if (row['Mode of training']) modes.add(row['Mode of training'].trim());
        if (row['Status']) statuses.add(row['Status'].trim());
    });

    programs.forEach(p => { if(p) programSelect.add(new Option(p, p)); });
    modes.forEach(m => { if(m) modeSelect.add(new Option(m, m)); });
    statuses.forEach(s => { 
        // Skip adding "Upcoming" again since it's already coded into the HTML default
        if(s && s !== 'Upcoming') statusSelect.add(new Option(s, s)); 
    });
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

    // Standard headers displayed on the dashboard layout
    const headers = ['Sr. No.', 'Program Name', 'From', 'To', 'Duration', 'Course code', 'Batch', 'Course Title', 'Mode of training', 'Location', 'Status', 'Link'];
    
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
            
            // Smart fallback tracking for the 'From' column in case of hidden spaces or casing variations
            let cellValue = row[header];
            if (header === 'From' && !cellValue) {
                cellValue = row['From '] || row['from'] || '';
            }

            // If it's the link column and contains a web URL, make it a clickable button
            if (header === 'Link' && cellValue && cellValue.trim().startsWith('http')) {
                td.innerHTML = `<a href="${cellValue.trim()}" target="_blank">View Link</a>`;
            } else {
                td.textContent = cellValue ? cellValue.trim() : '';
            }
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
}

// Filter data when a user changes any dropdown selection
// Filter data when a user changes any dropdown selection
function filterData() {
    const programFilter = document.getElementById('program-select').value.trim().toLowerCase();
    const modeFilter = document.getElementById('mode-select').value.trim().toLowerCase();
    const statusFilter = document.getElementById('status-select').value.trim().toLowerCase();

    const filtered = currentData.filter(row => {
        const rowProgram = row['Program Name'] ? row['Program Name'].trim().toLowerCase() : '';
        const rowMode = row['Mode of training'] ? row['Mode of training'].trim().toLowerCase() : '';
        const rowStatus = row['Status'] ? row['Status'].trim().toLowerCase() : '';

        const matchesProgram = programFilter === 'all' || rowProgram === programFilter;
        const matchesMode = modeFilter === 'all' || rowMode === modeFilter;
        const matchesStatus = statusFilter === 'all' || rowStatus === statusFilter;

        return matchesProgram && matchesMode && matchesStatus;
    });

    renderTable(filtered);
}

// Listen for dropdown changes
document.getElementById('program-select').addEventListener('change', filterData);
document.getElementById('mode-select').addEventListener('change', filterData);
document.getElementById('status-select').addEventListener('change', filterData);

// Load data immediately when page opens
window.addEventListener('DOMContentLoaded', loadData);
