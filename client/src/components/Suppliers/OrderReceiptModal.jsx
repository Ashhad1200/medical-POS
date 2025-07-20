import React, { useRef, useEffect } from "react";

const OrderReceiptModal = ({
  show,
  onClose,
  orderData,
  supplier,
  items,
  total,
  onPrintComplete,
  autoPrint = false,
}) => {
  const printRef = useRef();

  const handlePrint = () => {
    const printContent = printRef.current;
    const originalContents = document.body.innerHTML;

    // Create print styles
    const printStyles = `
      <style>
        @media print {
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            color: #000;
          }
          .print-container { 
            max-width: 800px; 
            margin: 0 auto; 
          }
          .no-print { 
            display: none !important; 
          }
          .print-header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .print-section {
            margin-bottom: 25px;
          }
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          .print-table th,
          .print-table td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
          }
          .print-table th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          .print-total {
            text-align: right;
            font-size: 18px;
            font-weight: bold;
            margin-top: 20px;
            border-top: 2px solid #000;
            padding-top: 10px;
          }
          .print-footer {
            margin-top: 40px;
            border-top: 1px solid #000;
            padding-top: 20px;
            text-align: center;
            font-size: 12px;
          }
        }
      </style>
    `;

    document.body.innerHTML = printStyles + printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload(); // Reload to restore the original page
  };

  useEffect(() => {
    if (autoPrint && show) {
      setTimeout(() => {
        handlePrint();
        if (onPrintComplete) onPrintComplete();
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrint, show]);

  if (!show) return null;

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const generateOrderId = () => {
    return (
      orderData.orderId ||
      orderData.purchaseOrder?.orderNumber ||
      `PO-${Date.now()}`
    );
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20 no-print">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Purchase Order Receipt
            </h2>
            <p className="text-sm text-gray-300 mt-1">
              Review and print your purchase order
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-colors duration-200 p-1 rounded-lg hover:bg-white/10"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Receipt Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div ref={printRef} className="print-container">
            {/* Header */}
            <div className="print-header text-center border-b-2 border-white/30 pb-6 mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">
                PURCHASE ORDER
              </h1>
              <div className="text-lg text-gray-300">
                <div className="font-semibold">Medical Store POS System</div>
                <div className="text-sm mt-1">Stock Replenishment Order</div>
              </div>
            </div>

            {/* Order Info */}
            <div className="print-section grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Order Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-300">Order ID:</span>
                    <span className="text-white">{generateOrderId()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-300">Order Date:</span>
                    <span className="text-white">{formatDate(new Date())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-300">Order Type:</span>
                    <span className="text-white">Stock Replenishment</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-300">Status:</span>
                    <span className="text-yellow-400 font-medium">Pending</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Supplier Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-300">Name:</span>
                    <div className="text-white">{supplier?.name}</div>
                  </div>
                  {supplier?.contactPerson && (
                    <div>
                      <span className="font-medium text-gray-300">Contact Person:</span>
                      <div className="text-white">
                        {supplier.contactPerson}
                      </div>
                    </div>
                  )}
                  {supplier?.phone && (
                    <div>
                      <span className="font-medium text-gray-300">Phone:</span>
                      <div className="text-white">{supplier.phone}</div>
                    </div>
                  )}
                  {supplier?.email && (
                    <div>
                      <span className="font-medium text-gray-300">Email:</span>
                      <div className="text-white">{supplier.email}</div>
                    </div>
                  )}
                  {supplier?.address && (
                    <div>
                      <span className="font-medium text-gray-300">Address:</span>
                      <div className="text-white">
                        {typeof supplier.address === "string"
                          ? supplier.address
                          : supplier.address
                          ? `${supplier.address.street || ""} ${
                              supplier.address.city || ""
                            } ${supplier.address.state || ""} ${
                              supplier.address.postalCode || ""
                            } ${supplier.address.country || ""}`.trim()
                          : "N/A"}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="print-section mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">
                Order Items
              </h3>
              <div className="overflow-x-auto">
                <table className="print-table w-full border-collapse border border-white/30">
                  <thead>
                    <tr className="bg-white/10">
                      <th className="border border-white/30 px-4 py-3 text-left font-semibold text-white">
                        S.No.
                      </th>
                      <th className="border border-white/30 px-4 py-3 text-left font-semibold text-white">
                        Medicine Name
                      </th>
                      <th className="border border-white/30 px-4 py-3 text-left font-semibold text-white">
                        Manufacturer
                      </th>
                      <th className="border border-white/30 px-4 py-3 text-left font-semibold text-white">
                        Batch No.
                      </th>
                      <th className="border border-white/30 px-4 py-3 text-center font-semibold text-white">
                        Quantity
                      </th>
                      <th className="border border-white/30 px-4 py-3 text-right font-semibold text-white">
                        Unit Price
                      </th>
                      <th className="border border-white/30 px-4 py-3 text-right font-semibold text-white">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-b border-white/20 hover:bg-white/5">
                        <td className="border border-white/30 px-4 py-3 text-center text-white">
                          {index + 1}
                        </td>
                        <td className="border border-white/30 px-4 py-3">
                          <div className="font-medium text-white">{item.name}</div>
                          <div className="text-sm text-gray-300 space-y-1">
                            <div>Quantity: {item.quantity} units</div>
                            <div>
                              Unit Price: Rs. {item.tradePrice.toFixed(2)}
                            </div>
                            <div className="font-medium">
                              Total: Rs.{" "}
                              {(item.quantity * item.tradePrice).toFixed(2)}
                            </div>
                            {item.expiry_date && (
                              <div className="text-xs text-gray-400">
                                Expiry:{" "}
                                {new Date(item.expiry_date).toLocaleDateString()}
                              </div>
                            )}
                            {item.batch_number && (
                              <div className="text-xs text-gray-400">
                                Batch: {item.batch_number}
                              </div>
                            )}
                            {item.notes && (
                              <div className="text-xs text-gray-400 italic">
                                Note: {item.notes}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="border border-white/30 px-4 py-3 text-white">
                          {item.manufacturer}
                        </td>
                        <td className="border border-white/30 px-4 py-3 text-white">
                          {item.batch_number || "N/A"}
                        </td>
                        <td className="border border-white/30 px-4 py-3 text-center font-medium text-white">
                          {item.quantity}
                        </td>
                        <td className="border border-white/30 px-4 py-3 text-right text-white">
                          Rs. {item.tradePrice.toFixed(2)}
                        </td>
                        <td className="border border-white/30 px-4 py-3 text-right font-medium text-white">
                          Rs. {(item.quantity * item.tradePrice).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Order Summary */}
            <div className="border-t-2 border-white/30 pt-4 mt-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Order Summary
              </h3>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-300">
                    {items.length}
                  </div>
                  <div className="text-sm text-gray-300">Total Items</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-300">
                    {items.reduce((sum, item) => sum + item.quantity, 0)}
                  </div>
                  <div className="text-sm text-gray-300">Total Quantity</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-300">
                    Rs. {total.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-300">Subtotal</div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="space-y-2">
                {/* Subtotal */}
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-300">
                    Subtotal ({items.length} items):
                  </span>
                  <span className="font-medium text-white">Rs. {total.toFixed(2)}</span>
                </div>

                {/* Tax */}
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-300">Tax (GST 18%):</span>
                  <span className="font-medium text-white">
                    Rs. {(total * 0.18).toFixed(2)}
                  </span>
                </div>

                {/* Discount */}
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-300">Discount:</span>
                  <span className="font-medium text-green-300">- Rs. 0.00</span>
                </div>

                {/* Shipping */}
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-300">Shipping & Handling:</span>
                  <span className="font-medium text-white">Rs. 0.00</span>
                </div>
              </div>

              {/* Grand Total */}
              <div className="border-t-2 border-white/30 mt-4 pt-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-white">
                    Grand Total:
                  </span>
                  <span className="text-2xl font-bold text-blue-300">
                    Rs. {(total * 1.18).toFixed(2)}
                  </span>
                </div>
                <div className="text-sm text-gray-300 mt-1 text-right">
                  (Including all taxes and charges)
                </div>
              </div>
            </div>

            {/* Payment Terms */}
            <div className="mt-6 p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg">
              <h4 className="font-semibold text-white mb-2">
                Payment Terms & Conditions
              </h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Payment due within 30 days of delivery</li>
                <li>• All prices are in Pakistani Rupees (PKR)</li>
                <li>• Goods once sold will not be taken back</li>
                <li>• Subject to Karachi jurisdiction</li>
              </ul>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-white/20 text-center">
              <p className="text-sm text-gray-300">
                Thank you for your business!
              </p>
              <p className="text-xs text-gray-400 mt-1">
                This is a computer generated purchase order.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-6 border-t border-white/20 bg-white/5 backdrop-blur-sm no-print">
          <div className="text-sm text-gray-300">
            <div className="flex items-center space-x-4">
              <span className="text-green-400 font-medium">
                ✓ Order created successfully
              </span>
              <div className="text-xs text-gray-400">
                Order ID: {generateOrderId()}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-white/20 hover:text-white focus:ring-2 focus:ring-white/30 transition-all duration-200"
            >
              Close
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(generateOrderId());
                alert("Order ID copied to clipboard!");
              }}
              className="px-4 py-2 text-sm font-medium text-blue-300 bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 rounded-lg hover:bg-blue-500/30 hover:text-blue-200 focus:ring-2 focus:ring-blue-400/50 transition-all duration-200"
            >
              📋 Copy Order ID
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 border border-transparent rounded-lg hover:from-blue-600 hover:to-purple-700 focus:ring-2 focus:ring-blue-400/50 transition-all duration-200 shadow-lg backdrop-blur-sm"
            >
              🖨️ Print Receipt
            </button>
            <button
              onClick={() => {
                handlePrint();
                setTimeout(() => {
                  if (onPrintComplete) onPrintComplete();
                }, 1000);
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 border border-transparent rounded-lg hover:from-green-600 hover:to-emerald-700 focus:ring-2 focus:ring-green-400/50 transition-all duration-200 shadow-lg backdrop-blur-sm"
            >
              🖨️ Print & New Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderReceiptModal;
