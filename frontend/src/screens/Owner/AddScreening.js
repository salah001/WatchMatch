import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import { View, Text, TextInput, Button, StyleSheet, Alert, FlatList, Pressable, ActivityIndicator, TouchableOpacity, SafeAreaView, ScrollView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import DateTimePicker from '@react-native-community/datetimepicker';
import { UserContext } from '../../context/UserContext';
import { useRoute, useNavigation } from '@react-navigation/native';
import axios from 'axios'; 
import { formatApiDateTime, formatDateForApi } from '../../utils/dateTimeUtils';

import { API_BASE_URL } from '../../config/api'; 

// Define supported sports list
const SUPPORTED_SPORTS = [
    { label: 'Soccer', value: 'Soccer' },
    { label: 'Basketball', value: 'Basketball' },
    { label: 'American Football', value: 'American Football' }, // Match API if needed
    { label: 'Boxing', value: 'Boxing' },
    { label: 'MMA', value: 'MMA' },
];

const AddScreening = () => {
  const navigation = useNavigation(); // Get navigation object via hook
  const route = useRoute(); 
  const { user, token, loading: userLoading } = useContext(UserContext);

  // --- Component State ---
  const [barId, setBarId] = useState(route.params?.barId ?? null);

  // Search Criteria State
  const [searchSport, setSearchSport] = useState(''); 
  const [searchLeague, setSearchLeague] = useState('');
  const [searchTeam, setSearchTeam] = useState('');
  const [searchDate, setSearchDate] = useState(null); // For the date picker

  // Game Selection State
  const [gameId, setGameId] = useState('');
  const [games, setGames] = useState([]);
  const [selectedGameForDisplay, setSelectedGameForDisplay] = useState(null);

  // Screening Time State
  const [screeningTime, setScreeningTime] = useState(new Date());

  // UI Control State
  const [showOwnerDatePicker, setShowOwnerDatePicker] = useState(false); 
  const [showScreeningTimePicker, setShowScreeningTimePicker] = useState(false);
  const [isFetchingInitial, setIsFetchingInitial] = useState(true);
  const [isSearchingGames, setIsSearchingGames] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  // Error State
  const [fetchError, setFetchError] = useState(null);
  const [searchError, setSearchError] = useState(null);
  

  useEffect(() => {

  const routeBarId = route.params?.barId;
  if (routeBarId && barId !== routeBarId) {
    console.log("Setting barId from route param via useEffect:", routeBarId);
    setBarId(routeBarId);
  }

  // Handle user loading/token state (no data fetching here initially)
  if (userLoading) {
    console.log(`⏳ Waiting: User Loading=${userLoading}`);
    setIsFetchingInitial(true); // Still indicate loading while user context resolves
    return;
  }
   if (!token) {
       console.log(`⏳ Waiting: Token Available=${!!token}`);
       setFetchError('User not authenticated.'); setIsFetchingInitial(false); 
       return;
   }

  // If we reach here, user is loaded and token exists
  console.log("User context ready. Bar ID:", barId);
  if (!barId) {
         console.error("AddScreening mounted without a barId in route params!");
         setFetchError("Bar ID not provided."); // Critical error
  }
  setIsFetchingInitial(false);

}, [token, userLoading, route.params?.barId, barId]);

  
  const handleSearchGames = async () => {

	if (!searchSport) { // Validate sport selection
            setSearchError("Please select a sport.");
            return;
        }
        setIsSearchingGames(true);
        setSearchError(null);
        setSearchPerformed(true); // Mark that a search attempt was made
        setGames([]); // Clear previous results
        setGameId(''); // Clear previous game selection
        setSelectedGameForDisplay(null);

        // Prepare query parameters
        const params = {sport: searchSport};
        if (searchLeague) params.league = searchLeague.trim();
        if (searchTeam) params.team = searchTeam.trim();
        if (searchDate) params.date = formatDateForApi(searchDate); // Use utility function

        console.log('Owner searching games with params:', params);

        try {
            const response = await axios.get(`${API_BASE_URL}/games/search`, {
                 params,
                 headers: { Authorization: `Bearer ${token}` } // Don't forget auth
            });
            console.log('Owner game search response:', response.data);
            const results = Array.isArray(response.data) ? response.data : [];
            setGames(results);
            if (results.length === 0) {
                // No technical error, but inform the user
                console.log("Search returned 0 games.");            }
        } catch (err) {
            console.error("Error searching games:", err.response?.data || err.message);
            const message = err.response?.data?.message || 'Failed to search for games.';
            setSearchError(message);
        } finally {
            setIsSearchingGames(false);
        }
    };

  const handleAddScreening = async () => {
    setFetchError(null);

    console.log("State before sending:", { barId, gameId, screeningTime });

    if (!barId) {
             Alert.alert("Error", "Bar information is missing.");
             return;
        }
    if (!gameId) {
            Alert.alert("Missing Selection", "Please search and select a game first.");
            return;
    }

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
      const response = await axios.post(`${API_BASE_URL}/screenings/add`,
        bodyToSend, {
                headers: {Authorization: `Bearer ${token}`},
      });
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

  // --- Handler for tapping a game in the list ---
  const handleGameSelect = (game) => {
      console.log('Selected Game:', game.id);
      setGameId(game.id); // Set the actual ID for submission
      setSelectedGameForDisplay(game); // Set the game object for display/styling
  };

  // --- Render Game Item for Owner ---
  const renderOwnerGameItem = ({ item }) => {
      const isSelected = selectedGameForDisplay?.id === item.id;
        return (
          <TouchableOpacity
              style={[styles.itemContainer, isSelected && styles.itemContainerSelected]} 
              onPress={() => handleGameSelect(item)}
          >
              {/* Reuse similar layout as GameSearch renderItem */}
              <Text style={styles.itemTitle}>{item.homeTeam || 'TBD'} vs {item.awayTeam || 'TBD'}</Text>
              <Text style={styles.itemSubtitle}>{item.league || 'Unknown League'}</Text>
              {/* Ensure formatApiDateTime handles null startTime */}
              <Text style={styles.itemTime}>{item.startTime ? formatApiDateTime(item.startTime) : 'Time TBD'}</Text>
               {/* You could display the request count here if you implement that feature */}
              {/* {item.requestCount > 0 && <Text style={styles.requestCount}>{item.requestCount} requests!</Text>} */}
              {isSelected && <Text style={styles.selectedText}>✓ Selected</Text>}
          </TouchableOpacity>
        );
    };

  // --- Conditional Renders for Loading/Error States ---

    if (isFetchingInitial) { // Initial loading for user context/barId check
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text>Loading...</Text>
            </View>
        );
    }

    if (fetchError) { // Display critical errors (like no token, no barId)
        return (
            <View style={[styles.container, styles.center]}>
                <Text style={styles.errorText}>Error:</Text>
                <Text style={styles.errorText}>{fetchError}</Text>
            </View>
        );
    }

    const ContainerComponent = Platform.OS === 'web' ? View : ScrollView;

    // --- Main Render ---

    return (
        <ContainerComponent style={styles.container} 
	{...(Platform.OS !== 'web' && { contentContainerStyle: styles.contentContainer })}>
	  <SafeAreaView style={styles.safeArea}>
            {/* --- Game Search Section for Owner --- */}
            <Text style={styles.label}>Search for Game to Schedule:</Text>

            {/* Sport Picker */}
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={searchSport}
                        onValueChange={(itemValue) => setSearchSport(itemValue)}
                        style={styles.picker}
                        enabled={!isSearchingGames}
                        >
                        {SUPPORTED_SPORTS.map(sport => (
                             <Picker.Item key={sport.value} label={sport.label} value={sport.value} />
                        ))}
                    </Picker>
                </View>

            {/* League Input */}
            <TextInput
                style={styles.input}
                placeholder="Filter by League Name (Optional)"
                value={searchLeague}
                onChangeText={setSearchLeague}
                editable={!isSearchingGames}
            />

            {/* Team Input */}
            <TextInput
                style={styles.input}
                placeholder="Filter by Team Name (Optional)"
                value={searchTeam}
                onChangeText={setSearchTeam}
                editable={!isSearchingGames}
            />

            {/* Date Input */}
            {Platform.OS === 'web' ? (
                <View style={styles.datePickerWrapper}>
                  <Text style={styles.label}>Filter by Date (Optional):</Text>
                  <DatePicker
                    selected={searchDate}
                    onChange={setSearchDate}
                    dateFormat="yyyy-MM-dd" // Use consistent format
                    isClearable
                    placeholderText="Select Date (YYYY-MM-DD)"
                    />
                </View>
              ) : (
                <>
                  <Text style={styles.label}>Filter by Date (Optional):</Text>
                  <View style={styles.dateButtonContainer}>
                     <Button
                        title={searchDate ? formatDateForApi(searchDate) : "Select Date"} // Use formatting
                        onPress={() => setShowOwnerDatePicker(true)}
                        disabled={isSearchingGames}
                        />
                     {searchDate && (
                         <Button title="Clear" onPress={() => setSearchDate(null)} disabled={isSearchingGames} color="#888" />
                     )}
                  </View>
                  {showOwnerDatePicker && (
                    <DateTimePicker
                      value={searchDate || new Date()}
                      mode="date"
                      display="default"
                      onChange={(_, date) => {
                        setShowOwnerDatePicker(false);
                        setSearchDate(date || null); 
                      }}
                    />
                  )}
                </>
              )}

            {/* Search Button */}
            <View style={styles.searchButtonContainer}>
                <Button
                    title="Search Games"
                    onPress={handleSearchGames} // Connect the handler
                    disabled={isSearchingGames || !searchSport}
                />
            </View>

            {/* Search Loading/Error Indicators */}
            {isSearchingGames && <ActivityIndicator style={{ marginVertical: 10 }} size="small" color="#0000ff" />}
            {searchError && <Text style={[styles.errorText, { marginTop: 0, marginBottom: 10 }]}>{searchError}</Text>}

            {/* --- End Game Search Section --- */}

	    {/* --- Search Results List (NEW) --- */}
        {/* Show list only if search wasn't loading, search finished, and didn't error */}
         {!isSearchingGames && searchPerformed && !searchError && (
             <>
                {/* Use a more descriptive label */}
                <Text style={styles.label}>{games.length > 0 ? 'Tap Game Below to Select:' : 'No Games Found'}</Text>

                {/* Conditionally render FlatList or 'No games' message */}
                {games.length > 0 ? (
                     <FlatList
                        data={games}
                        renderItem={renderOwnerGameItem} 
                        keyExtractor={(item) => item.id.toString()}
                        style={styles.list}
                        extraData={selectedGameForDisplay} // Use the new state variable
                    />
                ) : (
                    // Keep the message if search is done but no games found
                    <Text style={styles.infoText}>No games found matching your criteria.</Text>
                )}
             </>
         )}
        {/* --- End Search Results List --- */}

                       
            {/* --- Screening Time Selection --- */}
            {/* Only show time picker if a game has been selected from search */}
            {gameId ? ( // Conditional rendering based on gameId selection
                 <>
                    {Platform.OS === 'web' ? (
                        <View style={styles.datePickerWrapper}>
                          <Text style={styles.label}>Select Screening Time:</Text>
                          <DatePicker
                            selected={screeningTime}
                            onChange={(date) => date && setScreeningTime(date)} // Ensure date isn't null
                            showTimeSelect
                            dateFormat="Pp" // Locale-specific date and time (short)
                            minDate={new Date()}
                            timeIntervals={15}
                          />
                        </View>
                      ) : (
                        <>
                          <Text style={styles.label}>Select Screening Time:</Text>
                          <View style={styles.dateButtonContainer}>
                            {!showScreeningTimePicker && (
                              <Button title={screeningTime.toLocaleString()} onPress={() => setShowScreeningTimePicker(true)} />
                            )}
                          </View>
                          {showScreeningTimePicker && (
                            <DateTimePicker
                              value={screeningTime}
                              mode="datetime" // Allows date and time
                              display="default"
                              onChange={(_, selectedDate) => {
                                setShowScreeningTimePicker(false);
                                if (selectedDate) {
                                  setScreeningTime(selectedDate);
                                }
                              }}
                              minimumDate={new Date()} // Cannot schedule in the past
                            />
                          )}
                        </>
                      )}
                 </>
            ) : (
		searchPerformed && !searchError && games.length > 0 &&
                    <Text style={styles.infoText}>Select a game from the list to set screening time.</Text>
                )}
		          {/* --- Add Screening Button (Conditional) --- */}
                {gameId ? (
                    <View style={styles.addButtonContainer}>
                        <Button title="Add Screening" onPress={handleAddScreening} disabled={!barId || !gameId || isFetchingInitial || isSearchingGames} color="#007AFF" />
                    </View>
                 ) : null}


                {/* Display final submission errors */}
                {fetchError && !isFetchingInitial && <Text style={[styles.errorText, { marginTop: 10 }]}>{fetchError}</Text>}

            </SafeAreaView>
        </ContainerComponent>
    );
};

// --- Styles --- 
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
	...(Platform.OS === 'web' && {
	    height: '100%',
            overflowY: 'auto', // Enable vertical scrollbar on web
	    padding: 20,
	    paddingBottom: 60
        }),
    },
    contentContainer: { // Style for the inner content
        padding: 20, // Move padding here from container
        paddingBottom: 60, // Ensure extra space at the bottom
        ...(Platform.OS === 'web' && {
            flexGrow: 1, // Allows container to grow if content is short
        }),
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1
    },
    label: {
        fontSize: 16,
        marginTop: 15,
        marginBottom: 5,
        fontWeight: 'bold',
        color: '#333'
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 10,
        marginBottom: 15,
        fontSize: 16,
        backgroundColor: '#fff',
        height: 45, // Consistent height
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        backgroundColor: '#fff',
        marginBottom: 15,
    },
    picker: { // Common style for Picker, height might be needed specifically for iOS
        height: Platform.OS === 'ios' ? 180 : 50,
    },
    datePickerWrapper: { // Web date picker container
        marginBottom: 20,
    },
    dateButtonContainer: { // Mobile date/time button container
        marginBottom: 10, // Reduce bottom margin slightly
        flexDirection: 'row', // Allow Clear button side-by-side
        alignItems: 'center',
    },
    searchButtonContainer: {
         marginVertical: 15, // Add vertical margin
    },
    addButtonContainer: {
        marginTop: 20,
        marginBottom: 40
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
        marginTop: 10,
    },
    safeArea: { // Add style for SafeAreaView
         flex: 1,
     },
     picker: {
         height: Platform.OS === 'ios' ? 180 : 50,
         // Add width: '100%' if needed, depending on container
     },
     list: {
         // flex: 1, // Usually NOT needed inside ScrollView/View with specific height rules
         maxHeight: 350, // Adjust as needed for screen space
         marginBottom: 15,
         borderColor: '#ccc',
         borderWidth: 1,
         borderRadius: 8,
         backgroundColor: '#FFF', // Add background to list area
     },
     itemContainer: {
         backgroundColor: '#fff',
         paddingVertical: 12, // Adjust padding
         paddingHorizontal: 15,
         borderBottomWidth: 1,
         borderBottomColor: '#eee',
     },
     itemContainerSelected: {
         borderColor: '#007AFF',
         backgroundColor: '#e7f3ff',
         borderWidth: 1, // Keep border subtle
         borderLeftWidth: 5, // Highlight left side
         paddingLeft: 11,
     },
     itemTitle: { fontSize: 15, fontWeight: 'bold', color: '#212529' },
     itemSubtitle: { fontSize: 13, color: '#6c757d', marginTop: 3 },
     itemTime: { fontSize: 13, color: '#17a2b8', fontWeight: '500', marginTop: 5 },
     selectedText: {
         position: 'absolute', right: 15, top: '50%', marginTop: -10, color: 'green', fontSize: 20, fontWeight: 'bold',
     },
     infoText: { textAlign: 'center', marginVertical: 20, fontSize: 15, color: '#6c757d' },
});


export default AddScreening;