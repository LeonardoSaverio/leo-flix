import axios from 'axios';

const CINEMETA_URL = 'https://v3-cinemeta.strem.io';
const KITSU_URL = 'https://anime-kitsu.strem.fun';

export const stremioService = {
    async getTrending(type = 'movie', genre = null, language = 'pt-BR') {
        try {
            const baseUrl = type === 'anime' ? KITSU_URL : CINEMETA_URL;
            let path = type === 'anime' ? '/catalog/anime/kitsu-anime-trending.json' : `/catalog/${type}/top.json`;

            // Note: Cinemeta doesn't reliably support localized catalogs via this endpoint, 
            // but some metadata remains accessible.
            if (genre && type !== 'anime') {
                path = `/catalog/${type}/top/genre=${encodeURIComponent(genre)}.json`;
            }

            const response = await axios.get(`${baseUrl}${path}`);
            return response.data.metas || [];
        } catch (error) {
            console.error('Error fetching trending:', error);
            return [];
        }
    },

    async search(query, type = 'movie', language = 'pt-BR') {
        try {
            const baseUrl = type === 'anime' ? KITSU_URL : CINEMETA_URL;
            const path = type === 'anime'
                ? `/catalog/anime/kitsu-anime-list/search=${encodeURIComponent(query)}.json`
                : `/catalog/${type}/top/search=${encodeURIComponent(query)}.json`;
            const response = await axios.get(`${baseUrl}${path}`);
            return response.data.metas || [];
        } catch (error) {
            console.error('Error searching:', error);
            return [];
        }
    },

    async getMeta(type, id, language = 'pt-BR') {
        try {
            const isKitsu = type === 'anime' || (id && id.toString().startsWith('kitsu:'));
            const baseUrl = isKitsu ? KITSU_URL : CINEMETA_URL;
            const typePath = isKitsu ? 'anime' : type;

            // Try to use localized metadata if available in the future.
            // For now, we fetch the main meta.
            const response = await axios.get(`${baseUrl}/meta/${typePath}/${id}.json`);
            return response.data.meta;
        } catch (error) {
            console.error('Error fetching meta:', error);
            return null;
        }
    },

    async getStreams(type, imdbId, season, episode) {
        try {
            // Torrentio URL format:
            // movie: /stream/movie/tt12345.json
            // series: /stream/series/tt12345:1:2.json
            let id = imdbId;
            if (type === 'series') {
                id = `${imdbId}:${season}:${episode}`;
            }

            const response = await axios.get(`https://torrentio.strem.fun/stream/${type}/${id}.json`);
            return response.data.streams || [];
        } catch (error) {
            console.error('Error fetching streams:', error);
            return [];
        }
    }
};

