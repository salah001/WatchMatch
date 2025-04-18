import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { UserContext } from '../../context/UserContext';

const BarsList = ({ navigation }) => {
  const [bars, setBars] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(UserContext);

  useEffect(() => {
    const fetchBars = async () => {
      try {
        const res = await fetch('http://192.168.1.20:5000/bars', {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });
        const data = await res.json();
        setBars(data);
      } catch (err) {
        console.error('Error fetching bars:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBars();
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.barCard} onPress={() => navigation.navigate('BarDetail', { barId: item.id })}>
      <Text style={styles.barName}>{item.name}</Text>
      <Text>{item.address}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </TouchableOpacity>
  );

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1, justifyContent: 'center' }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Bars Showing Games</Text>
      <FlatList
        data={bars}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  barCard: { backgroundColor: '#f1f1f1', padding: 16, borderRadius: 10, marginBottom: 12 },
  barName: { fontSize: 18, fontWeight: 'bold' },
  description: { marginTop: 4, fontStyle: 'italic' },
});

export default BarsList;
