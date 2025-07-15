import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useSalesChartData } from "../../hooks/useOrders";
import { Card, CardContent, CardHeader, CardTitle } from "../UI/Card";
import { Skeleton } from "../UI/Skeleton";

const SalesChart = () => {
  const { data, isLoading, error } = useSalesChartData();

  if (isLoading) {
    return <Skeleton className="h-80 w-full" />;
  }

  if (error) {
    return (
      <div className="text-red-500">Error loading sales data.</div>
    );
  }

  const { weeklySales, monthlySales } = data?.data || {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlySales}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="#8884d8"
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default SalesChart;
