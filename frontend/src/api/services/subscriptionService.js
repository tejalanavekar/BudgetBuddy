import axiosInstance from '../axiosInstance';

const SUBSCRIPTION_API = '/subscriptions';

// The backend identifies the caller from the JWT, not a client-supplied id.
export const getSubscriptions = async () => {
  try {
    const response = await axiosInstance.get(SUBSCRIPTION_API);
    return response.data;
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    throw error;
  }
};

export const addSubscription = async (subscription) => {
  try {
    const response = await axiosInstance.post(SUBSCRIPTION_API, subscription);
    return response.data;
  } catch (error) {
    console.error('Error adding subscription:', error);
    throw error;
  }
};

export const updateSubscription = async (id, updates) => {
  try {
    const response = await axiosInstance.put(`${SUBSCRIPTION_API}/${id}`, updates);
    return response.data;
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
};

export const deleteSubscription = async (id) => {
  try {
    const response = await axiosInstance.delete(`${SUBSCRIPTION_API}/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting subscription:', error);
    throw error;
  }
};
