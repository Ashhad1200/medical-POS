import api from './api';

// AI Analytics Service for intelligent insights and predictions
export const aiAnalyticsService = {
  // Get AI-powered insights for dashboard
  getInsights: async (timeRange = '7d') => {
    try {
      const response = await api.get(`/dashboard/ai-insights?timeRange=${timeRange}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching AI insights:', error);
      throw error;
    }
  },

  // Get predictive analytics
  getPredictions: async (metric = 'revenue', timeRange = '30d') => {
    try {
      const response = await api.get(`/dashboard/ai-predictions?metric=${metric}&timeRange=${timeRange}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching predictions:', error);
      throw error;
    }
  },

  // Get smart alerts
  getSmartAlerts: async () => {
    try {
      const response = await api.get('/dashboard/smart-alerts');
      return response.data;
    } catch (error) {
      console.error('Error fetching smart alerts:', error);
      throw error;
    }
  },

  // Get performance analytics
  getPerformanceAnalytics: async (timeRange = '30d') => {
    try {
      const response = await api.get(`/dashboard/performance-analytics?timeRange=${timeRange}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching performance analytics:', error);
      throw error;
    }
  },

  // Get demand forecasting
  getDemandForecast: async (medicineId = null, timeRange = '30d') => {
    try {
      const params = new URLSearchParams({ timeRange });
      if (medicineId) params.append('medicineId', medicineId);
      
      const response = await api.get(`/ai/demand-forecast?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching demand forecast:', error);
      throw error;
    }
  },

  // Get customer behavior analytics
  getCustomerAnalytics: async (timeRange = '30d') => {
    try {
      const response = await api.get(`/ai/customer-analytics?timeRange=${timeRange}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching customer analytics:', error);
      throw error;
    }
  },

  // Get business intelligence summary
  getBusinessIntelligence: async (timeRange = '30d') => {
    try {
      const response = await api.get(`/ai/business-intelligence?timeRange=${timeRange}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching business intelligence:', error);
      throw error;
    }
  }
};

export default aiAnalyticsService;