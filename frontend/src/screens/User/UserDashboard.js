// frontend/screens/User/UserDashboard.js
import React, { useContext } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { UserContext } from '../../context/UserContext';

const UserDashboard = ({ navigation })  => {

  const { logout } = useContext(UserContext);

  const handleLogout = async () => {
	try {
    	    await logout(); // Calls the logout function from UserContext
  	} catch (err) {
    	    console.error("❌ Error during logout:", err);
  	}
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>User Dashboard</Text>
      <Text>Welcome, sports fan!</Text>
      <Button title="Find Games" onPress={() => navigation.navigate('GameSearch')} />
      <Button title="Browse Bars" onPress={() => navigation.navigate('BrowseBars')} />
      <Button title="Logout" onPress={handleLogout} color="red" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, marginBottom: 20, fontWeight: 'bold', textAlign: 'center' },
});

export default UserDashboard;
