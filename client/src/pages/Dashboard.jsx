import React from "react";
import { useAuthContext } from "../contexts/AuthContext";
import AIAnalyticsDashboard from "../components/Dashboard/AIAnalyticsDashboard";

const Dashboard = () => {
  const { profile } = useAuthContext();

  const getDashboardContent = () => {
    switch (profile?.role_in_pos) {
      case "admin":
        return <AIAnalyticsDashboard />;
      case "counter":
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Counter Dashboard</h2>
              <p className="text-gray-600">
                Manage orders and process transactions here.
              </p>
            </div>
          </div>
        );
      case "warehouse":
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">
                Warehouse Dashboard
              </h2>
              <p className="text-gray-600">
                Manage inventory and suppliers here.
              </p>
            </div>
          </div>
        );
      default:
        return (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Welcome</h2>
            <p className="text-gray-600">
              Please contact an administrator to set up your role.
            </p>
          </div>
        );
    }
  };

  // For admin users, return the full analytics dashboard without wrapper
  if (profile?.role_in_pos === "admin") {
    return getDashboardContent();
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        Dashboard - {profile?.role_in_pos || "User"}
      </h1>
      <p className="text-gray-600 mb-6">
        Welcome, {profile?.full_name || profile?.email || "User"}.
      </p>
      {getDashboardContent()}
    </div>
  );
};

export default Dashboard;
