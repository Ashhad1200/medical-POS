import React from "react";
import { useAuth } from "../hooks/useAuth";

const Dashboard = () => {
  const { profile } = useAuth();

  const getDashboardContent = () => {
    switch (profile?.role_in_pos) {
      case "admin":
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Admin Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded">
                  <h3 className="font-medium text-blue-800">Total Orders</h3>
                  <p className="text-2xl font-bold text-blue-600">0</p>
                </div>
                <div className="bg-green-50 p-4 rounded">
                  <h3 className="font-medium text-green-800">Total Sales</h3>
                  <p className="text-2xl font-bold text-green-600">$0</p>
                </div>
                <div className="bg-purple-50 p-4 rounded">
                  <h3 className="font-medium text-purple-800">Active Users</h3>
                  <p className="text-2xl font-bold text-purple-600">0</p>
                </div>
              </div>
            </div>
          </div>
        );
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
