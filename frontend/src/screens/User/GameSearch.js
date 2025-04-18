// src/screens/User/GameSearch.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button, // Or Pressable if you prefer
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  SafeAreaView,
  Pressable, // Use Pressable for consistency
} from 'react-native';
import axios from 'axios';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';

import { API_BASE_URL } from '../../config/api';
import { formatApiDateTime, formatDateForApi } from '../../utils/dateTimeUtils';

const GameSearch = () => { // Ensure component name matches navigator
  const navigation = useNavigation();

  // State for search criteria
  const [searchTermTeam, setSearchTermTeam] = useState('');
  const [searchTermLeague, setSearchTermLeague] = useState('');
  const [searchDate, setSearchDate] = useState(null); // Store Date object

  // State for date picker visibility
  const [showDatePicker, setShowDatePicker] = useState(false);

  // State for results and loading/error
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Date Change Handler ---
  const onDateChange = (event, selectedDate) => {
    // Always hide picker on non-iOS platforms after interaction
    if (Platform.OS !== 'ios') {
        setShowDatePicker(false);
    }

    // Check if user confirmed a date selection
    if (event.type === 'set' && selectedDate) {
        setSearchDate(selectedDate);
        // Optionally clear other fields when date is set
        // setSearchTermTeam('');
        // setSearchTermLeague('');
         // Hide picker on iOS only after confirmation ('set')
        if (Platform.OS === 'ios') {
            setShowDatePicker(false);
        }
    } else if (event.type === 'dismissed') {
         // User cancelled or dismissed - hide picker on iOS if still open
         if (Platform.OS === 'ios') {
             setShowDatePicker(false);
         }
    }
  };

  // --- Handler for Web Date Input ---
  const onWebDateChange = (event) => {
      const dateString = event.target.value; // Format: YYYY-MM-DD
      if (dateString) {
          // Use T00:00:00 to set time to start of day in local timezone
          setSearchDate(new Date(dateString + 'T00:00:00'));
          // Optionally clear other fields
          // setSearchTermTeam('');
          // setSearchTermLeague('');
      } else {
          setSearchDate(null);
      }
  };

  // --- Show Date Picker Trigger ---
  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  // --- Search Handler ---
  const handleSearch = async () => {
    setIsLoading(true);
    setError(null);
    setSearchResults([]);

    // Prepare query parameters
    const params = {
      sport: 'Soccer', // Hardcoded for now as requested
    };
    if (searchTermTeam) params.team = searchTermTeam.trim(); // Trim whitespace
    if (searchTermLeague) params.league = searchTermLeague.trim(); // Trim whitespace
    if (searchDate) params.date = formatDateForApi(searchDate); // Format date for API

    // Simple validation: Ensure at least one criteria is entered
    if (!params.team && !params.league && !params.date) {
        setError("Please enter a team, league, or select a date to search.");
        setIsLoading(false);
        return;
    }

    console.log('Searching with params:', params);

    try {
      const response = await axios.get(`${API_BASE_URL}/games/search`, { params });
      console.log('Search response:', response.data);
      setSearchResults(response.data || []); // Ensure it's always an array
      if (response.data.length === 0) {
          // Set error state to display message, even though it's not a technical error
          setError("No games found matching your criteria.");
      }
    } catch (err) {
      console.error("Error searching games:", err.response?.data || err.message);
      // Set error state to display message from backend or generic message
      setError(err.response?.data?.message || 'Failed to search for games. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Navigate to Bars Screen ---
  const handleGamePress = (game) => {
    if (!game || !game.id) {
        console.error("Invalid game data for navigation:", game);
        // Optionally show an alert to the user
        // Alert.alert("Error", "Cannot navigate, invalid game data.");
        return;
    }
    console.log(`Navigating to BarsForGame for game ID: ${game.id}`);
    navigation.navigate('BarsForGame', { // Use the screen name defined in UserStack
      external_game_id: game.id, // Pass the unique API game ID
      gameTitle: `${game.homeTeam || 'Team'} vs ${game.awayTeam || 'Team'}`, // Pass a title for the next screen
      // You could pass the whole game object if needed on the next screen
      // gameDetails: game
    });
  };

  // --- Render Game Item in List ---
  const renderGameItem = ({ item }) => (
    <TouchableOpacity style={styles.itemContainer} onPress={() => handleGamePress(item)}>
      <Text style={styles.itemTitle}>{item.homeTeam || 'TBD'} vs {item.awayTeam || 'TBD'}</Text>
      <Text style={styles.itemSubtitle}>{item.league || 'Unknown League'}</Text>
      <Text style={styles.itemTime}>{formatApiDateTime(item.startTime)}</Text>
      {/* Optional: Show status */}
      {item.status && item.status !== 'Scheduled' && (
        <Text style={styles.itemStatus}>({item.status})</Text>
      )}
      {item.error && ( // Show if game details had issues on backend
          <Text style={styles.errorTextSmall}>Details unavailable</Text>
      )}
    </TouchableOpacity>
  );

  // --- Component Render ---
  return (
    <SafeAreaView style={styles.screenContainer}>
      <View style={styles.searchContainer}>
        <Text style={styles.searchTitle}>Find Soccer Games</Text>
        <TextInput
          style={styles.input}
          placeholder="Search by Team Name"
          value={searchTermTeam}
          onChangeText={setSearchTermTeam}
          // Clear date/league if typing team? Optional UX decision.
          onFocus={() => { setSearchDate(null); setSearchTermLeague(''); }}
          autoCapitalize="words" // Improve UX
          returnKeyType="search" // Show search icon on keyboard
          onSubmitEditing={handleSearch} // Allow searching from keyboard
        />
        <TextInput
          style={styles.input}
          placeholder="Search by League Name"
          value={searchTermLeague}
          onChangeText={setSearchTermLeague}
          onFocus={() => { setSearchDate(null); setSearchTermTeam(''); }}
          autoCapitalize="words"
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />

        {/* --- Platform Specific Date Input --- */}
        {Platform.OS === 'web' ? (
          // --- WEB ---
          <View style={styles.webDateWrapper}>
              <Text style={styles.webDateLabel}>Or Select Date:</Text>
              <input
                  type="date"
                  value={searchDate ? formatDateForApi(searchDate) : ''}
                  onChange={onWebDateChange}
                  style={styles.webDateInput} // Apply web-specific styles
                  onFocus={() => { setSearchTermLeague(''); setSearchTermTeam(''); }}
              />
               {searchDate && (
                    <Pressable onPress={() => setSearchDate(null)} style={styles.clearButtonWeb}>
                       <Text style={styles.clearButtonText}>Clear</Text>
                    </Pressable>
                )}
          </View>
        ) : (
          // --- MOBILE (iOS/Android) ---
          <>
            <View style={styles.dateContainer}>
                 <Pressable onPress={showDatepicker} style={styles.dateButton}>
                     <Text style={styles.dateButtonText}>{searchDate ? `Date: ${formatDateForApi(searchDate)}` : "Or Select Date"}</Text>
                 </Pressable>
                 {searchDate && (
                     <Pressable onPress={() => setSearchDate(null)} style={styles.clearButtonMobile}>
                         <Text style={styles.clearButtonText}>X</Text>
                     </Pressable>
                  )}
            </View>

            {/* Conditionally render the Mobile DateTimePicker */}
            {showDatePicker && (
              <DateTimePicker
                testID="dateTimePicker"
                value={searchDate || new Date()} // Default to today if no date selected yet
                mode="date"
                // Consider 'spinner' for Android if 'default' causes issues
                display={Platform.OS === 'ios' ? 'default' : 'default'}
                onChange={onDateChange}
                minimumDate={new Date(new Date().setDate(new Date().getDate() - 30))} // Example: allow past month
                // maximumDate={new Date(new Date().setDate(new Date().getDate() + 90))} // Example: allow next 3 months
              />
            )}
          </>
        )}
        {/* --- End Platform Specific --- */}

        {/* Use Pressable for Search button too for styling consistency */}
        <Pressable
            style={({ pressed }) => [styles.searchButton, isLoading && styles.searchButtonDisabled, pressed && styles.searchButtonPressed]}
            onPress={handleSearch}
            disabled={isLoading}
        >
            <Text style={styles.searchButtonText}>Search Games</Text>
        </Pressable>
      </View>

      {/* --- Results / Loading / Error Display --- */}
      {isLoading && <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />}

      {error && !isLoading && ( // Show error only if not loading
          <Text style={styles.errorText}>{error}</Text>
      )}

      {!isLoading && !error && searchResults.length === 0 && (
           // Optional: Show a subtle message if search was successful but yielded 0 results
           // (This might conflict with the error message "No games found..." - choose one)
           // <Text style={styles.infoText}>Enter criteria and search.</Text>
           <></>
      )}

      {!isLoading && searchResults.length > 0 && ( // Show list only if results exist and not loading
         <FlatList
            data={searchResults}
            renderItem={renderGameItem}
            keyExtractor={(item) => item.id.toString()} // Use the API's unique game ID
            style={styles.list}
            contentContainerStyle={styles.listContentContainer} // Add padding at bottom
         />
      )}
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  searchContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15, // Increased spacing
    textAlign: 'center',
    color: '#333',
  },
  input: {
    height: 45, // Slightly taller
    borderColor: '#ced4da',
    borderWidth: 1,
    borderRadius: 8, // More rounded
    marginBottom: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    fontSize: 15,
  },
  // Mobile date styles
  dateContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
  },
  dateButton: {
      flex: 1, // Take available space
      paddingVertical: 12, // Increased padding
      paddingHorizontal: 15,
      backgroundColor: '#6c757d', // Grey button
      borderRadius: 8,
      marginRight: 10,
      alignItems: 'center', // Center text
  },
   dateButtonText: {
      color: '#fff',
      textAlign: 'center',
      fontWeight: '500',
      fontSize: 15,
   },
   clearButtonMobile: {
       paddingHorizontal: 14, // Make 'X' button slightly larger
       paddingVertical: 10,
       backgroundColor: '#e9ecef', // Lighter grey
       borderRadius: 8,
   },
   clearButtonText: {
       color: '#495057', // Darker grey text
       fontWeight: 'bold',
       textAlign: 'center', // Center 'X'
       fontSize: 14,
   },
  // Web date styles
  webDateWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
      paddingVertical: 5,
  },
   webDateLabel: {
       marginRight: 10,
       fontSize: 15, // Match input font size
       color: '#333',
       fontWeight: '500',
   },
  webDateInput: {
      // Use strings for web CSS properties
      padding: '10px',
      borderColor: '#ced4da',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderRadius: '8px',
      fontSize: '15px', // Match input font size
      flexGrow: 1,
      marginRight: '10px',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif', // Standard font stack
      height: '45px', // Match RN input height
      boxSizing: 'border-box', // Include padding/border in height/width
  },
   clearButtonWeb: {
       paddingHorizontal: 12,
       paddingVertical: 8,
       backgroundColor: '#e9ecef',
       borderRadius: 8,
       cursor: 'pointer',
       marginLeft: 5,
   },
   // Search Button Styles (using Pressable)
   searchButton: {
       backgroundColor: '#007AFF',
       paddingVertical: 14,
       borderRadius: 8,
       alignItems: 'center',
       marginTop: 5, // Add some space above
   },
   searchButtonDisabled: {
       backgroundColor: '#a0caff', // Lighter blue when disabled
   },
   searchButtonPressed: {
       backgroundColor: '#0056b3', // Darker blue when pressed
   },
   searchButtonText: {
       color: '#fff',
       fontSize: 16,
       fontWeight: '600',
   },
  // Common styles
  list: {
      flex: 1,
  },
  listContentContainer: {
     paddingBottom: 20, // Add padding at the bottom of the list
  },
  itemContainer: {
      backgroundColor: '#fff',
      padding: 15,
      marginVertical: 6, // Slightly more vertical space
      marginHorizontal: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#e9ecef',
      // Add shadow for depth (optional)
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 2.0,
      elevation: 2,
  },
  itemTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#212529',
      marginBottom: 2,
  },
  itemSubtitle: {
      fontSize: 13,
      color: '#6c757d',
      marginTop: 3,
  },
  itemTime: {
      fontSize: 14,
      color: '#17a2b8', // Cyan color for time?
      fontWeight: '500',
      marginTop: 6,
  },
   itemStatus: {
      fontSize: 13,
      color: '#fd7e14', // Orange color for status
      fontStyle: 'italic',
      marginLeft: 5,
  },
   errorTextSmall: {
       fontSize: 12,
       color: '#dc3545',
       fontStyle: 'italic',
       marginTop: 3,
   },
  loader: {
      marginTop: 40, // More space for loader
  },
  errorText: {
      color: '#dc3545',
      textAlign: 'center',
      marginTop: 25,
      paddingHorizontal: 15,
      fontSize: 16, // Slightly larger error text
      fontWeight: '500',
  },
   infoText: { // For messages like "Enter criteria..."
       textAlign: 'center',
       marginTop: 25,
       paddingHorizontal: 15,
       fontSize: 15,
       color: '#6c757d',
   },
});

export default GameSearch;