// frontend/src/screens/Auth/RegisterScreen.js
import React, { useState, useContext  } from 'react';
import { View, TextInput, Button, Text, StyleSheet, Alert, Switch } from 'react-native';
import { registerUser } from '../../services/authService';
import { UserContext } from '../../context/UserContext';
import { setStorageItem } from '../../context/UserContext';


const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user'); // Default role is user
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const { setUser } = useContext(UserContext); // GET IT FROM CONTEXT

  const handleRegister = async () => {

    try {
      setIsLoading(true);
      setError(null);
      const response = await registerUser(
  	name,
  	email,
  	password,
  	[role],      // roles as an array
  	role         // activeRole as a string
      );

      console.log('Registration Response:', response); // Log the full response to check its contents

      if (response.status === 201) {
	
	const { user, token } = response.data;
      	
      	await setStorageItem('token', token);
 	await setStorageItem('user', user);

      	setUser(user); //TRIGGER CONTEXT — causes AppContent to re-render
    
      } else {
  	setError(response.data.message);
      }
    } catch (err) {
      console.error("❌ Error during registration:", err);
      setError("An error occurred during registration.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Create Account</Text>
      <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      {/* Toggle switch for business account selection */}
      <View style={styles.switchContainer}>
        <Text>Are you a business owner?</Text>
        <Switch
          value={role === 'owner'}
          onValueChange={() => setRole(role === 'owner' ? 'user' : 'owner')}
          thumbColor={role === 'owner' ? '#4CAF50' : '#FF6347'} // Green for business, red for user
          trackColor={{ false: '#767577', true: '#81b0ff' }}
        />
      </View>
      <Button
        title={isLoading ? 'Registering...' : 'Register'}
        onPress={handleRegister}
        disabled={isLoading}
      />
	{error && <Text style={styles.errorText}>{error}</Text>}
      <Text style={styles.link} onPress={() => navigation.navigate('Login')}>Already have an account? Login</Text>
    </View>    
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 16 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  input: { height: 40, borderColor: 'gray', borderWidth: 1, marginBottom: 12, paddingHorizontal: 8, borderRadius: 4 },
  link: { marginTop: 12, textAlign: 'center', color: 'blue' },
  // Style for the switch container
  switchContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 14,
  }
});
export default RegisterScreen;