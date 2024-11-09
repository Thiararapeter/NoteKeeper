const NOTES_PER_PAGE = 12;

let currentPage = 1;



const APP_VERSION = localStorage.getItem('APP_VERSION') || '1.0.1';

// const VERSION_CHECK_URL = 'http://localhost:8000/version.json'; // For development

const VERSION_CHECK_URL = 'https://notekeeper-git-main-thiararapeters-projects.vercel.app/version.json'; // For production



async function checkForUpdates() {

    try {

        const response = await fetch(`${VERSION_CHECK_URL}?t=${Date.now()}`);

        if (!response.ok) {

            throw new Error('Failed to fetch version info');

        }

        const data = await response.json();

        const currentVersion = localStorage.getItem('APP_VERSION') || '1.0.0';

        if (data.version > currentVersion) {

            const hiddenUpdates = JSON.parse(localStorage.getItem('hiddenUpdates') || '{}');

            const hideUntil = hiddenUpdates[data.version];

            if (!hideUntil || 

                (hideUntil !== 'never' && new Date(hideUntil) <= new Date())) {

                showUpdateNotification(data);

            }

        }

    } catch (error) {

        console.error('Error checking for updates:', error);

    }

}



function showUpdateNotification(updateData) {

    // Check if user has chosen to hide this version's notification

    const hiddenUpdates = JSON.parse(localStorage.getItem('hiddenUpdates') || '{}');

    if (hiddenUpdates[updateData.version]) {

        const hideUntil = hiddenUpdates[updateData.version];

        if (hideUntil === 'never' || (hideUntil && new Date(hideUntil) > new Date())) {

            return;

        }

    }



    const notification = document.createElement('div');

    notification.className = 'update-notification';

    notification.innerHTML = `

        <div class="update-content">

            <h3>🚀 New Version Available!</h3>

            <p>Version ${updateData.version} is now available</p>

            <div class="update-actions">

                <button onclick="performUpdate('${updateData.version}')" class="update-button">

                    Update Now

                </button>

                <button onclick="hideUpdateUntilNext('${updateData.version}')">

                    Hide Until Next Update

                </button>

                <button onclick="hideUpdateTemporarily('${updateData.version}', 7)">

                    View Later

                </button>

                <button onclick="neverShowUpdate('${updateData.version}')">

                    Never Show Again

                </button>

                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="dismiss-button">

                    <i class="fas fa-times"></i>

                </button>

            </div>

            <div class="update-changelog">

                <h4>What's New:</h4>

                <ul>

                    ${updateData.changelog.map(change => `<li>${change}</li>`).join('')}

                </ul>

            </div>

        </div>

    `;

    

    document.body.appendChild(notification);

}



async function performUpdate(newVersion) {

    try {

        const registrations = await navigator.serviceWorker.getRegistrations();

        await Promise.all(registrations.map(reg => reg.unregister()));

        

        const keys = await caches.keys();

        await Promise.all(keys.map(key => caches.delete(key)));

        

        localStorage.setItem('APP_VERSION', newVersion);

        

        showNotification('Updating to version ' + newVersion + '...', 'success');

        

        setTimeout(() => {

            window.location.reload(true);

        }, 1000);

    } catch (error) {

        console.error('Update failed:', error);

        showNotification('Update failed. Please try again.', 'error');

    }

}



document.addEventListener('DOMContentLoaded', () => {

    // Get DOM elements

    const addNoteBtn = document.getElementById('add-note-btn');

    const noteForm = document.getElementById('add-note-form');

    const noteTitle = document.getElementById('note-title');

    const noteContent = document.getElementById('note-content');

    const noteCategory = document.getElementById('note-category');

    const notesContainer = document.getElementById('notes-container');

    const pinnedNotesContainer = document.getElementById('pinned-notes-container');

    const favoritedNotesContainer = document.getElementById('favorited-notes-container');

    const popupOverlay = document.getElementById('popup-overlay');

    const searchInput = document.getElementById('search-notes');

    const categoryFilter = document.getElementById('category-filter');

    const manageCategories = document.getElementById('manage-categories');

    const categoryModal = document.getElementById('category-modal-overlay');

    const categoryModalClose = document.getElementById('category-modal-close');

    const addCategoryForm = document.getElementById('add-category-form');

    const categoriesList = document.getElementById('categories-list');

    const editorToolbar = document.querySelector('.editor-toolbar');



    // Add these at the beginning of your DOMContentLoaded event

    const viewNoteModal = document.getElementById('view-note-modal');

    const viewNoteClose = document.getElementById('view-note-close');

    const viewNoteTitle = document.getElementById('view-note-title');

    const viewNoteCategory = document.getElementById('view-note-category');

    const viewNoteTimestamp = document.getElementById('view-note-timestamp');

    const viewNoteBody = document.getElementById('view-note-body');

    const viewNoteEdit = document.getElementById('view-note-edit');

    const viewNoteFavorite = document.getElementById('view-note-favorite');

    const viewNoteDelete = document.getElementById('view-note-delete');



    // Initialize data

    let notes = JSON.parse(localStorage.getItem('notes')) || [];

    let editingNoteId = null;

    let categories = JSON.parse(localStorage.getItem('categories')) || [

        { id: 'personal', name: 'Personal', color: '#fab1a0' },

        { id: 'work', name: 'Work', color: '#81ecec' },

        { id: 'study', name: 'Study', color: '#a8e6cf' },

        { id: 'other', name: 'Other', color: '#dfe6e9' }

    ];



    // Save functions

    const saveNotes = () => {

        localStorage.setItem('notes', JSON.stringify(notes));

    };



    const saveCategories = () => {

        localStorage.setItem('categories', JSON.stringify(categories));

        updateCategorySelects();

    };



    // Show/Hide form functions

    const showNoteForm = () => {

        popupOverlay.classList.add('show');

        document.body.style.overflow = 'hidden';

        noteTitle.focus();

    };



    const hideNoteForm = () => {

        popupOverlay.classList.remove('show');

        document.body.style.overflow = '';

        noteForm.reset();

        noteContent.innerHTML = '';

        editingNoteId = null;

        document.getElementById('add-note').innerHTML = '<i class="fas fa-plus"></i> Add Note';

    };



    // Notification function

    const showNotification = (message, type = 'success') => {

        const container = document.getElementById('notification-container');

        const notification = document.createElement('div');

        notification.className = `notification ${type}`;

        notification.innerHTML = `

            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>

            ${message}

        `;

        

        container.appendChild(notification);



        setTimeout(() => {

            notification.style.animation = 'slideOut 0.3s ease forwards';

            setTimeout(() => {

                container.removeChild(notification);

            }, 300);

        }, 3000);

    };



    // Create note element

    const createNoteElement = (note) => {

        const category = categories.find(cat => cat.id === note.category);

        const categoryColor = category ? category.color : '#dfe6e9';

        

        const div = document.createElement('div');

        div.className = `note ${note.pinned ? 'pinned' : ''} ${note.favorited ? 'favorited' : ''}`;

        div.innerHTML = `

            <button class="pin-button ${note.pinned ? 'pinned' : ''}" onclick="togglePin(${note.id})">

                <i class="fas fa-thumbtack"></i>

            </button>

            <h3>${note.title}</h3>

            <span class="note-category" style="background-color: ${categoryColor}">${note.category}</span>

            <div class="note-timestamp">

                <i class="far fa-clock"></i> ${new Date(note.timestamp).toLocaleString()}

            </div>

            <div class="note-actions">

                <button class="view-button" onclick="viewNote(${note.id})">

                    <i class="fas fa-eye"></i> View Note

                </button>

                <button onclick="toggleFavorite(${note.id})">

                    <i class="fas ${note.favorited ? 'fa-star' : 'fa-star-o'}"></i>

                </button>

            </div>

        `;

        return div;

    };



    // Add helper function to get preview content

    const getPreviewContent = (content) => {

        const tempDiv = document.createElement('div');

        tempDiv.innerHTML = content;

        const text = tempDiv.textContent || tempDiv.innerText;

        return text.length > 100 ? text.substring(0, 100) + '...' : text;

    };



    // Filter notes function

    const filterNotes = () => {

        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

        const selectedCategory = categoryFilter ? categoryFilter.value : 'all';



        const filteredNotes = notes.filter(note => {

            const matchesSearch = note.title.toLowerCase().includes(searchTerm) || 

                                note.content.toLowerCase().includes(searchTerm);

            const matchesCategory = selectedCategory === 'all' || note.category === selectedCategory;

            return matchesSearch && matchesCategory;

        });



        // Separate filtered notes

        const pinnedNotes = filteredNotes.filter(note => note.pinned);

        const favoritedNotes = filteredNotes.filter(note => note.favorited);

        const regularNotes = filteredNotes.filter(note => !note.pinned && !note.favorited);



        // Update pinned notes container

        if (pinnedNotesContainer) {

            pinnedNotesContainer.innerHTML = '';

            pinnedNotes.forEach(note => {

                pinnedNotesContainer.appendChild(createNoteElement(note));

            });

        }



        // Update favorited notes container

        if (favoritedNotesContainer) {

            favoritedNotesContainer.innerHTML = '';

            favoritedNotes.forEach(note => {

                favoritedNotesContainer.appendChild(createNoteElement(note));

            });

        }



        // Update regular notes container

        if (notesContainer) {

            notesContainer.innerHTML = '';

            regularNotes.forEach(note => {

                notesContainer.appendChild(createNoteElement(note));

            });

        }



        updateVisibility();

    };



    // Update visibility function

    const updateVisibility = () => {

        const pinnedNotesSection = document.getElementById('pinned-notes');

        const favoritedNotesSection = document.getElementById('favorited-notes');



        if (pinnedNotesSection) {

            pinnedNotesSection.style.display = 

                pinnedNotesContainer.children.length === 0 ? 'none' : 'block';

        }



        if (favoritedNotesSection) {

            favoritedNotesSection.style.display = 

                favoritedNotesContainer.children.length === 0 ? 'none' : 'block';

        }



        // Show/hide pagination based on number of regular notes

        const paginationElement = document.getElementById('pagination');

        const regularNotesCount = notes.filter(note => !note.pinned && !note.favorited).length;

        if (paginationElement) {

            paginationElement.style.display = regularNotesCount > NOTES_PER_PAGE ? 'flex' : 'none';

        }

    };



    // Update category selects

    const updateCategorySelects = () => {

        const categorySelects = document.querySelectorAll('#note-category, #category-filter');

        categorySelects.forEach(select => {

            const currentValue = select.value;

            select.innerHTML = `

                ${select.id === 'category-filter' ? '<option value="all">All Categories</option>' : '<option value="">Select Category</option>'}

                ${categories.map(cat => `

                    <option value="${cat.id}" ${currentValue === cat.id ? 'selected' : ''}>

                        ${cat.name}

                    </option>

                `).join('')}

            `;

        });

    };



    // Global functions

    window.deleteNote = (id) => {

        if (confirm('Are you sure you want to delete this note?')) {

            notes = notes.filter(note => note.id !== id);

            saveNotes();

            

            // Adjust current page if necessary

            const regularNotes = notes.filter(note => !note.pinned && !note.favorited);

            const totalPages = Math.ceil(regularNotes.length / NOTES_PER_PAGE);

            if (currentPage > totalPages) {

                currentPage = Math.max(1, totalPages);

            }

            

            filterNotes();

            showNotification('Note deleted successfully');

        }

    };



    window.togglePin = (id) => {

        const note = notes.find(note => note.id === id);

        if (note) {

            note.pinned = !note.pinned;

            if (note.pinned) note.favorited = false;

            saveNotes();

            filterNotes();

            showNotification(`Note ${note.pinned ? 'pinned' : 'unpinned'} successfully`);

        }

    };



    window.toggleFavorite = (id) => {

        const note = notes.find(note => note.id === id);

        if (note) {

            note.favorited = !note.favorited;

            if (note.favorited) note.pinned = false;

            saveNotes();

            filterNotes();

            showNotification(`Note ${note.favorited ? 'favorited' : 'unfavorited'} successfully`);

        }

    };



    window.editNote = (id) => {

        const note = notes.find(note => note.id === id);

        if (note) {

            editingNoteId = id;

            noteTitle.value = note.title;

            noteContent.innerHTML = note.content;

            noteCategory.value = note.category;

            document.getElementById('add-note').innerHTML = '<i class="fas fa-save"></i> Update Note';

            showNoteForm();

        }

    };



    // Event Listeners

    addNoteBtn.addEventListener('click', showNoteForm);



    noteForm.addEventListener('submit', (e) => {

        e.preventDefault();

        const title = noteTitle.value.trim();

        const content = noteContent.innerHTML.trim();

        const category = noteCategory.value;



        if (!title || !content || !category) {

            showNotification('Please fill in all required fields', 'error');

            return;

        }



        try {

            if (editingNoteId) {

                const noteIndex = notes.findIndex(note => note.id === editingNoteId);

                if (noteIndex !== -1) {

                    notes[noteIndex] = {

                        ...notes[noteIndex],

                        title,

                        content,

                        category,

                        timestamp: new Date().toISOString()

                    };

                    showNotification('Note updated successfully');

                }

            } else {

                const note = {

                    id: Date.now(),

                    title,

                    content,

                    category,

                    timestamp: new Date().toISOString(),

                    pinned: false,

                    favorited: false

                };

                notes.push(note);

                showNotification('Note created successfully');

            }

            saveNotes();

            hideNoteForm();

            filterNotes();

        } catch (error) {

            console.error('Error saving note:', error);

            showNotification('Failed to save note. Please try again.', 'error');

        }

    });



    // Rich text editor functionality

    editorToolbar.addEventListener('click', (e) => {

        const button = e.target.closest('button');

        if (!button) return;



        e.preventDefault();

        const command = button.dataset.command;

        

        if (command) {

            document.execCommand(command, false, null);

            noteContent.focus();

            

            if (['bold', 'italic', 'underline'].includes(command)) {

                button.classList.toggle('active');

            }

        }

    });



    // Initialize

    updateCategorySelects();

    filterNotes();



    // Category management

    manageCategories.addEventListener('click', () => {

        categoryModal.classList.add('show');

        renderCategories();

    });



    categoryModalClose.addEventListener('click', () => {

        categoryModal.classList.remove('show');

    });



    const renderCategories = () => {

        categoriesList.innerHTML = categories.map(cat => `

            <div class="category-item" data-id="${cat.id}">

                <div class="category-info">

                    <span class="category-badge" style="background-color: ${cat.color}"></span>

                    <span class="category-name">${cat.name}</span>

                </div>

                <div class="category-actions">

                    <button type="button" class="edit-category" aria-label="Edit category">

                        <i class="fas fa-edit"></i>

                    </button>

                    <button type="button" class="delete-category" aria-label="Delete category">

                        <i class="fas fa-trash"></i>

                    </button>

                </div>

            </div>

        `).join('');

    };



    addCategoryForm.addEventListener('submit', (e) => {

        e.preventDefault();

        const input = document.getElementById('new-category');

        const colorInput = document.getElementById('category-color');

        const name = input.value.trim();

        const color = colorInput.value;



        if (name) {

            const id = name.toLowerCase().replace(/\s+/g, '-');

            if (!categories.some(cat => cat.id === id)) {

                categories.push({ id, name, color });

                saveCategories();

                renderCategories();

                input.value = '';

                showNotification('Category added successfully');

            } else {

                showNotification('A category with this name already exists!', 'error');

            }

        }

    });



    categoriesList.addEventListener('click', (e) => {

        const categoryItem = e.target.closest('.category-item');

        if (!categoryItem) return;



        const categoryId = categoryItem.dataset.id;

        const category = categories.find(cat => cat.id === categoryId);



        if (e.target.closest('.edit-category')) {

            // Create a form for editing

            const editForm = document.createElement('div');

            editForm.className = 'category-edit-form';

            editForm.innerHTML = `

                <input type="text" value="${category.name}" class="edit-category-name">

                <div class="color-input-group">

                    <input type="color" value="${category.color}" class="edit-category-color">

                    <span class="color-tooltip">Badge color</span>

                </div>

                <button type="button" class="save-edit">

                    <i class="fas fa-check"></i>

                </button>

                <button type="button" class="cancel-edit">

                    <i class="fas fa-times"></i>

                </button>

            `;



            // Replace category content with edit form

            const categoryContent = categoryItem.querySelector('.category-info');

            const categoryActions = categoryItem.querySelector('.category-actions');

            categoryContent.style.display = 'none';

            categoryActions.style.display = 'none';

            categoryItem.insertBefore(editForm, categoryContent);



            // Handle save edit

            editForm.querySelector('.save-edit').addEventListener('click', () => {

                const newName = editForm.querySelector('.edit-category-name').value.trim();

                const newColor = editForm.querySelector('.edit-category-color').value;



                if (newName) {

                    category.name = newName;

                    category.color = newColor;

                    saveCategories();

                    renderCategories();

                    showNotification('Category updated successfully');

                } else {

                    showNotification('Category name cannot be empty', 'error');

                }

            });



            // Handle cancel edit

            editForm.querySelector('.cancel-edit').addEventListener('click', () => {

                categoryContent.style.display = '';

                categoryActions.style.display = '';

                editForm.remove();

            });

        } else if (e.target.closest('.delete-category')) {

            if (confirm('Are you sure you want to delete this category? Notes in this category will be moved to "Other".')) {

                notes = notes.map(note => ({

                    ...note,

                    category: note.category === categoryId ? 'other' : note.category

                }));

                saveNotes();



                categories = categories.filter(cat => cat.id !== categoryId);

                saveCategories();

                renderCategories();

                showNotification('Category deleted successfully');

            }

        }

    });



    // Search and filter

    if (searchInput) {

        searchInput.addEventListener('input', () => {

            currentPage = 1;

            filterNotes();

        });

    }



    if (categoryFilter) {

        categoryFilter.addEventListener('change', () => {

            currentPage = 1;

            filterNotes();

        });

    }



    // Add close button functionality

    const popupClose = document.getElementById('popup-close');

    popupClose.addEventListener('click', hideNoteForm);



    // Add theme toggle functionality

    const themeToggle = document.getElementById('theme-toggle');

    const root = document.documentElement;



    // Initialize theme

    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

    const savedTheme = localStorage.getItem('theme') || (prefersDarkScheme.matches ? 'dark' : 'light');

    updateTheme(savedTheme);



    // Theme toggle function

    function updateTheme(theme) {

        root.setAttribute('data-theme', theme);

        localStorage.setItem('theme', theme);

        

        const icon = themeToggle.querySelector('i');

        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';

        

        document.body.classList.add('theme-transition');

        setTimeout(() => {

            document.body.classList.remove('theme-transition');

        }, 1000);

    }



    // Theme toggle click handler

    themeToggle.addEventListener('click', () => {

        const currentTheme = root.getAttribute('data-theme');

        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        updateTheme(newTheme);

        showNotification(`Switched to ${newTheme} mode`);

    });



    // Mobile menu toggle

    const menuToggle = document.getElementById('menu-toggle');

    const navLinks = document.querySelector('.nav-links');



    menuToggle?.addEventListener('click', () => {

        navLinks.classList.toggle('show');

        menuToggle.querySelector('i').classList.toggle('fa-bars');

        menuToggle.querySelector('i').classList.toggle('fa-times');

    });



    // Close mobile menu when clicking outside

    document.addEventListener('click', (e) => {

        if (navLinks?.classList.contains('show') && 

            !e.target.closest('.nav-links') && 

            !e.target.closest('#menu-toggle')) {

            navLinks.classList.remove('show');

            menuToggle.querySelector('i').classList.add('fa-bars');

            menuToggle.querySelector('i').classList.remove('fa-times');

        }

    });



    // Add pagination elements

    const prevPageBtn = document.getElementById('prev-page');

    const nextPageBtn = document.getElementById('next-page');

    const currentPageSpan = document.getElementById('current-page');

    const totalPagesSpan = document.getElementById('total-pages');



    // Add pagination event listeners

    prevPageBtn.addEventListener('click', () => {

        if (currentPage > 1) {

            currentPage--;

            filterNotes();

        }

    });



    nextPageBtn.addEventListener('click', () => {

        const totalPages = Math.ceil(notes.length / NOTES_PER_PAGE);

        if (currentPage < totalPages) {

            currentPage++;

            filterNotes();

        }

    });



    // Add this to your DOMContentLoaded event listener

    document.getElementById('current-year').textContent = new Date().getFullYear();



    // Add view note function

    window.viewNote = (id) => {

        const note = notes.find(n => n.id === id);

        if (!note) return;



        const category = categories.find(cat => cat.id === note.category);

        

        viewNoteTitle.textContent = note.title;

        viewNoteCategory.textContent = note.category;

        viewNoteCategory.style.backgroundColor = category ? category.color : '#dfe6e9';

        viewNoteTimestamp.textContent = new Date(note.timestamp).toLocaleString();

        viewNoteBody.innerHTML = note.content;

        

        // Update favorite button

        viewNoteFavorite.innerHTML = `

            <i class="fas ${note.favorited ? 'fa-star' : 'fa-star-o'}"></i>

            ${note.favorited ? 'Unfavorite' : 'Favorite'}

        `;



        // Add event listeners

        viewNoteEdit.onclick = () => {

            viewNoteModal.classList.remove('show');

            editNote(id);

        };



        viewNoteFavorite.onclick = () => {

            toggleFavorite(id);

            viewNote(id); // Refresh view

        };



        viewNoteDelete.onclick = () => {

            if (confirm('Are you sure you want to delete this note?')) {

                deleteNote(id);

                viewNoteModal.classList.remove('show');

            }

        };



        viewNoteModal.classList.add('show');

    };



    // Add close handler

    viewNoteClose.addEventListener('click', () => {

        viewNoteModal.classList.remove('show');

    });



    // Add escape key handler

    document.addEventListener('keydown', (e) => {

        if (e.key === 'Escape' && viewNoteModal.classList.contains('show')) {

            viewNoteModal.classList.remove('show');

        }

    });



    // Check for updates

    checkForUpdates();



    // Replace the existing install app related code with this updated version:

    let deferredPrompt;

    let installButton = null; // Track the install button element



    function showInstallButton() {

        // Only create and show button if it doesn't already exist

        if (!installButton && !document.querySelector('.install-button')) {

            installButton = document.createElement('button');

            installButton.innerHTML = '<i class="fas fa-download"></i> Install App';

            installButton.className = 'install-button';

            installButton.onclick = installApp;

            

            // Add to navbar

            document.querySelector('.nav-links').appendChild(installButton);

        }

    }



    async function installApp() {

        if (!deferredPrompt) return;

        

        // Show the install prompt

        deferredPrompt.prompt();

        

        // Wait for the user to respond to the prompt

        const { outcome } = await deferredPrompt.userChoice;

        

        // Remove the install button regardless of outcome

        if (installButton) {

            installButton.remove();

            installButton = null;

        }

        

        // Clear the deferredPrompt

        deferredPrompt = null;

        

        if (outcome === 'accepted') {

            showNotification('App installed successfully!', 'success');

        }

    }



    window.addEventListener('beforeinstallprompt', (e) => {

        // Prevent Chrome 67 and earlier from automatically showing the prompt

        e.preventDefault();

        // Stash the event so it can be triggered later

        deferredPrompt = e;

        // Show install button

        showInstallButton();

    });



    // Add this new event listener to handle when the app is successfully installed

    window.addEventListener('appinstalled', (e) => {

        // Remove the install button if it exists

        if (installButton) {

            installButton.remove();

            installButton = null;

        }

        deferredPrompt = null;

    });



    // Modify the service worker registration

    navigator.serviceWorker.register('service-worker.js').then(registration => {

        // Check for updates in the background

        registration.addEventListener('updatefound', () => {

            const newWorker = registration.installing;

            

            newWorker.addEventListener('statechange', () => {

                // When the service worker is installed, activate it immediately

                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {

                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });

                }

            });

        });

        

        // Reload the page when the new service worker takes over

        let refreshing = false;

        navigator.serviceWorker.addEventListener('controllerchange', () => {

            if (!refreshing) {

                refreshing = true;

                window.location.reload();

            }

        });

    }).catch(error => {

        console.error('Service worker registration failed:', error);

    });



    // Add these new functions to handle update preferences

    window.hideUpdateUntilNext = (version) => {

        const hiddenUpdates = JSON.parse(localStorage.getItem('hiddenUpdates') || '{}');

        hiddenUpdates[version] = 'next';

        localStorage.setItem('hiddenUpdates', JSON.stringify(hiddenUpdates));

        document.querySelector('.update-notification').remove();

        showNotification('Update notification hidden until next version', 'success');

    };



    window.hideUpdateTemporarily = (version, days) => {

        const hiddenUpdates = JSON.parse(localStorage.getItem('hiddenUpdates') || '{}');

        const hideUntil = new Date();

        hideUntil.setDate(hideUntil.getDate() + days);

        hiddenUpdates[version] = hideUntil.toISOString();

        localStorage.setItem('hiddenUpdates', JSON.stringify(hiddenUpdates));

        document.querySelector('.update-notification').remove();

        showNotification(`Update notification hidden for ${days} days`, 'success');

    };



    window.neverShowUpdate = (version) => {

        const hiddenUpdates = JSON.parse(localStorage.getItem('hiddenUpdates') || '{}');

        hiddenUpdates[version] = 'never';

        localStorage.setItem('hiddenUpdates', JSON.stringify(hiddenUpdates));

        document.querySelector('.update-notification').remove();

        showNotification('Update notification will not be shown again', 'success');

    };

});
