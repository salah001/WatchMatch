// src/screens/Owner/ViewBarScreenings.js
import React, { useState, useContext, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl, Button, Platform } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { UserContext } from '../../context/UserContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = 'http://192.168.1.20:5000';

// Helper to format date/time nicely
const formatScreeningTime = (isoString) => {
    try {
        const date = new Date(isoString);
        if (isNaN(date)) return "Invalid Date";
        // Example format: "Apr 15, 2025, 3:30 PM"
        return date.toLocaleString(undefined, { // Use locale default
             year: 'numeric', month: 'short', day: 'numeric',
             hour: 'numeric', minute: '2-digit', hour12: true
        });
    } catch (e) {
        return "Invalid Date";
    }
};


const ViewBarScreenings = () => {
  const { token } = useContext(UserContext);
  const navigation = useNavigation();
  const route = useRoute();

  const { barId, barName } = route.params || {};

  const [screenings, setScreenings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- Fetch Screenings for this Bar ---
  const fetchScreenings = useCallback(async () => {
    if (!token || !barId) {
      setError("Authentication token or Bar ID missing.");
      setIsLoading(false);
      setIsRefreshing(false);
      setScreenings([]);
      return;
    }

    // Use setIsLoading only for initial load, not subsequent refreshes triggered by pull
    if (!isRefreshing) setIsLoading(true);
    setError(null);

    try {
      console.log(`Fetching screenings for barId: ${barId}...`);
      // Use the specific endpoint for bar screenings
      const response = await axios.get(`${API_URL}/screenings/bar/${barId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Screenings response:", response.data);
      // Ensure the backend returns an array directly
      // If response.data has a nested structure like { screenings: [...] }, adjust accordingly
      setScreenings(response.data || []);
    } catch (err) {
      console.error("Error fetching bar screenings:", err.response?.data || err.message);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Failed to fetch screenings.';
      setError(errorMessage);
      if (Platform.OS === 'web') toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token, barId, isRefreshing]); // Include isRefreshing dependency? Maybe not needed if setIsLoading handles it.

  // --- Fetch data when screen comes into focus ---
  useFocusEffect(
    useCallback(() => {
      console.log("ViewBarScreenings focused, fetching screenings...");
      fetchScreenings();
    }, [fetchScreenings])
  );

  // --- Handler for pull-to-refresh ---
  const onRefresh = useCallback(() => {
      console.log("Refreshing screenings list...");
      setIsRefreshing(true);
      fetchScreenings();
  }, [fetchScreenings]);

  // --- Handler for pressing an item (Future: Edit/Delete) ---
  const handleScreeningPress = (screening) => {
      console.log("Pressed screening:", screening);
      // Future: navigation.navigate('EditScreening', { screeningId: screening.screening_id });
      alert(`Details for Screening ID: ${screening.screening_id}\nGame: ${screening.game?.homeTeam} vs ${screening.game?.awayTeam}`);
  };

  // --- Render Function for each list item ---
  const renderScreeningItem = ({ item }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => handleScreeningPress(item)}
    >
      <View style={styles.itemContent}>
          {/* Display Game Info - Safely access nested properties */}
          <Text style={styles.itemTitle}>
              {item.game?.homeTeam || 'Team A'} vs {item.game?.awayTeam || 'Team B'}
          </Text>
          <Text style={styles.itemSubtitle}>
              {item.game?.sport || 'Unknown Sport'} - {item.game?.league || 'Unknown League'}
          </Text>
          {/* Display Formatted Screening Time */}
          <Text style={styles.itemTime}>
             Showing at: {formatScreeningTime(item.screening_time)}
          </Text>
          {/* Display Game Status if available */}
          {item.game?.status && item.game.status !== 'Scheduled' && (
               <Text style={styles.itemStatus}>Game Status: {item.game.status}</Text>
          )}
      </View>
       {/* Optional: Add an indicator like a chevron icon '>' */}
       <Text style={styles.itemChevron}>></Text>
    </TouchableOpacity>
  );

  // --- Conditional Content Rendering ---
  const renderContent = () => {
    if (isLoading && !isRefreshing) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text>Loading screenings for {barName}...</Text>
        </View>
      );
    }

    if (error && screenings.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <Button title="Retry" onPress={fetchScreenings} />
        </View>
      );
    }

    if (!isLoading && screenings.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.infoText}>No screenings scheduled for {barName} yet.</Text>
           {/* Optionally add a button to navigate directly to AddScreening? */}
          <Button title="Add a Screening" onPress={() => navigation.navigate('AddScreening', { barId })}/>
        </View>
      );
    }

    return (
      <FlatList
        data={screenings}
        renderItem={renderScreeningItem}
        keyExtractor={(item) => item.screening_id.toString()}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={
            <>
                {/* Optional: Display bar name again */}
                {/* <Text style={styles.listHeader}>Screenings at {barName}</Text> */}
                {error ? <Text style={[styles.errorText, styles.errorHeader]}>Could not refresh: {error}</Text> : null}
            </>
        }
        refreshControl={
            <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                colors={["#007AFF"]}
                tintColor={"#007AFF"}
            />
        }
      />
    );
  };

  // --- Main Return ---
   // Ensure barId was passed correctly
  if (!barId) {
     return (
         <View style={styles.centerContainer}>
             <Text style={styles.errorText}>Error: No Bar ID provided.</Text>
             {navigation.canGoBack() && <Button title="Go Back" onPress={() => navigation.goBack()} />}
         </View>
     );
  }

  return (
      <View style={styles.screenContainer}>
          {renderContent()}
      </View>
  );
};

// --- Styles --- (Similar to MyBarsListScreen, adjust as needed)
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa', // Slightly different background
  },
  listContainer: {
    paddingBottom: 20, // Space at bottom of list
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  itemContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginVertical: 4, // Tighter spacing
    marginHorizontal: 10,
    borderRadius: 6, // Slightly less rounded
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1, // Add subtle border
    borderColor: '#e9ecef'
  },
  itemContent: {
      flex: 1, // Allow content to take available space
      marginRight: 10, // Space before chevron
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529', // Darker text
  },
  itemSubtitle: {
    fontSize: 13,
    color: '#6c757d', // Greyer text
    marginTop: 3,
  },
  itemTime: {
     fontSize: 14,
     color: '#007bff', // Blue for time?
     fontWeight: '500',
     marginTop: 6,
  },
  itemStatus: {
      fontSize: 13,
      color: '#ffc107', // Yellowish for status?
      fontWeight: '500',
      marginTop: 4,
      fontStyle: 'italic',
  },
  itemChevron: {
      fontSize: 18,
      color: '#ced4da', // Lighter chevron
  },
  errorText: {
    color: '#dc3545', // Bootstrap danger red
    textAlign: 'center',
    marginBottom: 10,
  },
  errorHeader: {
      padding: 10,
      backgroundColor: '#f8d7da',
      marginHorizontal: 10,
      borderRadius: 5,
      marginBottom: 10, // Space below header error
  },
  infoText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
    color: '#6c757d',
  },
  listHeader: { // Optional header style
      fontSize: 18,
      fontWeight: '600',
      padding: 15,
      textAlign: 'center',
      color: '#495057',
  }
});

export default ViewBarScreenings;