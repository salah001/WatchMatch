import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import DateTimePicker from '@react-native-community/datetimepicker';
import { UserContext } from '../../context/UserContext';
import { Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import axios from 'axios'; 
import { API_BASE_URL } from '../../config/api'; 



const AddScreening = () => {
  const navigation = useNavigation(); // Get navigation object via hook
  const route = useRoute(); 
  const { user, token, loading: userLoading } = useContext(UserContext);
  const preSelectedBarId = route.params?.barId ?? null;
  const [bars, setBars] = useState([]);
  const [games, setGames] = useState([]);
  const [barId, setBarId] = useState('');
  const [gameId, setGameId] = useState('');
  const [screeningTime, setScreeningTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [fetchError, setFetchError] = useState(null);


  useEffect(() => {

  if (preSelectedBarId && barId !== preSelectedBarId) {
        console.log("Setting barId from route param:", preSelectedBarId);
        setBarId(preSelectedBarId);
  }

  if (userLoading || !token) {
      console.log(`⏳ Waiting: User1 Loading=${userLoading}, Token Available=${!!token}`);
      // Reset lists if token becomes null after being set (e.g., logout)
      if (!token && (bars.length > 0 || games.length > 0)) {
         setBars([]);
         setGames([]);
         setBarId('');
         setGameId('');
	 setFetchError(null);
      }
      setIsFetchingData(false);
      return; // Exit early
    }

  const fetchData = async () => {

    setIsFetchingData(true); // Start loading indicator for fetch
    setFetchError(null);
    console.log("👀 Fetching data for AddScreening...");

    try {
	const headers = { Authorization: `Bearer ${token}` };
        const [barsRes, gamesRes] = await axios.all([
        	axios.get(`${API_BASE_URL}/bars/owned`, {headers}),
        	axios.get(`${API_BASE_URL}/games`, {headers}),
        ]);
      
      if (!barsRes.ok) throw new Error(`Failed to fetch bars: ${barsRes.status}`);

      const barsData = barsRes.data;
      setBars(barsData.bars || []);

      if (!preSelectedBarId && barsData.bars?.length > 0 && !barId) {
               setBarId(barsData.bars[0].id); // Default only if no pre-selection
      }

      if (!gamesRes.ok) throw new Error(`Failed to fetch games: ${gamesRes.status}`);
       
      const gamesData = await gamesRes.json();
      console.log("Received Games Data:", gamesData.length); 
      setGames(gamesData || []); // Should be an array of standardized game objects

      if (gamesData?.length > 0 && !gameId) {
         setGameId(gamesData[0].id); // Set default game
      } else if (gamesData?.length === 0) {
         setGameId('');
      }

    } catch (err) {
      console.error('Error fetching data:', err.response?.data || err.message || err);
      const message = err.response?.data?.message || err.message || 'Failed to fetch data.';
      setFetchError(message);
      if (Platform.OS === 'web') toast.error(message);
    } finally {
          setIsFetchingData(false); // Stop loading indicator
    }
  };

  fetchData(); // always run fetch, even if token is not yet ready — we check inside
}, [token, userLoading, preSelectedBarId]);


  const handleAddScreening = async () => {
    setFetchError(null);

    console.log("State before sending:", { barId, gameId, screeningTime });

    const bodyToSend = {
    	bar_id: barId,                // Convert barId -> bar_id
    	external_game_id: gameId,     // Convert gameId -> external_game_id (Assuming gameId holds the correct external ID)
    	screening_time: screeningTime.toISOString(), // Keep sending ISO string
    };

    console.log("Sending Body:", JSON.stringify(bodyToSend)); 

    if (!barId || !gameId) {
        Alert.alert("Missing Selection", "Please select both a bar and a game.");
        return;
    }

    try {
      const reponse = await axios.post(`${API_BASE_URL}/screenings/add`,
        bodyToSend, {
                headers: {
           		Authorization: `Bearer ${token}`,
        	},
        }
      );
      console.log("Add Screening Success Response:", response.data);

      if (Platform.OS === 'web') {
        toast.success('Screening added successfully!');
      } else {
        Alert.alert('Success', 'Screening added successfully!');
      }
      navigation.goBack()

   } catch (err) {
        console.error("Error during handleAddScreening:", err.response?.data || err.message || err);
        const result = err.response?.data; // Error data from backend
        const errorMessage = result?.error || result?.message || err.message || 'Could not add screening.';

        if (Platform.OS === 'web') {
          toast.error(errorMessage);
        } else {
          Alert.alert('Error', errorMessage);
        }
        setFetchError(errorMessage); // Display error near button if needed
    }
  };

  if (userLoading || isFetchingData) {
      return (
          <View style={[styles.container, styles.center]}>
              <ActivityIndicator size="large" color="#0000ff" />
              <Text>Loading options...</Text>
          </View>
      );
  }

  if (fetchError) {
        return (
            <View style={[styles.container, styles.center]}>
                <Text style={styles.errorText}>Error loading data:</Text>
                <Text style={styles.errorText}>{fetchError}</Text>
                {/* Optionally add a retry button */}
            </View>
        );
  }

   // Handle case where lists are empty after loading (e.g., owner has no bars)
  if (!userLoading && token && !isFetchingData && bars.length === 0) {
    return (
       <View style={[styles.container, styles.center]}>
         <Text>You don't seem to own any bars yet.</Text>
         <Text>Add one before scheduling a screening.</Text>
         {/* Optionally add a button to navigate to an "Add Bar" screen */}
       </View>
    );
  }
   if (!userLoading && token && !isFetchingData && games.length === 0) {
    return (
       <View style={[styles.container, styles.center]}>
         <Text>No upcoming games found via the API.</Text>
         <Text>(Check API configuration or selected endpoint)</Text>
       </View>
    );
  }

  return (
    // Use ScrollView in case content overflows on smaller screens
    <ScrollView style={styles.container}>
      {bars.length > 0 && (
        <>
          <Text style={styles.label}>Select Your Bar:</Text>
          <View style={styles.pickerContainer}>
            <Picker
                selectedValue={barId}
                onValueChange={(itemValue) => setBarId(itemValue)}
                style={styles.picker} >
              {bars.map((bar) => (
                <Picker.Item key={bar.id} label={bar.name} value={bar.id} />
              ))}
            </Picker>
          </View>
        </>
      )}

      {games.length > 0 && (
         <>
            <Text style={styles.label}>Select Game:</Text>
             <View style={styles.pickerContainer}>
                <Picker
                    selectedValue={gameId}
                    onValueChange={(itemValue) => setGameId(itemValue)}
                    style={styles.picker} >
                    {games.map((game) => (
                        // Use fields from the standardized game object for the label
                        <Picker.Item
                            key={game.id} // Use the unique external ID as the key
                            label={`${game.homeTeam} vs ${game.awayTeam} (${game.sport})`}
                            value={game.id} // The value is the external ID
                        />
                    ))}
                </Picker>
            </View>
         </>
      )}


      {/* === Platform-Specific Date/Time Picker === */}
      {Platform.OS === 'web' ? (
        // --- WEB Implementation using react-datepicker ---
        <View style={styles.datePickerWrapper}>
          <Text style={styles.label}>Select Screening Time:</Text>
          <DatePicker
            selected={screeningTime} // Bind to your Date state variable
            onChange={(date) => setScreeningTime(date)} // Updates state directly with Date object
            showTimeSelect // Enable time selection
            dateFormat="MMMM d, yyyy h:mm aa" // How the selected date/time appears in the input
            minDate={new Date()} // Prevent selection of past dates
            timeIntervals={15} // Optional: Set minute intervals (e.g., 15)
            // You can add custom styling via className or customInput
            // className="my-custom-datepicker-input"
            // Example using customInput if needed:
            // customInput={<Button title={screeningTime.toLocaleString()}/>}
          />
        </View>

      ) : (
        // --- NATIVE (iOS/Android) Implementation (Unchanged) ---
        <>
          <Text style={styles.label}>Select Screening Time:</Text>
          <View style={styles.dateButtonContainer}>
            {!showDatePicker && (
              <Button title={screeningTime.toLocaleString()} onPress={() => setShowDatePicker(true)} />
            )}
          </View>
          {showDatePicker && (
            <DateTimePicker
              // ... other props ...
              value={screeningTime}
              mode="datetime"
              onChange={(_, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setScreeningTime(selectedDate);
                }
              }}
              minimumDate={new Date()}
            />
          )}
        </>
      )}
      {/* === End Platform-Specific === */}

      <View style={styles.addButtonContainer}>
        <Button
            title="Add Screening"
            onPress={handleAddScreening}
            disabled={!barId || !gameId || isFetchingData} // Disable if no selection or loading
            color="#007AFF" // Example styling
            />
       </View>

      {/* Display fetch errors near the button if they occur during submission */}
      {fetchError && <Text style={[styles.errorText, { marginTop: 10 }]}>{fetchError}</Text>}

    </ScrollView> // Close ScrollView
  );
};

const styles = StyleSheet.create({
  container: {
       flex: 1,
       padding: 20,
       backgroundColor: '#f5f5f5' // Light background
    },
  center: {
       justifyContent: 'center',
       alignItems: 'center',
       flex: 1 // Ensure it takes full space for centering
    },
  label: {
      fontSize: 16,
      marginTop: 15,
      marginBottom: 5,
      fontWeight: 'bold',
      color: '#333' // Darker text
    },
  pickerContainer: { // Add styling for Picker container
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    backgroundColor: '#fff', // White background for picker
    marginBottom: 15,
  },
  picker: { // Style the picker itself if needed (might have limited effect)
      height: Platform.OS === 'ios' ? 180 : 50, // iOS needs explicit height
  },
  datePickerWrapper: { // Style the container for the web date picker + label
    marginBottom: 20,
  },
  dateButtonContainer: {
      marginBottom: 20,
      alignItems: 'flex-start' // Align button to the left
  },
  addButtonContainer: {
      marginTop: 20,
      marginBottom: 40 // Add some space at the bottom
  },
   errorText: {
       color: 'red',
       textAlign: 'center',
       marginTop: 10,
   },

   input: { // Ensure you have styles for the web TextInput
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#fff', // Match picker background?
  },
  dateInputContainer: { // Optional wrapper for web input + label
    marginBottom: 15,
  },

   pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8, // Match other inputs?
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  disabledPickerContainer: { // Style for the picker when disabled
      backgroundColor: '#e9ecef', // Light grey background
      borderColor: '#ced4da', // Darker grey border
      opacity: 0.7, // Make it look faded
  },
  disabledPickerItem: { // Optional: Style for items when picker is disabled
     // color: '#6c757d', // Grey text (might not work consistently across platforms)
  }
});

export default AddScreening;
