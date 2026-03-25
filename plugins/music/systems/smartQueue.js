module.exports = {
    isDuplicate(queue, trackInfo) {
        if (!queue || !trackInfo) return false;
        if (queue.current && (queue.current.info.uri === trackInfo.uri)) return true;
        return queue.tracks.some(t => t.info.uri === trackInfo.uri);
    }
};
