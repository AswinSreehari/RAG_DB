require('dotenv').config();
const express = require('express');
const cors = require('cors');
const projectRoutes = require('./routes/projectRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/projects', projectRoutes);

app.get('/', (req, res) => {
  res.send('RAG UI Backend is running');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
