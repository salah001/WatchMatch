import React, { useEffect, useState, useContext  } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { NavigationContainer } from '@react-navigation/native';
import { UserProvider, UserContext } from './src/context/UserContext';

import AuthStack from './src/navigation/AuthStack';
import OwnerStack from './src/navigation/OwnerStack';
import UserStack from './src/navigation/UserStack';
//import LoadingScreen from './src/screens/LoadingScreen'; // Optional loading screen
import LoginScreen from './src/screens/Auth/LoginScreen';

const AppContent = () => {
      
  const { user, loading } = useContext(UserContext);

  if (loading) {
      // return <LoadingScreen />; // Or a simple ActivityIndicator
      return (
          <View style={styles.center}>
              {/* <ActivityIndicator size="large" />  // Uncomment if you import ActivityIndicator */}
              <Text>Loading User...</Text>
          </View>
      );
  }

  if (!user || !user.id) {
    return <AuthStack />;
  }

  const isActiveOwner = user.roles && user.roles.includes('owner');

  if (isActiveOwner) {
    return <OwnerStack />;
  } else {
    return <UserStack />;
  }
};

export default function App() {
  return (
    <UserProvider>
      {/* Wrap everything in a View with flex: 1 */}
      <View style={styles.appContainer}>
        <NavigationContainer>
          <AppContent />
        </NavigationContainer>

        {/* Keep ToastContainer outside NavigationContainer but inside the main View */}
        {Platform.OS === 'web' && (
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        )}
      </View>
    </UserProvider>
  );
}

// Add StyleSheet at the bottom
const styles = StyleSheet.create({
    appContainer: {
        flex: 1, // Make the main wrapper take full height
        // For web specifically, ensure proper height context
        ...(Platform.OS === 'web' && {
             position: 'absolute',
             top: 0, // Position relative to its offset parent
             left: 0,
             right: 0,
             bottom: 0,
             overflowY: 'auto', // Keep overflow handling
             padding: 20,
             paddingBottom: 60,
             
        }),
    },
    contentContainer: { // Still needed for NATIVE ScrollView
        padding: 20,
        paddingBottom: 60,
        // flexGrow: 1, // Probably not needed for native ScrollView here
    },
     center: { // Style for loading indicator
         flex: 1,
         justifyContent: 'center',
         alignItems: 'center',
     }
});