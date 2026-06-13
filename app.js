// Paste your published Google Sheets CSV URL between the single quotes below:
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS9Xl8OLV8KSgH5XrxPZN0v_t3rSUq8y1_zuYOqabT-ND_L9SvTMBcwBB0GMPhj2iNH0cqQTZ5YkC3J/pub?gid=1038942149&single=true&output=csv';

let currentData = [];    // Holds raw data from Google Sheets
let filteredData = [];   // Holds currently active filtered data
let currentPage = 1;     // Tracks current pagination view
const ROWS_PER_PAGE = 50; // Triggers page break after 50 records

// Helper function to safely parse dates from format like "16-Apr-2026" or "4-May-2026"
function parseSheetDate(dateStr) {
    if (!dateStr) return null;
    const cleanedStr = dateStr.trim();
    const parsed = Date.parse(cleanedStr);
    if (!isNaN(parsed)) {
        const d = new Date(parsed);
        d.setHours(0, 0, 0, 0); // Normalize time to midnight for true date comparisons
        return d;
    }
    return null;
}

// Helper function to dynamically compute the status based on calendar dates and overrides
function calculateDynamicStatus(row) {
    const rawStatus = row['Status'] ? row['Status'].trim() : '';
    const lowStatus = rawStatus.toLowerCase();

    // 1. Check for manual overrides first (Cancelled or Postponed)
    if (lowStatus === 'cancelled' || lowStatus === 'canceled') {
        return 'Cancelled';
    }
    if (lowStatus === 'postponed') {
        return 'Postponed';
    }

    // Extract and parse timeline fields
    const fromStr = row['From'] || row['From '] || row['from'] || '';
    const toStr = row['To'] || row['To '] || row['to'] || '';
    
    const fromDate = parseSheetDate(fromStr);
    const toDate = parseSheetDate(toStr);
    
    // Get current actual system calendar date normalized to midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fallback if spreadsheet dates are missing or improperly formatted
    if (!fromDate || !toDate) {
        return rawStatus || 'Upcoming';
    }

    // 2. Completed: If the To date has already crossed today's calendar date
    if (today > toDate) {
        return 'Completed';
    }

    // 3. In-progress: If today falls within or matches the From and To date boundaries
    if (today >= fromDate && today <= toDate) {
        return 'In-progress';
    }

    // 4. Default: If the course timeline sits entirely in the future
    return 'Upcoming';
}

// Fetch and parse the data from Google Sheets
function loadData() {
    Papa.parse(SHEET_CSV_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            currentData = results.data;
            
            // Pre-calculate the dynamic status for every row immediately on load
            currentData.forEach(row => {
                row['CalculatedStatus'] = calculateDynamicStatus(row);
            });

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

    // Ensure our essential system statuses are represented inside the filter options list
    statuses.add('Upcoming');
    statuses.add('In-progress');
    statuses.add('Completed');

    data.forEach(row => {
        if (row['Program Name']) programs.add(row['Program Name'].trim());
        if (row['Mode of training']) modes.add(row['Mode of training'].trim());
        if (row['CalculatedStatus']) statuses.add(row['CalculatedStatus']);
    });

    programs.forEach(p => { if(p) programSelect.add(new Option(p, p)); });
    modes.forEach(m => { if(m) modeSelect.add(new Option(m, m)); });
    
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
        const rowStatus = row['CalculatedStatus'] ? row['CalculatedStatus'].trim().toLowerCase() : '';

        const matchesProgram = programFilter === 'all' || rowProgram === programFilter;
        const matchesMode = modeFilter === 'all' || rowMode === modeFilter;
        const matchesStatus = statusFilter === 'all' || rowStatus === statusFilter;

        let matchesSearch = true;
        if (searchQuery) {
            const rowTitle = row['Course Title'] ? row['Course Title'].trim().toLowerCase() : '';
            const rowCode = row['Course code'] ? row['Course code'].trim().toLowerCase() : '';
            const rowLocation = row['Location'] ? row['Location'].trim().toLowerCase() : '';
            const rowBatch = row['Batch'] ? row['Batch'].trim().toLowerCase() : '';

            const combinedFields = `${rowProgram} ${rowMode} ${rowStatus} ${rowTitle} ${rowCode} ${rowLocation} ${rowBatch}`;
            matchesSearch = combinedFields.includes(searchQuery);
        }

        return matchesProgram && matchesMode && matchesStatus && matchesSearch;
    });
