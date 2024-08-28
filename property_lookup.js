document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM fully loaded and parsed');

    const addPropertyButton = document.getElementById('add-property-icon');
    const filterActiveCheckbox = document.getElementById('filter-active-checkbox');
    const searchBar = document.getElementById('search-bar');
    const propertyList = document.getElementById('property-list');
    const modal = document.getElementById('property-modal');
    const closeModal = document.getElementsByClassName('close')[0];
    const cancelAddPopup = document.getElementById('cancel-popup');
    const form = document.getElementById('property-form');
    const editModal = document.getElementById('edit-property-modal');
    const closeEditModal = document.getElementsByClassName('close-edit')[0];
    const cancelEditPopup = document.getElementById('cancel-edit-popup');
    const editForm = document.getElementById('edit-property-form');

    if (!addPropertyButton) {
        console.error('Add Property button not found');
    }
    if (!filterActiveCheckbox) {
        console.error('Filter Active checkbox not found');
    }
    if (!searchBar) {
        console.error('Search bar not found');
    }
    if (!propertyList) {
        console.error('Property list not found');
    }
    if (!modal) {
        console.error('Modal not found');
    }
    if (!closeModal) {
        console.error('Close modal button not found');
    }
    if (!cancelAddPopup) {
        console.error('Cancel add popup button not found');
    }
    if (!form) {
        console.error('Form not found');
    }
    if (!editModal) {
        console.error('Edit modal not found');
    }
    if (!closeEditModal) {
        console.error('Close edit modal button not found');
    }
    if (!cancelEditPopup) {
        console.error('Cancel edit popup button not found');
    }
    if (!editForm) {
        console.error('Edit form not found');
    }

    let highestSessionId = 0;

    const request = indexedDB.open('MeasurementToolDB', 1);
    let db;

    request.onupgradeneeded = function (event) {
        db = event.target.result;
        const objectStore = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
        objectStore.createIndex('id', 'id', { unique: true });
    };

    request.onsuccess = function (event) {
        db = event.target.result;
        loadProperties();
        initializeHighestSessionId();
    };

    request.onerror = function (event) {
        console.error('Database error:', event.target.errorCode);
    };

    addPropertyButton.addEventListener('click', () => {
        modal.style.display = 'block';
    });

    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    cancelAddPopup.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
        if (event.target == editModal) {
            editModal.style.display = 'none';
        }
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const propertyName = document.getElementById('property-name').value;
        const propertyAddress = document.getElementById('property-address').value;

        if (!propertyAddress) return;

        const propertyItem = {
            name: propertyName || 'Unnamed Property',
            address: propertyAddress,
            percentDone: 0,
            description: "No description provided.",
            image: null,
            tableData: [],
            active: false
        };

        addPropertyToList(propertyItem);
        saveProperty(propertyItem);
        modal.style.display = 'none';
        form.reset();
    });

    filterActiveCheckbox.addEventListener('change', filterProperties);
    searchBar.addEventListener('input', filterProperties);

    closeEditModal.addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    cancelEditPopup.addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    editForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const propertyName = document.getElementById('edit-property-name').value;
        const propertyAddress = document.getElementById('edit-property-address').value;
        const originalName = editForm.getAttribute('data-original-name');

        if (!propertyAddress) return;

        let properties = JSON.parse(localStorage.getItem('properties')) || [];
        let property = properties.find(p => p.name === originalName);

        if (property) {
            property.name = propertyName || 'Unnamed Property';
            property.address = propertyAddress;
            localStorage.setItem('properties', JSON.stringify(properties));
            document.getElementById('property-list').innerHTML = '';
            loadProperties();
        }

        editModal.style.display = 'none';
        editForm.reset();
    });

    function filterProperties() {
        try {
            const filterActive = filterActiveCheckbox.checked;
            const searchTerm = searchBar.value.toLowerCase();
            const properties = JSON.parse(localStorage.getItem('properties')) || [];
            propertyList.innerHTML = ''; // Clear current list

            console.log('Filter Active:', filterActive);
            console.log('Search Term:', searchTerm);
            console.log('Properties:', properties);

            let filteredProperties = properties;

            if (filterActive) {
                filteredProperties = properties.filter(property => property.active);
                console.log('Filtered by Active:', filteredProperties);
            }

            if (searchTerm) {
                filteredProperties = filteredProperties.filter(property => property.address.toLowerCase().includes(searchTerm));
                console.log('Filtered by Search Term:', filteredProperties);
            }

            filteredProperties.forEach(addPropertyToList);
        } catch (error) {
            console.error('Error in filterProperties:', error);
        }
    }

    function addPropertyToList(property) {
        try {
            console.log('Adding property to list:', property);
            const propertyItem = document.createElement('div');
            propertyItem.className = 'property-item';
            propertyItem.setAttribute('data-active', property.active);

            propertyItem.innerHTML = `
                <span><strong>Address:</strong> ${property.address}</span>
                <span><strong>Name:</strong> ${property.name}</span>
                <div class="buttons">
                    ${property.image ? `<img src="${property.image}" class="image-thumbnail" alt="Property Image">` : ''}
                </div>
            `;

            propertyItem.addEventListener('click', () => {
                displayPropertyDetails(property);
            });

            propertyList.appendChild(propertyItem);
        } catch (error) {
            console.error('Error in addPropertyToList:', error);
        }
    }

    function openEditModal(property) {
        document.getElementById('edit-property-name').value = property.name;
        document.getElementById('edit-property-address').value = property.address;
        editForm.setAttribute('data-original-name', property.name);
        editModal.style.display = 'block';
    }

    function confirmDeleteProperty(name) {
        const confirmation = confirm("Are you sure you want to delete this property?");
        if (confirmation) {
            deleteProperty(name);
        }
    }

    function deleteProperty(name) {
        let properties = JSON.parse(localStorage.getItem('properties')) || [];
        properties = properties.filter(p => p.name !== name);
        localStorage.setItem('properties', JSON.stringify(properties));
        document.getElementById('property-list').innerHTML = '';
        loadProperties();
    }

    function saveProperty(property) {
        let properties = JSON.parse(localStorage.getItem('properties')) || [];
        properties.push(property);
        localStorage.setItem('properties', JSON.stringify(properties));
        filterProperties(); // Update the list immediately
    }

    function loadProperties() {
        console.log('Loading properties');
        let properties = JSON.parse(localStorage.getItem('properties')) || [];
        properties.sort((a, b) => a.address.localeCompare(b.address, undefined, {numeric: true}));
        properties.forEach(addPropertyToList);
        loadCompletionPercentages();
    }

    function loadCompletionPercentages() {
        const transaction = db.transaction(['sessions']);
        const objectStore = transaction.objectStore('sessions');
        const request = objectStore.getAll();

        request.onsuccess = function (event) {
            const sessions = event.target.result;
            const rows = document.querySelectorAll('.property-table tbody tr');

            rows.forEach(row => {
                const sessionIdCell = row.querySelector('td:nth-child(5)');
                const percentageCell = row.querySelector('td:nth-child(2)');
                const startDateCell = row.querySelector('td:nth-child(3)');
                const sessionId = sessionIdCell.textContent;

                const session = sessions.find(s => s.id === parseInt(sessionId));
                if (session) {
                    // Ensure the percentage is only formatted here
                    let completionPercentage = session.completion;
                    if (typeof completionPercentage === 'string' && completionPercentage.includes('Completion:')) {
                        completionPercentage = completionPercentage.replace('Completion:', '').trim();
                    }
                    if (typeof completionPercentage === 'number') {
                        completionPercentage = completionPercentage.toFixed(2);
                    }

                    // Check if the completionPercentage already contains a '%' sign
                    if (!completionPercentage.includes('%')) {
                        completionPercentage = `${completionPercentage}%`;
                    }
                    percentageCell.textContent = completionPercentage;

                    // Extract and set the earliest start date
                    if (session.greenTools && session.greenTools.length > 0) {
                        const dates = session.greenTools.map(tool => new Date(tool.date));
                        const earliestDate = new Date(Math.min(...dates));
                        const formattedDate = `${earliestDate.getMonth() + 1}/${earliestDate.getDate()}/${earliestDate.getFullYear()}`;
                        startDateCell.textContent = formattedDate;
                    }
                }
            });
        };

        request.onerror = function (event) {
            console.error('Error loading sessions:', event.target.errorCode);
        };
    }

    function displayPropertyDetails(property) {
        let properties = JSON.parse(localStorage.getItem('properties')) || [];
        let updatedProperty = properties.find(p => p.name === property.name);

        if (!updatedProperty) return;

        const propertyDetails = document.querySelector('.property-details');
        propertyDetails.innerHTML = `
            <h2>Name: ${updatedProperty.name}</h2>
            <p>Address: ${updatedProperty.address}</p>
            <div style="display: flex; align-items: center; gap: 10px;">
                <button id="add-row-button" class="add-row-btn btn">Add Row</button>
                <button id="edit-property-button" class="btn">Edit</button>
                <button id="delete-property-button" class="btn">Delete</button>
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
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Session ID</th>
                        <th>Session</th>
                        <th>Row</th>
                    </tr>
                </thead>
                <tbody>
                    ${updatedProperty.tableData.map((row, index) => `
                        <tr>
                            <td contenteditable="true">${row.scope}</td>
                            <td contenteditable="true">${row.percentage}</td>
                            <td contenteditable="true">${row.startDate}</td>
                            <td contenteditable="true">${row.endDate}</td>
                            <td contenteditable="false">${row.sessionId || ''}</td>
                            <td><button class="small-load-btn plain-btn" data-session-id="${row.sessionId}">Load</button></td>
                            <td><button class="small-delete-btn plain-btn" data-row-index="${index}" data-property-name="${updatedProperty.name}">Delete</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        document.getElementById('add-row-button').addEventListener('click', async () => {
            await addRow(updatedProperty);
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
            filterProperties();
        });

        const loadButtons = propertyDetails.querySelectorAll('.small-load-btn');
        loadButtons.forEach(button => {
            button.addEventListener('click', () => {
                loadSessionFromRow(button);
            });
        });

        const deleteButtons = propertyDetails.querySelectorAll('.small-delete-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', () => {
                confirmDeleteRow(button, button.dataset.rowIndex, button.dataset.propertyName);
            });
        });

        loadCompletionPercentages(); // Load percentages and start dates after the table is rendered
    }

    async function addRow(property) {
        const propertyDetails = document.querySelector('.property-details tbody');
        const newRow = document.createElement('tr');

        const nextSessionId = ++highestSessionId;
        console.log('Next Session ID:', nextSessionId); // Debug log
        newRow.innerHTML = `
            <td contenteditable="true"></td>
            <td contenteditable="true"></td>
            <td contenteditable="true"></td>
            <td contenteditable="true"></td>
            <td contenteditable="false">${nextSessionId}</td>
            <td><button class="small-load-btn plain-btn" data-session-id="${nextSessionId}">Load</button></td>
            <td><button class="small-delete-btn plain-btn" data-row-index="${property.tableData.length}" data-property-name="${property.name}">Delete</button></td>
        `;
        propertyDetails.appendChild(newRow);

        const cells = newRow.querySelectorAll('td[contenteditable="true"]');
        cells.forEach(cell => {
            cell.addEventListener('input', () => saveTableData(property));
        });

        const loadButton = newRow.querySelector('.small-load-btn');
        loadButton.addEventListener('click', () => {
            loadSessionFromRow(loadButton);
        });

        const deleteButton = newRow.querySelector('.small-delete-btn');
        deleteButton.addEventListener('click', () => {
            confirmDeleteRow(deleteButton, property.tableData.length, property.name);
        });

        property.tableData.push({
            scope: '',
            percentage: '',
            startDate: '',
            endDate: '',
            sessionId: nextSessionId
        });

        saveTableData(property);
    }

    function confirmDeleteRow(button, index, propertyName) {
        const confirmation = confirm("Are you sure you want to delete this row?");
        if (confirmation) {
            deleteRow(button, index, propertyName);
        }
    }

    function deleteRow(button, index, propertyName) {
        const row = button.parentElement.parentElement;
        const tbody = row.parentElement;
        tbody.removeChild(row);

        let properties = JSON.parse(localStorage.getItem('properties')) || [];
        let property = properties.find(p => p.name === propertyName);
        if (property) {
            property.tableData.splice(index, 1);
            saveTableData(property);
            localStorage.setItem('properties', JSON.stringify(properties));
        }
    }

    function saveTableData(property) {
        const propertyDetails = document.querySelector('.property-details tbody');
        const rows = propertyDetails.querySelectorAll('tr');
        property.tableData = Array.from(rows).map(row => {
            const cells = row.querySelectorAll('td');
            let percentage = cells[1].textContent;
            if (percentage.includes('%')) {
                percentage = percentage.replace('%', '').trim();
            }
            return {
                scope: cells[0].textContent,
                percentage: percentage, // Store without the percent sign
                startDate: cells[2].textContent,
                endDate: cells[3].textContent,
                sessionId: cells[4].textContent
            };
        });

        let properties = JSON.parse(localStorage.getItem('properties')) || [];
        let propertyIndex = properties.findIndex(p => p.name === property.name);
        if (propertyIndex !== -1) {
            properties[propertyIndex] = property;
        }
        localStorage.setItem('properties', JSON.stringify(properties));
    }

    function loadSessionFromRow(button) {
        const sessionId = button.dataset.sessionId;
        if (sessionId) {
            window.location.href = `index.html?sessionId=${sessionId}`;
        } else {
            alert("Please enter a valid Session ID.");
        }
    }

    async function initializeHighestSessionId() {
        const transaction = db.transaction(['sessions'], 'readonly');
        const objectStore = transaction.objectStore('sessions');
        const request = objectStore.openCursor(null, 'prev');

        request.onsuccess = function (event) {
            const cursor = event.target.result;
            if (cursor) {
                highestSessionId = cursor.value.id;
            }
        };

        request.onerror = function (event) {
            console.error('Error initializing highest session ID:', event.target.errorCode);
        };
    }
});
