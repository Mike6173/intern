window.onload = () => {
    const mainPage = document.getElementById('main-page');
    const propertyLookupPage = document.getElementById('property-lookup-page');
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');

    if (mainPage) {
        initializeMainPage();
    }

    if (propertyLookupPage) {
        initializePropertyLookup();
    }

    if (sessionId) {
        document.getElementById('session-id-input').value = sessionId;
        resumeSession(parseInt(sessionId));
    }
};

function debounce(func, delay) {
    let debounceTimer;
    return function () {
        const context = this;
        const args = arguments;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(context, args), delay);
    };
}

function initializeMainPage() {
    const uploadImageInput = document.getElementById('upload-image');
    const buildingImage = document.getElementById('building');
    const addDropButton = document.getElementById('add-drop-button');
    const totalDropsInput = document.getElementById('total-drops');
    const saveSessionButton = document.getElementById('save-session-button');
    const resumeSessionButton = document.getElementById('resume-session-button');
    const savePDFButton = document.getElementById('save-pdf-button');
    const polygonCanvas = document.getElementById('polygon-canvas');
    const toolElement = document.getElementById('tool');
    const container = document.getElementById('container');
    
    totalDropsInput.value = 0;

    uploadImageInput.addEventListener('change', handleImageUpload);
    addDropButton.addEventListener('click', handleAddDrop);
    totalDropsInput.addEventListener('input', updateCompletion);
    toolElement.addEventListener('mousemove', debounce(calculateCoverage, 100));
    window.addEventListener('resize', debounce(resizeBuildingImage, 100));
    saveSessionButton.addEventListener('click', handleSaveSession);
    resumeSessionButton.addEventListener('click', handleResumeSession);
    savePDFButton.addEventListener('click', saveAsPDF);

    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                buildingImage.src = e.target.result;
                buildingImage.style.display = 'block';
                polygonCanvas.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    }

    function handleAddDrop() {
        const totalDrops = parseInt(totalDropsInput.value);
        const currentDrops = Object.keys(dropDetails).length;

        if (totalDrops === 0) {
            alert("Please enter the total number of drops first.");
            return;
        }

        if (currentDrops >= totalDrops) {
            alert("You have already entered the maximum number of drops.");
            return;
        }

        // Create a singular pop-up div
        const popup = document.createElement('div');
        popup.classList.add('popup');

        // Add form fields to the pop-up
        popup.innerHTML = `
            <div>
                <label>Enter Drop Number:</label>
                <input type="number" id="drop-number-input" required>
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
                <button id="submit-popup" class="popup-btn">Done</button>
                <button id="cancel-popup" class="popup-btn">Cancel</button>
            </div>
        `;

        document.body.appendChild(popup);

        // Initialize flatpickr on date input
        flatpickr(document.getElementById('date-input'), {
            defaultDate: new Date()
        });

        // Event listener for the "Done" button
        document.getElementById('submit-popup').addEventListener('click', () => {
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

            document.body.removeChild(popup);
        });

        // Event listener for the "Cancel" button
        document.getElementById('cancel-popup').addEventListener('click', () => {
            document.body.removeChild(popup);
        });
    }
}

let dropDetails = {};
let currentHandle;
let startX, startY, startWidth, startHeight;

function resizeBuildingImage() {
    const buildingWrapper = document.getElementById('building-wrapper');
    const buildingImage = document.getElementById('building');
    if (buildingWrapper && buildingImage) {
        buildingImage.style.maxWidth = `${buildingWrapper.clientWidth}px`;
        buildingImage.style.maxHeight = `${buildingWrapper.clientHeight}px`;
    }
}

function initResize(e) {
    currentHandle = e.target;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = parseInt(document.defaultView.getComputedStyle(buildingImage).width, 10);
    startHeight = parseInt(document.defaultView.getComputedStyle(buildingImage).height, 10);
    document.documentElement.addEventListener('mousemove', doResize);
    document.documentElement.addEventListener('mouseup', stopResize);
}

function doResize(e) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    switch (currentHandle.className) {
        case 'resize-handle top-left':
            buildingImage.style.width = (startWidth - dx) + 'px';
            buildingImage.style.height = (startHeight - dy) + 'px';
            break;
        case 'resize-handle top-right':
            buildingImage.style.width = (startWidth + dx) + 'px';
            buildingImage.style.height = (startHeight - dy) + 'px';
            break;
        case 'resize-handle bottom-left':
            buildingImage.style.width = (startWidth - dx) + 'px';
            buildingImage.style.height = (startHeight + dy) + 'px';
            break;
        case 'resize-handle bottom-right':
            buildingImage.style.width = (startWidth + dx) + 'px';
            buildingImage.style.height = (startHeight + dy) + 'px';
            break;
    }
}

function stopResize() {
    document.documentElement.removeEventListener('mousemove', doResize);
    document.documentElement.removeEventListener('mouseup', stopResize);
}

function addNewTool(dateStr, dropNumber, percentDone) {
    const container = document.getElementById('container');
    const newTool = document.createElement('div');
    newTool.className = 'draggable green-tool';
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
        updateDropDetailsTable(dropNumber, formattedDate, percentDone);
        toggleHandles(newTool);
    });
    resizeText(newTool);
    updateCompletion();
}

function toggleHandles(element) {
    element.classList.toggle('hidden-handles');
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
        if (drawing) return;
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
        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        const rotation = initialRotation + angle;
        elmnt.style.transform = `rotate(${rotation}deg)`;
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
    const x1 = line1Start.x, y1 = line1Start.y, x2 = line1End.x, y2 = line1End.y;
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
        if (drawing || e.target.classList.contains('rotate-handle')) return;
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
        checkTrashCan(elmnt);
    }

    function closeDragElement() {
        if (isOverTrashCan(elmnt)) {
            removeElement(elmnt);
        }
        document.onmouseup = null;
        document.onmousemove = null;
    }
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
    document.getElementById('drop-number').textContent = dropNumber;
    document.getElementById('drop-date').textContent = date;
    document.getElementById('drop-percent').textContent = percentDone + "%";
    document.getElementById('drop-details-table').style.display = 'table';
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

function saveSession() {
    const sessionIdInput = document.getElementById('session-id-input').value;
    const sessionData = {
        buildingImage: document.getElementById('building').src,
        greenTools: Array.from(document.querySelectorAll('.green-tool')).map(tool => ({
            top: tool.style.top,
            left: tool.style.left,
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
                newTool.className = 'draggable green-tool';
                newTool.style.top = toolData.top;
                newTool.style.left = toolData.left;
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
                newTool.addEventListener('click', function () {
                    updateDropDetailsTable(toolData.dropNumber, toolData.date, toolData.percentDone);
                    toggleHandles(newTool);
                });
            });

            document.getElementById('total-drops').value = sessionData.totalDrops;
            updateCompletion();
        } else {
            alert("Invalid session ID.");
        }
    };

    request.onerror = function (event) {
        console.error('Error resuming session:', event.target.errorCode);
    };
}

let currentUser = '';

function initializePropertyLookup() {
    currentUser = prompt("Enter your name:");
    if (!currentUser) {
        alert("Name is required to access properties.");
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('username-display').textContent = `Logged in as: ${currentUser}`;
    document.getElementById('add-property-button').style.display = 'block';

    const addPropertyButton = document.getElementById('add-property-button');
    const filterActiveCheckbox = document.getElementById('filter-active-checkbox');
    const propertyList = document.getElementById('property-list');
    const modal = document.getElementById('property-modal');
    const closeModal = document.getElementsByClassName('close')[0];
    const form = document.getElementById('property-form');
    const editModal = document.getElementById('edit-property-modal');
    const closeEditModal = document.getElementsByClassName('close-edit')[0];
    const editForm = document.getElementById('edit-property-form');

    loadProperties();

    addPropertyButton.addEventListener('click', () => {
        createPopup('property-modal', `
            <div>
                <label>Enter Address:</label>
                <input type="text" id="property-address" required>
            </div>
            <div>
                <label>Enter Property Name:</label>
                <input type="text" id="property-name" required>
            </div>
            <div style="text-align: center; margin-top: 10px;">
                <button id="submit-property-popup" class="popup-btn">Done</button>
                <button id="cancel-property-popup" class="popup-btn">Cancel</button>
            </div>
        `);

        document.getElementById('submit-property-popup').addEventListener('click', () => {
            const propertyAddress = document.getElementById('property-address').value;
            const propertyName = document.getElementById('property-name').value;
            
            if (!propertyAddress || !propertyName) {
                alert("Please fill out all fields.");
                return;
            }
            
            const propertyItem = {
                name: propertyName,
                address: propertyAddress,
                percentDone: 0,
                description: "No description provided.",
                image: null,
                tableData: [],
                active: false
            };

            addPropertyToList(propertyItem);
            saveProperty(propertyItem);
            closePopup('property-modal');
        });

        document.getElementById('cancel-property-popup').addEventListener('click', () => {
            closePopup('property-modal');
        });
    });

    filterActiveCheckbox.addEventListener('change', filterProperties);

    closeEditModal.addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    editForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const propertyName = document.getElementById('edit-property-name').value;
        const propertyAddress = document.getElementById('edit-property-address').value;
        const originalName = editForm.getAttribute('data-original-name');

        if (!propertyName || !propertyAddress) return;

        let properties = JSON.parse(localStorage.getItem(currentUser + '_properties')) || [];
        let property = properties.find(p => p.name === originalName);

        if (property) {
            property.name = propertyName;
            property.address = propertyAddress;
            localStorage.setItem(currentUser + '_properties', JSON.stringify(properties));
            document.getElementById('property-list').innerHTML = '';
            loadProperties();
        }

        editModal.style.display = 'none';
        editForm.reset();
    });

    function filterProperties() {
        const filterActive = document.getElementById('filter-active-checkbox').checked;
        const properties = document.querySelectorAll('.property-item');

        properties.forEach(property => {
            if (filterActive && property.getAttribute('data-active') !== 'true') {
                property.style.display = 'none';
            } else {
                property.style.display = 'block';
            }
        });
    }

    function addPropertyToList(property) {
        const propertyList = document.getElementById('property-list');
        const propertyItem = document.createElement('div');
        propertyItem.className = 'property-item';
        propertyItem.setAttribute('data-active', property.active);

        const description = property.description.length > 15 ? property.description.substring(0, 15) + '...' : property.description;

        propertyItem.innerHTML = `
            <span><strong>Address:</strong> ${property.address}</span>
            <span><strong>Name:</strong> ${property.name}</span>
            <div class="buttons">
                ${property.image ? `<img src="${property.image}" class="image-thumbnail" alt="Property Image">` : ''}
            </div>
            <button class="edit-btn">Edit</button>
        `;

        propertyItem.addEventListener('click', () => {
            displayPropertyDetails(property);
        });

        propertyItem.querySelector('.edit-btn').addEventListener('click', (event) => {
            event.stopPropagation();
            createPopup('edit-property-modal', `
                <div>
                    <label>Enter Address:</label>
                    <input type="text" id="edit-property-address" value="${property.address}" required>
                </div>
                <div>
                    <label>Enter Property Name:</label>
                    <input type="text" id="edit-property-name" value="${property.name}" required>
                </div>
                <div style="text-align: center; margin-top: 10px;">
                    <button id="submit-edit-property-popup" class="popup-btn">Done</button>
                    <button id="cancel-edit-property-popup" class="popup-btn">Cancel</button>
                </div>
            `);

            document.getElementById('submit-edit-property-popup').addEventListener('click', () => {
                const propertyAddress = document.getElementById('edit-property-address').value;
                const propertyName = document.getElementById('edit-property-name').value;
                
                if (!propertyAddress || !propertyName) {
                    alert("Please fill out all fields.");
                    return;
                }
                
                let properties = JSON.parse(localStorage.getItem(currentUser + '_properties')) || [];
                let property = properties.find(p => p.name === property.name);

                if (property) {
                    property.name = propertyName;
                    property.address = propertyAddress;
                    localStorage.setItem(currentUser + '_properties', JSON.stringify(properties));
                    document.getElementById('property-list').innerHTML = '';
                    loadProperties();
                }
                
                closePopup('edit-property-modal');
            });

            document.getElementById('cancel-edit-property-popup').addEventListener('click', () => {
                closePopup('edit-property-modal');
            });
        });

        propertyList.appendChild(propertyItem);
    }

    function confirmDeleteProperty(name) {
        const confirmation = confirm("Are you sure you want to delete this property?");
        if (confirmation) {
            deleteProperty(name);
        }
    }

    function uploadImage(name) {
        document.getElementById(`upload-${name}`).click();
    }

    function saveImage(event, name) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            let properties = JSON.parse(localStorage.getItem(currentUser + '_properties')) || [];
            let property = properties.find(p => p.name === name);
            if (property) {
                property.image = e.target.result;
                localStorage.setItem(currentUser + '_properties', JSON.stringify(properties));
                document.getElementById('property-list').innerHTML = '';
                loadProperties();
            }
        };
        reader.readAsDataURL(file);
    }

    function deleteProperty(name) {
        let properties = JSON.parse(localStorage.getItem(currentUser + '_properties')) || [];
        properties = properties.filter(p => p.name !== name);
        localStorage.setItem(currentUser + '_properties', JSON.stringify(properties));
        document.getElementById('property-list').innerHTML = '';
        loadProperties();
    }

    function saveProperty(property) {
        let properties = JSON.parse(localStorage.getItem(currentUser + '_properties')) || [];
        properties.push(property);
        localStorage.setItem(currentUser + '_properties', JSON.stringify(properties));
    }

    function loadProperties() {
        let properties = JSON.parse(localStorage.getItem(currentUser + '_properties')) || [];
        properties.sort((a, b) => a.address.localeCompare(b.address, undefined, {numeric: true}));
        properties.forEach(addPropertyToList);
    }

    function displayPropertyDetails(property) {
        // Reload properties from localStorage
        let properties = JSON.parse(localStorage.getItem(currentUser + '_properties')) || [];
        let updatedProperty = properties.find(p => p.name === property.name);

        if (!updatedProperty) return;

        const propertyDetails = document.querySelector('.property-details');
        propertyDetails.innerHTML = `
            <h2>Name: ${updatedProperty.name}</h2>
            <p>Address: ${updatedProperty.address}</p>
            <div style="display: flex; align-items: center; gap: 10px;">
                <button id="add-row-button" class="add-row-btn">Add Row</button>
                <button id="edit-property-button" class="add-row-btn">Edit</button>
                <button id="delete-property-button" class="add-row-btn">Delete</button>
                <label class="checkbox-label">
                    <input type="checkbox" id="active-checkbox" ${updatedProperty.active ? 'checked' : ''}>
                    Check if Active
                </label>
            </div>
            <table class="property-table">
                <thead>
                    <tr>
                        <th>Scope</th>
                        <th>Percent</th>
                        <th>Budget</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Session ID</th>
                        <th>Load Session</th>
                        <th>Delete Row</th>
                    </tr>
                </thead>
                <tbody>
                    ${updatedProperty.tableData.map((row, index) => `
                        <tr>
                            <td contenteditable="true">${row.scope}</td>
                            <td contenteditable="true">${row.percentage}</td>
                            <td contenteditable="true">${row.budget}</td>
                            <td contenteditable="true">${row.startDate}</td>
                            <td contenteditable="true">${row.endDate}</td>
                            <td contenteditable="true">${row.sessionId || ''}</td>
                            <td><button onclick="loadSessionFromRow(this)" class="small-load-btn">Load</button></td>
                            <td><button onclick="deleteRow(this, ${index}, '${updatedProperty.name}')" class="small-delete-btn">Delete</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        document.getElementById('add-row-button').addEventListener('click', () => {
            addRow(updatedProperty);
        });

        document.getElementById('edit-property-button').addEventListener('click', () => {
            openEditModal(updatedProperty);
        });

        document.getElementById('delete-property-button').addEventListener('click', () => {
            confirmDeleteProperty(updatedProperty.name);
        });

        const cells = propertyDetails.querySelectorAll('td[contenteditable="true"]');
        cells.forEach(cell => {
            cell.addEventListener('input', () => saveTableData(updatedProperty));
        });

        const activeCheckbox = document.getElementById('active-checkbox');
        activeCheckbox.checked = updatedProperty.active || false;
        activeCheckbox.addEventListener('change', () => {
            updatedProperty.active = activeCheckbox.checked;
            saveTableData(updatedProperty);
            filterProperties();  // Call filterProperties to update the list
        });
    }

    function addRow(property) {
        const propertyDetails = document.querySelector('.property-details tbody');
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td contenteditable="true"></td>
            <td contenteditable="true"></td>
            <td contenteditable="true"></td>
            <td contenteditable="true"></td>
            <td contenteditable="true"></td>
            <td contenteditable="true"></td>
            <td><button onclick="loadSessionFromRow(this)" class="small-load-btn">Load</button></td>
            <td><button onclick="deleteRow(this, ${property.tableData.length}, '${property.name}')" class="small-delete-btn">Delete</button></td>
        `;
        propertyDetails.appendChild(newRow);

        const cells = newRow.querySelectorAll('td[contenteditable="true"]');
        cells.forEach(cell => {
            cell.addEventListener('input', () => saveTableData(property));
        });

        property.tableData.push({
            scope: '',
            percentage: '',
            budget: '',
            startDate: '',
            endDate: '',
            sessionId: ''
        });

        saveTableData(property);
    }

    function deleteRow(button, index, propertyName) {
        const row = button.parentElement.parentElement;
        const tbody = row.parentElement;
        tbody.removeChild(row);

        let properties = JSON.parse(localStorage.getItem(currentUser + '_properties')) || [];
        let property = properties.find(p => p.name === propertyName);
        if (property) {
            property.tableData.splice(index, 1);
            saveTableData(property);
            localStorage.setItem(currentUser + '_properties', JSON.stringify(properties));
        }
    }

    function saveTableData(property) {
        const propertyDetails = document.querySelector('.property-details tbody');
        const rows = propertyDetails.querySelectorAll('tr');
        property.tableData = Array.from(rows).map(row => {
            const cells = row.querySelectorAll('td');
            return {
                scope: cells[0].textContent,
                percentage: cells[1].textContent,
                budget: cells[2].textContent,
                startDate: cells[3].textContent,
                endDate: cells[4].textContent,
                sessionId: cells[5].textContent
            };
        });

        let properties = JSON.parse(localStorage.getItem(currentUser + '_properties')) || [];
        let propertyIndex = properties.findIndex(p => p.name === property.name);
        if (propertyIndex !== -1) {
            properties[propertyIndex] = property;
        }
        localStorage.setItem(currentUser + '_properties', JSON.stringify(properties));
    }

    function loadSessionFromRow(button) {
        const row = button.parentElement.parentElement;
        const sessionId = row.cells[5].textContent;
        if (sessionId) {
            window.location.href = `index.html?sessionId=${sessionId}`;
        } else {
            alert("Please enter a valid Session ID.");
        }
    }

    function saveAsPDF() {
        const { jsPDF } = window.jspdf;
        const container = document.querySelector('.main-content');
        html2canvas(container).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('landscape', 'pt', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save('building_measurement.pdf');
        });
    }

    document.getElementById('save-pdf-button').addEventListener('click', saveAsPDF);
}

function createPopup(id, innerHTML) {
    const popup = document.createElement('div');
    popup.id = id;
    popup.classList.add('popup');
    popup.innerHTML = innerHTML;
    document.body.appendChild(popup);
}

function closePopup(id) {
    const popup = document.getElementById(id);
    if (popup) {
        document.body.removeChild(popup);
    }
}
