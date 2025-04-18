// frontend/screens/Auth/LoginScreen.js
import React, { useState, useContext } from 'react';
import { UserContext } from '../../context/UserContext';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { loginUser } from '../../services/authService';
import { useNavigation } from '@react-navigation/native';
import { setStorageItem, removeStorageItem } from '../../context/UserContext';
import * as Updates from 'expo-updates';


const LoginScreen = () => {
  const navigation = useNavigation();

  const { setUser, setToken } = useContext(UserContext);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
  	Alert.alert('Missing Fields', 'Please enter both email and password');
  	return;
    }

    try {
	console.log("📤 Login Request Sent:", { email, password });
    
      // Clear old auth state
      await removeStorageItem('user');
      await removeStorageItem('token');

      const response = await loginUser(email, password);

      // Extract token and user from the response
      const { token, user } = response;

      if (!token || !user?.userId) {
    	Alert.alert("Login error", "Invalid login response.");
    	return;
      }
	
      await setStorageItem('token', token);
      await setStorageItem('user', user);

      setUser(user);  
      setToken(token);    
      console.log("✅ Token + User saved, context updated:", user);

      // Optional: reload to fully refresh nav state
      if (Updates?.reloadAsync) await Updates.reloadAsync();

    } catch (err) {
      console.error("❌ Login error:", err?.message || err);
      Alert.alert('Login Failed', err?.message || 'Something went wrong.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput 
        style={styles.input}
        placeholder="Email"
        value={email}
        autoCapitalize="none"
        onChangeText={setEmail}
      />
      <TextInput 
        style={styles.input}
        placeholder="Password"
        value={password}
        secureTextEntry
        onChangeText={setPassword}
      />
      <Button title="Login" onPress={handleLogin} />
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Don't have an account? Register</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 32, marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 15, borderRadius: 8 },
  link: { marginTop: 15, textAlign: 'center', color: 'blue' },
});


export default LoginScreen;
