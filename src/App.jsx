import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Play, Info, Download, Star, ChevronDown } from 'lucide-react';
import { stremioService } from './services/stremio';
import './index.css';

function App() {
    const [mediaType, setMediaType] = useState('movie');
    const [items, setItems] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [showPlayer, setShowPlayer] = useState(false);
    const [selectedServer, setSelectedServer] = useState('superflix_ptbr');
    const [streams, setStreams] = useState([]);
    const [showStreams, setShowStreams] = useState(false);
    const [loadingStreams, setLoadingStreams] = useState(false);
    const [selectedGenre, setSelectedGenre] = useState('');
    const [sortBy, setSortBy] = useState('trending');
    const [requestId, setRequestId] = useState(0);
    const [autoNext, setAutoNext] = useState(true);
    const [view, setView] = useState('home'); // 'home' | 'details'
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [language, setLanguage] = useState('pt-BR'); // 'pt-BR' | 'en'
    const observer = useRef();

    const genres = [
        { id: '', name: 'Todos os Gêneros' },
        { id: 'Action', name: 'Ação' },
        { id: 'Adventure', name: 'Aventura' },
        { id: 'Animation', name: 'Animação' },
        { id: 'Comedy', name: 'Comédia' },
        { id: 'Crime', name: 'Crime' },
        { id: 'Documentary', name: 'Documentário' },
        { id: 'Drama', name: 'Drama' },
        { id: 'Family', name: 'Família' },
        { id: 'Fantasy', name: 'Fantasia' },
        { id: 'History', name: 'História' },
        { id: 'Horror', name: 'Terror' },
        { id: 'Music', name: 'Música' },
        { id: 'Mystery', name: 'Mistério' },
        { id: 'Romance', name: 'Romance' },
        { id: 'Sci-Fi', name: 'Ficção Científica' },
        { id: 'Thriller', name: 'Suspense' },
        { id: 'War', name: 'Guerra' },
        { id: 'Western', name: 'Faroeste' }
    ];

    // Series selection
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [selectedEpisode, setSelectedEpisode] = useState(1);

    useEffect(() => {
        // Reset genre and page when changing media type
        setSelectedGenre('');
        setSearchQuery('');
        setPage(0);
        setItems([]);
        loadData(mediaType, '', 'trending', 0);
    }, [mediaType, language]);

    useEffect(() => {
        if (searchQuery.length === 0) {
            setPage(0);
            setItems([]);
            loadData(mediaType, selectedGenre, sortBy, 0);
        }
    }, [selectedGenre, sortBy, language]);

    useEffect(() => {
        if (page > 0 && searchQuery.length === 0) {
            loadData(mediaType, selectedGenre, sortBy, page);
        }
    }, [page]);

    const loadData = async (type, genre, sort, currentPage = 0) => {
        if (currentPage === 0) {
            setLoading(true);
            setItems([]);
        }

        const currentRequestId = requestId + 1;
        setRequestId(currentRequestId);

        const data = await stremioService.getTrending(type, genre, language);
        let sortedData = [...data];

        if (sort === 'rating') {
            sortedData.sort((a, b) => (parseFloat(b.imdbRating) || 0) - (parseFloat(a.imdbRating) || 0));
        } else if (sort === 'year') {
            sortedData.sort((a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0));
        }

        // Simulate pagination from the large static list
        const itemsPerPage = 20;
        const startIndex = 0; // Intersection observer handles logic
        const endIndex = (currentPage + 1) * itemsPerPage;
        const paginatedData = sortedData.slice(0, endIndex);

        setRequestId(prev => {
            if (currentRequestId >= prev) {
                setItems(paginatedData);
                setHasMore(paginatedData.length < sortedData.length);
                setLoading(false);
            }
            return prev;
        });
    };

    const lastItemElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && searchQuery.length === 0) {
                setPage(prevPage => prevPage + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore, searchQuery]);



    const handleSearch = async (e) => {
        const q = e.target.value;
        setSearchQuery(q);

        const currentRequestId = requestId + 1;
        setRequestId(currentRequestId);

        if (q.length > 1) {
            setLoading(true);
            const results = await stremioService.search(q, mediaType, language);

            setRequestId(prev => {
                if (currentRequestId >= prev) {
                    setItems(results);
                    setLoading(false);
                }
                return prev;
            });
        } else if (q.length === 0) {
            setPage(0);
            loadData(mediaType, selectedGenre, sortBy, 0);
        }
    };

    const openDetails = async (item) => {
        // We pass mediaType so getMeta can use it for Anime checking
        const metaType = mediaType === 'anime' ? 'anime' : item.type;
        const meta = await stremioService.getMeta(metaType, item.id, language);

        const detailedItem = meta || item;
        setSelectedItem(detailedItem);
        setShowPlayer(false);
        setShowStreams(false);
        setStreams([]);
        setView('details');
        window.scrollTo(0, 0);

        if (detailedItem.type === 'series' || mediaType === 'anime') {
            setSelectedSeason(1);
            setSelectedEpisode(1);
            // Don't auto-start first episode of series on open, let user choose
        } else {
            // For movies, we can auto-start if user clicks "Watch" in home, 
            // but here we just open the details.
        }
    };

    const handleEpisodeClick = (epNumber) => {
        setSelectedEpisode(epNumber);
        setShowPlayer(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleBack = () => {
        setView('home');
        setSelectedItem(null);
        setShowPlayer(false);
    };

    const getPlayerUrl = () => {
        if (!selectedItem) return '';
        const targetId = selectedItem.imdb_id || selectedItem.id;
        const type = selectedItem.type === 'movie' ? 'movie' : 'series';

        switch (selectedServer) {
            case 'superflix_ptbr':
                return type === 'movie'
                    ? `https://superflixapi.rest/filme/${targetId}`
                    : `https://superflixapi.rest/serie/${targetId}/${selectedSeason}/${selectedEpisode}`;
            case 'vidsrc':
            default:
                return type === 'movie'
                    ? `https://vidsrc.xyz/embed/movie?imdb=${targetId}`
                    : `https://vidsrc.xyz/embed/tv?imdb=${targetId}&season=${selectedSeason}&episode=${selectedEpisode}`;
        }
    };

    const handleGetStreams = async () => {
        setLoadingStreams(true);
        setShowStreams(true);
        const targetId = selectedItem.imdb_id || selectedItem.id;
        const type = selectedItem.type === 'movie' ? 'movie' : 'series';

        const data = await stremioService.getStreams(type, targetId, selectedSeason, selectedEpisode);

        // Sorting torrents to prioritize PT-BR
        const sortedStreams = [...data].sort((a, b) => {
            const ptPatterns = [/dublado/i, /pt[- ]?br/i, /dual/i, /portuguese/i, /purtugues/i];
            const aIsPt = ptPatterns.some(p => p.test(a.name) || p.test(a.title));
            const bIsPt = ptPatterns.some(p => p.test(b.name) || p.test(b.title));

            if (aIsPt && !bIsPt) return -1;
            if (!aIsPt && bIsPt) return 1;
            return 0;
        });

        setStreams(sortedStreams);
        setLoadingStreams(false);
    };

    const handleNextEpisode = () => {
        if (!selectedItem || !selectedItem.videos) return;
        const currentIndex = selectedItem.videos.findIndex(v => v.season === Number(selectedSeason) && v.episode === Number(selectedEpisode));
        const nextVideo = selectedItem.videos[currentIndex + 1];

        if (nextVideo) {
            setSelectedSeason(nextVideo.season);
            setSelectedEpisode(nextVideo.episode);
            // Re-trigger player
            setShowPlayer(false);
            setTimeout(() => setShowPlayer(true), 10);
        }
    };

    // Extract seasons from video list if available
    const availableSeasons = selectedItem?.videos
        ? [...new Set(selectedItem.videos.map(v => v.season))].sort((a, b) => a - b)
        : [];

    const currentSeasonEpisodes = selectedItem?.videos
        ? selectedItem.videos.filter(v => v.season === Number(selectedSeason)).sort((a, b) => a.episode - b.episode)
        : [];

    const renderHome = () => (
        <>
            <header className="header">
                <h1 className="logo" onClick={() => handleBack()}>LeoFlix</h1>
                <div className="nav-links">
                    <button
                        className={`nav-btn ${mediaType === 'movie' ? 'active' : ''}`}
                        onClick={() => setMediaType('movie')}
                    >
                        Filmes
                    </button>
                    <button
                        className={`nav-btn ${mediaType === 'series' ? 'active' : ''}`}
                        onClick={() => setMediaType('series')}
                    >
                        Séries
                    </button>
                    <button
                        className={`nav-btn ${mediaType === 'anime' ? 'active' : ''}`}
                        onClick={() => setMediaType('anime')}
                    >
                        Animes
                    </button>
                </div>
                <div className="lang-toggle">
                    <button
                        className={`lang-btn ${language === 'pt-BR' ? 'active' : ''}`}
                        onClick={() => setLanguage('pt-BR')}
                    >
                        PT
                    </button>
                    <button
                        className={`lang-btn ${language === 'en' ? 'active' : ''}`}
                        onClick={() => setLanguage('en')}
                    >
                        EN
                    </button>
                </div>
            </header>

            <div className="search-row">
                <div className="search-container">
                    <Search className="search-icon" size={20} />
                    <input
                        type="text"
                        className="search-input"
                        placeholder={`Pesquisar ${mediaType === 'movie' ? 'filmes' : mediaType === 'series' ? 'séries' : 'animes'}...`}
                        value={searchQuery}
                        onChange={handleSearch}
                    />
                </div>

                {mediaType !== 'anime' && searchQuery.length === 0 && (
                    <div className="filters-container">
                        <select
                            className="filter-select"
                            value={selectedGenre}
                            onChange={(e) => setSelectedGenre(e.target.value)}
                        >
                            {genres.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>

                        <select
                            className="filter-select"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="trending">Destaques</option>
                            <option value="rating">Melhores Notas</option>
                            <option value="year">Lançamentos</option>
                        </select>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="skeleton-grid">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="skeleton-card"></div>
                    ))}
                </div>
            ) : (
                <div className="movie-grid">
                    {items.map((item, index) => {
                        const isLast = items.length === index + 1;
                        return (
                            <div
                                ref={isLast ? lastItemElementRef : null}
                                key={item.id}
                                className="movie-card"
                                onClick={() => openDetails(item)}
                            >
                                <img
                                    src={item.poster}
                                    alt={item.name}
                                    className="poster"
                                    loading="lazy"
                                    onError={(e) => { e.target.src = 'https://placehold.co/300x450/111/fff?text=Sem+Capa'; }}
                                />
                                <div className="movie-overlay">
                                    <div className="movie-title">{item.name}</div>
                                    <div className="movie-description-mini">
                                        {item.description}
                                    </div>
                                    <div className="movie-year">
                                        <span>{item.releaseInfo || item.year}</span>
                                        {item.imdbRating && (
                                            <div className="rating">
                                                <Star size={14} fill="#fbbf24" color="#fbbf24" />
                                                <span>{item.imdbRating}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );

    const renderDetails = () => (
        <div className="details-view">
            <button className="back-btn" onClick={handleBack}>
                <X size={24} /> <span>FECHAR</span>
            </button>

            <div className="details-bg-immersive">
                <img src={selectedItem.background} alt="" />
            </div>

            <div className="details-content">
                <div className="details-header-bar">
                    <div className="preference-item">
                        <label>SERVIDOR:</label>
                        <select
                            value={selectedServer}
                            onChange={e => {
                                setSelectedServer(e.target.value);
                                if (showPlayer) {
                                    setShowPlayer(false);
                                    setTimeout(() => setShowPlayer(true), 10);
                                }
                            }}
                            className="server-select"
                        >
                            <option value="superflix_ptbr">SuperFlix VIP (Dublado PT-BR)</option>
                            <option value="vidsrc">VidSrc (Legendado / Original)</option>
                        </select>
                    </div>
                    {(selectedItem.type === 'series' || mediaType === 'anime') && showPlayer && (
                        <div className="player-actions">
                            <button className="nav-btn active" onClick={handleNextEpisode}>
                                PRÓXIMO EPISÓDIO
                            </button>
                        </div>
                    )}
                </div>

                {showPlayer ? (
                    <div className="player-container">
                        <iframe
                            src={getPlayerUrl()}
                            className="player-iframe"
                            allowFullScreen
                            title="Video Player"
                        />
                        <button className="close-player-mobile" onClick={() => setShowPlayer(false)}>
                            <X size={24} />
                        </button>
                    </div>
                ) : (
                    <div className="details-main">
                        <div className="details-sidebar">
                            <img src={selectedItem.poster} className="details-poster" alt="" />
                            <div className="details-actions">
                                <button
                                    onClick={() => { setShowPlayer(true); setShowStreams(false); }}
                                    className="watch-button"
                                >
                                    <Play fill="white" size={20} /> ASSISTIR AGORA
                                </button>
                                <button
                                    onClick={handleGetStreams}
                                    className="torrent-button"
                                >
                                    <Download size={20} /> TORRENT
                                </button>
                            </div>
                        </div>

                        <div className="details-info-col">
                            <div className="details-title-row">
                                <h2 className="details-title">{selectedItem.name}</h2>
                                {selectedItem.imdbRating && (
                                    <div className="rating details-rating">
                                        <Star size={24} fill="#fbbf24" color="#fbbf24" />
                                        <span>{selectedItem.imdbRating}</span>
                                    </div>
                                )}
                            </div>

                            <p className="details-description">{selectedItem.description}</p>

                            {(selectedItem.type === 'series' || mediaType === 'anime') && (
                                <div className="series-controls">
                                    {availableSeasons.length > 0 ? (
                                        <>
                                            <div className="selection-group">
                                                <label>Temporada</label>
                                                <div className="pill-container">
                                                    {availableSeasons.map(season => (
                                                        <button
                                                            key={season}
                                                            className={`pill-btn ${Number(selectedSeason) === season ? 'active' : ''}`}
                                                            onClick={() => {
                                                                setSelectedSeason(season);
                                                                const eps = selectedItem.videos.filter(v => v.season === season).sort((a, b) => a.episode - b.episode);
                                                                if (eps.length > 0) setSelectedEpisode(eps[0].episode);
                                                            }}
                                                        >
                                                            {season}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="selection-group mt-3">
                                                <label>Episódios ({currentSeasonEpisodes.length})</label>
                                                <div className="episodes-rich-list">
                                                    {currentSeasonEpisodes.map(ep => (
                                                        <div
                                                            key={ep.id}
                                                            className={`episode-card ${Number(selectedEpisode) === ep.episode ? 'active' : ''}`}
                                                            onClick={() => handleEpisodeClick(ep.episode)}
                                                        >
                                                            <div className="episode-thumb">
                                                                <img src={ep.thumbnail || selectedItem.background} alt="" />
                                                                <div className="episode-number">{ep.episode}</div>
                                                            </div>
                                                            <div className="episode-info">
                                                                <div className="episode-name">{ep.title || `Episódio ${ep.episode}`}</div>
                                                                <div className="episode-meta">{ep.released?.split('T')[0]}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="legacy-controls">
                                            <div className="legacy-input-group">
                                                <label>Temporada</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={selectedSeason}
                                                    onChange={e => setSelectedSeason(e.target.value)}
                                                    className="legacy-input"
                                                />
                                            </div>
                                            <div className="legacy-input-group">
                                                <label>Episódio</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={selectedEpisode}
                                                    onChange={e => setSelectedEpisode(e.target.value)}
                                                    className="legacy-input"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {showStreams && (
                                <div className="streams-container">
                                    <h3 className="streams-title">Opções de Torrent</h3>
                                    {loadingStreams ? (
                                        <div className="streams-loading">
                                            <div className="spinner"></div>
                                            <span>Buscando melhores fontes...</span>
                                        </div>
                                    ) : streams.length > 0 ? (
                                        <div className="streams-list">
                                            {streams.map((stream, idx) => {
                                                const isPt = /dublado|pt[- ]?br|dual|portuguese/i.test(stream.name) || /dublado|pt[- ]?br|dual|portuguese/i.test(stream.title);
                                                return (
                                                    <a key={idx} href={stream.url || `magnet:?xt=urn:btih:${stream.infoHash}`} className="stream-card">
                                                        <div className="stream-info">
                                                            <div className="stream-name-row">
                                                                <span className="stream-provider">{stream.name.split('\n')[0]}</span>
                                                                {isPt && <span className="pt-badge">PT-BR</span>}
                                                            </div>
                                                            <div className="stream-details">{stream.title.split('\n')[0]}</div>
                                                            <div className="stream-meta">
                                                                {stream.title.split('\n')[1] || 'Torrent Link'}
                                                            </div>
                                                        </div>
                                                        <Download size={20} className="stream-icon" />
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="no-streams">Nenhum torrent encontrado para este episódio.</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="app-container">
            {view === 'home' ? renderHome() : renderDetails()}
        </div>
    );

}

export default App;
