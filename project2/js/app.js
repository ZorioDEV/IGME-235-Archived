const state = {
    currentPage: 1,
    lastPage: 1,
    searchQuery: '',
    typeFilter: '',
    genreFilter: '',
    sortBy: 'members',
    sortOrder: 'desc',
    favorites: JSON.parse(localStorage.getItem('animeFavorites')) || [],
    isDefaultView: true
};

const elements = {
    homeBtn: document.getElementById('home-btn'),
    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    typeFilter: document.getElementById('type-filter'),
    genreFilter: document.getElementById('genre-filter'),
    sortBy: document.getElementById('sort-by'),
    sortOrder: document.getElementById('sort-order'),
    resultsGrid: document.getElementById('results-grid'),
    resultsTitle: document.getElementById('results-title'),
    resultsCount: document.getElementById('results-count'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    pageInfo: document.getElementById('page-info'),
    spinner: document.getElementById('spinner'),
    favoritesList: document.getElementById('favorites-list'),
    clearFavorites: document.getElementById('clear-favorites'),
    detailsModal: document.getElementById('details-modal'),
    modalBody: document.getElementById('modal-body'),
    closeModal: document.getElementById('close-modal')
};

const API_BASE = 'https://api.jikan.moe/v4/anime';

function init() {
    const savedState = JSON.parse(localStorage.getItem('animeAppState')) || {};
    
    const lastSearch = localStorage.getItem('lastAnimeSearch');
    if (lastSearch) {
        elements.searchInput.value = lastSearch;
        state.searchQuery = lastSearch;
    }
    
    const lastFilters = JSON.parse(localStorage.getItem('lastAnimeFilters')) || {};
    if (lastFilters.type) {
        elements.typeFilter.value = lastFilters.type;
        state.typeFilter = lastFilters.type;
    }
    if (lastFilters.genre) {
        elements.genreFilter.value = lastFilters.genre;
        state.genreFilter = lastFilters.genre;
    }
    if (lastFilters.sortBy) {
        elements.sortBy.value = lastFilters.sortBy;
        state.sortBy = lastFilters.sortBy;
    }
    if (lastFilters.sortOrder) {
        elements.sortOrder.value = lastFilters.sortOrder;
        state.sortOrder = lastFilters.sortOrder;
    }
    
    if (savedState.currentPage) {
        state.currentPage = savedState.currentPage;
    }
    if (savedState.isDefaultView !== undefined) {
        state.isDefaultView = savedState.isDefaultView;
    }
    
    if (state.searchQuery && !state.isDefaultView) {
        searchAnime();
    } else {
        loadPopularAnime();
    }
    
    updateFavoritesDisplay();
    setupEventListeners();
}

function setupEventListeners() {
    elements.homeBtn.addEventListener('click', loadDefaultView);
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    
    elements.typeFilter.addEventListener('change', handleFilterChange);
    elements.genreFilter.addEventListener('change', handleFilterChange);
    elements.sortBy.addEventListener('change', handleFilterChange);
    elements.sortOrder.addEventListener('change', handleFilterChange);
    
    elements.prevBtn.addEventListener('click', goToPreviousPage);
    elements.nextBtn.addEventListener('click', goToNextPage);
    
    elements.clearFavorites.addEventListener('click', clearAllFavorites);
    
    elements.closeModal.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === elements.detailsModal) {
            closeModal();
        }
    });
}

function saveAppState() {
    const appState = {
        currentPage: state.currentPage,
        isDefaultView: state.isDefaultView
    };
    localStorage.setItem('animeAppState', JSON.stringify(appState));
}

function loadDefaultView() {
    state.searchQuery = '';
    state.currentPage = 1;
    state.isDefaultView = true;
    elements.searchInput.value = '';
    
    saveAppState();
    loadPopularAnime();
}

function handleSearch() {
    const query = elements.searchInput.value.trim();
    
    if (!query) {
        return;
    }
    
    state.searchQuery = query;
    state.currentPage = 1;
    state.isDefaultView = false;
    
    localStorage.setItem('lastAnimeSearch', query);
    saveAppState();
    searchAnime();
}

function handleFilterChange() {
    state.typeFilter = elements.typeFilter.value;
    state.genreFilter = elements.genreFilter.value;
    state.sortBy = elements.sortBy.value;
    state.sortOrder = elements.sortOrder.value;
    state.currentPage = 1;
    
    localStorage.setItem('lastAnimeFilters', JSON.stringify({
        type: state.typeFilter,
        genre: state.genreFilter,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder
    }));
    
    saveAppState();
    
    if (state.searchQuery && !state.isDefaultView) {
        searchAnime();
    } else {
        loadPopularAnime();
    }
}

async function searchAnime() {
    showLoading();
    
    const params = new URLSearchParams({
        q: state.searchQuery,
        page: state.currentPage,
        limit: 25,
        sfw: true
    });
    
    if (state.typeFilter) params.append('type', state.typeFilter);
    if (state.genreFilter) params.append('genres', state.genreFilter);
    if (state.sortBy) params.append('order_by', state.sortBy);
    if (state.sortOrder) params.append('sort', state.sortOrder);
    
    const response = await fetch(`${API_BASE}?${params}`);
    const data = await response.json();
    
    if (data.pagination && data.pagination.last_visible_page) {
        state.lastPage = data.pagination.last_visible_page;
    } else {
        state.lastPage = 1;
    }
    
    if (data.data && data.data.length > 0) {
        updateResultsDisplay(data.data);
        updatePagination();
        updateResultsTitle(`Results for "${state.searchQuery}"`);
        const totalItems = data.pagination?.items?.total || data.data.length;
        updateResultsCount(data.data.length, totalItems);
    } else {
        updateResultsDisplay([]);
    }
    
    hideLoading();
}

async function loadPopularAnime() {
    showLoading();
    
    const params = new URLSearchParams({
        page: state.currentPage,
        limit: 25,
        order_by: state.sortBy,
        sort: state.sortOrder,
        sfw: true
    });
    
    if (state.typeFilter) params.append('type', state.typeFilter);
    if (state.genreFilter) params.append('genres', state.genreFilter);
    
    const response = await fetch(`${API_BASE}?${params}`);
    const data = await response.json();
    
    if (data.pagination && data.pagination.last_visible_page) {
        state.lastPage = data.pagination.last_visible_page;
    } else {
        state.lastPage = 1;
    }
    
    if (data.data && data.data.length > 0) {
        updateResultsDisplay(data.data);
        updatePagination();
        updateResultsTitle('Popular Anime');
        const totalItems = data.pagination?.items?.total || data.data.length;
        updateResultsCount(data.data.length, totalItems);
    } else {
        updateResultsDisplay([]);
    }
    
    hideLoading();
}

function updateResultsDisplay(animeList) {
    elements.resultsGrid.innerHTML = '';
    
    if (animeList.length === 0) {
        return;
    }
    
    animeList.forEach(anime => {
        const animeCard = createAnimeCard(anime);
        elements.resultsGrid.appendChild(animeCard);
    });
}

function createAnimeCard(anime) {
    const card = document.createElement('div');
    card.className = 'anime-card';
    
    const isFavorite = state.favorites.some(fav => fav.id === anime.mal_id);
    
    const imageUrl = anime.images?.jpg?.image_url || '';
    const title = anime.title || 'No title';
    const type = anime.type || 'Unknown';
    const episodes = anime.episodes || '?';
    const score = anime.score || 'N/A';
    const year = anime.aired?.prop?.from?.year || 'Unknown';
    
    card.innerHTML = `
        <img src="${imageUrl}" alt="${title}" class="anime-image">
        <div class="anime-info">
            <div class="anime-title">${title}</div>
            <div class="anime-details">
                ${type} • ${episodes} eps • ${year}
            </div>
            <div class="anime-score">
                <div class="score">${score}</div>
            </div>
            <div class="anime-actions">
                <button class="details-btn" data-id="${anime.mal_id}">Details</button>
                <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-id="${anime.mal_id}">
                    ${isFavorite ? '♥' : '♡'}
                </button>
            </div>
        </div>
    `;
    
    const favBtn = card.querySelector('.favorite-btn');
    favBtn.addEventListener('click', () => toggleFavorite(anime, favBtn));
    
    const detailsBtn = card.querySelector('.details-btn');
    detailsBtn.addEventListener('click', () => showAnimeDetails(anime.mal_id));
    
    return card;
}

function toggleFavorite(anime, button) {
    const isCurrentlyFavorite = state.favorites.some(fav => fav.id === anime.mal_id);
    
    if (isCurrentlyFavorite) {
        state.favorites = state.favorites.filter(fav => fav.id !== anime.mal_id);
        button.classList.remove('active');
        button.innerHTML = '♡';
    } else {
        const favItem = {
            id: anime.mal_id,
            title: anime.title,
            image: anime.images?.jpg?.image_url || '',
            type: anime.type,
            score: anime.score
        };
        state.favorites.push(favItem);
        button.classList.add('active');
        button.innerHTML = '♥';
    }
    
    localStorage.setItem('animeFavorites', JSON.stringify(state.favorites));
    updateFavoritesDisplay();
}

function updateFavoritesDisplay() {
    elements.favoritesList.innerHTML = '';
    
    if (state.favorites.length === 0) {
        return;
    }
    
    state.favorites.forEach(anime => {
        const favoriteItem = document.createElement('div');
        favoriteItem.className = 'favorite-item';
        favoriteItem.innerHTML = `
            <img src="${anime.image}" alt="${anime.title}">
            <div class="favorite-info">
                <div class="favorite-title">${anime.title}</div>
                <div class="favorite-meta">${anime.type} • Score: ${anime.score || 'N/A'}</div>
            </div>
            <button class="remove-favorite" data-id="${anime.id}">×</button>
        `;
        
        elements.favoritesList.appendChild(favoriteItem);
        
        const removeBtn = favoriteItem.querySelector('.remove-favorite');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFavorite(anime.id);
        });
        
        favoriteItem.addEventListener('click', () => {
            elements.searchInput.value = anime.title;
            handleSearch();
        });
    });
}

function removeFavorite(id) {
    state.favorites = state.favorites.filter(fav => fav.id !== id);
    localStorage.setItem('animeFavorites', JSON.stringify(state.favorites));
    updateFavoritesDisplay();
    
    const favButtons = document.querySelectorAll(`.favorite-btn[data-id="${id}"]`);
    favButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.innerHTML = '♡';
    });
}

function clearAllFavorites() {
    if (state.favorites.length === 0) return;
    
    if (confirm('Are you sure you want to clear all favorites?')) {
        state.favorites = [];
        localStorage.setItem('animeFavorites', JSON.stringify(state.favorites));
        updateFavoritesDisplay();
        
        const favButtons = document.querySelectorAll('.favorite-btn.active');
        favButtons.forEach(btn => {
            btn.classList.remove('active');
            btn.innerHTML = '♡';
        });
    }
}

async function showAnimeDetails(animeId) {
    openModal();
    
    const response = await fetch(`${API_BASE}/${animeId}/full`);
    const data = await response.json();
    const anime = data.data;
    
    renderAnimeDetails(anime);
}

function renderAnimeDetails(anime) {
    const imageUrl = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '';
    const title = anime.title || 'No title';
    const type = anime.type || 'Unknown';
    const episodes = anime.episodes || 'Unknown';
    const status = anime.status || 'Unknown';
    const score = anime.score || 'N/A';
    const scoredBy = anime.scored_by || 'N/A';
    const rank = anime.rank || 'N/A';
    const popularity = anime.popularity || 'N/A';
    const year = anime.aired?.prop?.from?.year || 'Unknown';
    const synopsis = anime.synopsis || 'No synopsis available.';
    const genres = anime.genres || [];
    const studios = anime.studios || [];
    
    elements.modalBody.innerHTML = `
        <img src="${imageUrl}" alt="${title}" class="modal-poster">
        <div class="modal-details">
            <h2 class="modal-title">${title}</h2>
            <div class="modal-meta">
                ${type} • ${episodes} episodes • ${status} • ${year}
            </div>
            <div class="modal-stats">
                <p><strong>Score:</strong> ${score} (by ${scoredBy} users)</p>
                <p><strong>Rank:</strong> #${rank} • <strong>Popularity:</strong> #${popularity}</p>
            </div>
            <div class="modal-genres">
                ${genres.map(genre => `<span class="genre-tag">${genre.name}</span>`).join('')}
            </div>
            <div class="modal-studios">
                <p><strong>Studios:</strong> ${studios.map(studio => studio.name).join(', ') || 'Unknown'}</p>
            </div>
            <div class="modal-synopsis">
                <h3>Synopsis</h3>
                <p>${synopsis}</p>
            </div>
        </div>
    `;
}

function openModal() {
    elements.detailsModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    elements.detailsModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function updatePagination() {
    elements.prevBtn.disabled = state.currentPage <= 1;
    elements.nextBtn.disabled = state.currentPage >= state.lastPage;
    elements.pageInfo.textContent = `Page ${state.currentPage} of ${state.lastPage}`;
}

function goToPreviousPage() {
    if (state.currentPage > 1) {
        state.currentPage--;
        saveAppState();
        if (state.searchQuery && !state.isDefaultView) {
            searchAnime();
        } else {
            loadPopularAnime();
        }
    }
}

function goToNextPage() {
    if (state.currentPage < state.lastPage) {
        state.currentPage++;
        saveAppState();
        if (state.searchQuery && !state.isDefaultView) {
            searchAnime();
        } else {
            loadPopularAnime();
        }
    }
}

function updateResultsTitle(title) {
    elements.resultsTitle.textContent = title;
}

function updateResultsCount(current, total) {
    if (total) {
        elements.resultsCount.textContent = `Showing ${current} of ${total} results`;
    } else {
        elements.resultsCount.textContent = `Showing ${current} results`;
    }
}

function showLoading() {
    elements.spinner.classList.add('active');
}

function hideLoading() {
    elements.spinner.classList.remove('active');
}

document.addEventListener('DOMContentLoaded', init);