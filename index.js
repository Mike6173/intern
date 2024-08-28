window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');

    if (sessionId) {
        document.getElementById('session-id-input').value = sessionId;
        resumeSession(parseInt(sessionId));
    }

    initializeMainPage();
};

function initializeMainPage() {
    const uploadImageInput = document.getElementById('upload-image');
    const addDropButton = document.getElementById('add-drop-button');
    const totalDropsInput = document.getElementById('total-drops');
    const saveSessionButton = document.getElementById('save-session-button');
    const resumeSessionButton = document.getElementById('resume-session-button');
    const savePDFButton = document.getElementById('save-pdf-button');
    const toolElement = document.getElementById('tool');
    const saveIcon = document.getElementById('save-icon');
    const pdfIcon = document.getElementById('pdf-icon');
    const uploadIcon = document.getElementById('upload-icon');

    uploadImageInput.addEventListener('change', handleImageUpload);
    addDropButton.addEventListener('click', handleAddDrop);
    totalDropsInput.addEventListener('input', updateCompletion);
    toolElement.addEventListener('mousemove', debounce(calculateCoverage, 100));
    window.addEventListener('resize', debounce(resizeBuildingImage, 100));
    saveSessionButton.addEventListener('click', handleSaveSession);
    resumeSessionButton.addEventListener('click', handleResumeSession);
    savePDFButton.addEventListener('click', saveAsPDF);
    saveIcon.addEventListener('click', handleSaveSession);
    pdfIcon.addEventListener('click', saveAsPDF);
    uploadIcon.addEventListener('click', () => uploadImageInput.click());

    document.getElementById('toggle-menus-button').addEventListener('click', toggleMenus);
}

function toggleMenus() {
    const rightSidebar = document.getElementById('right-sidebar');
    rightSidebar.classList.toggle('hidden');
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.getElementById('building');
            img.src = e.target.result;
            img.style.display = 'block';
            resizeBuildingImage();
        };
        reader.readAsDataURL(file);
    }
}

function handleAddDrop() {
    const totalDrops = parseInt(document.getElementById('total-drops').value);
    const currentDrops = Object.keys(dropDetails).length;

    if (totalDrops === 0) {
        alert("Please enter the total number of drops first.");
        return;
    }

    if (currentDrops >= totalDrops) {
        alert("You have already entered the maximum number of drops.");
        return;
    }

    createPopup('add-drop-modal', `
        <div>
            <label>Enter Drop Number:</label>
            <input type="text" id="drop-number-input" required>
        </div>
        <div>
            <label>Enter Percent of Drop Done:</label>
            <input type="number" id="percent-done-input" required>
        </div>
        <div>
            <label>Select Date:</label>
            <input type="text" id="date-input" required>
        </div>
        <div style="text-align: center; margin-top: 10px;">
            <button id="submit-add-drop-popup" class="popup-btn">Done</button>
            <button id="cancel-add-drop-popup" class="popup-btn">Cancel</button>
        </div>
    `);

    flatpickr(document.getElementById('date-input'), {
        defaultDate: new Date()
    });

    document.getElementById('submit-add-drop-popup').addEventListener('click', () => {
        const dropNumber = document.getElementById('drop-number-input').value;
        const percentDone = document.getElementById('percent-done-input').value;
        const dateStr = document.getElementById('date-input').value;

        if (!dropNumber || !percentDone || !dateStr || isNaN(percentDone) || percentDone <= 0 || percentDone > 100) {
            alert("Please fill out all fields correctly.");
            return;
        }

        const totalPercent = (dropDetails[dropNumber] || 0) + parseInt(percentDone);
        if (totalPercent > 100) {
            alert("Error: Drop exceeds 100%");
            return;
        }

        dropDetails[dropNumber] = totalPercent;
        addNewTool(dateStr, dropNumber, percentDone);

        closePopup('add-drop-modal');
    });

    document.getElementById('cancel-add-drop-popup').addEventListener('click', () => {
        closePopup('add-drop-modal');
    });
}

let dropDetails = {};

function resizeBuildingImage() {
    const buildingWrapper = document.getElementById('building-wrapper');
    const buildingImage = document.getElementById('building');
    if (buildingWrapper && buildingImage) {
        buildingImage.style.maxWidth = `${buildingWrapper.clientWidth}px`;
        buildingImage.style.maxHeight = `${buildingWrapper.clientHeight}px`;
        updateToolPositions();  // Update tool positions on resize
    }
}

function updateToolPositions() {
    const container = document.getElementById('container');
    const greenTools = document.querySelectorAll('.green-tool');
    greenTools.forEach(tool => {
        const relTop = tool.dataset.relTop;
        const relLeft = tool.dataset.relLeft;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        tool.style.top = `${relTop * containerHeight}px`;
        tool.style.left = `${relLeft * containerWidth}px`;
    });
}

function addNewTool(dateStr, dropNumber, percentDone) {
    const container = document.getElementById('container');
    const newTool = document.createElement('div');
    newTool.className = 'draggable green-tool hidden-handles';
    const formattedDate = formatDate(dateStr);
    const displayText = percentDone == 100 ? formattedDate : `${formattedDate}-${percentDone}%`;
    newTool.innerHTML = `<div class="resize-handle top-left"></div>
                         <div class="resize-handle top-right"></div>
                         <div class="resize-handle bottom-left"></div>
                         <div class="resize-handle bottom-right"></div>
                         <div class="rotate-handle"></div>
                         <div class="tool-content">
                             <span class="tool-date">${displayText}</span>
                         </div>`;
    container.appendChild(newTool);
    newTool.dataset.dropNumber = dropNumber;
    newTool.dataset.date = formattedDate;
    newTool.dataset.percentDone = percentDone;
    dragElement(newTool, calculateCoverage);
    addResizeListeners(newTool, resizeText);
    addRotationListener(newTool);
    newTool.addEventListener('click', function (event) {
        toggleHandles(newTool);
        updateDropDetailsTable(dropNumber, formattedDate, percentDone);
    });
    resizeText(newTool);
    updateCompletion();
    updateRightTable(); // Call to update the right table
    setRelativePosition(newTool); // Set initial relative position
}

function toggleHandles(element) {
    const greenTools = document.querySelectorAll('.green-tool');
    greenTools.forEach(tool => {
        if (tool === element) {
            tool.classList.toggle('hidden-handles');
        } else {
            tool.classList.add('hidden-handles');
        }
    });
}

function resizeText(element) {
    const toolContent = element.querySelector('.tool-content');
    const elementWidth = element.offsetWidth;
    const elementHeight = element.offsetHeight;
    const newFontSize = Math.min(elementWidth, elementHeight) / 2.5;

    toolContent.style.fontSize = `${newFontSize}px`;
    toolContent.style.lineHeight = `${elementHeight}px`;
}

function formatDate(dateStr) {
    const date = new Date(dateStr + "T00:00:00");
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = String(date.getFullYear()).slice(-2);

    return `${month}/${day}/${year}`;
}

function addResizeListeners(elmnt, callback) {
    const handles = elmnt.getElementsByClassName('resize-handle');

    for (let handle of handles) {
        handle.onmousedown = resizeMouseDown;
    }

    function resizeMouseDown(e) {
        e.stopPropagation();
        e.preventDefault();
        const handle = e.target;
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = parseInt(document.defaultView.getComputedStyle(elmnt).width, 10);
        const startHeight = parseInt(document.defaultView.getComputedStyle(elmnt).height, 10);
        const startTop = parseInt(document.defaultView.getComputedStyle(elmnt).top, 10);
        const startLeft = parseInt(document.defaultView.getComputedStyle(elmnt).left, 10);

        document.onmousemove = resizeElement;
        document.onmouseup = stopResize;

        function resizeElement(e) {
            if (handle.classList.contains('bottom-right')) {
                elmnt.style.width = (startWidth + e.clientX - startX) + 'px';
                elmnt.style.height = (startHeight + e.clientY - startY) + 'px';
            } else if (handle.classList.contains('bottom-left')) {
                elmnt.style.width = (startWidth - e.clientX + startX) + 'px';
                elmnt.style.height = (startHeight + e.clientY - startY) + 'px';
                elmnt.style.left = (startLeft + e.clientX - startX) + 'px';
            } else if (handle.classList.contains('top-right')) {
                elmnt.style.width = (startWidth + e.clientX - startX) + 'px';
                elmnt.style.height = (startHeight - e.clientY + startY) + 'px';
                elmnt.style.top = (startTop + e.clientY - startY) + 'px';
            } else if (handle.classList.contains('top-left')) {
                elmnt.style.width = (startWidth - e.clientX + startX) + 'px';
                elmnt.style.height = (startHeight - e.clientY + startY) + 'px';
                elmnt.style.top = (startTop + e.clientY - startY) + 'px';
                elmnt.style.left = (startLeft + e.clientX - startX) + 'px';
            }
            if (callback) callback(elmnt);
            setRelativePosition(elmnt);
        }

        function stopResize() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }
}

function addRotationListener(elmnt) {
    const rotateHandle = elmnt.querySelector('.rotate-handle');
    let initialMouseX, initialMouseY;
    let initialRotation = 0;

    rotateHandle.onmousedown = function (e) {
        e.preventDefault();
        e.stopPropagation();
        initialMouseX = e.clientX;
        initialMouseY = e.clientY;
        const transform = elmnt.style.transform;
        if (transform) {
            const match = transform.match(/rotate\(([-\d.]+)deg\)/);
            if (match) {
                initialRotation = parseFloat(match[1]);
            }
        }
        document.onmousemove = rotateElement;
        document.onmouseup = stopRotateElement;
    };

    function rotateElement(e) {
        e.preventDefault();
        const deltaX = e.clientX - initialMouseX;
        const deltaY = e.clientY - initialMouseY;
        let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        let rotation = initialRotation + angle;

        if (e.shiftKey) {
            // Lock to 45-degree increments
            rotation = Math.round(rotation / 45) * 45;
        }

        elmnt.style.transform = `rotate(${rotation}deg)`;
        setRelativePosition(elmnt);
    }

    function stopRotateElement() {
        document.onmousemove = null;
        document.onmouseup = null;
    }
}

function calculateCoverage() {
    const tool = document.getElementById('tool');
    const building = document.getElementById('building');
    const output = document.getElementById('output');

    if (!tool || !output) {
        console.error('Tool or Output element not found.');
        return;
    }

    const toolRect = tool.getBoundingClientRect();
    const buildingRect = building.getBoundingClientRect();

    const overlapWidth = Math.min(toolRect.right, buildingRect.right) - Math.max(toolRect.left, buildingRect.left);
    const overlapHeight = Math.min(toolRect.bottom, buildingRect.bottom) - Math.max(toolRect.top, buildingRect.top);

    if (overlapWidth > 0 && overlapHeight > 0) {
        const overlapArea = overlapWidth * overlapHeight;
        const buildingArea = buildingRect.width * buildingRect.height;
        const coverage = (overlapArea / buildingArea) * 100;
        output.textContent = `Coverage: ${coverage.toFixed(2)}%`;
    } else {
        output.textContent = 'Coverage: 0%';
    }
}

function isInside(point, edgeStart, edgeEnd) {
    return (edgeEnd.x - edgeStart.x) * (point.y - edgeStart.y) > (edgeEnd.y - edgeStart.y) * (point.x - edgeStart.x);
}

function intersection(line1Start, line1End, line2Start, line2End) {
    const x1 = line1Start.x, y1 = line1Start.y, x2 = line1End.y, y2 = line1End.y;
    const x3 = line2Start.x, y3 = line2Start.y, x4 = line2End.x, y4 = line2End.y;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denom === 0) return null;

    const intersectX = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom;
    const intersectY = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom;

    return { x: intersectX, y: intersectY };
}

let drawing = false;
let points = [];

function dragElement(elmnt, callback) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    elmnt.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        if (drawing || e.target.classList.contains('resize-handle') || e.target.classList.contains('rotate-handle')) return;
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        if (callback) callback();
        setRelativePosition(elmnt);
        checkTrashCan(elmnt);
    }

    function closeDragElement() {
        if (isOverTrashCan(elmnt)) {
            if (confirm("Are you sure you want to delete this element?")) {
                removeElement(elmnt);
            }
        }
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

function setRelativePosition(elmnt) {
    const container = document.getElementById('container');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const rect = elmnt.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    elmnt.dataset.relTop = (rect.top - containerRect.top) / containerHeight;
    elmnt.dataset.relLeft = (rect.left - containerRect.left) / containerWidth;
}

function isOverTrashCan(elmnt) {
    const trashCan = document.getElementById('trash-can');
    const trashCanRect = trashCan.getBoundingClientRect();
    const elmntRect = elmnt.getBoundingClientRect();

    return (
        elmntRect.right > trashCanRect.left &&
        elmntRect.left < trashCanRect.right &&
        elmntRect.bottom > trashCanRect.top &&
        elmntRect.top < trashCanRect.bottom
    );
}

function removeElement(elmnt) {
    const dropNumber = elmnt.dataset.dropNumber;
    const percentDone = parseFloat(elmnt.dataset.percentDone);

    elmnt.remove();

    if (dropDetails[dropNumber]) {
        dropDetails[dropNumber] -= percentDone;
        if (dropDetails[dropNumber] <= 0) {
            delete dropDetails[dropNumber];
        }
    }
    updateCompletion();
    updateRightTable(); // Update right table after removal
}

function updateCompletion() {
    const totalDrops = parseInt(document.getElementById('total-drops').value);
    let totalPercent = 0;
    for (const key in dropDetails) {
        totalPercent += dropDetails[key];
    }
    const completionOutput = document.getElementById('completion');

    if (totalDrops && totalPercent >= 0) {
        const completion = (totalPercent / (totalDrops * 100)) * 100;
        completionOutput.textContent = `Completion: ${completion.toFixed(2)}%`;
    } else {
        completionOutput.textContent = 'Completion: 0%';
    }
}

function checkTrashCan(elmnt) {
    const trashCan = document.getElementById('trash-can');
    const trashCanRect = trashCan.getBoundingClientRect();
    const elmntRect = elmnt.getBoundingClientRect();

    if (elmntRect.right > trashCanRect.left &&
        elmntRect.left < trashCanRect.right &&
        elmntRect.bottom > trashCanRect.top &&
        elmntRect.top < trashCanRect.bottom) {
        removeElement(elmnt);
    }
}

function updateDropDetailsTable(dropNumber, date, percentDone) {
    const dropNumberElement = document.getElementById('drop-number');
    const dropDateElement = document.getElementById('drop-date');
    const dropPercentElement = document.getElementById('drop-percent');
    const dropDetailsTable = document.getElementById('drop-details-table');
    
    if (dropNumberElement && dropDateElement && dropPercentElement && dropDetailsTable) {
        dropNumberElement.textContent = dropNumber;
        dropDateElement.textContent = date;
        dropPercentElement.textContent = percentDone + "%";
        dropDetailsTable.style.display = 'table';
    } else {
        console.error('Drop details elements not found.');
    }
}

let db;
const request = indexedDB.open('MeasurementToolDB', 1);

request.onupgradeneeded = function (event) {
    db = event.target.result;
    const objectStore = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
    objectStore.createIndex('id', 'id', { unique: true });
};

request.onsuccess = function (event) {
    db = event.target.result;
};

request.onerror = function (event) {
    console.error('Database error:', event.target.errorCode);
};

function handleSaveSession() {
    const sessionIdInput = document.getElementById('session-id-input').value;
    const sessionData = {
        buildingImage: document.getElementById('building').src,
        greenTools: Array.from(document.querySelectorAll('.green-tool')).map(tool => ({
            relTop: tool.dataset.relTop,
            relLeft: tool.dataset.relLeft,
            width: tool.style.width,
            height: tool.style.height,
            transform: tool.style.transform,
            date: tool.querySelector('.tool-date').textContent.split('-')[0],
            percentDone: tool.querySelector('.tool-date').textContent.split('-')[1].replace('%', ''),
            dropNumber: tool.dataset.dropNumber
        })),
        totalDrops: document.getElementById('total-drops').value,
        completion: document.getElementById('completion').textContent
    };

    const transaction = db.transaction(['sessions'], 'readwrite');
    const objectStore = transaction.objectStore('sessions');

    if (sessionIdInput) {
        const sessionId = parseInt(sessionIdInput);
        const request = objectStore.put({ ...sessionData, id: sessionId });

        request.onsuccess = function () {
            alert(`Session ${sessionId} updated successfully.`);
        };

        request.onerror = function (event) {
            console.error('Error updating session:', event.target.errorCode);
        };
    } else {
        const request = objectStore.add(sessionData);

        request.onsuccess = function (event) {
            const sessionId = event.target.result;
            document.getElementById('session-id-display').textContent = `Session ID: ${sessionId}`;
        };

        request.onerror = function (event) {
            console.error('Error saving session:', event.target.errorCode);
        }
    }
}

function handleResumeSession() {
    const sessionIdInput = document.getElementById('session-id-input').value;
    if (sessionIdInput) {
        resumeSession(parseInt(sessionIdInput));
    } else {
        alert("Please enter a Session ID.");
    }
}

function resumeSession(sessionId) {
    const transaction = db.transaction(['sessions']);
    const objectStore = transaction.objectStore('sessions');
    const request = objectStore.get(sessionId);

    request.onsuccess = function (event) {
        const sessionData = event.target.result;
        if (sessionData) {
            const buildingImage = document.getElementById('building');
            buildingImage.src = sessionData.buildingImage;
            buildingImage.style.display = 'block';
            document.getElementById('polygon-canvas').style.display = 'block';

            dropDetails = {};

            document.querySelectorAll('.green-tool').forEach(tool => tool.remove());
            sessionData.greenTools.forEach(toolData => {
                dropDetails[toolData.dropNumber] = (dropDetails[toolData.dropNumber] || 0) + parseFloat(toolData.percentDone);
                const container = document.getElementById('container');
                const newTool = document.createElement('div');
                newTool.className = 'draggable green-tool hidden-handles';
                newTool.style.top = `${toolData.relTop * container.clientHeight}px`;
                newTool.style.left = `${toolData.relLeft * container.clientWidth}px`;
                newTool.style.width = toolData.width;
                newTool.style.height = toolData.height;
                newTool.style.transform = toolData.transform;
                newTool.innerHTML = `<div class="resize-handle top-left"></div>
                                     <div class="resize-handle top-right"></div>
                                     <div class="resize-handle bottom-left"></div>
                                     <div class="resize-handle bottom-right"></div>
                                     <div class="rotate-handle"></div>
                                     <div class="tool-content">
                                         <span class="tool-date">${toolData.date}-${toolData.percentDone}%</span>
                                     </div>`;
                container.appendChild(newTool);
                dragElement(newTool, calculateCoverage);
                addResizeListeners(newTool, resizeText);
                addRotationListener(newTool);
                newTool.dataset.dropNumber = toolData.dropNumber;
                newTool.dataset.date = toolData.date;
                newTool.dataset.percentDone = toolData.percentDone;
                newTool.dataset.relTop = toolData.relTop;
                newTool.dataset.relLeft = toolData.relLeft;
                newTool.addEventListener('click', function () {
                    updateDropDetailsTable(toolData.dropNumber, toolData.date, toolData.percentDone);
                    toggleHandles(newTool);
                    highlightTableRow(toolData.dropNumber);  // Highlight the corresponding table row
                });
            });

            document.getElementById('total-drops').value = sessionData.totalDrops;
            updateCompletion();
            updateRightTable();
        } else {
            alert("Session ID does not exist yet.");
        }
    };

    request.onerror = function (event) {
        console.error('Error resuming session:', event.target.errorCode);
    };
}
function saveAsPDF() {
    const { jsPDF } = window.jspdf;
    const container = document.querySelector('.main-content');

    // Ensure the container is visible before capturing
    if (!container) {
        console.error('Main content container not found.');
        return;
    }

    console.log('Capturing container:', container);
    console.log('Container dimensions:', container.clientWidth, container.clientHeight);
    console.log('Container content:', container.innerHTML);

    // Use html2canvas to capture the content of the container
    html2canvas(container, {
        scale: 2, // Increase scale for better resolution
        useCORS: true,
        logging: true, // Enable logging for html2canvas
        onclone: (clonedDoc) => {
            // Style adjustments to ensure content is fully visible in the cloned document
            const clonedContainer = clonedDoc.querySelector('.main-content');
            clonedContainer.style.overflow = 'visible';
        }
    }).then((canvas) => {
        console.log('Canvas captured:', canvas);
        console.log('Canvas dimensions:', canvas.width, canvas.height);

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('landscape', 'pt', 'a4');

        // Calculate the image dimensions to fit the PDF page
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        console.log('Image dimensions:', imgWidth, imgHeight);

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save('building_measurement.pdf');
    }).catch(error => {
        console.error('Error generating PDF:', error);
    });
}


function debounce(func, delay) {
    let debounceTimer;
    return function () {
        const context = this;
        const args = arguments;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(context, args), delay);
    };
}

function createPopup(id, innerHTML) {
    let popup = document.getElementById(id);
    if (!popup) {
        popup = document.createElement('div');
        popup.id = id;
        popup.classList.add('popup');
        document.body.appendChild(popup);
    }
    popup.innerHTML = innerHTML;
    popup.style.display = 'block';
}

function closePopup(id) {
    const popup = document.getElementById(id);
    if (popup) {
        popup.style.display = 'none';
    }
}

function updateRightTable() {
    const rightTableBody = document.querySelector('#right-table tbody');
    rightTableBody.innerHTML = ''; // Clear previous data

    const greenTools = Array.from(document.querySelectorAll('.green-tool'));

    // Sort the green tools by drop number in ascending order
    greenTools.sort((a, b) => parseInt(a.dataset.dropNumber) - parseInt(b.dataset.dropNumber));

    greenTools.forEach(tool => {
        const dropNumber = tool.dataset.dropNumber;
        const date = tool.dataset.date;
        const percentDone = tool.dataset.percentDone;

        const row = document.createElement('tr');
        row.dataset.dropNumber = dropNumber;  // Set drop number as data attribute
        row.innerHTML = `
            <td>${dropNumber}</td>
            <td>${date}</td>
            <td>${percentDone}%</td>
        `;
        rightTableBody.appendChild(row);
    });
}

function highlightTableRow(dropNumber) {
    const rows = document.querySelectorAll('#right-table tbody tr');
    rows.forEach(row => {
        if (row.dataset.dropNumber === dropNumber) {
            row.classList.add('highlight');
        } else {
            row.classList.remove('highlight');
        }
    });
}
