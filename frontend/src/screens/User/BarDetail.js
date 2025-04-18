// frontend/screens/User/BarDetail.js
import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, SafeAreaView } from 'react-native';
import axios from 'axios';
import { useRoute } from '@react-navigation/native';

import { UserContext } from '../../context/UserContext'; // Import context for token
import { API_BASE_URL } from '../../config/api'; // Use config
import { formatApiDateTime } from '../../utils/dateTimeUtils'; // Use formatter

const BarDetail = ({ route }) => {
  
  const { barId, barName } = route.params || {};
  const { token } = useContext(UserContext);
  
  const [bar, setBar] = useState(null);
  const [screenings, setScreenings] = useState([]);
  const [loadingBar, setLoadingBar] = useState(true);
  const [loadingScreenings, setLoadingScreenings] = useState(true);
  const [error, setError] = useState(null);

 // Fetch Bar Details
  useEffect(() => {
    if (!barId) {
      setError("Bar ID not provided.");
      setLoadingBar(false);
      setLoadingScreenings(false); // Also stop screening loading
      return;
    }

    const fetchBar = async () => {
      setLoadingBar(true);
      setError(null); // Reset error on new fetch attempt
      try {
        console.log(`Fetching details for bar ID: ${barId}`);
        // Assume /bars/:id exists and is public or requires auth?
        // Let's assume public for now based on bars.js GET /:bar_id
        const barRes = await axios.get(`${API_BASE_URL}/bars/${barId}`);
        setBar(barRes.data);
      } catch (err) {
        console.error("Error fetching bar details:", err.response?.data || err.message);
        setError("Could not load bar details.");
      } finally {
        setLoadingBar(false);
      }
    };

    fetchBar();
  }, [barId]); // Re-fetch if barId changes

  // Fetch Screenings for this Bar
  useEffect(() => {
    // Only fetch screenings if we have a barId and token
    if (!barId || !token) {
      setLoadingScreenings(false);
      // Don't set error here if bar fetching failed, avoid duplicate messages
      return;
    }

    const fetchScreenings = async () => {
      setLoadingScreenings(true);
      // Don't reset general error, maybe screenings fail independently
      try {
        console.log(`Fetching screenings for bar ID: ${barId}`);
        const screeningRes = await axios.get(
          `${API_BASE_URL}/screenings/bar/${barId}`,
          {
            headers: { Authorization: `Bearer ${token}` }, // Add Auth token
          }
        );
        console.log("Screenings for bar:", screeningRes.data);
        // Ensure backend returns array, even if empty []
        setScreenings(screeningRes.data || []);

      } catch (err) {
        console.error("Error fetching bar screenings:", err.response?.data || err.message);
       
         if (err.response?.status === 401) {
             setError(prevError => prevError ? `${prevError} Also failed to load screenings (Session expired).` : "Failed to load screenings (Session expired). Please log in again.");
         } else {
	     setError(prevError => prevError ? `${prevError} Also failed to load screenings.` : "Failed to load screenings.");
	 }
      } finally {
        setLoadingScreenings(false);
      }
    };
    fetchScreenings();
  }, [barId, token]); // Re-fetch if barId or token changes



  // --- Render Loading/Error/Content ---
  if (loadingBar) {
      return <View style={styles.centerContainer}><ActivityIndicator size="large" /></View>;
  }

  if (error && !bar) { // If bar fetch failed critically
      return <View style={styles.centerContainer}><Text style={styles.errorText}>{error}</Text></View>;
  }

  if (!bar) { // Should not happen if error handling is correct, but safeguard
      return <View style={styles.centerContainer}><Text style={styles.errorText}>Bar data not available.</Text></View>;
  }

  // --- Render Bar Details and Screenings ---
  return (
    <SafeAreaView style={styles.screenContainer}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.name}>{bar.name || barName || 'Bar Details'}</Text>
        <Text style={styles.address}>{bar.address}</Text>
        {bar.description && <Text style={styles.description}>{bar.description}</Text>}

        <Text style={styles.sectionTitle}>Upcoming Screenings:</Text>
        {loadingScreenings ? (
          <ActivityIndicator style={{ marginTop: 15}} />
        ) : error && screenings.length === 0 ? ( // Show error if screenings failed AND list is empty
           <Text style={[styles.errorText, {marginTop: 10}]}>{error.includes('screenings') ? error : 'Could not load screenings.'}</Text>
        ) : !loadingScreenings && screenings.length === 0 ? (
          <Text style={styles.infoText}>No screenings currently listed for this bar.</Text>
        ) : (
          screenings.map((s) => ( // Use screening_id from backend for key
            <View key={s.screening_id} style={styles.screening}>
              {/* --- Corrected Data Access --- */}
              <Text style={styles.screeningTitle}>
                  {s.game?.homeTeam || 'Team A'} vs {s.game?.awayTeam || 'Team B'}
              </Text>
              <Text style={styles.screeningLeague}>{s.game?.league || 'Unknown League'}</Text>
              <Text style={styles.screeningTime}>
                {formatApiDateTime(s.screening_time)}
              </Text>
              {s.game?.status && s.game.status !== 'Scheduled' && (
                  <Text style={styles.screeningStatus}>({s.game.status})</Text>
              )}
               {s.game?.error && ( // Show if game details couldn't be fetched by backend
                   <Text style={styles.errorTextSmall}>Game details unavailable</Text>
               )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// --- Styles --- (Refined)
const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: '#fff' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20},
  container: { padding: 20 },
  name: { fontSize: 24, fontWeight: 'bold', marginBottom: 5, color: '#333' },
  address: { fontSize: 16, color: '#555', marginBottom: 10 },
  description: { fontSize: 14, color: '#777', fontStyle: 'italic', marginBottom: 20 },
  sectionTitle: { fontSize: 18, marginTop: 15, marginBottom: 10, fontWeight: '600', color: '#444', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15 },
  screening: {
      marginBottom: 15,
      borderBottomWidth: 1,
      borderColor: '#f0f0f0',
      paddingBottom: 15
  },
  screeningTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: '#333',
  },
  screeningLeague: {
      fontSize: 13,
      color: '#888',
      marginTop: 2,
  },
  screeningTime: {
      fontSize: 14,
      color: '#007AFF',
      marginTop: 5,
      fontWeight: '500',
  },
  screeningStatus: {
      fontSize: 13,
      color: '#E67E22', // Orange color for status
      fontStyle: 'italic',
      marginLeft: 5,
  },
  infoText: {
    fontSize: 15,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 15,
  },
  errorText: {
    color: '#dc3545',
    textAlign: 'center',
    fontSize: 15,
  },
   errorTextSmall: {
       fontSize: 12,
       color: '#dc3545',
       fontStyle: 'italic',
       marginTop: 3,
   }
});

export default BarDetail;
