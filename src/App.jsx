import React, { useState, useEffect } from 'react';
import { Search, X, Play, Info, Download, Star } from 'lucide-react';
import { stremioService } from './services/stremio';
import './index.css';

function App() {
    const [mediaType, setMediaType] = useState('movie');
    const [items, setItems] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [showPlayer, setShowPlayer] = useState(false);
    const [streams, setStreams] = useState([]);
    const [showStreams, setShowStreams] = useState(false);
    const [loadingStreams, setLoadingStreams] = useState(false);

    // Series selection
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [selectedEpisode, setSelectedEpisode] = useState(1);

    useEffect(() => {
        loadTrending(mediaType);
    }, [mediaType]);

    const loadTrending = async (type) => {
        setLoading(true);
        const data = await stremioService.getTrending(type);
        setItems(data);
        setLoading(false);
    };

    const handleSearch = async (e) => {
        const q = e.target.value;
        setSearchQuery(q);
        if (q.length > 2) {
            const results = await stremioService.search(q, mediaType);
            setItems(results);
        } else if (q.length === 0) {
            loadTrending(mediaType);
        }
    };

    const openDetails = async (item) => {
        // We pass mediaType so getMeta can use it for Anime checking
        const metaType = mediaType === 'anime' ? 'anime' : item.type;
        const meta = await stremioService.getMeta(metaType, item.id);

        const detailedItem = meta || item;
        setSelectedItem(detailedItem);
        setShowPlayer(false);
        setShowStreams(false);
        setStreams([]);

        if (detailedItem.type === 'series' || mediaType === 'anime') {
            setSelectedSeason(1);
            setSelectedEpisode(1);
        }
    };

    const getPlayerUrl = () => {
        if (!selectedItem) return '';
        // Use imdb_id if available (essential for anime from Kitsu)
        const targetId = selectedItem.imdb_id || selectedItem.id;
        const type = selectedItem.type === 'movie' ? 'movie' : 'series';

        return type === 'movie'
            ? `https://vidsrc.xyz/embed/movie?imdb=${targetId}`
            : `https://vidsrc.xyz/embed/tv?imdb=${targetId}&season=${selectedSeason}&episode=${selectedEpisode}`;
    };

    const handleGetStreams = async () => {
        setLoadingStreams(true);
        setShowStreams(true);
        const targetId = selectedItem.imdb_id || selectedItem.id;
        const type = selectedItem.type === 'movie' ? 'movie' : 'series';

        const data = await stremioService.getStreams(type, targetId, selectedSeason, selectedEpisode);
        setStreams(data);
        setLoadingStreams(false);
    };

    // Extract seasons from video list if available
    const availableSeasons = selectedItem?.videos
        ? [...new Set(selectedItem.videos.map(v => v.season))].sort((a, b) => a - b)
        : [];

    const currentSeasonEpisodes = selectedItem?.videos
        ? selectedItem.videos.filter(v => v.season === Number(selectedSeason)).sort((a, b) => a.episode - b.episode)
        : [];

    return (
        <div className="app-container">
            <header className="header">
                <h1 className="logo">LeoFlix</h1>
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
            </header>

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

            {loading ? (
                <div style={{ textAlign: 'center', opacity: 0.5 }}>Buscando conteúdo...</div>
            ) : (
                <div className="movie-grid">
                    {items.map((item) => (
                        <div key={item.id} className="movie-card" onClick={() => openDetails(item)}>
                            <img
                                src={item.poster}
                                alt={item.name}
                                className="poster"
                                loading="lazy"
                                onError={(e) => { e.target.src = 'https://placehold.co/300x450/111/fff?text=Sem+Capa'; }}
                            />
                            <div className="movie-overlay">
                                <div className="movie-title">{item.name}</div>
                                <div className="movie-year">
                                    {item.releaseInfo || item.year}
                                    {item.imdbRating && (
                                        <span className="rating">
                                            <Star size={12} fill="gold" color="gold" /> {item.imdbRating}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedItem && (
                <div className="modal-backdrop" onClick={() => setSelectedItem(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <button className="close-modal" onClick={() => setSelectedItem(null)}>
                            <X size={24} />
                        </button>

                        {showPlayer ? (
                            <div className="player-container">
                                <iframe
                                    src={getPlayerUrl()}
                                    className="player-iframe"
                                    allowFullScreen
                                    title="Video Player"
                                />
                            </div>
                        ) : (
                            <div className="modal-details">
                                <img src={selectedItem.poster} className="modal-poster" alt="" />
                                <div className="modal-info">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                        <h2 className="modal-title" style={{ marginBottom: 0 }}>{selectedItem.name}</h2>
                                        {selectedItem.imdbRating && (
                                            <span className="rating modal-rating">
                                                <Star size={18} fill="gold" color="gold" /> {selectedItem.imdbRating}
                                            </span>
                                        )}
                                    </div>
                                    <p className="modal-description">
                                        {selectedItem.description}
                                    </p>

                                    {(selectedItem.type === 'series' || mediaType === 'anime') && (
                                        <div className="seasons-episodes-container">
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
                                                                        // Automaticamente seleciona o primeiro episódio da temporada
                                                                        const eps = selectedItem.videos.filter(v => v.season === season).sort((a, b) => a.episode - b.episode);
                                                                        if (eps.length > 0) setSelectedEpisode(eps[0].episode);
                                                                    }}
                                                                >
                                                                    {season}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {currentSeasonEpisodes.length > 0 && (
                                                        <div className="selection-group mt-3">
                                                            <label>Episódios</label>
                                                            <div className="pill-container episodes-grid">
                                                                {currentSeasonEpisodes.map(ep => (
                                                                    <button
                                                                        key={ep.id}
                                                                        className={`pill-btn episode-btn ${Number(selectedEpisode) === ep.episode ? 'active' : ''}`}
                                                                        onClick={() => setSelectedEpisode(ep.episode)}
                                                                        title={ep.title || `Episódio ${ep.episode}`}
                                                                    >
                                                                        {ep.episode}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
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

                                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
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
                                            <Download size={20} /> BAIXAR TORRENT
                                        </button>
                                    </div>

                                    {showStreams && (
                                        <div className="streams-container">
                                            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Links de Torrent</h3>
                                            {loadingStreams ? (
                                                <div style={{ opacity: 0.7 }}>Buscando torrents...</div>
                                            ) : streams.length > 0 ? (
                                                <div className="streams-list">
                                                    {streams.map((stream, idx) => (
                                                        <a key={idx} href={stream.url || `magnet:?xt=urn:btih:${stream.infoHash}`} className="stream-item">
                                                            <div className="stream-name">{stream.name}</div>
                                                            <div className="stream-title">{stream.title}</div>
                                                        </a>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div style={{ opacity: 0.7 }}>Nenhum torrent encontrado.</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
