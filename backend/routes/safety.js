const express = require('express');
const router = express.Router();
const Vote = require('../models/Vote');

// Submit a vote
router.post('/vote', async (req, res) => {
  try {
    const { lat, lng, safety } = req.body;
    const vote = new Vote({ lat, lng, safety });
    await vote.save();
    res.status(200).json({ message: 'Vote submitted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all votes
router.get('/all', async (req, res) => {
  try {
    const votes = await Vote.find();
    res.json(votes);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch votes' });
  }
});

module.exports = router;
