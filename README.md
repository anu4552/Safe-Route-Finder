# 🛡️ Safe Route Finder

A MERN-stack based web application that helps users — especially girls and women — find **safer travel routes** in cities using community-sourced safety data and real-time map integration.

## 🚀 Features

- 🗺️ Interactive Map with OpenStreetMap + Leaflet 
- 📍 Vote-based area safety markers (Safe / Unsafe)
- 📊 Safety rating heatmap per route
- 🔎 Location search using Nominatim API
- 🧭 Route generation via OpenRouteService (Free + Pedestrian mode)
- 🌐 Real-time frontend built with React + Vite
- 📦 Backend with Express.js + MongoDB

## 📂 Project Structure

Safe-Route-Finder/
├── backend/ # Express.js API for votes & locations
│ ├── models/ # Mongoose schemas
│ ├── routes/ # API endpoints
│ └── server.js # Entry point
├── frontend/ # React + Vite frontend
│ ├── components/ # Map, Header, Controls, etc.
│ └── App.jsx
├── .gitignore
└── README.md

🔍 How It Works
The Safe Route Finder app empowers users to navigate safer paths in their city using real-time, community-sourced safety data. Here's how the system works from both user and technical perspectives:

🧑‍💻 User Experience Flow
Map Interface
Users see a city map powered by MapLibre and OpenStreetMap, showing current safety markers.

View or Vote on Safety

Users can click anywhere on the map to rate the area as either Safe ✅ or Unsafe ❌.

These ratings are saved in the backend and displayed as colored markers:

🟢 Green → Safe

🔴 Red → Unsafe

Generate Safer Routes

Users select a start and end location.

The app uses OpenRouteService API to generate pedestrian-friendly routes.

🔭 Project Scope
The Safe Route Finder aims to enhance personal safety, especially for women and vulnerable groups, by providing community-driven safety insights. It serves as a real-time navigation and awareness platform that combines open-source mapping with crowd-sourced safety feedback.

Current capabilities:

Community-based safety voting for locations

Visual safety markers on a live map

Route generation with visual overlay of safe/unsafe zones

Real-time location search and route planning using open APIs

🌱 Future Enhancements
1. ✅ Smart & Safer Routing Algorithm
Automatically prioritize routes with fewer unsafe markers

Route scoring based on proximity to unsafe votes or crimes

2. 📱 Mobile App (Android/iOS)
Bring all features into a mobile app using React Native or Flutter

Support offline map navigation

3. 🔔 Live Alerts and Notifications
Alert users if they enter or approach high-risk zones

Notifications for newly reported incidents in frequently visited areas

4. 📍 Incident Reporting & Categorization
Allow users to report incidents like:

Harassment

Theft

Poor lighting

No CCTV

Tag locations with these incidents for others to see

5. 🕵️‍♂️ Integration with Police/NGO Data
Ingest real crime data from open government APIs or law enforcement to validate and strengthen community reports



