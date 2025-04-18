// src/screens/User/BarsForGame.js
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, SafeAreaView } from 'react-native';
import axios from 'axios';
import { useRoute, useNavigation } from '@react-navigation/native';

import { UserContext } from '../../context/UserContext';
import { API_BASE_URL } from '../../config/api';
// You might not need date formatting here unless showing screening times again

const BarsForGame = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { token } = useContext(UserContext); // Get auth token

  // Get params passed from GameSearchScreen
  const { external_game_id, gameTitle } = route.params || {};

  // State
  const [bars, setBars] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch bars showing the game
  useEffect(() => {
    if (!external_game_id || !token) {
      setError("Game ID missing or not logged in.");
      setBars([]);
      return;
    }

    const fetchBarsForGame = async () => {
      setIsLoading(true);
      setError(null);
      setBars([]);

      console.log(`Fetching bars for game ID: ${external_game_id}`);

      try {
        const response = await axios.get(
          `${API_BASE_URL}/screenings/game/${external_game_id}/bars`,
          {
            headers: { Authorization: `Bearer ${token}` }, // Include auth token
          }
        );
        console.log('Bars for game response:', response.data);
        setBars(response.data || []);
        if (response.data.length === 0) {
            setError("No bars found showing this game."); // Informative message
        }
      } catch (err) {
        console.error("Error fetching bars for game:", err.response?.data || err.message);
        // Check for specific errors like 401 Unauthorized if token is bad
        if (err.response?.status === 401) {
             setError("Your session has expired. Please log in again.");
             // Optional: Trigger logout?
        } else {
            setError(err.response?.data?.message || 'Failed to fetch bars. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchBarsForGame();
  }, [external_game_id, token]); // Re-fetch if game ID or token changes

  // --- Navigate to Bar Details ---
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
      {/* Optional: Show description if available */}
      {item.description && <Text style={styles.itemDescription}>{item.description}</Text>}
    </TouchableOpacity>
  );

  // --- Screen Content ---
  return (
    <SafeAreaView style={styles.screenContainer}>
      <Text style={styles.headerTitle}>{gameTitle || 'Bars Showing Game'}</Text>

      {isLoading && <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />}

      {error && !isLoading && ( // Show error only if not loading
          <Text style={styles.errorText}>{error}</Text>
      )}

      {!isLoading && !error && bars.length > 0 && ( // Show list only if no error and bars exist
        <FlatList
          data={bars}
          renderItem={renderBarItem}
          keyExtractor={(item) => item.id.toString()} // Use bar's unique DB ID
          style={styles.list}
        />
      )}
    </SafeAreaView>
  );
};

// --- Styles --- (Adapt as needed)
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