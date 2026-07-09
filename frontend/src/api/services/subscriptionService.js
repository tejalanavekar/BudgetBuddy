import axiosInstance from '../axiosInstance';

const SUBSCRIPTION_API = '/subscriptions';

export const getSubscriptions = async (userId) => {
  try {
    const response = await axiosInstance.get(SUBSCRIPTION_API, { params: { userId } });
    return response.data;
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    throw error;
  }
};

export const addSubscription = async (userId, subscription) => {
  try {
    const response = await axiosInstance.post(SUBSCRIPTION_API, { userId, ...subscription });
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
