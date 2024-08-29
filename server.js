const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());
app.use(express.static('public'));

// Endpoint to save session
app.post('/saveSession', (req, res) => {
    const sessionData = req.body;
    const sessionId = `session_${Date.now()}`;
    const filePath = path.join(__dirname, 'sessions', `${sessionId}.json`);

    fs.writeFile(filePath, JSON.stringify(sessionData), (err) => {
        if (err) {
            console.error('Error saving session:', err);
            return res.status(500).send('Error saving session');
        }
        res.json({ sessionId });
    });
});

// Endpoint to resume session
app.post('/resumeSession', (req, res) => {
    const { sessionId } = req.body;
    const filePath = path.join(__dirname, 'sessions', `${sessionId}.json`);

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading session:', err);
            return res.status(500).send('Error reading session');
        }
        res.json({ sessionData: JSON.parse(data) });
    });
});

// Create sessions directory if it doesn't exist
if (!fs.existsSync(path.join(__dirname, 'sessions'))) {
    fs.mkdirSync(path.join(__dirname, 'sessions'));
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
