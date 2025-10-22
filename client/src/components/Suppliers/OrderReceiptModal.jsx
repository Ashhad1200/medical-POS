import React, { useRef } from "react";

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
    window.location.reload();
  };

  const handleDownloadPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const html2canvas = await import("html2canvas").then((m) => m.default);

    const element = printRef.current;
    const canvas = await html2canvas(element, {
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`purchase-order-${generateOrderId()}.pdf`);
  };

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

  // Convert total to number to handle string inputs
  const numericTotal = parseFloat(total) || 0;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 no-print flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Purchase Order Receipt
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Review, print, or download your purchase order
            </p>
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

        {/* Receipt Content - This is the scrollable section */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth min-h-0">
          <style>{`
            .scroll-smooth::-webkit-scrollbar {
              width: 8px;
            }
            .scroll-smooth::-webkit-scrollbar-track {
              background: #f1f1f1;
              border-radius: 10px;
            }
            .scroll-smooth::-webkit-scrollbar-thumb {
              background: #888;
              border-radius: 10px;
            }
            .scroll-smooth::-webkit-scrollbar-thumb:hover {
              background: #555;
            }
          `}</style>
          <div ref={printRef} className="print-container">
            {/* Header */}
            <div className="print-header text-center border-b-2 border-gray-300 pb-6 mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                PURCHASE ORDER
              </h1>
              <div className="text-lg text-gray-700">
                <div className="font-semibold">Medical Store POS System</div>
                <div className="text-sm mt-1">Stock Replenishment Order</div>
              </div>
            </div>

            {/* Order Info */}
            <div className="print-section grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Order Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Order ID:</span>
                    <span className="text-gray-900">{generateOrderId()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">
                      Order Date:
                    </span>
                    <span className="text-gray-900">
                      {formatDate(new Date())}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">
                      Order Type:
                    </span>
                    <span className="text-gray-900">Stock Replenishment</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Status:</span>
                    <span className="text-yellow-600 font-medium">Pending</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Supplier Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Name:</span>
                    <div className="text-gray-900">{supplier?.name}</div>
                  </div>
                  {supplier?.contactPerson && (
                    <div>
                      <span className="font-medium text-gray-700">
                        Contact Person:
                      </span>
                      <div className="text-gray-900">
                        {supplier.contactPerson}
                      </div>
                    </div>
                  )}
                  {supplier?.phone && (
                    <div>
                      <span className="font-medium text-gray-700">Phone:</span>
                      <div className="text-gray-900">{supplier.phone}</div>
                    </div>
                  )}
                  {supplier?.email && (
                    <div>
                      <span className="font-medium text-gray-700">Email:</span>
                      <div className="text-gray-900">{supplier.email}</div>
                    </div>
                  )}
                  {supplier?.address && (
                    <div>
                      <span className="font-medium text-gray-700">
                        Address:
                      </span>
                      <div className="text-gray-900">
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Order Items
              </h3>
              {items && items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="print-table w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">
                          S.No.
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">
                          Medicine Name
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">
                          Manufacturer
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">
                          Batch No.
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900">
                          Quantity
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-900">
                          Unit Price
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-900">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items
                        .filter(
                          (item) =>
                            item && item.name && item.name !== "No items loaded"
                        )
                        .map((item, index) => (
                          <tr
                            key={index}
                            className="border-b border-gray-200 hover:bg-gray-50"
                          >
                            <td className="border border-gray-300 px-4 py-3 text-center text-gray-900">
                              {index + 1}
                            </td>
                            <td className="border border-gray-300 px-4 py-3">
                              <div className="font-medium text-gray-900">
                                {item.name}
                              </div>
                              <div className="text-sm text-gray-600 space-y-1">
                                <div>Quantity: {item.quantity} units</div>
                                <div>
                                  Unit Price: Rs.{" "}
                                  {(item.tradePrice || 0).toFixed(2)}
                                </div>
                                <div className="font-medium text-gray-900">
                                  Total: Rs.{" "}
                                  {(
                                    item.quantity * (item.tradePrice || 0)
                                  ).toFixed(2)}
                                </div>
                                {item.expiry_date && (
                                  <div className="text-xs text-gray-500">
                                    Expiry:{" "}
                                    {new Date(
                                      item.expiry_date
                                    ).toLocaleDateString()}
                                  </div>
                                )}
                                {item.batch_number && (
                                  <div className="text-xs text-gray-500">
                                    Batch: {item.batch_number}
                                  </div>
                                )}
                                {item.notes && (
                                  <div className="text-xs text-gray-500 italic">
                                    Note: {item.notes}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-gray-900">
                              {item.manufacturer}
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-gray-900">
                              {item.batch_number || "N/A"}
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-center font-medium text-gray-900">
                              {item.quantity}
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-right text-gray-900">
                              Rs. {(item.tradePrice || 0).toFixed(2)}
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-right font-medium text-gray-900">
                              Rs.{" "}
                              {(item.quantity * (item.tradePrice || 0)).toFixed(
                                2
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center border border-gray-300 rounded-lg bg-gray-50">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400 mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M20 7l-8-4-8 4m0 0l8 4m-8-4v10l8 4m0-10l8 4m-8-4l8 4M7 15v4m6-4v4m6-4v4"
                    />
                  </svg>
                  <p className="text-gray-600 font-medium">
                    No items in this order
                  </p>
                  <p className="text-sm text-gray-500">
                    Items data is not available for this purchase order
                  </p>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="border-t-2 border-gray-300 pt-4 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Order Summary
              </h3>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-100 border border-gray-300 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {items.length}
                  </div>
                  <div className="text-sm text-gray-700">Total Items</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {items.reduce((sum, item) => sum + item.quantity, 0)}
                  </div>
                  <div className="text-sm text-gray-700">Total Quantity</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    Rs. {numericTotal.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-700">Subtotal</div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="space-y-2">
                {/* Subtotal */}
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-700">
                    Subtotal ({items.length} items):
                  </span>
                  <span className="font-medium text-gray-900">
                    Rs. {numericTotal.toFixed(2)}
                  </span>
                </div>

                {/* Discount */}
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-700">Discount:</span>
                  <span className="font-medium text-green-600">- Rs. 0.00</span>
                </div>

                {/* Shipping */}
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-700">Shipping & Handling:</span>
                  <span className="font-medium text-gray-900">Rs. 0.00</span>
                </div>
              </div>

              {/* Grand Total */}
              <div className="border-t-2 border-gray-300 mt-4 pt-4 bg-gray-100 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-900">
                    Grand Total:
                  </span>
                  <span className="text-2xl font-bold text-blue-600">
                    Rs. {numericTotal.toFixed(2)}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1 text-right">
                  (Final amount)
                </div>
              </div>
            </div>

            {/* Payment Terms */}
            <div className="mt-6 p-4 bg-gray-100 border border-gray-300 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">
                Payment Terms & Conditions
              </h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Payment due within 30 days of delivery</li>
                <li>• All prices are in Pakistani Rupees (PKR)</li>
                <li>• Goods once sold will not be taken back</li>
                <li>• Subject to Karachi jurisdiction</li>
              </ul>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-gray-300 text-center">
              <p className="text-sm text-gray-700">
                Thank you for your business!
              </p>
              <p className="text-xs text-gray-500 mt-1">
                This is a computer generated purchase order.
              </p>
            </div>
          </div>
        </div>

        {/* Actions - Fixed footer, doesn't scroll */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 no-print flex-shrink-0">
          <div className="text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span className="text-green-600 font-medium">
                ✓ Order created successfully
              </span>
              <div className="text-xs text-gray-500">
                Order ID: {generateOrderId()}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3 flex-wrap gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 focus:ring-2 focus:ring-gray-400 transition-all duration-200"
            >
              Close
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(generateOrderId());
                alert("Order ID copied to clipboard!");
              }}
              className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 hover:text-blue-900 focus:ring-2 focus:ring-blue-400 transition-all duration-200"
            >
              📋 Copy Order ID
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 border border-transparent rounded-lg hover:from-red-600 hover:to-red-700 focus:ring-2 focus:ring-red-400 transition-all duration-200 shadow-lg"
            >
              � Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 border border-transparent rounded-lg hover:from-blue-600 hover:to-blue-700 focus:ring-2 focus:ring-blue-400 transition-all duration-200 shadow-lg"
            >
              🖨️ Print Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderReceiptModal;
