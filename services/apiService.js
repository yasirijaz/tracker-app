const axios = require('axios');
const baseurl = process.env.BASE_URL;
const Store = require('electron-store');
const store = new Store();
let bearerToken = store.get('authToken');

// Function to handle GET requests
const getRequest = (url,token) => {
    // Base configuration for Axios
    const bToken = token ?? bearerToken;
    const axiosInstance = axios.create({
        baseURL: baseurl, // Your API base URL
        timeout: 10000, // Request timeout
        headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bToken}`
        }
    });

    return axiosInstance.get(url)
        .then(response => {
        return response.data;
    })
    .catch(error => {
        console.error('GET Request Error:', error.response);
        throw error;
    });
};

// Function to handle POST requests
const postRequest = (url, data, token) => {
    const bToken = token ?? bearerToken;
    // Base configuration for Axios
     const axiosInstance = axios.create({
        baseURL: baseurl, // Your API base URL
        timeout: 10000, // Request timeout
        headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bToken}`
        }
    });

    return axiosInstance.post(url, data)
        .then(response => {
			// if (!response.ok) {
            //     console.log('response.status:',response.status); // Log the status code
			// 	throw new Error(`Network response was not ok, status code: ${response.status}`);
			// }
			return response.data;
    })
    .catch(error => {
        console.error('POST Request Error:', error.response);
        throw error;
    });
};
  

// Export the functions for use in other parts of your application
module.exports = {
  getRequest,
  postRequest,
  // Add more request functions as needed
};
