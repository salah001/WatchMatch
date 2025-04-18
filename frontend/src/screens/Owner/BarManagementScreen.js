// src/screens/Owner/BarManagementScreen.js
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

const BarManagementScreen = () => {
  const navigation = useNavigation();
  const route = useRoute(); // Hook to access route parameters

  // Extract parameters passed from MyBarsListScreen
  const { barId, barName } = route.params || {}; // Use default empty object to prevent errors if params are missing

  // --- Optional: Set screen title dynamically ---
  // This is an alternative to setting it in the Stack Navigator options
  // useEffect(() => {
  //   if (barName) {
  //     navigation.setOptions({ title: `Manage: ${barName}` });
  //   }
  // }, [navigation, barName]);


  // --- Handler for navigating to Add Screening ---
  const goToAddScreening = () => {
    if (!barId) {
        console.error("Bar ID is missing, cannot navigate to Add Screening.");
        // Optionally show an alert to the user
        return;
    }
    console.log(`Navigating to Add Screening for barId: ${barId}, name: ${barName}`);
    navigation.navigate('AddScreening', {
        barId: barId, // Pass the specific barId to the AddScreening screen
    });
  };

   // --- Handler for navigating to View Screenings ---
  const goToViewScreenings = () => {
      if (!barId) {
          console.error("Bar ID is missing, cannot navigate to View Screenings.");
          return;
      }
      console.log(`Navigating to ViewBarScreenings for barId: ${barId}, name: ${barName}`);
      navigation.navigate('ViewBarScreenings', { // Use the name defined in OwnerStack
          barId: barId,
          barName: barName,
      });
  };

  // --- Check if parameters were received ---
  if (!barId || !barName) {
      // This shouldn't happen if navigation from MyBarsListScreen is correct,
      // but good practice to handle it.
      return (
          <View style={styles.container}>
              <Text style={styles.errorText}>Error: Bar details not found.</Text>
              {/* Optionally add a button to go back */}
              {navigation.canGoBack() && <Button title="Go Back" onPress={() => navigation.goBack()} />}
          </View>
      );
  }


  return (
    <ScrollView style={styles.screenContainer} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Managing Bar:</Text>
      <Text style={styles.barName}>{barName}</Text>
      <Text style={styles.barIdText}>(ID: {barId})</Text>

      <View style={styles.actionsContainer}>
          <Text style={styles.actionsTitle}>Actions</Text>

          {/* --- Add Screening Button --- */}
          <Pressable style={styles.actionButton} onPress={goToAddScreening}>
              <Text style={styles.actionButtonText}>Add Screening to this Bar</Text>
          </Pressable>

          <Pressable style={[styles.actionButton, styles.disabledButton]} onPress={goToViewScreenings}>
              <Text style={styles.actionButtonText}>View Scheduled Screenings</Text>
          </Pressable>
		{/* --- Placeholder Buttons for Future Features --- */}
           <Pressable style={[styles.actionButton, styles.disabledButton]} onPress={() => alert('Feature coming soon!')}>
              <Text style={styles.actionButtonText}>Edit Bar Details (Soon)</Text>
          </Pressable>

           <Pressable style={[styles.actionButton, styles.destructiveButton]} onPress={() => alert('Delete confirmation needed!')}>
              <Text style={[styles.actionButtonText, styles.destructiveButtonText]}>Delete Bar (Soon)</Text>
          </Pressable>
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
      padding: 20,
      alignItems: 'center', // Center content horizontally
  },
  title: {
    fontSize: 20,
    color: '#666',
    marginBottom: 5,
  },
  barName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  barIdText: {
      fontSize: 14,
      color: '#888',
      marginBottom: 40, // Space before actions
  },
  actionsContainer: {
      width: '90%', // Limit width of actions section
      marginTop: 20,
      borderTopWidth: 1,
      borderTopColor: '#eee',
      paddingTop: 30,
  },
  actionsTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#444',
      marginBottom: 20,
      textAlign: 'center',
  },
  actionButton: {
     backgroundColor: '#007AFF',
     paddingVertical: 15,
     paddingHorizontal: 20,
     borderRadius: 8,
     alignItems: 'center',
     marginBottom: 15,
     width: '100%', // Make buttons fill container width
  },
  actionButtonText: {
     color: '#fff',
     fontSize: 16,
     fontWeight: '600',
  },
  disabledButton: { // Style for future feature buttons
      backgroundColor: '#b0c4de', // Lighter blue, indicating disabled/future
  },
  destructiveButton: { // Style for delete button
      backgroundColor: '#d9534f',
  },
  destructiveButtonText: {
      color: '#fff',
  },
  errorText: {
      color: 'red',
      fontSize: 16,
      textAlign: 'center',
  },
});

export default BarManagementScreen;