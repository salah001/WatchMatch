import React, { useEffect, useState, useContext  } from 'react';
import { Platform } from 'react-native';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { NavigationContainer } from '@react-navigation/native';
import { UserProvider, UserContext } from './src/context/UserContext';
import { Text, View } from 'react-native';

import AuthStack from './src/navigation/AuthStack';
import OwnerStack from './src/navigation/OwnerStack';
import UserStack from './src/navigation/UserStack';
//import LoadingScreen from './src/screens/LoadingScreen'; // Optional loading screen
import LoginScreen from './src/screens/Auth/LoginScreen';

const AppContent = () => {
      
  const { user, loading } = useContext(UserContext);

  if (loading) return null;

  if (!user || !user.id) {
    return <AuthStack />;
  }

  const isActiveOwner = user.roles.includes('owner');

  if (isActiveOwner) {
    return <OwnerStack />;
  } else {
    return <UserStack />;
  }
};

export default function App() {
  return (
    <UserProvider>
      <>
      	<NavigationContainer>
        	<AppContent />
      	</NavigationContainer>
	
	{Platform.OS === 'web' && (
          <ToastContainer
            position="top-right" // Or 'bottom-right', 'top-center', etc.
            autoClose={3000}     // Auto close after 3 seconds
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light" // Or 'dark', 'colored'
          />
        )}
      </>
    </UserProvider>
  );
}