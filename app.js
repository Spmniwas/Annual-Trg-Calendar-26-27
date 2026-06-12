// Paste your published Google Sheets CSV URL between the single quotes below:
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS9Xl8OLV8KSgH5XrxPZN0v_t3rSUq8y1_zuYOqabT-ND_L9SvTMBcwBB0GMPhj2iNH0cqQTZ5YkC3J/pub?gid=1038942149&single=true&output=csv';

let currentData = [];    // Holds raw data from Google Sheets
let filteredData = [];   // Holds currently active filtered data
let currentPage = 1;     // Tracks current pagination view
const ROWS_PER_PAGE = 50; // Triggers page break after 50 records

// Fetch and parse the data from Google Sheets
function loadData() {
    Papa.parse(SHEET_CSV_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            currentData = results.data;
            setupDropdowns(currentData);
            filterData(); // Applies default filters on initial load
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

    // Ensure 'Upcoming' is explicitly available in the set right away
    statuses.add('Upcoming');

    data.forEach(row => {
        if (row['Program Name']) programs.add(row['Program Name'].trim());
        if (row['Mode of training']) modes.add(row['Mode of training'].trim());
        if (row['Status']) statuses.add(row['Status'].trim());
    });

    programs.forEach(p => { if(p) programSelect.add(new Option(p, p)); });
    modes.forEach(m => { if(m) modeSelect.add(new Option(m, m)); });
    
    // Sort and add statuses, setting 'Upcoming' as the selected default
    statuses.forEach(s => { 
        if(s) {
            const isUpcoming = s.toLowerCase() === 'upcoming';
            const option = new Option(s, s, isUpcoming, isUpcoming);
            statusSelect.add(option);
        }
    });
}

// Filter data when a user changes any dropdown selection or types a keyword
function filterData() {
    const programFilter = document.getElementById('program-select').value.trim().toLowerCase();
    const modeFilter = document.getElementById('mode-select').value.trim().toLowerCase();
    const statusFilter = document.getElementById('status-select').value.trim().toLowerCase();
    const searchQuery = document.getElementById('search-input').value.trim().toLowerCase();

    filteredData = currentData.filter(row => {
        const rowProgram = row['Program Name'] ? row['Program Name'].trim().toLowerCase() : '';
        const rowMode = row['Mode of training'] ? row['Mode of training'].trim().toLowerCase() : '';
        const rowStatus = row['Status'] ? row['Status'].trim().toLowerCase() : '';

        // Dropdown matching logic
        const matchesProgram = programFilter === 'all' || rowProgram === programFilter;
        const matchesMode = modeFilter === 'all' || rowMode === modeFilter;
        const matchesStatus = statusFilter === 'all' || rowStatus === statusFilter;

        // Global keyword search logic: converts the entire row's values to text and checks for the query
        let matchesSearch = true;
        if (searchQuery) {
            const combinedRowText = Object.values(row).join(' ').toLowerCase();
            matchesSearch = combinedRowText.includes(searchQuery);
        }

        return matchesProgram && matchesMode && matchesStatus && matchesSearch;
    });

    currentPage = 1; // Reset to page 1 whenever filters change
    renderTablePage();
}

// Listen for pagination navigation button click events
document.getElementById('prev-btn').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderTablePage();
        document.querySelector('.table-container').scrollLeft = 0; 
    }
});

document.getElementById('next-btn').addEventListener('click', () => {
    const totalPages = Math.ceil(filteredData.length / ROWS_PER_PAGE);
    if (currentPage < totalPages) {
        currentPage++;
        renderTablePage();
        document.querySelector('.table-container').scrollLeft = 0; 
    }
});

// Listen for filter dropdown configuration changes
document.getElementById('program-select').addEventListener('change', filterData);
document.getElementById('mode-select').addEventListener('change', filterData);
document.getElementById('status-select').addEventListener('change', filterData);

// Listen for text input inside the global search bar (updates instantly on keyup)
document.getElementById('search-input').addEventListener('input', filterData);

// Load data immediately when page opens
window.addEventListener('DOMContentLoaded', loadData);

// Display the sliced 50-row data chunk inside the HTML table
function renderTablePage() {
    const headersRow = document.getElementById('table-headers');
    const tableBody = document.getElementById('table-body');
    
    headersRow.innerHTML = '';
    tableBody.innerHTML = '';

    const totalRecords = filteredData.length;
    const totalPages = Math.ceil(totalRecords / ROWS_PER_PAGE) || 1;

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    // Update Pagination UI indicators
    document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages} (${totalRecords} items)`;
    document.getElementById('prev-btn').disabled = currentPage === 1;
    document.getElementById('next-btn').disabled = currentPage === totalPages;

    if (totalRecords === 0) {
        tableBody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding: 30px;">No training records found matching those filters.</td></tr>';
        return;
    }

    // Display Headers on the UI Layout
    const displayHeaders = ['Sr. No.', 'Program Name', 'From', 'To', 'Duration', 'Course code', 'Batch', 'Programme Title', 'Mode of training', 'Location', 'Status', 'Link'];
    
    displayHeaders.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headersRow.appendChild(th);
    });

    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    const endIndex = startIndex + ROWS_PER_PAGE;
    const pageDataChunk = filteredData.slice(startIndex, endIndex);

    // Populate data rows for the 50 items allocated to this page
    pageDataChunk.forEach(row => {
        const tr = document.createElement('tr');
        displayHeaders.forEach(header => {
            const td = document.createElement('td');
            
            // Core mapping bridge: Convert user header request to raw Google Sheet property
            let sheetKey = header;
            if (header === 'Programme Title') {
                sheetKey = 'Course Title'; 
            }

            let cellValue = row[sheetKey];
            
            // Smart fallback loop for the 'From' column spaces issue
            if (header === 'From' && !cellValue) {
                cellValue = row['From '] || row['from'] || '';
            }

            // Custom link rendering for Google Sheets nomination forms
            if (header === 'Link' && cellValue && cellValue.trim().startsWith('http')) {
                td.innerHTML = `<a href="${cellValue.trim()}" target="_blank">Submit Nomination</a>`;
            } else {
                td.textContent = cellValue ? cellValue.trim() : '';
            }
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
}

// Listen for pagination navigation button click events
document.getElementById('prev-btn').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderTablePage();
        document.querySelector('.table-container').scrollLeft = 0; 
    }
});

document.getElementById('next-btn').addEventListener('click', () => {
    const totalPages = Math.ceil(filteredData.length / ROWS_PER_PAGE);
    if (currentPage < totalPages) {
        currentPage++;
        renderTablePage();
        document.querySelector('.table-container').scrollLeft = 0; 
    }
});

// Listen for filter dropdown configuration changes
document.getElementById('program-select').addEventListener('change', filterData);
document.getElementById('mode-select').addEventListener('change', filterData);
document.getElementById('status-select').addEventListener('change', filterData);

// Load data immediately when page opens
window.addEventListener('DOMContentLoaded', loadData);
