// File: server/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const routeRoutes = require('./routes/route');
const safetyRoutes = require('./routes/safety');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

app.use('/api/route', routeRoutes);
app.use('/api/safety', safetyRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));



// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// require('dotenv').config();

// const app = express();
// app.use(cors());
// app.use(express.json());

// //  Connect to MongoDB
// mongoose.connect(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// }).then(() => console.log(' MongoDB Connected'))
//   .catch((err) => console.error(' Mongo Error:', err));

// //  Schema
// const FeedbackSchema = new mongoose.Schema({
//   latlngKey: String,       // e.g., "28.61394,77.20902"
//   type: String             // "safe" or "unsafe"
// });

// const Feedback = mongoose.model('Feedback', FeedbackSchema);

// //  POST /feedback - save a vote
// app.post('/feedback', async (req, res) => {
//   const { latlngKey, type } = req.body;
//   if (!latlngKey || !['safe', 'unsafe'].includes(type)) {
//     return res.status(400).json({ error: 'Invalid data' });
//   }

//   try {
//     const vote = new Feedback({ latlngKey, type });
//     await vote.save();

//     // return updated counts
//     const allVotes = await Feedback.find({ latlngKey });
//     const safe = allVotes.filter(v => v.type === 'safe').length;
//     const unsafe = allVotes.filter(v => v.type === 'unsafe').length;

//     res.json({ safe, unsafe });
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to save feedback' });
//   }
// });

// //  GET /feedback/:latlngKey - fetch vote summary
// app.get('/feedback/:latlngKey', async (req, res) => {
//   const key = req.params.latlngKey;

//   try {
//     const allVotes = await Feedback.find({ latlngKey: key });
//     const safe = allVotes.filter(v => v.type === 'safe').length;
//     const unsafe = allVotes.filter(v => v.type === 'unsafe').length;

//     res.json({ safe, unsafe });
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to fetch feedback' });
//   }
// });

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(` Server running on port ${PORT}`));

