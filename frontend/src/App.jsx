import { useEffect, useState, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline
} from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import './App.css';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjQ4ZDdjYWQxMjNhYjQ2MmVhYWVlZWZmM2FjMjhlODRlIiwiaCI6Im11cm11cjY0In0='; 
const BACKEND_URL = 'http://localhost:5000'; //  ADDED: Your backend server address

export default function App() {
  const [userLocation, setUserLocation] = useState(null);
  const [destination, setDestination] = useState('');
  const [routes, setRoutes] = useState([]);
  const [feedbackTarget, setFeedbackTarget] = useState(null);
  const [feedbackCounts, setFeedbackCounts] = useState({});
  const mapRef = useRef();

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      (err) => {
        console.error('Location error:', err);
        setUserLocation([28.6139, 77.2090]);
      }
    );
  }, []);

  const getRoute = async () => {
    if (!userLocation || !destination) return;

    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`;
      const nomRes = await axios.get(nominatimUrl);

      if (!nomRes.data.length) return alert('Destination not found');

      const destCoords = [
        parseFloat(nomRes.data[0].lat),
        parseFloat(nomRes.data[0].lon)
      ];

      const coordinates = [
        [userLocation[1], userLocation[0]],
        [destCoords[1], destCoords[0]]
      ];

      const alternatives = await axios.post(
        'https://api.openrouteservice.org/v2/directions/foot-walking/geojson',
        { coordinates },
        {
          headers: {
            Authorization: ORS_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      const multipleRoutes = [alternatives.data.features[0]];
      setRoutes(multipleRoutes.map(f =>
        f.geometry.coordinates.map(([lon, lat]) => [lat, lon])
      ));

      if (mapRef.current) {
        mapRef.current.setView(userLocation, 14);
      }
    } catch (err) {
      console.error('Route error:', err);
      alert('Failed to fetch route');
    }
  };

  //  ADDED: Fetch vote counts from backend
  const fetchFeedback = async (latlng) => {
    const key = `${latlng.lat.toFixed(5)},${latlng.lng.toFixed(5)}`;
    try {
      const res = await axios.get(`${BACKEND_URL}/feedback/${key}`);
      return res.data;
    } catch (err) {
      console.error("Feedback fetch failed", err);
      return { safe: 0, unsafe: 0 };
    }
  };

  const handleRouteClick = async (latlng) => {
    const stats = await fetchFeedback(latlng); //  ADDED backend fetch
    setFeedbackTarget({ latlng, stats });

    const key = `${latlng.lat.toFixed(5)},${latlng.lng.toFixed(5)}`;
    setFeedbackCounts((prev) => ({ ...prev, [key]: stats }));
  };

  //  UPDATED: Vote gets saved to backend
  const handleVote = async (latlng, type) => {
    const key = `${latlng.lat.toFixed(5)},${latlng.lng.toFixed(5)}`;
    try {
      const res = await axios.post(`${BACKEND_URL}/feedback`, {
        latlngKey: key,
        type
      });

      setFeedbackCounts((prev) => ({
        ...prev,
        [key]: res.data
      }));

      setFeedbackTarget(null);
    } catch (err) {
      console.error("Voting error:", err);
    }
  };

  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'auto' }}>
      <input
        type="text"
        placeholder="Enter destination (e.g. Connaught Place)"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
        style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000, padding: '8px', width: '250px' }}
      />
      <button
        onClick={getRoute}
        style={{ position: 'absolute', top: 10, left: 270, zIndex: 1000, padding: '8px' }}
      >
        Get Route
      </button>

      {userLocation && (
        <MapContainer
          center={userLocation}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          whenCreated={(map) => mapRef.current = map}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={userLocation}><Popup>Your Location</Popup></Marker>

          {routes.map((routeCoords, idx) => (
            <Polyline
              key={idx}
              positions={routeCoords}
              pathOptions={{ color: idx === 0 ? 'blue' : 'gray', weight: 5, opacity: 0.7 }}
              eventHandlers={{ click: (e) => handleRouteClick(e.latlng) }}
            />
          ))}

          {feedbackTarget && (
            <Marker position={feedbackTarget.latlng}>
              <Popup onClose={() => setFeedbackTarget(null)}>
                <p>Community Feedback:</p>
                <p>✅ Safe: {feedbackCounts[`${feedbackTarget.latlng.lat.toFixed(5)},${feedbackTarget.latlng.lng.toFixed(5)}`]?.safe || 0}</p>
                <p>❌ Unsafe: {feedbackCounts[`${feedbackTarget.latlng.lat.toFixed(5)},${feedbackTarget.latlng.lng.toFixed(5)}`]?.unsafe || 0}</p>
                <div>
                  <button onClick={() => handleVote(feedbackTarget.latlng, 'safe')}>✅ Safe</button>
                  <button onClick={() => handleVote(feedbackTarget.latlng, 'unsafe')}>❌ Unsafe</button>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      )}
    </div>
  );
}








// import { useEffect, useState, useRef } from 'react';
// import {
//   MapContainer,
//   TileLayer,
//   Marker,
//   Popup,
//   Polyline
// } from 'react-leaflet';
// import L from 'leaflet';
// import axios from 'axios';
// import 'leaflet/dist/leaflet.css';
// import './App.css';

// // Fix default marker icons
// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
//   iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
//   shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
// });

// const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjQ4ZDdjYWQxMjNhYjQ2MmVhYWVlZWZmM2FjMjhlODRlIiwiaCI6Im11cm11cjY0In0=';

// export default function App() {
//   const [userLocation, setUserLocation] = useState(null);
//   const [destination, setDestination] = useState('');
//   const [routes, setRoutes] = useState([]);
//   const [feedbackTarget, setFeedbackTarget] = useState(null);
//   const [feedbackCounts, setFeedbackCounts] = useState({});
//   const mapRef = useRef();

//   useEffect(() => {
//     navigator.geolocation.getCurrentPosition(
//       (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
//       (err) => {
//         console.error('Location error:', err);
//         setUserLocation([28.6139, 77.2090]);
//       }
//     );
//   }, []);

//   const getRoute = async () => {
//     if (!userLocation || !destination) return;

//     try {
//       const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`;
//       const nomRes = await axios.get(nominatimUrl);

//       if (!nomRes.data.length) return alert('Destination not found');

//       const destCoords = [
//         parseFloat(nomRes.data[0].lat),
//         parseFloat(nomRes.data[0].lon)
//       ];

//       const coordinates = [
//         [userLocation[1], userLocation[0]],
//         [destCoords[1], destCoords[0]]
//       ];

//       const alternatives = await axios.post(
//         'https://api.openrouteservice.org/v2/directions/foot-walking/geojson',
//         { coordinates },
//         {
//           headers: {
//             Authorization: ORS_API_KEY,
//             'Content-Type': 'application/json'
//           }
//         }
//       );

//       const multipleRoutes = [alternatives.data.features[0]];
//       setRoutes(multipleRoutes.map(f =>
//         f.geometry.coordinates.map(([lon, lat]) => [lat, lon])
//       ));

//       if (mapRef.current) {
//         mapRef.current.setView(userLocation, 14);
//       }
//     } catch (err) {
//       console.error('Route error:', err);
//       alert('Failed to fetch route');
//     }
//   };

//   const handleRouteClick = (latlng) => {
//     const key = `${latlng.lat.toFixed(5)},${latlng.lng.toFixed(5)}`;
//     const stats = feedbackCounts[key] || { safe: 0, unsafe: 0 };
//     setFeedbackTarget({ latlng, stats });
//   };

//   const handleVote = (latlng, type) => {
//     const key = `${latlng.lat.toFixed(5)},${latlng.lng.toFixed(5)}`;
//     setFeedbackCounts((prev) => {
//       const current = prev[key] || { safe: 0, unsafe: 0 };
//       return {
//         ...prev,
//         [key]: {
//           ...current,
//           [type]: current[type] + 1
//         }
//       };
//     });
//     setFeedbackTarget(null);
//   };

//   return (
//     <div style={{ height: '100vh', width: '100vw', overflow: 'auto' }}>
//       <input
//         type="text"
//         placeholder="Enter destination (e.g. Connaught Place)"
//         value={destination}
//         onChange={(e) => setDestination(e.target.value)}
//         style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000, padding: '8px', width: '250px' }}
//       />
//       <button
//         onClick={getRoute}
//         style={{ position: 'absolute', top: 10, left: 270, zIndex: 1000, padding: '8px' }}
//       >
//         Get Route
//       </button>

//       {userLocation && (
//         <MapContainer
//           center={userLocation}
//           zoom={14}
//           style={{ height: '100%', width: '100%' }}
//           whenCreated={(map) => mapRef.current = map}
//         >
//           <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
//           <Marker position={userLocation}><Popup>Your Location</Popup></Marker>

//           {routes.map((routeCoords, idx) => (
//             <Polyline
//               key={idx}
//               positions={routeCoords}
//               pathOptions={{ color: idx === 0 ? 'blue' : 'gray', weight: 5, opacity: 0.7 }}
//               eventHandlers={{ click: (e) => handleRouteClick(e.latlng) }}
//             />
//           ))}

//           {feedbackTarget && (
//             <Marker position={feedbackTarget.latlng}>
//               <Popup onClose={() => setFeedbackTarget(null)}>
//                 <p>Community Feedback:</p>
//                 <p>✅ Safe: {feedbackCounts[`${feedbackTarget.latlng.lat.toFixed(5)},${feedbackTarget.latlng.lng.toFixed(5)}`]?.safe || 0}</p>
//                 <p>❌ Unsafe: {feedbackCounts[`${feedbackTarget.latlng.lat.toFixed(5)},${feedbackTarget.latlng.lng.toFixed(5)}`]?.unsafe || 0}</p>
//                 <div>
//                   <button onClick={() => handleVote(feedbackTarget.latlng, 'safe')}>✅ Safe</button>
//                   <button onClick={() => handleVote(feedbackTarget.latlng, 'unsafe')}>❌ Unsafe</button>
//                 </div>
//               </Popup>
//             </Marker>
//           )}
//         </MapContainer>
//       )}
//     </div>
//   );
// }






// import { useEffect, useState, useRef } from 'react';
// import {
//   MapContainer,
//   TileLayer,
//   Marker,
//   Popup,
//   Polyline
// } from 'react-leaflet';
// import L from 'leaflet';
// import axios from 'axios';
// import 'leaflet/dist/leaflet.css';
// import './App.css';

// // 🧭 Fix default marker icons for Leaflet
// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
//   iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
//   shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
// });

// const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjQ4ZDdjYWQxMjNhYjQ2MmVhYWVlZWZmM2FjMjhlODRlIiwiaCI6Im11cm11cjY0In0='; // 🔐 Your OpenRouteService API key

// export default function App() {
//   const [userLocation, setUserLocation] = useState(null); // 📍 User's current location
//   const [destination, setDestination] = useState('');      // 🏁 Destination input text
//   const [route, setRoute] = useState([]);                 // 🛣 Route coordinates array
//   const [feedbackTarget, setFeedbackTarget] = useState(null); // 🎯 Point clicked for feedback

//   const [feedbackCounts, setFeedbackCounts] = useState({}); // 🗳 Track votes for each location
//   const mapRef = useRef(); // 🗺️ Reference to the Leaflet map

//   // ✅ Get current geolocation on load
//   useEffect(() => {
//     navigator.geolocation.getCurrentPosition(
//       (pos) => {
//         setUserLocation([pos.coords.latitude, pos.coords.longitude]);
//       },
//       (err) => {
//         console.error('Location error:', err);
//         setUserLocation([28.6139, 77.2090]); // 🔁 Fallback to Delhi
//       }
//     );
//   }, []);

//   // 🔄 Fetch walking route using OpenRouteService & Nominatim geocoder
//   const getRoute = async () => {
//     if (!userLocation || !destination) return;

//     try {
//       const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`;
//       const nomRes = await axios.get(nominatimUrl);

//       if (!nomRes.data.length) return alert('Destination not found');

//       const destCoords = [
//         parseFloat(nomRes.data[0].lat),
//         parseFloat(nomRes.data[0].lon)
//       ];

//       const body = {
//         coordinates: [
//           [userLocation[1], userLocation[0]],       // [lng, lat] format
//           [destCoords[1], destCoords[0]]
//         ]
//       };

//       const res = await axios.post(
//         'https://api.openrouteservice.org/v2/directions/foot-walking/geojson',
//         body,
//         {
//           headers: {
//             Authorization: ORS_API_KEY,
//             'Content-Type': 'application/json'
//           }
//         }
//       );

//       const geoCoords = res.data.features[0].geometry.coordinates.map(
//         ([lon, lat]) => [lat, lon] // Convert [lng, lat] → [lat, lng] for Leaflet
//       );
//       setRoute(geoCoords);

//       // 🧭 Center map on start
//       if (mapRef.current) {
//         mapRef.current.setView(userLocation, 14);
//       }

//     } catch (error) {
//       console.error('Error fetching route:', error);
//       alert('Failed to fetch route');
//     }
//   };

//   // 📍 Handle click on route line → open feedback marker
//   const handleRouteClick = (latlng) => {
//     const key = `${latlng.lat.toFixed(5)},${latlng.lng.toFixed(5)}`; // precise key
//     const stats = feedbackCounts[key] || { safe: 0, unsafe: 0 };
//     setFeedbackTarget({ latlng, stats });
//   };

//   // 🗳 Voting logic → update state by location key
//   const handleVote = (latlng, type) => {
//     const key = `${latlng.lat.toFixed(5)},${latlng.lng.toFixed(5)}`;

//     setFeedbackCounts((prev) => {
//       const current = prev[key] || { safe: 0, unsafe: 0 };
//       return {
//         ...prev,
//         [key]: {
//           ...current,
//           [type]: current[type] + 1
//         }
//       };
//     });

//     setFeedbackTarget(null); // ✅ Close popup after vote
//   };

//   return (
//     <div style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
//       {/* 📝 Input box and Get Route button */}
//       <input
//         type="text"
//         placeholder="Enter destination (e.g. Connaught Place)"
//         value={destination}
//         onChange={(e) => setDestination(e.target.value)}
//         style={{
//           position: 'absolute',
//           top: 10,
//           left: 10,
//           zIndex: 1000,
//           padding: '8px',
//           width: '250px'
//         }}
//       />
//       <button
//         onClick={getRoute}
//         style={{
//           position: 'absolute',
//           top: 10,
//           left: 270,
//           zIndex: 1000,
//           padding: '8px'
//         }}
//       >
//         Get Route
//       </button>

//       {/* 🗺️ Main Map rendering */}
//       {userLocation && (
//         <MapContainer
//           center={userLocation}
//           zoom={14}
//           style={{ height: '100%', width: '100%' }}
//           whenCreated={(mapInstance) => {
//             mapRef.current = mapInstance;
//           }}
//         >
//           <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

//           {/* 📍 Marker for user */}
//           <Marker position={userLocation}>
//             <Popup>Your Location</Popup>
//           </Marker>

//           {/* 🔵 Route line with click handler for feedback */}
//           {route.length > 0 && (
//             <Polyline
//               positions={route}
//               pathOptions={{ color: 'blue', weight: 5 }}
//               eventHandlers={{
//                 click: (e) => handleRouteClick(e.latlng)
//               }}
//             />
//           )}

//           {/* 🧠 Feedback Popup with vote count + buttons */}
//           {feedbackTarget && (
//             <Marker position={feedbackTarget.latlng}>
//               <Popup onClose={() => setFeedbackTarget(null)}>
//                 <p>Community Feedback:</p>
//                 <p>✅ Safe: {feedbackCounts[`${feedbackTarget.latlng.lat.toFixed(5)},${feedbackTarget.latlng.lng.toFixed(5)}`]?.safe || 0}</p>
//                 <p>❌ Unsafe: {feedbackCounts[`${feedbackTarget.latlng.lat.toFixed(5)},${feedbackTarget.latlng.lng.toFixed(5)}`]?.unsafe || 0}</p>
//                 <div>
//                   <button onClick={() => handleVote(feedbackTarget.latlng, 'safe')}>✅ Safe</button>
//                   <button onClick={() => handleVote(feedbackTarget.latlng, 'unsafe')}>❌ Unsafe</button>
//                 </div>
//               </Popup>
//             </Marker>
//           )}
//         </MapContainer>
//       )}
//     </div>
//   );
// }






// import { useEffect, useState, useRef } from 'react';
// import {
//   MapContainer,
//   TileLayer,
//   Marker,
//   Popup,
//   Polyline
// } from 'react-leaflet';
// import L from 'leaflet';
// import axios from 'axios';
// import 'leaflet/dist/leaflet.css';
// import './App.css';

// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
//   iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
//   shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
// });

// const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjQ4ZDdjYWQxMjNhYjQ2MmVhYWVlZWZmM2FjMjhlODRlIiwiaCI6Im11cm11cjY0In0='; // Replace with your real key

// export default function App() {
//   const [userLocation, setUserLocation] = useState(null);
//   const [destination, setDestination] = useState('');
//   const [route, setRoute] = useState([]);
//   const [feedbackTarget, setFeedbackTarget] = useState(null);

//   const [feedbackCounts, setFeedbackCounts] = useState({}); // ✅ Track votes by lat,lng

//   const mapRef = useRef();

//   useEffect(() => {
//     navigator.geolocation.getCurrentPosition(
//       (pos) => {
//         setUserLocation([pos.coords.latitude, pos.coords.longitude]);
//       },
//       (err) => {
//         console.error('Location error:', err);
//         setUserLocation([28.6139, 77.2090]); // fallback: Delhi
//       }
//     );
//   }, []);

//   const getRoute = async () => {
//     if (!userLocation || !destination) return;

//     try {
//       const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`;
//       const nomRes = await axios.get(nominatimUrl);

//       if (!nomRes.data.length) return alert('Destination not found');

//       const destCoords = [
//         parseFloat(nomRes.data[0].lat),
//         parseFloat(nomRes.data[0].lon)
//       ];

//       const body = {
//         coordinates: [
//           [userLocation[1], userLocation[0]],
//           [destCoords[1], destCoords[0]]
//         ]
//       };

//       const res = await axios.post(
//         'https://api.openrouteservice.org/v2/directions/foot-walking/geojson',
//         body,
//         {
//           headers: {
//             Authorization: ORS_API_KEY,
//             'Content-Type': 'application/json'
//           }
//         }
//       );

//       const geoCoords = res.data.features[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);
//       setRoute(geoCoords);

//       if (mapRef.current) {
//         mapRef.current.setView(userLocation, 14);
//       }

//     } catch (error) {
//       console.error('Error fetching route:', error);
//       alert('Failed to fetch route');
//     }
//   };

//   const handleRouteClick = (latlng) => {
//     const key = `${latlng.lat.toFixed(5)},${latlng.lng.toFixed(5)}`; // 🧠 Use key for unique location
//     const stats = feedbackCounts[key] || { safe: 0, unsafe: 0 };
//     setFeedbackTarget({ latlng, stats });
//   };

//   const handleVote = (latlng, type) => {
//     const key = `${latlng.lat.toFixed(5)},${latlng.lng.toFixed(5)}`;

//     setFeedbackCounts((prev) => {
//       const current = prev[key] || { safe: 0, unsafe: 0 };
//       return {
//         ...prev,
//         [key]: {
//           ...current,
//           [type]: current[type] + 1
//         }
//       };
//     });

//     setFeedbackTarget(null); // ✅ Close popup after vote
//   };

//   return (
//     <div style={{ height: '100vh' }}>
//       <input
//         type="text"
//         placeholder="Enter destination (e.g. Connaught Place)"
//         value={destination}
//         onChange={(e) => setDestination(e.target.value)}
//         style={{
//           position: 'absolute',
//           top: 10,
//           left: 10,
//           zIndex: 1000,
//           padding: '8px',
//           width: '250px'
//         }}
//       />
//       <button
//         onClick={getRoute}
//         style={{
//           position: 'absolute',
//           top: 10,
//           left: 270,
//           zIndex: 1000,
//           padding: '8px'
//         }}
//       >
//         Get Route
//       </button>

//       {userLocation && (
//         <MapContainer
//           center={userLocation}
//           zoom={14}
//           style={{ height: '100%', width: '100%' }}
//           whenCreated={(mapInstance) => {
//             mapRef.current = mapInstance;
//           }}
//         >
//           <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

//           <Marker position={userLocation}>
//             <Popup>Your Location</Popup>
//           </Marker>

//           {route.length > 0 && (
//             <Polyline
//               positions={route}
//               pathOptions={{ color: 'blue', weight: 5 }}
//               eventHandlers={{
//                 click: (e) => handleRouteClick(e.latlng)
//               }}
//             />
//           )}

//           {feedbackTarget && (
//             <Marker position={feedbackTarget.latlng}>
//               <Popup onClose={() => setFeedbackTarget(null)}>
//                 <p>Community Feedback:</p>
//                 <p>✅ Safe: {feedbackCounts[`${feedbackTarget.latlng.lat.toFixed(5)},${feedbackTarget.latlng.lng.toFixed(5)}`]?.safe || 0}</p>
//                 <p>❌ Unsafe: {feedbackCounts[`${feedbackTarget.latlng.lat.toFixed(5)},${feedbackTarget.latlng.lng.toFixed(5)}`]?.unsafe || 0}</p>
//                 <div>
//                   <button onClick={() => handleVote(feedbackTarget.latlng, 'safe')}>✅ Safe</button>
//                   <button onClick={() => handleVote(feedbackTarget.latlng, 'unsafe')}>❌ Unsafe</button>
//                 </div>
//               </Popup>
//             </Marker>
//           )}
//         </MapContainer>
//       )}
//     </div>
//   );
// }







// import { useEffect, useState, useRef } from 'react';
// import {
//   MapContainer,
//   TileLayer,
//   Marker,
//   Popup,
//   Polyline,
//   useMap
// } from 'react-leaflet';
// import L from 'leaflet';
// import axios from 'axios';
// import 'leaflet/dist/leaflet.css';
// import './App.css';

// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
//   iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
//   shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
// });

// const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjQ4ZDdjYWQxMjNhYjQ2MmVhYWVlZWZmM2FjMjhlODRlIiwiaCI6Im11cm11cjY0In0='; // Replace with your real key

// export default function App() {
//   const [userLocation, setUserLocation] = useState(null);
//   const [destination, setDestination] = useState('');
//   const [route, setRoute] = useState([]);
//   const [feedbackTarget, setFeedbackTarget] = useState(null);
//   const [feedbackCounts, setFeedbackCounts] = useState({});


//   const mapRef = useRef();

//   // Get user's current location
//   useEffect(() => {
//     navigator.geolocation.getCurrentPosition(
//       (pos) => {
//         setUserLocation([pos.coords.latitude, pos.coords.longitude]);
//       },
//       (err) => {
//         console.error('Location error:', err);
//         setUserLocation([28.6139, 77.2090]); // fallback: Delhi
//       }
//     );
//   }, []);

//   const getRoute = async () => {
//     if (!userLocation || !destination) return;

//     // Geocode destination to lat/lng
//     try {
//       const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
//         destination
//       )}&format=json&limit=1`;
//       const nomRes = await axios.get(nominatimUrl);

//       if (!nomRes.data.length) return alert('Destination not found');

//       const destCoords = [
//         parseFloat(nomRes.data[0].lat),
//         parseFloat(nomRes.data[0].lon)
//       ];

//       const body = {
//         coordinates: [
//           [userLocation[1], userLocation[0]],
//           [destCoords[1], destCoords[0]]
//         ]
//       };

//       const res = await axios.post(
//         'https://api.openrouteservice.org/v2/directions/foot-walking/geojson',
//         body,
//         {
//           headers: {
//             Authorization: ORS_API_KEY,
//             'Content-Type': 'application/json'
//           }
//         }
//       );

//       const geoCoords = res.data.features[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);
//       setRoute(geoCoords);

//       // Center map to route start
//       if (mapRef.current) {
//         mapRef.current.setView(userLocation, 14);
//       }

//     } catch (error) {
//       console.error('Error fetching route:', error);
//       alert('Failed to fetch route');
//     }
//   };

//   const handleRouteClick = (latlng) => {
//     setFeedbackTarget({
//       latlng,
//       stats: { safeVotes: 5, unsafeVotes: 1 }
//     });
//   };

//   return (
//     <div style={{ height: '100vh' }}>
//       <input
//         type="text"
//         placeholder="Enter destination (e.g. Connaught Place)"
//         value={destination}
//         onChange={(e) => setDestination(e.target.value)}
//         style={{
//           position: 'absolute',
//           top: 10,
//           left: 10,
//           zIndex: 1000,
//           padding: '8px',
//           width: '250px'
//         }}
//       />
//       <button
//         onClick={getRoute}
//         style={{
//           position: 'absolute',
//           top: 10,
//           left: 270,
//           zIndex: 1000,
//           padding: '8px'
//         }}
//       >
//         Get Route
//       </button>

//       {userLocation && (
//         <MapContainer
//           center={userLocation}
//           zoom={14}
//           style={{ height: '100%', width: '100%' }}
//           whenCreated={(mapInstance) => {
//             mapRef.current = mapInstance;
//           }}
//         >
//           <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

//           <Marker position={userLocation}>
//             <Popup>Your Location</Popup>
//           </Marker>

//           {route.length > 0 && (
//             <Polyline
//               positions={route}
//               pathOptions={{ color: 'blue', weight: 5 }}
//               eventHandlers={{
//                 click: (e) => handleRouteClick(e.latlng)
//               }}
//             />
//           )}

//           {feedbackTarget && (
//             <Marker position={feedbackTarget.latlng}>
//               <Popup onClose={() => setFeedbackTarget(null)}>
//                 <p>Community Feedback:</p>
//                 <p>✅ Safe: {feedbackTarget.stats.safeVotes}</p>
//                 <p>❌ Unsafe: {feedbackTarget.stats.unsafeVotes}</p>
//                 <div>
//                   <button onClick={() => alert('Thanks for voting SAFE')}>✅ Safe</button>
//                   <button onClick={() => alert('Thanks for voting UNSAFE')}>❌ Unsafe</button>
//                 </div>
//               </Popup>
//             </Marker>
//           )}
//         </MapContainer>
//       )}
//     </div>
//   );
// }









// import { useEffect, useState } from 'react';
// import {
//   MapContainer,
//   TileLayer,
//   Marker,
//   Popup,
//   Polyline
// } from 'react-leaflet';
// import L from 'leaflet';
// import axios from 'axios';
// import 'leaflet/dist/leaflet.css';
// import './App.css';

// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
//   iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
//   shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
// });

// const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjQ4ZDdjYWQxMjNhYjQ2MmVhYWVlZWZmM2FjMjhlODRlIiwiaCI6Im11cm11cjY0In0=';

// export default function App() {
//   const [userLocation, setUserLocation] = useState(null);
//   const [destination, setDestination] = useState('');
//   const [route, setRoute] = useState([]);
//   const [feedbackTarget, setFeedbackTarget] = useState(null);

//   // Get user's current location
//   useEffect(() => {
//     navigator.geolocation.getCurrentPosition(
//       (pos) => {
//         setUserLocation([pos.coords.latitude, pos.coords.longitude]);
//       },
//       (err) => {
//         console.error('Location error:', err);
//         setUserLocation([28.6139, 77.2090]); // fallback: Delhi
//       }
//     );
//   }, []);

//   const getRoute = async () => {
    
//   const getRoute = async (start, end) => {
//   const body = {
//     coordinates: [start, end],
//     format: 'geojson',
//     instructions: false,
//   };

//   try {
//     const res = await axios.post(
//       'https://api.openrouteservice.org/v2/directions/foot-walking/geojson',
//       body,
//       {
//         headers: {
//           Authorization: 'YOUR_API_KEY',
//           'Content-Type': 'application/json',
//         },
//       }
//     );

//     // ✅ Check if routes[0] exists
//     if (
//       res.data &&
//       res.data.features &&
//       res.data.features.length > 0 &&
//       res.data.features[0].geometry
//     ) {
//       const coordinates = res.data.features[0].geometry.coordinates;

//       // Draw the route
//       if (routeRef.current) {
//         map.removeLayer(routeRef.current);
//       }

//       const newRoute = L.geoJSON(res.data, {
//         style: { color: 'blue', weight: 4 },
//       }).addTo(map);

//       routeRef.current = newRoute;

//     } else {
//       console.error("Invalid ORS response:", res.data);
//       alert("No route data found in the response.");
//     }

//   } catch (err) {
//     console.error("ORS request failed:", err);
//     alert("Something went wrong while fetching the route.");
//   }
// };


//   return (
//     <div style={{ height: '100vh' }}>
//       <input
//         type="text"
//         placeholder="Enter destination (e.g. Connaught Place)"
//         value={destination}
//         onChange={(e) => setDestination(e.target.value)}
//         style={{
//           position: 'absolute',
//           top: 10,
//           left: 10,
//           zIndex: 1000,
//           padding: '8px',
//           width: '250px'
//         }}
//       />
//       <button
//         onClick={getRoute}
//         style={{
//           position: 'absolute',
//           top: 10,
//           left: 270,
//           zIndex: 1000,
//           padding: '8px'
//         }}
//       >
//         Get Route
//       </button>

//       {userLocation && (
//         <MapContainer center={userLocation} zoom={14} style={{ height: '100%', width: '100%' }}>
//           <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

//           <Marker position={userLocation}>
//             <Popup>Your Location</Popup>
//           </Marker>

//           {route.length > 0 && (
//             <Polyline
//               positions={route}
//               pathOptions={{ color: 'blue', weight: 5 }}
//               eventHandlers={{
//                 click: (e) => handleRouteClick(e.latlng)
//               }}
//             />
//           )}

//           {feedbackTarget && (
//             <Marker position={feedbackTarget.latlng}>
//               <Popup onClose={() => setFeedbackTarget(null)}>
//                 <p>Community Feedback:</p>
//                 <p>✅ Safe: {feedbackTarget.stats.safeVotes}</p>
//                 <p>❌ Unsafe: {feedbackTarget.stats.unsafeVotes}</p>
//                 <div>
//                   <button onClick={() => alert('Thanks for voting SAFE')}>✅ Safe</button>
//                   <button onClick={() => alert('Thanks for voting UNSAFE')}>❌ Unsafe</button>
//                 </div>
//               </Popup>
//             </Marker>
//           )}
//         </MapContainer>
//       )}
//     </div>
//   );
// }




// import { useState } from 'react';
// import {
//   MapContainer,
//   TileLayer,
//   Marker,
//   Popup,
//   Polyline
// } from 'react-leaflet';
// import L from 'leaflet';
// import 'leaflet/dist/leaflet.css';
// import './App.css';

// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
//   iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
//   shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
// });

// export default function App() {
//   const [feedbackTarget, setFeedbackTarget] = useState(null);

//   const routePath = [
//     [28.610, 77.230],
//     [28.613, 77.233],
//     [28.616, 77.237]
//   ];

//   const handleRouteClick = (latlng) => {
//     console.log('Polyline clicked:', latlng);
//     setFeedbackTarget({
//       latlng,
//       stats: { safeVotes: 7, unsafeVotes: 2 }
//     });
//   };

//   return (
//     <div style={{ height: '100vh' }}>
//       <MapContainer center={[28.612, 77.233]} zoom={15} style={{ height: '100%', width: '100%' }}>
//         <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

//         <Polyline
//           positions={routePath}
//           pathOptions={{ color: 'blue', weight: 5 }}
//           eventHandlers={{
//             click: (e) => handleRouteClick(e.latlng)
//           }}
//         />

//         {feedbackTarget && (
//           <Marker position={feedbackTarget.latlng}>
//             <Popup onClose={() => setFeedbackTarget(null)}>
//               <p>Community Feedback:</p>
//               <p>✅ Safe: {feedbackTarget.stats.safeVotes}</p>
//               <p>❌ Unsafe: {feedbackTarget.stats.unsafeVotes}</p>
//               <div>
//                 <button onClick={() => alert('Thanks for voting SAFE')}>✅ Safe</button>
//                 <button onClick={() => alert('Thanks for voting UNSAFE')}>❌ Unsafe</button>
//               </div>
//             </Popup>
//           </Marker>
//         )}
//       </MapContainer>
//     </div>
//   );
// }





// import { useState, useRef } from 'react';
// import {
//   MapContainer,
//   TileLayer,
//   Marker,
//   Popup,
//   Polyline,
//   useMapEvents
// } from 'react-leaflet';
// import L from 'leaflet';
// import 'leaflet/dist/leaflet.css';
// import './App.css';

// const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjQ4ZDdjYWQxMjNhYjQ2MmVhYWVlZWZmM2FjMjhlODRlIiwiaCI6Im11cm11cjY0In0='; // 🔁 Replace with your OpenRouteService API key

// // Map click listener component
// function LocationSelector({ mode, onSelect }) {
//   useMapEvents({
//     click(e) {
//       if (mode) {
//         onSelect(e.latlng, mode);
//       }
//     }
//   });
//   return null;
// }

// export default function App() {
//   const [start, setStart] = useState(null);
//   const [end, setEnd] = useState(null);
//   const [selectMode, setSelectMode] = useState(null); // 'start' or 'end'
//   const [routeCoords, setRouteCoords] = useState([]);
//   const [feedbackTarget, setFeedbackTarget] = useState(null);
//   const mapRef = useRef(null); // ✅ useRef for map instance

//   useEffect(() => {
//     if (popupRef.current) {
//       popupRef.current._source.openPopup(); // Open popup automatically
//     }
//   }, [feedbackTarget]);

//   const fetchRoute = async () => {
//     if (!start || !end) {
//       alert('Please select both start and end points.');
//       return;
//     }

//     const coordinates = [
//       [start.lng, start.lat],
//       [end.lng, end.lat]
//     ];

//     const body = { coordinates };

//     try {
//       const res = await fetch(
//         'https://api.openrouteservice.org/v2/directions/foot-walking/geojson',
//         {
//           method: 'POST',
//           headers: {
//             Authorization: ORS_API_KEY,
//             'Content-Type': 'application/json'
//           },
//           body: JSON.stringify(body)
//         }
//       );

//       if (!res.ok) {
//         const errorText = await res.text();
//         console.error("API error:", res.status, errorText);
//         alert("Route fetch failed. See console.");
//         return;
//       }

//       const data = await res.json();
//       const coords = data.features[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
//       setRouteCoords(coords);

//       // ✅ Fit map to route
//       if (mapRef.current) {
//         mapRef.current.fitBounds(L.latLngBounds(coords));
//       }
//     } catch (err) {
//       console.error("Failed to fetch route:", err);
//     }
//   };

//   const handleSelect = (latlng, type) => {
//     if (type === 'start') setStart(latlng);
//     if (type === 'end') setEnd(latlng);
//     setSelectMode(null);

//   };
//   const handleRouteClick = (e) => {
//     console.log("Polyline clicked at:", e.latlng);
//     setFeedbackTarget({
//       latlng: e.latlng,
//       stats: { safeVotes: 4, unsafeVotes: 1 } // dummy data
//     });
//   };

//   return (
//     <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
//       <div className="controls">
//         <button onClick={() => setSelectMode('start')}>Select Start</button>
//         <button onClick={() => setSelectMode('end')}>Select End</button>
//         <button onClick={fetchRoute}>Draw Route</button>
//       </div>

//       <div style={{ flex: 1 }}>
//         <MapContainer
//           center={[28.61, 77.23]}
//           zoom={13}
//           className="leaflet-container"
//           whenCreated={(map) => { mapRef.current = map; }}
//         >
//           <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

//           <LocationSelector mode={selectMode} onSelect={handleSelect} />

//           {start && <Marker position={start}><Popup>Start Point</Popup></Marker>}
//           {end && <Marker position={end}><Popup>End Point</Popup></Marker>}

//           {routeCoords.length > 0 && (
//             <Polyline
//               positions={routeCoords}
//               pathOptions={{ color: 'blue', weight: 8 }}
//               eventHandlers={{ click: handleRouteClick }}
//             />
//           )}

//           {feedbackTarget && (
//           <Marker position={feedbackTarget.latlng}>
//             <Popup ref={popupRef} onClose={() => setFeedbackTarget(null)}>
//               <p><strong>Community Feedback:</strong></p>
//               <p>✅ Safe: {feedbackTarget.stats.safeVotes}</p>
//               <p>❌ Unsafe: {feedbackTarget.stats.unsafeVotes}</p>
//               <button onClick={() => alert("Thank you for marking SAFE!")}>✅ Safe</button>
//               <button onClick={() => alert("Thank you for marking UNSAFE!")}>❌ Unsafe</button>
//             </Popup>
//           </Marker>
//         )}

//         </MapContainer>
//       </div>
//     </div>
//   );
// }










// import { useState, useRef, useEffect } from 'react';
// import {
//   MapContainer,
//   TileLayer,
//   Marker,
//   Popup,
//   Polyline
// } from 'react-leaflet';
// import L from 'leaflet';
// import 'leaflet/dist/leaflet.css';
// import './App.css';

// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
//   iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
//   shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
// });

// const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjQ4ZDdjYWQxMjNhYjQ2MmVhYWVlZWZmM2FjMjhlODRlIiwiaCI6Im11cm11cjY0In0=';

// export default function App() {
//   const [start, setStart] = useState('');
//   const [end, setEnd] = useState('');
//   const [routeCoords, setRouteCoords] = useState([]);
//   const [feedbackTarget, setFeedbackTarget] = useState(null);
//   const popupRef = useRef(null);

//   useEffect(() => {
//     if (popupRef.current) {
//       popupRef.current._source.openPopup(); // Open popup automatically
//     }
//   }, [feedbackTarget]);

//   const fetchRoute = async () => {
//     if (!start || !end) {
//     alert("Please enter both start and end locations.");
//     return;
//   }

//   const [startLat, startLng] = start.split(',').map(Number);
//   const [endLat, endLng] = end.split(',').map(Number);

//   // ✅ Validate coordinates
//   if (
//     isNaN(startLat) || isNaN(startLng) ||
//     isNaN(endLat) || isNaN(endLng)
//   ) {
//     alert("Invalid coordinates. Use format: lat,lng");
//     return;
//   }

//   const coordinates = [
//     [startLng, startLat], // Note: ORS needs [lng, lat]
//     [endLng, endLat]
//   ];

//   const body = { coordinates };
//   console.log("Sending coordinates:", body);


//     try {
//       const res = await fetch(
//         'https://api.openrouteservice.org/v2/directions/foot-walking/geojson',
//         {
//           method: 'POST',
//           headers: {
//             'Authorization': ORS_API_KEY,
//             'Content-Type': 'application/json'
//           },
//           body: JSON.stringify(body)
//         }
//       );

//       if (!res.ok) {
//         const errorText = await res.text();
//         console.error("API error:", res.status, errorText);
//         return;
//       }

//       const data = await res.json();
//       console.log("Route response:", data);

//       const coords = data.features[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
//       setRouteCoords(coords);
//       console.log("Drawing polyline with", coords.length, "points");

//       // Fit map to route bounds
//       window._leaflet_map.fitBounds(L.latLngBounds(coords));
//     } catch (err) {
//       console.error("Failed to fetch route:", err);
//     }
//   };

//   const handleRouteClick = (e) => {
//     console.log("Polyline clicked at:", e.latlng);
//     setFeedbackTarget({
//       latlng: e.latlng,
//       stats: { safeVotes: 4, unsafeVotes: 1 } // dummy data
//     });
//   };

//   return (
//     <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
//       <div className="controls">
//         <input
//           type="text"
//           placeholder="Start (lat,lng)"
//           value={start}
//           onChange={(e) => setStart(e.target.value)}
//         />
//         <input
//           type="text"
//           placeholder="End (lat,lng)"
//           value={end}
//           onChange={(e) => setEnd(e.target.value)}
//         />
//         <button onClick={fetchRoute}>Draw Safe Route</button>
//       </div>

//       <MapContainer
//         center={[28.61, 77.23]}
//         zoom={14}
//         className="leaflet-container"
//         whenCreated={(map) => (window._leaflet_map = map)}
//       >
//         <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

//         {routeCoords.length > 0 && (
//           <Polyline
//             positions={routeCoords}
//             pathOptions={{ color: 'blue', weight: 5 }}
//             eventHandlers={{ click: handleRouteClick }}
//           />
//         )}

//         {feedbackTarget && (
//           <Marker position={feedbackTarget.latlng}>
//             <Popup ref={popupRef} onClose={() => setFeedbackTarget(null)}>
//               <p><strong>Community Feedback:</strong></p>
//               <p>✅ Safe: {feedbackTarget.stats.safeVotes}</p>
//               <p>❌ Unsafe: {feedbackTarget.stats.unsafeVotes}</p>
//               <button onClick={() => alert("Thank you for marking SAFE!")}>✅ Safe</button>
//               <button onClick={() => alert("Thank you for marking UNSAFE!")}>❌ Unsafe</button>
//             </Popup>
//           </Marker>
//         )}
//       </MapContainer>
//     </div>
//   );
// }









// import { useState, useRef, useEffect } from 'react';
// import {
//   MapContainer,
//   TileLayer,
//   Marker,
//   Popup,
//   Polyline
// }from 'react-leaflet';
// import L from 'leaflet';
// import 'leaflet/dist/leaflet.css';
// import './App.css';

// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
//   iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
//   shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
// });

// const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjQ4ZDdjYWQxMjNhYjQ2MmVhYWVlZWZmM2FjMjhlODRlIiwiaCI6Im11cm11cjY0In0=';

// export default function App() {
//   const [start, setStart] = useState('');
//   const [end, setEnd] = useState('');
//   const [routeCoords, setRouteCoords] = useState([]);
//   const [feedbackTarget, setFeedbackTarget] = useState(null);
//   const popupRef = useRef(null);

//   useEffect(() => {
//     if (popupRef.current) {
//       popupRef.current._source.openPopup(); // open popup
//     }
//   }, [feedbackTarget]);

//   const fetchRoute = async () => {
//     if (!start || !end) return;

//     const [startLat, startLng] = start.split(',').map(Number);
//     const [endLat, endLng] = end.split(',').map(Number);

//     const body = {
//       coordinates: [[startLng, startLat], [endLng, endLat]]
//     };

//     const res = await fetch(
//       'https://api.openrouteservice.org/v2/directions/foot-walking/geojson',
//       {
//         method: 'POST',
//         headers: {
//           'Authorization': ORS_API_KEY,
//           'Content-Type': 'application/json'
//         },
//         body: JSON.stringify(body)
//       }
//     );

//     const data = await res.json();
//     const coords = data.features[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
//     setRouteCoords(coords);
//   };

//   const handleRouteClick = (e) => {
//     setFeedbackTarget({
//       latlng: e.latlng,
//       stats: { safeVotes: 4, unsafeVotes: 1 } // dummy data
//     });
//   };

//   return (
//     <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
//       <div className="controls">
//         <input
//           type="text"
//           placeholder="Start (lat,lng)"
//           value={start}
//           onChange={(e) => setStart(e.target.value)}
//         />
//         <input
//           type="text"
//           placeholder="End (lat,lng)"
//           value={end}
//           onChange={(e) => setEnd(e.target.value)}
//         />
//         <button onClick={fetchRoute}>Draw Safe Route</button>
//       </div>

//       <MapContainer
//         center={[28.61, 77.23]}
//         zoom={14}
//         className="leaflet-container"
//         whenCreated={(map) => (window._leaflet_map = map)}
//       >
//         <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

//         {routeCoords.length > 0 && (
//           <Polyline
//             positions={routeCoords}
//             pathOptions={{ color: 'blue', weight: 5 }}
//             eventHandlers={{
//               click: handleRouteClick
//             }}
//           />
//         )}

//         {feedbackTarget && (
//           <Marker position={feedbackTarget.latlng}>
//             <Popup ref={popupRef} onClose={() => setFeedbackTarget(null)}>
//               <p><strong>Community Feedback:</strong></p>
//               <p>✅ Safe: {feedbackTarget.stats.safeVotes}</p>
//               <p>❌ Unsafe: {feedbackTarget.stats.unsafeVotes}</p>
//               <button onClick={() => alert("Thank you for marking SAFE!")}>✅ Safe</button>
//               <button onClick={() => alert("Thank you for marking UNSAFE!")}>❌ Unsafe</button>
//             </Popup>
//           </Marker>
//         )}
//       </MapContainer>
//     </div>
//   );
// }








// import { useState, useRef } from 'react';
// import {
//   MapContainer,
//   TileLayer,
//   Marker,
//   Popup,
//   Polyline
// } from 'react-leaflet';
// import L from 'leaflet';
// import 'leaflet/dist/leaflet.css';
// import 'leaflet-routing-machine';
// import './App.css';

// // Fix icon issue with Leaflet
// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
//   iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
//   shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
// });

// export default function App() {
//   const [markers, setMarkers] = useState([]);
//   const [start, setStart] = useState('');
//   const [end, setEnd] = useState('');
//   const [routePath, setRoutePath] = useState([]);
//   const [feedbackTarget, setFeedbackTarget] = useState(null);
//   const mapRef = useRef(null);
//   const routingRef = useRef(null);

//   const handleVote = (lat, lng, vote) => {
//     setMarkers([...markers, { lat, lng, vote }]);
//   };

//   const handleRouteClick = (latlng) => {
//     console.log("Route clicked!", latlng);
//     const stats = {
//       safeVotes: 8,
//       unsafeVotes: 2
//     };
//     setFeedbackTarget({ latlng, stats });
//   };

//   const drawRoute = () => {
//     if (!start || !end || !mapRef.current) return;

//     if (routingRef.current) {
//       mapRef.current.removeControl(routingRef.current);
//     }

//     const [startLat, startLng] = start.split(',').map(Number);
//     const [endLat, endLng] = end.split(',').map(Number);

//     routingRef.current = L.Routing.control({
//       waypoints: [
//         L.latLng(startLat, startLng),
//         L.latLng(endLat, endLng)
//       ],
//       routeWhileDragging: false,
//       createMarker: () => null,
//       addWaypoints: false
//     })
//       .on('routesfound', function (e) {
//         const coordinates = e.routes[0].coordinates.map(coord => [coord.lat, coord.lng]);
//         console.log("Route found:", coordinates);
//         setRoutePath(coordinates);
//       })
//       .addTo(mapRef.current);
//   };

//   return (
//     <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
//       <div className="controls">
//         <input
//           type="text"
//           placeholder="Start (lat,lng)"
//           value={start}
//           onChange={(e) => setStart(e.target.value)}
//         />
//         <input
//           type="text"
//           placeholder="End (lat,lng)"
//           value={end}
//           onChange={(e) => setEnd(e.target.value)}
//         />
//         <button onClick={drawRoute}>Draw Safe Route</button>
//       </div>

//       <div style={{ flex: 1 }}>
//         <MapContainer
//           center={[28.61, 77.23]}
//           zoom={13}
//           className="leaflet-container"
//           whenCreated={(mapInstance) => (mapRef.current = mapInstance)}

    
//         >
//           <Polyline
//              positions={[
//              [28.61, 77.23],
//              [28.615, 77.235],
//              [28.62, 77.24]
//           ]}
//           pathOptions={{ color: 'blue', weight: 5 }}
//           interactive={true}
//           eventHandlers={{
//           click: (e) => {
//           alert('Clicked on route!');
//         }
//   }}
// />



//           {/* <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

//           {routePath.length > 0 && (
//             <Polyline
//               positions={routePath}
//               pathOptions={{ color: 'blue', weight: 5 }}
//               interactive={true}
//               eventHandlers={{
//                 click: (e) => handleRouteClick(e.latlng)
//               }}
//             />
//           )}

//           {feedbackTarget && (
//             <Marker position={feedbackTarget.latlng}>
//               <Popup onClose={() => setFeedbackTarget(null)}>
//                 <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '200px' }}>
//                   <p>
//                     🔍 This route is currently rated:
//                     <br />
//                     <strong>
//                       {feedbackTarget.stats.safeVotes >= feedbackTarget.stats.unsafeVotes ? 'Safe' : 'Unsafe'}
//                     </strong>
//                     <br />
//                     (Safe: {feedbackTarget.stats.safeVotes}, Unsafe: {feedbackTarget.stats.unsafeVotes})
//                   </p>
//                   <p>Do you agree?</p>
//                   <div style={{ display: 'flex', justifyContent: 'space-around' }}>
//                     <button
//                       style={{ backgroundColor: 'green', color: 'white', padding: '6px 12px', borderRadius: '4px', border: 'none' }}
//                       onClick={() => {
//                         alert('Thanks for your feedback: Safe!');
//                         setFeedbackTarget(null);
//                       }}
//                     >
//                       ✅ Safe
//                     </button>
//                     <button
//                       style={{ backgroundColor: 'red', color: 'white', padding: '6px 12px', borderRadius: '4px', border: 'none' }}
//                       onClick={() => {
//                         alert('Thanks for your feedback: Unsafe!');
//                         setFeedbackTarget(null);
//                       }}
//                     >
//                       ❌ Unsafe
//                     </button>
//                   </div>
//                 </div>
//               </Popup>
//             </Marker>
//           )} */}
//         </MapContainer>
//       </div>
//     </div>
//   );
// }







// import { useState, useRef } from 'react';
// import {
//   MapContainer,
//   TileLayer,
//   Marker,
//   Popup,
//   Polyline
// } from 'react-leaflet';
// import L from 'leaflet';
// import 'leaflet/dist/leaflet.css';
// import 'leaflet-routing-machine';
// import './App.css';

// // Fix icon issue with Leaflet
// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
//   iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
//   shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
// });

// export default function App() {
//   const [markers, setMarkers] = useState([]);
//   const [start, setStart] = useState('');
//   const [end, setEnd] = useState('');
//   const [routePath, setRoutePath] = useState([]);
//   const [feedbackTarget, setFeedbackTarget] = useState(null);
//   const mapRef = useRef(null);
//   const routingRef = useRef(null);

//   const handleVote = (lat, lng, vote) => {
//     setMarkers([...markers, { lat, lng, vote }]);
//   };

//   const handleRouteClick = (latlng) => {
//     console.log("Route clicked at:", latlng);
     
//     const stats = {
//       safeVotes: 8,
//       unsafeVotes: 2
//     };
//     setFeedbackTarget({ latlng, stats });
//   };

//   const drawRoute = () => {
//     if (!start || !end || !mapRef.current) return;

//     if (routingRef.current) {
//       mapRef.current.removeControl(routingRef.current);
//     }

//     const [startLat, startLng] = start.split(',').map(Number);
//     const [endLat, endLng] = end.split(',').map(Number);

//     routingRef.current = L.Routing.control({
//       waypoints: [
//         L.latLng(startLat, startLng),
//         L.latLng(endLat, endLng)
//       ],
//       routeWhileDragging: true,
//       createMarker: () => null,
//       addWaypoints: false
//     })
//     .on('routesfound', function (e) {
//       const coordinates = e.routes[0].coordinates.map(coord => [coord.lat, coord.lng]);
//       console.log("Route coordinates:", coordinates);
//       setRoutePath(coordinates);
//     })
//     .addTo(mapRef.current);
//   };

//   return (
//     <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
//       <div className="controls">
//         <input
//           type="text"
//           placeholder="Start (lat,lng)"
//           value={start}
//           onChange={(e) => setStart(e.target.value)}
//         />
//         <input
//           type="text"
//           placeholder="End (lat,lng)"
//           value={end}
//           onChange={(e) => setEnd(e.target.value)}
//         />
//         <button onClick={drawRoute}>Draw Safe Route</button>
//       </div>

//       <div style={{ flex: 1 }}>
//         <MapContainer
//           center={[28.61, 77.23]}
//           zoom={13}
//           className="leaflet-container"
//           whenCreated={(mapInstance) => (mapRef.current = mapInstance)}
//         >
//           <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

//           {markers.map((marker, index) => (
//             <Marker
//               key={index}
//               position={[marker.lat, marker.lng]}
//               icon={new L.Icon({
//                 iconUrl: `http://maps.google.com/mapfiles/ms/icons/${marker.vote === 'safe' ? 'green' : 'red'}-dot.png`,
//                 iconSize: [32, 32]
//               })}
//             >
//               <Popup>
//                 Voted: <strong>{marker.vote.toUpperCase()}</strong>
//               </Popup>
//             </Marker>
//           ))}

//           {routePath.length > 0 && (
//             <Polyline
//               positions={routePath}
//               pathOptions={{ color: 'blue', weight: 5 }}
//               interactive={true}
//               eventHandlers={{
//                 click: (e) => handleRouteClick(e.latlng)
//               }}
//             />
//           )}

//           {feedbackTarget && (
//             <Marker position={feedbackTarget.latlng}>
//               <Popup onClose={() => setFeedbackTarget(null)}>
//                 <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '200px' }}>
//                   <p>
//                     🔍 This route is currently rated:
//                     <br />
//                     <strong>
//                       {feedbackTarget.stats.safeVotes >= feedbackTarget.stats.unsafeVotes ? 'Safe' : 'Unsafe'}
//                     </strong>
//                     <br />
//                     (Safe: {feedbackTarget.stats.safeVotes}, Unsafe: {feedbackTarget.stats.unsafeVotes})
//                   </p>
//                   <p>Do you agree?</p>
//                   <div style={{ display: 'flex', justifyContent: 'space-around' }}>
//                     <button
//                       style={{ backgroundColor: 'green', color: 'white', padding: '6px 12px', borderRadius: '4px', border: 'none' }}
//                       onClick={() => {
//                         alert('Thanks for your feedback: Safe!');
//                         setFeedbackTarget(null);
//                       }}
//                     >
//                       ✅ Safe
//                     </button>
//                     <button
//                       style={{ backgroundColor: 'red', color: 'white', padding: '6px 12px', borderRadius: '4px', border: 'none' }}
//                       onClick={() => {
//                         alert('Thanks for your feedback: Unsafe!');
//                         setFeedbackTarget(null);
//                       }}
//                     >
//                       ❌ Unsafe
//                     </button>
//                   </div>
//                 </div>
//               </Popup>
//             </Marker>
//           )}
//         </MapContainer>
//       </div>
//     </div>
//   );
// }
















// import { useState, useRef } from 'react';
// import {
//   MapContainer,
//   TileLayer,
//   Marker,
//   Popup,
//   Polyline,
//   useMapEvents
// } from 'react-leaflet';
// import L from 'leaflet';
// import 'leaflet/dist/leaflet.css';
// import 'leaflet-routing-machine';
// import './App.css';

// // Fix icon issue with Leaflet
// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
//   iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
//   shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
// });

// function ClickToVote({ onVote }) {
//   useMapEvents({
//     click(e) {
//       const isSafe = window.confirm("Mark as SAFE? Cancel = UNSAFE");
//       onVote(e.latlng.lat, e.latlng.lng, isSafe ? 'safe' : 'unsafe');
//     }
//   });
//   return null;
// }

// export default function App() {
//   const [markers, setMarkers] = useState([]);
//   const [start, setStart] = useState('');
//   const [end, setEnd] = useState('');
//   const [routePath, setRoutePath] = useState([]);
//   const [feedbackTarget, setFeedbackTarget] = useState(null);
//   const mapRef = useRef(null);
//   const routingRef = useRef(null);

//   const handleVote = (lat, lng, vote) => {
//     setMarkers([...markers, { lat, lng, vote }]);
//   };

//   const handleRouteClick = (latlng) => {
//     const stats = {
//       safeVotes: 8,
//       unsafeVotes: 2
//     };
//     setFeedbackTarget({ latlng, stats });
//   };

//   const drawRoute = () => {
//     if (!start || !end || !mapRef.current) return;

//     if (routingRef.current) {
//       mapRef.current.removeControl(routingRef.current);
//     }

//     const [startLat, startLng] = start.split(',').map(Number);
//     const [endLat, endLng] = end.split(',').map(Number);

//     routingRef.current = L.Routing.control({
//       waypoints: [
//         L.latLng(startLat, startLng),
//         L.latLng(endLat, endLng)
//       ],
//       routeWhileDragging: true,
//       createMarker: () => null,
//       addWaypoints: false
//     })
//     .on('routesfound', function (e) {
//       const coordinates = e.routes[0].coordinates.map(coord => [coord.lat, coord.lng]);
//       setRoutePath(coordinates);
//     })
//     .addTo(mapRef.current);
//   };

//   return (
//     <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
//       <div className="controls">
//         <input
//           type="text"
//           placeholder="Start (lat,lng)"
//           value={start}
//           onChange={(e) => setStart(e.target.value)}
//         />
//         <input
//           type="text"
//           placeholder="End (lat,lng)"
//           value={end}
//           onChange={(e) => setEnd(e.target.value)}
//         />
//         <button onClick={drawRoute}>Draw Safe Route</button>
//       </div>

//       <div style={{ flex: 1 }}>
//         <MapContainer
//           center={[28.61, 77.23]}
//           zoom={13}
//           className="leaflet-container"
//           whenCreated={(mapInstance) => (mapRef.current = mapInstance)}
//         >
//           <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          

//           {markers.map((marker, index) => (
//             <Marker
//               key={index}
//               position={[marker.lat, marker.lng]}
//               icon={new L.Icon({
//                 iconUrl: `http://maps.google.com/mapfiles/ms/icons/${marker.vote === 'safe' ? 'green' : 'red'}-dot.png`,
//                 iconSize: [32, 32]
//               })}
//             >
//               <Popup>
//                 Voted: <strong>{marker.vote.toUpperCase()}</strong>
//               </Popup>
//             </Marker>
//           ))}

//           {routePath.length > 0 && (
//             <Polyline
//               positions={routePath}
//               pathOptions={{ color: 'blue', weight: 5 }}
//               eventHandlers={{
//                 click: (e) => handleRouteClick(e.latlng)
//               }}
//             />
//           )}

//           {feedbackTarget && (
//             <Marker position={feedbackTarget.latlng}>
//               <Popup onClose={() => setFeedbackTarget(null)}>
//                 <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '200px' }}>
//                   <p>
//                     🔍 This route is currently rated:
//                     <br />
//                     <strong>
//                       {feedbackTarget.stats.safeVotes >= feedbackTarget.stats.unsafeVotes ? 'Safe' : 'Unsafe'}
//                     </strong>
//                     <br />
//                     (Safe: {feedbackTarget.stats.safeVotes}, Unsafe: {feedbackTarget.stats.unsafeVotes})
//                   </p>
//                   <p>Do you agree?</p>
//                   <div style={{ display: 'flex', justifyContent: 'space-around' }}>
//                     <button
//                       style={{ backgroundColor: 'green', color: 'white', padding: '6px 12px', borderRadius: '4px', border: 'none' }}
//                       onClick={() => {
//                         alert('Thanks for your feedback: Safe!');
//                         setFeedbackTarget(null);
//                       }}
//                     >
//                       ✅ Safe
//                     </button>
//                     <button
//                       style={{ backgroundColor: 'red', color: 'white', padding: '6px 12px', borderRadius: '4px', border: 'none' }}
//                       onClick={() => {
//                         alert('Thanks for your feedback: Unsafe!');
//                         setFeedbackTarget(null);
//                       }}
//                     >
//                       ❌ Unsafe
//                     </button>
//                   </div>
//                 </div>
//               </Popup>
//             </Marker>
//           )}
//         </MapContainer>
//       </div>
//     </div>
//   );
// }











