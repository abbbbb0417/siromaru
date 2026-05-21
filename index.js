const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// API routes can be added here later
// app.get('/api/data', (req, res) => { ... });

// Serve static files from the Vite build directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle SPA routing: serve index.html for any unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
