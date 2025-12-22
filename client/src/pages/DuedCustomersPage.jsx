import React, { useState, useEffect, useCallback } from "react";
import { useAuthContext } from "../contexts/AuthContext";
import api from "../services/api";
import { toast } from "react-hot-toast";

const DuedCustomersPage = () => {
    const { profile } = useAuthContext();
    const [customers, setCustomers] = useState([]);
    const [summary, setSummary] = useState({ totalCustomers: 0, totalOutstanding: 0 });
    const [loading, setLoading] = useState(true);
    const [expandedCustomer, setExpandedCustomer] = useState(null);
    const [paymentModal, setPaymentModal] = useState({ show: false, order: null });
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [processing, setProcessing] = useState(false);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-PK", {
            style: "currency",
            currency: "PKR",
            minimumFractionDigits: 2,
        })
            .format(amount || 0)
            .replace("PKR", "Rs.");
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("en-PK", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const fetchCustomersWithDues = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get("/orders/customers-with-dues");
            if (response.data.success) {
                setCustomers(response.data.data.customers);
                setSummary(response.data.data.summary);
            }
        } catch (error) {
            console.error("Error fetching customers with dues:", error);
            toast.error("Failed to load customer dues");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCustomersWithDues();
    }, [fetchCustomersWithDues]);

    const handlePayDue = async () => {
        if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
            toast.error("Please enter a valid payment amount");
            return;
        }

        setProcessing(true);
        try {
            const response = await api.patch(`/orders/${paymentModal.order.id}/pay-due`, {
                payment_amount: parseFloat(paymentAmount),
                payment_method: paymentMethod,
            });

            if (response.data.success) {
                toast.success(response.data.message);
                setPaymentModal({ show: false, order: null });
                setPaymentAmount("");
                fetchCustomersWithDues(); // Refresh data
            }
        } catch (error) {
            console.error("Error processing payment:", error);
            toast.error(error.response?.data?.message || "Failed to process payment");
        } finally {
            setProcessing(false);
        }
    };

    const openPaymentModal = (order) => {
        setPaymentModal({ show: true, order });
        setPaymentAmount(String(parseFloat(order.amount_due || 0).toFixed(2)));
        setPaymentMethod("cash");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Dued Customers</h1>
                <p className="text-gray-600">Manage outstanding balances and collect payments</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm text-gray-600">Customers with Dues</p>
                            <p className="text-2xl font-bold text-gray-900">{summary.totalCustomers}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm text-gray-600">Total Outstanding</p>
                            <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalOutstanding)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm text-gray-600">Average Due</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {formatCurrency(summary.totalCustomers > 0 ? summary.totalOutstanding / summary.totalCustomers : 0)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Customers List */}
            {customers.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900">All Clear!</h3>
                    <p className="text-gray-600">No customers have outstanding dues.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {customers.map((customer, idx) => (
                        <div key={idx} className="bg-white rounded-lg shadow overflow-hidden">
                            {/* Customer Header */}
                            <div
                                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => setExpandedCustomer(expandedCustomer === idx ? null : idx)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                                            <span className="text-orange-600 font-bold text-lg">
                                                {(customer.customer_name || "W")[0].toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-gray-900">{customer.customer_name || "Walk-in Customer"}</h3>
                                            <p className="text-sm text-gray-500">
                                                {customer.customer_phone || "No phone"} • {customer.order_count} order{customer.order_count > 1 ? "s" : ""}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <div className="text-right">
                                            <p className="text-sm text-gray-500">Total Due</p>
                                            <p className="text-xl font-bold text-red-600">{formatCurrency(customer.total_due)}</p>
                                        </div>
                                        <svg
                                            className={`w-5 h-5 text-gray-400 transition-transform ${expandedCustomer === idx ? "rotate-180" : ""}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Orders */}
                            {expandedCustomer === idx && (
                                <div className="border-t border-gray-200 bg-gray-50 p-4">
                                    <h4 className="font-medium text-gray-700 mb-3">Outstanding Orders</h4>
                                    <div className="space-y-2">
                                        {customer.orders.map((order) => (
                                            <div
                                                key={order.id}
                                                className="bg-white rounded-lg p-3 flex items-center justify-between"
                                            >
                                                <div>
                                                    <p className="font-medium text-gray-900">{order.order_number}</p>
                                                    <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
                                                    <div className="flex items-center space-x-2 mt-1">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${order.payment_status === "partial"
                                                                ? "bg-yellow-100 text-yellow-800"
                                                                : "bg-red-100 text-red-800"
                                                            }`}>
                                                            {order.payment_status}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-500">
                                                        Total: {formatCurrency(order.total_amount)}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        Paid: {formatCurrency(order.amount_paid)}
                                                    </p>
                                                    <p className="font-bold text-red-600">
                                                        Due: {formatCurrency(order.amount_due)}
                                                    </p>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openPaymentModal(order);
                                                        }}
                                                        className="mt-2 px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                                                    >
                                                        Collect Payment
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Payment Modal */}
            {paymentModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Collect Payment</h3>

                        <div className="bg-gray-50 rounded-lg p-3 mb-4">
                            <p className="text-sm text-gray-600">Order: <span className="font-medium">{paymentModal.order?.order_number}</span></p>
                            <p className="text-sm text-gray-600">Outstanding: <span className="font-bold text-red-600">{formatCurrency(paymentModal.order?.amount_due)}</span></p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rs.</span>
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                            <div className="grid grid-cols-2 gap-2">
                                {["cash", "upi"].map((method) => (
                                    <button
                                        key={method}
                                        onClick={() => setPaymentMethod(method)}
                                        className={`py-2 px-4 rounded-lg border-2 transition-colors ${paymentMethod === method
                                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                                : "border-gray-200 hover:border-gray-300"
                                            }`}
                                    >
                                        {method === "cash" ? "💵 Cash" : "📱 UPI"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex space-x-3">
                            <button
                                onClick={() => setPaymentModal({ show: false, order: null })}
                                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                disabled={processing}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePayDue}
                                disabled={processing || !paymentAmount}
                                className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                                {processing ? "Processing..." : "Confirm Payment"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DuedCustomersPage;
