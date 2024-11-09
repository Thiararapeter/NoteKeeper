document.addEventListener('DOMContentLoaded', async () => {
    const appVersionElement = document.getElementById('app-version');
    const releaseDateElement = document.getElementById('release-date');
    const changelogContent = document.getElementById('changelog-content');

    // Theme toggle functionality
    const themeToggle = document.getElementById('theme-toggle');
    const root = document.documentElement;
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    function updateTheme(theme) {
        root.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        const icon = themeToggle.querySelector('i');
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    updateTheme(savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = root.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        updateTheme(newTheme);
    });

    // Set current year
    document.getElementById('current-year').textContent = new Date().getFullYear();

    try {
        const response = await fetch('version.json');
        const data = await response.json();

        // Update version info
        appVersionElement.textContent = data.version;
        releaseDateElement.textContent = `Released: ${new Date(data.releaseDate).toLocaleDateString()}`;

        // Create changelog entries
        const changelogHTML = data.changelog.map(change => `
            <div class="changelog-entry">
                <i class="fas fa-circle"></i>
                <span>${change}</span>
            </div>
        `).join('');

        changelogContent.innerHTML = changelogHTML;
    } catch (error) {
        console.error('Error loading changelog:', error);
        changelogContent.innerHTML = '<p class="error">Failed to load changelog data.</p>';
    }

    // Mobile menu toggle
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    menuToggle?.addEventListener('click', () => {
        navLinks.classList.toggle('show');
        menuToggle.querySelector('i').classList.toggle('fa-bars');
        menuToggle.querySelector('i').classList.toggle('fa-times');
    });
}); 