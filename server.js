const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the "Public" directory
app.use(express.static(path.join(__dirname, 'Public')));

// Optional: Send index.html for any unknown routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'index.html'));
});

// Use the port Render provides OR fallback to 3000
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
});
