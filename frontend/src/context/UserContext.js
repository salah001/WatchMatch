import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Text } from 'react-native';
import { jwtDecode } from 'jwt-decode';

console.log("***** EXECUTING UserContext.js FILE *****");

const isWeb = Platform.OS === 'web';

console.log(`[UserContext Init] Platform.OS: ${Platform.OS}, isWeb constant: ${isWeb}`);

const getStorageItem = async (key) => {
	console.log(`[Storage] getStorageItem called for key: "${key}"`);
   try {
    if (isWeb) {
      console.log(`[Storage WEB] Trying to get item: ${key}`); 
      const item = localStorage.getItem(key);
      console.log(`[Storage WEB] Got item for ${key}:`, item ? item.substring(0, 20) + '...' : item);
      return key === 'token' ? item : item ? JSON.parse(item) : null;
    }
    const result = await AsyncStorage.getItem(key);
    return key === 'token' ? result : result ? JSON.parse(result) : null;
  } catch (err) {
    console.error(`[Storage] Error getting item ${key}:`, err);
    await removeStorageItem(key); // clean it up
    return null;
  }
};

const setStorageItem = async (key, value) => {
  if (isWeb) {
    localStorage.setItem(key, key === 'token' ? value : JSON.stringify(value));
  } else {
    await AsyncStorage.setItem(key, key === 'token' ? value : JSON.stringify(value));
  }
};

const removeStorageItem = async (key) => {
  if (isWeb) {
    localStorage.removeItem(key);
  } else {
    await AsyncStorage.removeItem(key);
  }
};

export const UserContext = createContext();

export const UserProvider = ({ children }) => {

  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  
  useEffect(() => {
	console.log("Loading user...");
    const loadUser = async () => {
      try {
        const storedUser = await getStorageItem('user');
	const storedtoken = await getStorageItem('token');
	setToken(storedtoken);

	console.log("Stored User:", storedUser); 
        console.log("stored Token:", storedtoken);

        if (storedUser && storedtoken) {
	  try {
		const decoded = jwtDecode(storedtoken); // Decode the JWT to check its validity

          	// Check if the token is expired
          	if (decoded.exp < Date.now() / 1000) {
            	  // Token is expired
		  console.log("Token expired");
           	  await removeStorageItem ('user');
            	  await removeStorageItem ('token');
            	  setUser(null);
		  setToken(null);
          	} else {
            	  // Token is valid, use the stored user data
            	  setUser(storedUser);
		  setToken(storedtoken);
		  console.log("User set from storage:", storedUser);
		  console.log("Decoded Token:", decoded); // Add this for clarity
                }
	   } catch (decodeErr) {
            	console.error("❌ Error decoding token:", decodeErr);
            	// In case of a malformed token, log out the user
            	await removeStorageItem('user');
            	await removeStorageItem('token');
            	setUser(null);
		setToken(null);
          }
	} else {
	   setUser(null); // No user or token, clear state 
	   setToken(null);	
	}
      } catch (err) {
        console.error("❌ Error loading user from storage:", err);
	setUser(null);
	setToken(null);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

const logout = async () => {
  try {
    
    await removeStorageItem('user');
    await removeStorageItem('token');
    setUser(null); // Clear the user from context
    setToken(null);

  } catch (err) {
    console.error("❌ Error logging out:", err);
  }
};

if (loading) {
    return <Text>Loading...</Text>; // Fallback if data is still loading
  }

  return (
    <UserContext.Provider value={{ user, setUser, token, setToken, loading, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export { getStorageItem, setStorageItem, removeStorageItem };