import React from "react";
import { toast } from "react-hot-toast";
import { useAuthContext } from "../../contexts/AuthContext";
import api from "../../services/api";

const ReceiptModal = ({ show, onClose, orderId, orderData }) => {
  const { profile } = useAuthContext();
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
    const organizationName = profile?.organization_name || profile?.full_name || "Medical Store POS";
    const receiptNumber = orderId || `RCP-${Date.now()}`;
    let text = "";

    text += `${organizationName}\n`;
    text += `Receipt #: ${receiptNumber}\n`;
    text += `Date: ${currentDate.toLocaleDateString()}\n`;
    text += `Time: ${currentDate.toLocaleTimeString()}\n\n`;

    text += "ITEMS:\n";
    orderData?.items?.forEach((item, index) => {
      text += `${index + 1}. ${item.name}\n`;
      text += `   Qty: ${item.quantity} x ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.unitPrice * item.quantity)}\n`;
    });

    text += "\n";
    text += `Subtotal: ${formatCurrency(orderData?.totals?.subtotal || 0)}\n`;
    if (orderData?.totals?.globalDiscount > 0) {
      text += `Discount: -${formatCurrency(orderData.totals.globalDiscount)}\n`;
    }
    text += `Tax: ${formatCurrency(orderData?.totals?.taxAmount || 0)}\n`;
    text += `Total: ${formatCurrency(orderData?.totals?.grandTotal || 0)}\n`;
    text += `Payment: ${orderData?.paymentMethod || "Cash"}\n\n`;
    text += "Thank you!\n";

    return text;
  };

  if (!show) return null;

  const currentDate = new Date(orderData?.timestamp || new Date());
  const receiptNumber = orderId || `RCP-${Date.now()}`;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Receipt</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-lg hover:bg-gray-100"
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
        <div className="p-4 bg-white" id="receipt-content">
          {/* Store Header */}
          <div className="text-center mb-4 border-b pb-4">
            <h1 className="text-xl font-bold">
              {profile?.organization_name || profile?.full_name || "Medical Store POS"}
            </h1>
          </div>

          {/* Receipt Details */}
          <div className="mb-4">
            <div className="text-sm">
              <p><strong>Receipt #:</strong> {receiptNumber}</p>
              <p><strong>Date:</strong> {currentDate.toLocaleDateString()}</p>
              <p><strong>Time:</strong> {currentDate.toLocaleTimeString()}</p>
            </div>
          </div>

          {/* Items */}
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Items:</h3>
            <div className="space-y-2">
              {orderData?.items?.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <div>
                    <p>{item.name}</p>
                    <p className="text-gray-600">Qty: {item.quantity} x {formatCurrency(item.unitPrice)}</p>
                  </div>
                  <div className="text-right">
                    <p>{formatCurrency(item.unitPrice * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Totals */}
          <div className="mb-4 border-t pt-4">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(orderData?.totals?.subtotal || 0)}</span>
              </div>
              {orderData?.totals?.globalDiscount > 0 && (
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-{formatCurrency(orderData.totals.globalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>{formatCurrency(orderData?.totals?.taxAmount || 0)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-1">
                <span>Total:</span>
                <span>{formatCurrency(orderData?.totals?.grandTotal || 0)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Payment:</span>
                <span>{orderData?.paymentMethod || "Cash"}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-sm border-t pt-4">
            <p>Thank you!</p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Print
            </button>

            <button
              onClick={downloadReceipt}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Download
            </button>

            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Text
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
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
