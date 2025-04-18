// src/screens/Owner/MyBarsListScreen.js
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, Text, Button, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native'; // Import useFocusEffect
import { UserContext } from '../../context/UserContext';
import axios from 'axios'; // Using axios as in BarFormScreen
import { toast } from 'react-toastify'; // For web error notifications
import { Platform } from 'react-native'; // For platform checks

// Ensure this matches your actual backend address
const API_URL = 'http://192.168.1.20:5000';

const MyBarsListScreen = () => {
  const { token } = useContext(UserContext);
  const navigation = useNavigation();
  const [bars, setBars] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false); // For pull-to-refresh

  const fetchOwnedBars = useCallback(async () => {
    if (!token) {
      setError("Authentication token not found.");
      setIsLoading(false);
      setIsRefreshing(false); // Stop refreshing indicator if token disappears
      setBars([]); // Clear bars if no token
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("Fetching owned bars...");
      const response = await axios.get(`${API_URL}/bars/owned`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("Owned bars response:", response.data);
      setBars(response.data.bars || []); // Ensure response structure is handled
    } catch (err) {
      console.error("Error fetching owned bars:", err.response?.data || err.message);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Failed to fetch your bars.';
      setError(errorMessage);
      // Optionally show toast on web
      if (Platform.OS === 'web') {
          toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false); // Stop refreshing indicator
    }
  }, [token]); // Dependency: fetch again if token changes

  // --- Fetch data when the screen comes into focus ---
  // useFocusEffect is better than useEffect for refetching when navigating back
  useFocusEffect(
    useCallback(() => {
      console.log("MyBarsListScreen focused, fetching bars...");
      fetchOwnedBars();

      // Optional cleanup function (can be useful but not strictly needed here)
      // return () => console.log("MyBarsListScreen unfocused");
    }, [fetchOwnedBars]) // Re-run if the fetchOwnedBars function instance changes (due to token)
  );

  // --- Handler for pull-to-refresh ---
  const onRefresh = useCallback(() => {
      console.log("Refreshing bars list...");
      setIsRefreshing(true); // Show refresh indicator
      fetchOwnedBars(); // Re-fetch data
  }, [fetchOwnedBars]); // Dependency


  // --- Handler for pressing a bar item ---
  const handleBarPress = (barId, barName) => {
    console.log(`Navigating to BarManagement for barId: ${barId}, name: ${barName}`);
    navigation.navigate('BarManagement', {
      barId: barId, // Pass barId
      barName: barName, // Pass barName (for the screen title)
    });
  };

  // --- Render Function for each list item ---
  const renderBarItem = ({ item }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => handleBarPress(item.id, item.name)}
    >
      <View>
        <Text style={styles.itemTitle}>{item.name}</Text>
        <Text style={styles.itemSubtitle}>{item.address}</Text>
        {/* Optional: Show description snippet */}
        {/* <Text style={styles.itemDescription} numberOfLines={1}>{item.description}</Text> */}
      </View>
      {/* Optional: Add an indicator like a chevron icon '>' */}
       <Text style={styles.itemChevron}>></Text>
    </TouchableOpacity>
  );

  // --- Conditional Content Rendering ---
  const renderContent = () => {
    if (isLoading && !isRefreshing) { // Show initial loading indicator
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text>Loading your bars...</Text>
        </View>
      );
    }

    if (error && bars.length === 0) { // Show error only if no bars loaded previously
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <Button title="Retry" onPress={fetchOwnedBars} />
        </View>
      );
    }

    if (!isLoading && bars.length === 0) { // Show message if no bars found
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.infoText}>You haven't registered any bars yet.</Text>
          <Button title="Register a Bar" onPress={() => navigation.navigate('BarForm')} />
        </View>
      );
    }

    // --- Render the List ---
    return (
      <FlatList
        data={bars}
        renderItem={renderBarItem}
        keyExtractor={(item) => item.id.toString()} // Use unique ID
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={error ? <Text style={[styles.errorText, styles.errorHeader]}>Could not refresh: {error}</Text> : null} // Show refresh error at top
        refreshControl={ // Enable pull-to-refresh
            <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                colors={["#007AFF"]} // Spinner color (Android)
                tintColor={"#007AFF"} // Spinner color (iOS)
            />
        }
      />
    );
  };

  return (
      <View style={styles.screenContainer}>
          {renderContent()}
      </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    paddingVertical: 10,
  },
  centerContainer: { // For loading, error, empty states
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  itemContainer: {
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 5,
    marginHorizontal: 10,
    borderRadius: 8,
    flexDirection: 'row', // Arrange content and chevron side-by-side
    justifyContent: 'space-between', // Push content and chevron apart
    alignItems: 'center', // Vertically center items
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
//   itemDescription: {
//       fontSize: 12,
//       color: '#888',
//       marginTop: 4,
//   },
  itemChevron: {
      fontSize: 20,
      color: '#ccc',
      fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorHeader: { // Specific style for error shown above list
      padding: 15,
      backgroundColor: '#ffe0e0', // Light red background
      marginHorizontal: 10,
      borderRadius: 5,
  },
  infoText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
    color: '#555',
  },
});

export default MyBarsListScreen;