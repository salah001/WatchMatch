// frontend/src/navigation/UserStack.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import UserDashboard from '../screens/User/UserDashboard';
import BarsList from '../screens/User/BarsList';
import BarDetail from '../screens/User/BarDetail';
import GameSearch from '../screens/User/GameSearch';
import BarsForGame from '../screens/User/BarsForGame';

const Stack = createStackNavigator();

const UserStack = () => {
  return (
    <Stack.Navigator initialRouteName="UserDashboard">
      <Stack.Screen name="UserDashboard" component={UserDashboard} options={{ title: 'Dashboard' }} />
      <Stack.Screen name="GameSearch" component={GameSearch} options={{ title: 'Find Games' }} />
      <Stack.Screen name="BarsForGame" component={BarsForGame} options={({ route }) => 
		({ title: route.params?.gameTitle || 'Bars Showing Game' })} />
      <Stack.Screen name="BarDetail" component={BarDetail} options={({ route }) => 
		({ title: route.params?.barName || 'Bar Details' })} />
    </Stack.Navigator>
  );
};
export default UserStack;

