import React from "react";
import { toast } from "react-hot-toast";
import api from "../../services/api";

const ReceiptModal = ({ show, onClose, orderId, orderData }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 2,
    })
      .format(amount)
      .replace("PKR", "Rs.");
  };

  const handlePrint = () => {
    const printContent = document.getElementById("receipt-content");
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${orderId}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .receipt { max-width: 400px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 1px solid #ccc; padding-bottom: 10px; margin-bottom: 10px; }
            .item { display: flex; justify-content: space-between; margin: 5px 0; }
            .total { border-top: 1px solid #ccc; padding-top: 10px; margin-top: 10px; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

  const handleDownload = () => {
    if (!orderData) {
      toast.error("No order data available for download");
      return;
    }

    // Create a simple text receipt
    const receiptText = generateReceiptText();

    // Create and download as text file
    const blob = new Blob([receiptText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `receipt-${orderId || "order"}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Receipt downloaded successfully!");
  };

  const downloadReceipt = async () => {
    if (!orderId) return;

    try {
      const response = await api.get(`/orders/${orderId}/receipt`, {
        responseType: "blob",
      });

      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading receipt:", error);
    }
  };

  const generateReceiptText = () => {
    const currentDate = new Date(orderData?.timestamp || new Date());
    let text = "";

    text += "========================================\n";
    text += "          Moiz Medical Store          \n";
    text += "          Moiz Medical Store          \n";
    text += "========================================\n";
    text += "123 Medical Street, Health City\n";
    text += "Phone: +92-300-1234567\n";
    text += "License: MED-2024-001\n";
    text += "========================================\n\n";

    text += `Receipt #: ${orderId || "N/A"}\n`;
    text += `Date: ${currentDate.toLocaleDateString()}\n`;
    text += `Time: ${currentDate.toLocaleTimeString()}\n`;

    if (orderData?.customer?.name) {
      text += `Customer: ${orderData.customer.name}\n`;
    }
    if (orderData?.customer?.phone) {
      text += `Phone: ${orderData.customer.phone}\n`;
    }

    text += "\n========================================\n";
    text += "                 ITEMS                  \n";
    text += "========================================\n";

    orderData?.items?.forEach((item, index) => {
      text += `${index + 1}. ${item.name}\n`;
      text += `   Qty: ${item.quantity} × ${formatCurrency(item.unitPrice)}`;
      if (item.discountPercent > 0) {
        text += ` (${item.discountPercent}% off)`;
      }
      text += "\n";
      const itemTotal =
        item.unitPrice * item.quantity -
        (item.unitPrice * item.quantity * (item.discountPercent || 0)) / 100;
      text += `   Total: ${formatCurrency(itemTotal)}\n\n`;
    });

    text += "========================================\n";
    text += `Subtotal:        ${formatCurrency(
      orderData?.totals?.subtotal || 0
    )}\n`;

    if (orderData?.totals?.globalDiscount > 0) {
      text += `Discount:       -${formatCurrency(
        orderData.totals.globalDiscount
      )}\n`;
    }

    text += `Tax:             ${formatCurrency(
      orderData?.totals?.taxAmount || 0
    )}\n`;
    text += "----------------------------------------\n";
    text += `TOTAL:           ${formatCurrency(
      orderData?.totals?.grandTotal || 0
    )}\n`;
    text += "========================================\n\n";

    text += `Payment Method: ${orderData?.paymentMethod || "Cash"}\n\n`;

    text += "========================================\n";
    text += "       Thank you for your business!    \n";
    text += "     For queries, call: +92-300-1234567\n";
    text += "   Email: support@medstoreplus.com     \n";
    text += "                                       \n";
    text += "Please check medicines before leaving  \n";
    text += "            the store                  \n";
    text += "========================================\n";

    return text;
  };

  if (!show) return null;

  const currentDate = new Date(orderData?.timestamp || new Date());
  const receiptNumber = orderId || `RCP-${Date.now()}`;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="p-4 border-b border-white/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Receipt</h2>
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
        <div className="p-6" id="receipt-content">
          {/* Store Header */}
          <div className="text-center mb-6 border-b border-white/20 pb-4">
            <h1 className="text-xl font-bold text-white">
              Moiz Medical Store
            </h1>
            <p className="text-sm text-gray-300">Moiz Medical Store</p>
            <p className="text-xs text-gray-400 mt-1">
              123 Medical Street, Health City
              <br />
              Phone: +92-300-1234567
              <br />
              License: MED-2024-001
            </p>
          </div>

          {/* Receipt Details */}
          <div className="mb-4 text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-gray-300">Receipt #:</span>
              <span className="font-medium text-white">{receiptNumber}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-300">Date:</span>
              <span className="text-white">{currentDate.toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-300">Time:</span>
              <span className="text-white">{currentDate.toLocaleTimeString()}</span>
            </div>
            {orderData?.customer?.name && (
              <div className="flex justify-between mb-1">
                <span className="text-gray-300">Customer:</span>
                <span className="text-white">{orderData.customer.name}</span>
              </div>
            )}
            {orderData?.customer?.phone && (
              <div className="flex justify-between mb-1">
                <span className="text-gray-300">Phone:</span>
                <span className="text-white">{orderData.customer.phone}</span>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="border-t border-b border-white/20 py-4 mb-4">
            <h3 className="font-medium text-white mb-3">Items Purchased</h3>
            <div className="space-y-2">
              {orderData?.items?.map((item, index) => (
                <div key={index} className="text-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-white">{item.name}</p>
                      <p className="text-xs text-gray-300">
                        Qty: {item.quantity} × {formatCurrency(item.unitPrice)}
                        {item.discountPercent > 0 && (
                          <span className="text-red-400 ml-1">
                            ({item.discountPercent}% off)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-white">
                        {formatCurrency(
                          item.unitPrice * item.quantity -
                            (item.unitPrice *
                              item.quantity *
                              (item.discountPercent || 0)) /
                              100
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-2 text-sm mb-6">
            <div className="flex justify-between">
              <span className="text-gray-300">Subtotal:</span>
              <span className="text-white">{formatCurrency(orderData?.totals?.subtotal || 0)}</span>
            </div>

            {orderData?.totals?.globalDiscount > 0 && (
              <div className="flex justify-between text-red-400">
                <span>Discount:</span>
                <span>-{formatCurrency(orderData.totals.globalDiscount)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-gray-300">Tax:</span>
              <span className="text-white">{formatCurrency(orderData?.totals?.taxAmount || 0)}</span>
            </div>

            <div className="flex justify-between pt-2 border-t border-white/20 font-bold text-lg">
              <span className="text-white">Total:</span>
              <span className="text-white">{formatCurrency(orderData?.totals?.grandTotal || 0)}</span>
            </div>

            <div className="flex justify-between text-xs text-gray-400">
              <span>Payment Method:</span>
              <span className="capitalize text-gray-300">
                {orderData?.paymentMethod || "Cash"}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-400 border-t border-white/20 pt-4">
            <p className="mb-2 text-white">Thank you for your business!</p>
            <p className="text-gray-300">For queries, call: +92-300-1234567</p>
            <p className="text-gray-300">Email: support@medstoreplus.com</p>
            <p className="mt-2 font-medium text-gray-200">
              Please check medicines before leaving the store
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-white/20 bg-white/5 backdrop-blur-sm">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center justify-center px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all duration-200 text-sm"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Print Receipt
            </button>

            <button
              onClick={downloadReceipt}
              className="flex items-center justify-center px-3 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400/50 transition-all duration-200 text-sm"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Download PDF
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center justify-center px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-400/50 transition-all duration-200 text-sm"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Download Text
            </button>

            <button
              onClick={onClose}
              className="px-3 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all duration-200 backdrop-blur-sm text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
