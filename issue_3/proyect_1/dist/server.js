import { createApp } from './app.js';
const PORT = process.env.PORT ?? 3000;
const app = createApp();
app.listen(PORT, () => {
    console.log(`Snap running on http://localhost:${PORT}`);
});
