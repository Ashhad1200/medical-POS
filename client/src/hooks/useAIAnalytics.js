import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import aiAnalyticsService from '../services/aiAnalyticsService';

// Query keys for AI analytics
export const AI_ANALYTICS_KEYS = {
  insights: (timeRange) => ['ai', 'insights', timeRange],
  predictions: (metric, timeRange) => ['ai', 'predictions', metric, timeRange],
  alerts: () => ['ai', 'alerts'],
  performance: (timeRange) => ['ai', 'performance', timeRange],
  demandForecast: (medicineId, timeRange) => ['ai', 'demand-forecast', medicineId, timeRange],
  customerAnalytics: (timeRange) => ['ai', 'customer-analytics', timeRange],
  businessIntelligence: (timeRange) => ['ai', 'business-intelligence', timeRange]
};

// Hook for AI insights
export const useAIInsights = (timeRange = '7d', options = {}) => {
  return useQuery({
    queryKey: AI_ANALYTICS_KEYS.insights(timeRange),
    queryFn: () => aiAnalyticsService.getInsights(timeRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    ...options
  });
};

// Hook for predictions
export const useAIPredictions = (metric = 'revenue', timeRange = '30d', options = {}) => {
  return useQuery({
    queryKey: AI_ANALYTICS_KEYS.predictions(metric, timeRange),
    queryFn: () => aiAnalyticsService.getPredictions(metric, timeRange),
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    ...options
  });
};

// Hook for smart alerts
export const useSmartAlerts = (options = {}) => {
  return useQuery({
    queryKey: AI_ANALYTICS_KEYS.alerts(),
    queryFn: () => aiAnalyticsService.getSmartAlerts(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes for alerts
    refetchOnWindowFocus: true,
    ...options
  });
};

// Hook for performance analytics
export const usePerformanceAnalytics = (timeRange = '30d', options = {}) => {
  return useQuery({
    queryKey: AI_ANALYTICS_KEYS.performance(timeRange),
    queryFn: () => aiAnalyticsService.getPerformanceAnalytics(timeRange),
    staleTime: 15 * 60 * 1000, // 15 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    ...options
  });
};

// Hook for demand forecasting
export const useDemandForecast = (medicineId = null, timeRange = '30d', options = {}) => {
  return useQuery({
    queryKey: AI_ANALYTICS_KEYS.demandForecast(medicineId, timeRange),
    queryFn: () => aiAnalyticsService.getDemandForecast(medicineId, timeRange),
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    enabled: true, // Always enabled, medicineId can be null for all medicines
    ...options
  });
};

// Hook for customer analytics
export const useCustomerAnalytics = (timeRange = '30d', options = {}) => {
  return useQuery({
    queryKey: AI_ANALYTICS_KEYS.customerAnalytics(timeRange),
    queryFn: () => aiAnalyticsService.getCustomerAnalytics(timeRange),
    staleTime: 20 * 60 * 1000, // 20 minutes
    cacheTime: 40 * 60 * 1000, // 40 minutes
    refetchOnWindowFocus: false,
    ...options
  });
};

// Hook for business intelligence
export const useBusinessIntelligence = (timeRange = '30d', options = {}) => {
  return useQuery({
    queryKey: AI_ANALYTICS_KEYS.businessIntelligence(timeRange),
    queryFn: () => aiAnalyticsService.getBusinessIntelligence(timeRange),
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    ...options
  });
};

// Combined hook for dashboard data
export const useAIDashboard = (timeRange = '7d') => {
  const insights = useAIInsights(timeRange);
  const predictions = useAIPredictions('revenue', timeRange);
  const alerts = useSmartAlerts();
  const performance = usePerformanceAnalytics(timeRange);
  const businessIntelligence = useBusinessIntelligence(timeRange);
  
  return {
    insights,
    predictions,
    alerts,
    performance,
    businessIntelligence,
    isLoading: insights.isLoading || predictions.isLoading || alerts.isLoading || performance.isLoading || businessIntelligence.isLoading,
    isError: insights.isError || predictions.isError || alerts.isError || performance.isError || businessIntelligence.isError,
    error: insights.error || predictions.error || alerts.error || performance.error || businessIntelligence.error
  };
};

// Hook for refreshing all AI analytics data
export const useRefreshAIAnalytics = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      // Invalidate all AI analytics queries
      await queryClient.invalidateQueries({ queryKey: ['ai'] });
      return true;
    },
    onSuccess: () => {
      console.log('AI Analytics data refreshed successfully');
    },
    onError: (error) => {
      console.error('Error refreshing AI Analytics data:', error);
    }
  });
};

// Hook for real-time alerts subscription (WebSocket simulation)
export const useRealTimeAlerts = () => {
  const queryClient = useQueryClient();
  
  // Simulate real-time updates by refetching alerts periodically
  const { data: alerts, ...alertsQuery } = useSmartAlerts({
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
    refetchIntervalInBackground: true
  });
  
  // In a real implementation, this would use WebSocket
  // useEffect(() => {
  //   const ws = new WebSocket('ws://localhost:3001/ai-alerts');
  //   
  //   ws.onmessage = (event) => {
  //     const newAlert = JSON.parse(event.data);
  //     queryClient.setQueryData(AI_ANALYTICS_KEYS.alerts(), (oldData) => {
  //       if (!oldData) return { data: { alerts: [newAlert] } };
  //       return {
  //         ...oldData,
  //         data: {
  //           ...oldData.data,
  //           alerts: [newAlert, ...oldData.data.alerts]
  //         }
  //       };
  //     });
  //   };
  //   
  //   return () => ws.close();
  // }, [queryClient]);
  
  return {
    alerts: alerts?.data?.alerts || [],
    ...alertsQuery
  };
};

// Utility hook for AI analytics cache management
export const useAIAnalyticsCache = () => {
  const queryClient = useQueryClient();
  
  const clearCache = () => {
    queryClient.removeQueries({ queryKey: ['ai'] });
  };
  
  const prefetchInsights = (timeRange = '7d') => {
    queryClient.prefetchQuery({
      queryKey: AI_ANALYTICS_KEYS.insights(timeRange),
      queryFn: () => aiAnalyticsService.getInsights(timeRange),
      staleTime: 5 * 60 * 1000
    });
  };
  
  const prefetchPredictions = (metric = 'revenue', timeRange = '30d') => {
    queryClient.prefetchQuery({
      queryKey: AI_ANALYTICS_KEYS.predictions(metric, timeRange),
      queryFn: () => aiAnalyticsService.getPredictions(metric, timeRange),
      staleTime: 10 * 60 * 1000
    });
  };
  
  const getCachedData = (queryKey) => {
    return queryClient.getQueryData(queryKey);
  };
  
  const setCachedData = (queryKey, data) => {
    queryClient.setQueryData(queryKey, data);
  };
  
  return {
    clearCache,
    prefetchInsights,
    prefetchPredictions,
    getCachedData,
    setCachedData
  };
};

export default {
  useAIInsights,
  useAIPredictions,
  useSmartAlerts,
  usePerformanceAnalytics,
  useDemandForecast,
  useCustomerAnalytics,
  useBusinessIntelligence,
  useAIDashboard,
  useRefreshAIAnalytics,
  useRealTimeAlerts,
  useAIAnalyticsCache
};