
const express = require('express');
const axios = require('axios');
const router = express.Router();

router.post('/', async (req, res) => {
  const { coordinates } = req.body;

  try {
    const response = await axios.post(
      'https://api.openrouteservice.org/v2/directions/foot-walking/geojson',
      { coordinates },
      {
        headers: {
          Authorization: process.env.ORS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Route error:', error.response?.data || error.message);
    res.status(400).json({ error: 'Failed to fetch route' });
  }
});

module.exports = router;
