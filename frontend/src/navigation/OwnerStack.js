// frontend/src/navigation/OwnerStack.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import OwnerDashboard from '../screens/Owner/OwnerDashboard';
import BarFormScreen from '../screens/Owner/BarFormScreen';
import AddScreening from '../screens/Owner/AddScreening';
import MyBarsListScreen from '../screens/Owner/MyBarsListScreen';
import BarManagementScreen from '../screens/Owner/BarManagementScreen';
import ViewBarScreenings from '../screens/Owner/ViewBarScreenings';

const MyBarScreen = () => <View><Text>My Bar Screen Placeholder</Text></View>;
const AddScreeningScreen = () => <View><Text>Add Screening Screen Placeholder</Text></View>;

const Stack = createStackNavigator();

const OwnerStack = () => {
  return (
    <Stack.Navigator initialRouteName="OwnerDashboard">
      <Stack.Screen name="OwnerDashboard" component={OwnerDashboard} options={{ title: 'Owner Dashboard'}}/>
      <Stack.Screen name="RegisterBar" component={BarFormScreen} options={{ title: 'Register New Bar' }}/>
      <Stack.Screen name="MyBarsListScreen" component={MyBarsListScreen} options={{ title: 'Manage My Bars' }}/>
      <Stack.Screen name="BarManagement" component={BarManagementScreen} options={({ route }) => ({ title: route.params?.barName || 'Manage Bar' })}/>
      <Stack.Screen name="ViewBarScreenings" component={ViewBarScreenings} options={({ route }) => ({ title: `Screenings: ${route.params?.barName}` })}/> 
      <Stack.Screen name="AddScreening" component={AddScreening} options={{ title: 'Add Screening' }}/>
    </Stack.Navigator>
  );
};

export default OwnerStack;
