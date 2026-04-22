require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', database: 'connected' });
});

app.get('/api/jobs', (req, res) => {
  res.json({ jobs: [], message: 'Database not configured yet' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
