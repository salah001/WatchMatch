// frontend/src/services/authService.js
import axios from 'axios';
import { API_BASE_URL } from '../config/api'; // Import the base URL


export const loginUser = async (email, password) => {
  try{
      console.log("📡 Sending login request...");
      const response = await axios.post(`${ API_BASE_URL}/users/login`, { email, password, });
      console.log("✅ Login response:", response.data);

      return response.data;
  } catch (err){
      if (err.response) {
      // Backend responded with error (e.g., 401)
      console.error("❌ Login failed with response:", err.response.data);
    } else if (err.request) {
      // Request made but no response received
      console.error("❌ Login request made but no response received:", err.request);
    } else {
      // Other error
      console.error("❌ Login error:", err.message);
    }
    throw err;
  }
};

export const registerUser = async (name, email, password, role ) => {
  try{
    console.log("Making API call to register user:", { name, email, password, role });

    const response = await axios.post(`${ API_BASE_URL}/users/register`, { name, email, password, role });

    console.log("API response:", response); // Log API response

    return response; // Return response (user or token)
    

  } catch (error) {
    console.error("Registration API error:", error); // Log any error
    throw new Error(error.response?.data?.message || 'Registration failed');
  }
};
