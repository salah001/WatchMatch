// frontend/screens/Owner/OwnerDashboard.js
import React, { useContext } from 'react';
import { View, Text, Button, StyleSheet, Pressable } from 'react-native';
import { UserContext } from '../../context/UserContext';

const OwnerDashboard = ({ navigation }) => {

  const { user, logout } = useContext(UserContext);

  const handleLogout = async () => {
    try {
    	    await logout(); // Calls the logout function from UserContext
  	} catch (err) {
    	    console.error("❌ Error during logout:", err);
  	}

  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Owner Dashboard</Text>
      <Text style={styles.welcomeText}>Welcome, {user?.name || 'owner'}!</Text>
      <View style={styles.buttonContainer}>
      	 <Pressable style={styles.button} onPress={() => navigation.navigate('RegisterBar')}>
             <Text style={styles.buttonText}>Register New Bar</Text>
         </Pressable>
	 <Pressable style={styles.button} onPress={() => navigation.navigate('MyBarsListScreen')}>
             <Text style={styles.buttonText}>Manage My Bars</Text>
         </Pressable>
      </View>
      <View style={styles.logoutContainer}>
        <Pressable style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
             <Text style={[styles.buttonText, styles.logoutButtonText]}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5', // Light background
    justifyContent: 'space-between', // Pushes logout to bottom
  },
  title: {
      fontSize: 28, // Larger title
      marginBottom: 10,
      fontWeight: 'bold',
      textAlign: 'center',
      color: '#333',
  },
  welcomeText: {
      fontSize: 18,
      textAlign: 'center',
      marginBottom: 40, // More space below welcome
      color: '#555',
  },
  buttonContainer: {
     // Groups main action buttons
     width: '80%',
     alignSelf: 'center',
  },
  button: {
     backgroundColor: '#007AFF', // Example blue
     paddingVertical: 15,
     paddingHorizontal: 20,
     borderRadius: 8,
     alignItems: 'center',
     marginBottom: 15, // Space between buttons
     elevation: 2, // Android shadow
     shadowColor: '#000', // iOS shadow
     shadowOffset: { width: 0, height: 1 },
     shadowOpacity: 0.2,
     shadowRadius: 1.41,
  },
  buttonText: {
     color: '#fff',
     fontSize: 16,
     fontWeight: '600', // Semibold
  },
  logoutContainer: {
      // Container for logout button at the bottom
      paddingBottom: 20, // Space from bottom edge
       width: '80%',
       alignSelf: 'center',
  },
  logoutButton: {
     backgroundColor: '#d9534f', // Example red for logout/destructive
  },
  logoutButtonText: {
     color: '#fff',
  },
});

export default OwnerDashboard;
