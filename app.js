// Paste your published Google Sheets CSV URL between the single quotes below:
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS9Xl8OLV8KSgH5XrxPZN0v_t3rSUq8y1_zuYOqabT-ND_L9SvTMBcwBB0GMPhj2iNH0cqQTZ5YkC3J/pub?gid=1038942149&single=true&output=csv';

let currentData = [];    // Holds raw data from Google Sheets
let filteredData = [];   // Holds currently active filtered data
let currentPage = 1;     // Tracks current pagination view
const ROWS_PER_PAGE = 50; // Triggers page break after 50 records

// Helper function to safely parse dates from format like "16-Apr-2026"
function parseSheetDate(dateStr) {
    if (!dateStr) return null;
    const cleanedStr = dateStr.trim();
    const parsed = Date.parse(cleanedStr);
    if (!isNaN(parsed)) {
        const d = new Date(parsed);
        d.setHours(0, 0, 0, 0); 
        return d;
    }
    return null;
}

// Helper function to dynamically compute status based on calendar dates
function calculateDynamicStatus(row) {
    const rawStatus = row['Status'] ? row['Status'].trim() : '';
    const lowStatus = rawStatus.toLowerCase();

    if (lowStatus === 'cancelled' || lowStatus === 'canceled') return 'Cancelled';
    if (lowStatus === 'postponed') return 'Postponed';

    const fromStr = row['From'] || row['From '] || row['from'] || '';
    const toStr = row['To'] || row['To '] || row['to'] || '';
    
    const fromDate = parseSheetDate(fromStr);
    const toDate = parseSheetDate(toStr);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!fromDate || !toDate) return rawStatus || 'Upcoming';
    if (today > toDate) return 'Completed';
    if (today >= fromDate && today <= toDate) return 'In-progress';

    return 'Upcoming';
}

// HIGH-SPEED FETCH: Downloads data asynchronously via native streams to eliminate initial lag
async function loadData() {
    try {
        const cacheBusterUrl = `${SHEET_CSV_URL}&_cb=${new Date().getTime()}`;
        const response = await fetch(cacheBusterUrl);
        if (!response.ok) throw new Error('Network response data was not stable');
        const csvText = await response.text();

        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                currentData = results.data;
                currentData.forEach(row => {
                    row['CalculatedStatus'] = calculateDynamicStatus(row);
                });
                setupDropdowns(currentData);
                filterData(); 
            }
        });
    } catch (err) {
        console.error("Error running high-speed data fetch:", err);
    }
}

// Set up filter menus dynamically
function setupDropdowns(data) {
    const programSelect = document.getElementById('program-select');
    const modeSelect = document.getElementById('mode-select');
    const statusSelect = document.getElementById('status-select');
    
    programSelect.innerHTML = '<option value="all">All Programs</option>';
    modeSelect.innerHTML = '<option value="all">All Modes</option>';
    
    statusSelect.innerHTML = '<option value="active_default">In-progress & Upcoming</option>';
    statusSelect.innerHTML += '<option value="all">All Status</option>';

    const programs = new Set();
    const modes = new Set();
    const statuses = new Set();

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
        if(s) statusSelect.add(new Option(s, s));
    });
    
    statusSelect.value = "active_default";
}

// Filter data execution logic
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
        
        let matchesStatus = false;
        if (statusFilter === 'all') {
            matchesStatus = true;
        } else if (statusFilter === 'active_default') {
            matchesStatus = (rowStatus === 'in-progress' || rowStatus === 'upcoming');
        } else {
            matchesStatus = rowStatus === statusFilter;
        }

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

    currentPage = 1; 
    renderTablePage();
}

// Render dynamic rows
function renderTablePage() {
    const headersRow = document.getElementById('table-headers');
    const tableBody = document.getElementById('table-body');
    
    headersRow.innerHTML = '';
    tableBody.innerHTML = '';

    const totalRecords = filteredData.length;
    const totalPages = Math.ceil(totalRecords / ROWS_PER_PAGE) || 1;

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    
    document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prev-btn').disabled = currentPage === 1;
    document.getElementById('next-btn').disabled = currentPage === totalPages;

    if (totalRecords === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 30px;">No training records found matching those filters.</td></tr>';
        return;
    }

    const displayHeaders = ['Sr. No.', 'Programme Title', 'From', 'To', 'Location', 'Status', 'Link'];
    
    displayHeaders.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headersRow.appendChild(th);
    });

    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    const endIndex = startIndex + ROWS_PER_PAGE;
    const pageDataChunk = filteredData.slice(startIndex, endIndex);

    pageDataChunk.forEach((row, index) => {
        const tr = document.createElement('tr');
        displayHeaders.forEach(header => {
            const td = document.createElement('td');
            
            if (header === 'Programme Title') {
                const titleText = row['Course Title'] ? row['Course Title'].trim() : '';
                const progName = row['Program Name'] ? row['Program Name'].trim() : '';
                const modeText = row['Mode of training'] ? row['Mode of training'].trim() : '';
                const durationText = row['Duration'] ? row['Duration'].trim() : '';
                const codeText = row['Course code'] ? row['Course code'].trim() : '';
                const batchText = row['Batch'] ? row['Batch'].trim() : '';
                
                const scheduleLink = row['Schedule'] ? row['Schedule'].trim() : '';
                const resourcesLink = row['Resources'] ? row['Resources'].trim() : '';

                let badgeClass = 'badge-default';
                if (progName.toLowerCase() === 'jjm') badgeClass = 'badge-jjm';
                if (progName.toLowerCase() === 'sbm') badgeClass = 'badge-sbm';

                let modeIcon = '💻'; 
                const lowMode = modeText.toLowerCase();
                if (lowMode.includes('physical') || lowMode.includes('onsite')) {
                    modeIcon = '🏢';
                } else if (lowMode.includes('online')) {
                    modeIcon = '🌐';
                } else if (lowMode.includes('hybrid')) {
                    modeIcon = '🔄';
                }

                let scheduleHTML = '';
                if (scheduleLink && scheduleLink.startsWith('http')) {
                    scheduleHTML = `<a href="${scheduleLink}" target="_blank" class="utility-link">📅 View Schedule</a>`;
                }

                let resourcesHTML = '';
                if (resourcesLink && resourcesLink.startsWith('http')) {
                    resourcesHTML = `<a href="${resourcesLink}" target="_blank" class="utility-link">📁 Access Resources</a>`;
                }

                td.innerHTML = `
                    <div class="metadata-row-top">
                        <span class="meta-badge ${badgeClass}">🏷️ ${progName}</span>
                        <span class="meta-item">${modeIcon} ${modeText}</span>
                        <span class="meta-item">⏱️ ${durationText}</span>
                        <span class="meta-item">🔑 ${codeText}</span>
                        <span class="meta-item">👥 ${batchText}</span>
                    </div>
                    <div class="title-main-layered">${titleText}</div>
                    <div class="metadata-row-bottom">
                        ${scheduleHTML}
                        ${resourcesHTML}
                    </div>
                `;
            } 
            else if (header === 'Sr. No.') {
                td.textContent = startIndex + index + 1;
            }
            else if (header === 'From') {
                let cellValue = row['From'] || row['From '] || row['from'] || '';
                td.textContent = cellValue ? cellValue.trim() : '';
            } 
            else if (header === 'Status') {
                td.textContent = row['CalculatedStatus'];
            }
            else if (header === 'Link') {
                const currentStatus = row['CalculatedStatus'] ? row['CalculatedStatus'].toLowerCase() : '';
                let cellValue = row['Link'] ? row['Link'].trim() : '';
                
                if (currentStatus === 'completed' || currentStatus === 'cancelled') {
                    td.innerHTML = `<span class="closed-label">Closed</span>`;
                } 
                else if (cellValue && cellValue.startsWith('http')) {
                    td.innerHTML = `<a href="${cellValue}" target="_blank" class="nomination-btn">Submit Nomination</a>`;
                } else {
                    td.textContent = '';
                }
            } 
            else {
                let cellValue = row[header];
                td.textContent = cellValue ? cellValue.trim() : '';
            }
            
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
}

// GENERATES IMMACULATE MULTI-PAGE LANDSCAPE PDF DOCS DYNAMICALLY
function exportDashboardToPDF() {
    const element = document.getElementById('dashboard-print-area');
    const downloadButton = document.getElementById('download-pdf-btn');
    
    // Temporarily indicate loading state
    downloadButton.textContent = "⌛ Generating...";
    downloadButton.disabled = true;

    // High-resolution landscape output layout options configurations
    const options = {
        margin: [10, 10, 15, 10], // Generates clean top/bottom margins for headers and footers
        filename: 'SPM_NIWAS_Training_Calendar_2026-27.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2, // Doubles resolution pixels for sharp text readability when printing
            useCORS: true, 
            logging: false,
            scrollY: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
        pagebreak: { mode: ['css', 'legacy'] }
    };

    // Generate PDF, append smart dynamic page numbers footer counters, and reset download button
    html2pdf().set(options).from(element).toPdf().get('pdf').then(function(pdf) {
        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            pdf.setFontSize(9);
            pdf.setTextColor(100);
            // Render beautiful alignment markers at the exact safe margin centers of each page sheet
            pdf.text('Page ' + i + ' of ' + totalPages, pdf.internal.pageSize.getWidth() - 25, pdf.internal.pageSize.getHeight() - 8);
            pdf.text('SPM NIWAS Training Calendar — Generated Automatically', 12, pdf.internal.pageSize.getHeight() - 8);
        }
    }).save().then(() => {
        // Restore active button status state parameters
        downloadButton.textContent = "📥 Download PDF";
        downloadButton.disabled = false;
    }).catch(err => {
        console.error("PDF engine crash error log details:", err);
        downloadButton.textContent = "📥 Download PDF";
        downloadButton.disabled = false;
    });
}

// Event Listeners
document.getElementById('prev-btn').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderTablePage();
        document.querySelector('.table-container').scrollTop = 0; 
    }
});

document.getElementById('next-btn').addEventListener('click', () => {
    const totalPages = Math.ceil(filteredData.length / ROWS_PER_PAGE);
    if (currentPage < totalPages) {
        currentPage++;
        renderTablePage();
        document.querySelector('.table-container').scrollTop = 0; 
    }
});

document.getElementById('program-select').addEventListener('change', filterData);
document.getElementById('mode-select').addEventListener('change', filterData);
document.getElementById('status-select').addEventListener('change', filterData);
document.getElementById('search-input').addEventListener('input', filterData);

// Bind the freshly engineered PDF function to your click events loader chain
document.getElementById('download-pdf-btn').addEventListener('click', exportDashboardToPDF);

window.addEventListener('DOMContentLoaded', loadData);
