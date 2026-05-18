export function errorHandler(err, _req, res, _next) {
    const message = process.env.NODE_ENV !== 'production' && err instanceof Error
        ? err.message
        : 'Internal server error';
    res.status(500).json({ error: message });
}
