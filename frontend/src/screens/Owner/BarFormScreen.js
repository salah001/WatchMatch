import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Platform  } from 'react-native';
import { UserContext } from '../../context/UserContext';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native'; // Import navigation hook
import { toast } from 'react-toastify';

const API_URL = 'http://192.168.1.20:5000';

const BarFormScreen = () => {
  const { user, token } = useContext(UserContext);
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {

    if (isSubmitting || !name || !address) { // Basic validation
         Alert.alert('Missing Info', 'Please enter at least a name and address.');
         return;
      }
      setIsSubmitting(true);

      // Check if token exists (important!)
      if (!token) {
        Alert.alert('Error', 'Authentication token not found. Please log in again.');
        setIsSubmitting(false);
        return;
      }

    try {
      const response = await axios.post(`${API_URL}/bars/register`, {
        name,
        address,
        description,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
	  'Content-Type': 'application/json',
        },
      });

      const successMessage = `Bar '${name}' registered!`; // ID: ${response.data.id}`;
      if (Platform.OS === 'web') {
        toast.success(successMessage);
      } else {
        Alert.alert('✅ Bar Registered', successMessage);
      }

      setName('');
      setAddress('');
      setDescription('');

      if (navigation.canGoBack()) {
          navigation.goBack();
      } else {
          // Fallback if cannot go back (e.g., root screen)
        navigation.navigate('OwnerDashboard'); // Or wherever appropriate
          
      }

    } catch (err) {
      console.error("Bar Registration Error:", err.response?.data || err.message); // Log detailed error
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Failed to create bar. Please try again.';
      if (Platform.OS === 'web') {
          toast.error(errorMessage);
      } else {
          Alert.alert('❌ Error', errorMessage);
      }
    } finally {
        setIsSubmitting(false); // Re-enable button
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register Your Bar</Text>
      <TextInput style={styles.input} placeholder="Bar Name *" value={name} onChangeText={setName} editable={!isSubmitting} />
      <TextInput style={styles.input} placeholder="Address *" value={address} onChangeText={setAddress} editable={!isSubmitting} />
      <TextInput style={[styles.input, styles.textArea]} // Style for multiline
          placeholder="Description (Optional)"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4} // Suggest initial height
          editable={!isSubmitting}
      />
      <Button title={isSubmitting ? "Registering..." : "Register Bar"}
          onPress={handleSubmit}
          disabled={isSubmitting} // Disable button
      />
    </View>
  );
};

export default BarFormScreen;

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, backgroundColor: '#f5f5f5' }, // Added flex and bg
  title: { fontSize: 24, marginBottom: 20, fontWeight: 'bold', textAlign: 'center' }, // Adjusted styles
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15, // Increased spacing
    backgroundColor: '#fff', // White background for inputs
    fontSize: 16,
  },
  textArea: { // Specific style for multiline input
      height: 100, // Set a default height
      textAlignVertical: 'top', // Align text to top
  },
  // Optional: Add styles for button wrapper if needed
});
