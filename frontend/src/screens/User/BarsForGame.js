// src/screens/User/BarsForGame.js
import * as Location from 'expo-location'; // Import expo-location
import React, { useState, useEffect, useContext } from 'react'; // Keep React imports
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, SafeAreaView } from 'react-native'; // Keep RN imports
import axios from 'axios'; // Keep axios
import { useRoute, useNavigation } from '@react-navigation/native'; // Keep navigation imports

import { UserContext } from '../../context/UserContext'; // Keep context import
import { API_BASE_URL } from '../../config/api'; // Keep API base URL import

// --- Start of the Component ---
const BarsForGame = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { token } = useContext(UserContext); // Get auth token

  // --- State Variables ---
  // Location State
  const [location, setLocation] = useState(null); // To store { latitude, longitude }
  const [locationErrorMsg, setLocationErrorMsg] = useState(null);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false); // Track permission status

  // Passed Params
  const { external_game_id, gameTitle } = route.params || {};

  // Data State
  const [bars, setBars] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // For fetching bars
  const [error, setError] = useState(null); // For fetching bars error

  // --- useEffect for Location 
  useEffect(() => {
    (async () => {
      console.log("Requesting location permission...");
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationErrorMsg('Permission to access location was denied');
        console.warn('Location permission denied');
        setLocationPermissionGranted(false);
        // Decide what to do here: Fetch ALL bars? Show error?
        return;
      }
      setLocationPermissionGranted(true);
      console.log("Location permission granted.");

      try {
        console.log("Getting current position...");
        let currentPosition = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation({
          latitude: currentPosition.coords.latitude,
          longitude: currentPosition.coords.longitude,
        });
        console.log("Location obtained:", currentPosition.coords);
        setLocationErrorMsg(null); // Clear any previous location error
      } catch (error) {
          console.error("Error getting location:", error);
          setLocationErrorMsg("Could not retrieve location. Please ensure location services are enabled.");
          setLocation(null); // Clear location if fetching failed
      }
    })(); // Immediately invoke the async function
  }, []); // Empty dependency array means this runs once on mount

  // --- useEffect for Fetching Bars 
  useEffect(() => {
    // Wait until we have the game ID, token, AND location permission status decided.
    // Also wait until we actually have a location if permission was granted.
    if (!external_game_id || !token || locationPermissionGranted === null) {
        // Don't fetch if basic requirements aren't met or permission status is unknown
        return;
    }

    // Decide if we should fetch nearby or all (based on permission and location availability)
    const canFetchNearby = locationPermissionGranted && location;

    const fetchBarsForGame = async () => {
      setIsLoading(true);
      setError(null);
      setBars([]); // Clear previous bars

    // ---- Construct API URL and Params ----
      let apiUrl = `${API_BASE_URL}/screenings/game/${external_game_id}/bars`;
      let config = {
          headers: { Authorization: `Bearer ${token}` },
          params: {} // Initialize params object
      };
  
      if (canFetchNearby) {
          console.log(`Fetching nearby bars for game ID: ${external_game_id} near Lat: ${location.latitude}, Lon: ${location.longitude}`);
          // Add lat/lon as query parameters
          config.params.lat = location.latitude;
          config.params.lon = location.longitude;
          config.params.radius = 10000; // Example: 10km radius in meters, make configurable later?
      } else {
           // Log based on why we're not fetching nearby
           if (!locationPermissionGranted) {
               console.log(`Location permission denied. Fetching all bars for game ID: ${external_game_id}`);
               setError("Showing all bars for game (location permission denied)."); // Inform user
           } else {
               console.log(`Location not available yet. Fetching all bars for game ID: ${external_game_id}`);
               // Don't set an error here, just proceed with fetching all
           }
          // No location params needed for fallback
      }
      // ------------------------------------

    
      try {
        const response = await axios.get(apiUrl, config); // Current endpoint
      
        console.log('Bars for game response:', response.data);
        setBars(response.data || []);
        if (!response.data || response.data.length === 0) {
            // Adjust message based on whether we searched nearby or not
            if (canFetchNearby) {
                 setError("No bars found showing this game near your location.");
            } else {
                 setError("No bars found showing this game."); // Original message for fallback
            }
        }
      } catch (err) {
        console.error("Error fetching bars for game:", err.response?.data || err.message);
        if (err.response?.status === 401) {
             setError("Your session has expired. Please log in again.");
        } else {
            setError(err.response?.data?.message || 'Failed to fetch bars. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchBarsForGame();
    // Dependency arra
  }, [external_game_id, token, location, locationPermissionGranted]); // Re-fetch if game ID or token changes


  // --- Navigation Handler ---
  const handleBarPress = (bar) => {
      if (!bar || !bar.id) {
          console.error("Invalid bar data for navigation:", bar);
          return;
      }
      console.log(`Navigating to BarDetail for bar ID: ${bar.id}`);
      navigation.navigate('BarDetail', {
          barId: bar.id,
          barName: bar.name // Pass name for title
      });
  };

  // --- Render Bar Item ---
  const renderBarItem = ({ item }) => (
    <TouchableOpacity style={styles.itemContainer} onPress={() => handleBarPress(item)}>
      <Text style={styles.itemTitle}>{item.name}</Text>
      <Text style={styles.itemSubtitle}>{item.address}</Text>
      {item.description && <Text style={styles.itemDescription}>{item.description}</Text>}
    </TouchableOpacity>
  );

  // --- Final Return Statement for the Component ---
  return (
    <SafeAreaView style={styles.screenContainer}>
      <Text style={styles.headerTitle}>{gameTitle || 'Bars Showing Game'}</Text>

      {/* Display Location Status (for debugging) */}
      {locationErrorMsg && <Text style={styles.errorText}>{locationErrorMsg}</Text>}
      {!location && !locationErrorMsg && locationPermissionGranted && <ActivityIndicator size="small" color="#007AFF" />}
      {location && <Text style={{textAlign: 'center', paddingVertical: 5, color: 'green'}}>Location Acquired</Text>}
      {/* You could display coords: {location && <Text>Lat: {location.latitude.toFixed(4)}, Lon: {location.longitude.toFixed(4)}</Text>} */}


      {/* Display Bar Fetching Status and List */}
      {isLoading && <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />}

      {/* Display bars fetch error *unless* it's just because location permission was denied */}
      {error && !isLoading && locationPermissionGranted && (
          <Text style={styles.errorText}>{error}</Text>
      )}

      {/* Display bars list */}
      {!isLoading && bars.length > 0 && (
        <FlatList
          data={bars}
          renderItem={renderBarItem}
          keyExtractor={(item) => item.id.toString()}
          style={styles.list}
        />
      )}

       {/* Message if no bars found *and* no error occurred */}
      {!isLoading && !error && bars.length === 0 && locationPermissionGranted && (
         <Text style={styles.errorText}>No bars found showing this game near you.</Text>
      )}


    </SafeAreaView>
  );
}; // --- End of the Component ---

// --- Styles --- (Keep these outside the component)
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  list: {
    flex: 1, // Takes remaining space
  },
  itemContainer: { // Similar style to GameSearchScreen item
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 5,
    marginHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
  },
  itemSubtitle: {
    fontSize: 14, // Address might be longer
    color: '#6c757d',
    marginTop: 4,
  },
   itemDescription: {
      fontSize: 13,
      color: '#888',
      marginTop: 6,
      fontStyle: 'italic',
  },
  loader: {
    marginTop: 30,
  },
  errorText: { // Similar style to GameSearchScreen error
    color: '#dc3545',
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 15,
    fontSize: 15,
  },
});

export default BarsForGame;