import React, { useState, useMemo } from "react";
import { toast } from "react-hot-toast";

const ReceiveOrderModal = ({
  show,
  onClose,
  orderData,
  supplier,
  items = [],
  onAllItemsReceived,
  onEditItems,
}) => {
  const [receivedItems, setReceivedItems] = useState(
    items.map((item, index) => ({
      ...item,
      id: item.id || index,
      receivedQuantity: item.quantity, // Default to ordered quantity
    }))
  );
  const [isEditing, setIsEditing] = useState(false);

  if (!show) return null;

  // Calculate summary
  const summary = useMemo(() => {
    return {
      totalItems: receivedItems.length,
      totalOrderedQty: receivedItems.reduce(
        (sum, item) => sum + (item.quantity || 0),
        0
      ),
      totalReceivedQty: receivedItems.reduce(
        (sum, item) => sum + (item.receivedQuantity || 0),
        0
      ),
      totalCost: receivedItems.reduce(
        (sum, item) => sum + item.quantity * (item.tradePrice || 0),
        0
      ),
      partiallyReceived: receivedItems.filter(
        (item) =>
          item.receivedQuantity < item.quantity && item.receivedQuantity > 0
      ).length,
      notReceived: receivedItems.filter((item) => item.receivedQuantity === 0)
        .length,
      excessReceived: receivedItems.filter(
        (item) => item.receivedQuantity > item.quantity
      ).length,
      allReceived: receivedItems.every(
        (item) => item.receivedQuantity === item.quantity
      ),
    };
  }, [receivedItems]);

  const handleQuantityChange = (index, value) => {
    const newQty = Math.max(0, parseInt(value) || 0);
    const updated = [...receivedItems];
    updated[index].receivedQuantity = newQty;
    setReceivedItems(updated);
  };

  const handleAllItemsReceived = async () => {
    if (summary.allReceived) {
      if (onAllItemsReceived) {
        await onAllItemsReceived(receivedItems);
      }
      toast.success("✅ All items marked as received!");
      onClose();
    } else {
      toast.error(
        "⚠️ Not all items have been received. Please check quantities."
      );
    }
  };

  const handleEditItems = () => {
    setIsEditing(!isEditing);
  };

  const handleConfirmPartialReceipt = async () => {
    if (summary.totalReceivedQty === 0) {
      toast.error("⚠️ Please receive at least one item.");
      return;
    }

    if (onEditItems) {
      await onEditItems(receivedItems);
    }
    toast.success("✅ Partial receipt recorded!");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              📦 Receive Purchase Order
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {isEditing
                ? "Edit quantities for partial receipt"
                : "Verify received items and quantities"}
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

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto scroll-smooth min-h-0">
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

          <div className="p-6 space-y-6">
            {/* Order Info Section */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-blue-600 font-medium">
                    Order ID
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {orderData?.orderId || orderData?.po_number || "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-blue-600 font-medium">
                    Supplier
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {supplier?.name || "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-blue-600 font-medium">
                    Total Items
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {summary.totalItems}
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-5 gap-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-600 font-medium">
                  Total Ordered
                </div>
                <div className="text-2xl font-bold text-blue-600 mt-1">
                  {summary.totalOrderedQty}
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="text-sm text-green-600 font-medium">
                  Received
                </div>
                <div className="text-2xl font-bold text-green-600 mt-1">
                  {summary.totalReceivedQty}
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <div className="text-sm text-blue-600 font-medium">Excess</div>
                <div className="text-2xl font-bold text-blue-600 mt-1">
                  {summary.totalReceivedQty > summary.totalOrderedQty
                    ? summary.totalReceivedQty - summary.totalOrderedQty
                    : 0}
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <div className="text-sm text-yellow-600 font-medium">
                  Partial
                </div>
                <div className="text-2xl font-bold text-yellow-600 mt-1">
                  {summary.partiallyReceived}
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <div className="text-sm text-red-600 font-medium">
                  Not Received
                </div>
                <div className="text-2xl font-bold text-red-600 mt-1">
                  {summary.notReceived}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-300">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        S.No.
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Medicine Name
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                        Ordered Qty
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                        {isEditing ? "Received Qty" : "Received Qty"}
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        Total
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {receivedItems.map((item, index) => {
                      const isFullyReceived =
                        item.receivedQuantity === item.quantity;
                      const isPartiallyReceived =
                        item.receivedQuantity > 0 &&
                        item.receivedQuantity < item.quantity;
                      const isNotReceived = item.receivedQuantity === 0;

                      return (
                        <tr
                          key={item.id}
                          className="border-b border-gray-200 hover:bg-gray-50"
                        >
                          <td className="px-4 py-3 text-center text-gray-900 font-medium">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">
                              {item.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.batch_number &&
                                `Batch: ${item.batch_number}`}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                              {item.quantity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                value={item.receivedQuantity}
                                onChange={(e) =>
                                  handleQuantityChange(index, e.target.value)
                                }
                                className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            ) : (
                              <span className="inline-flex items-center justify-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                                {item.receivedQuantity}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900">
                            Rs. {(item.tradePrice || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">
                            Rs.{" "}
                            {(item.quantity * (item.tradePrice || 0)).toFixed(
                              2
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isFullyReceived ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                ✓ Complete
                              </span>
                            ) : item.receivedQuantity > item.quantity ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                ⬆ Excess
                              </span>
                            ) : isPartiallyReceived ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                ⚠ Partial
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                ✗ Missing
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Order Total */}
            <div className="bg-gray-100 rounded-lg p-4 border border-gray-300">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-700 font-medium">
                  Order Subtotal:
                </span>
                <span className="text-lg font-bold text-gray-900">
                  Rs. {summary.totalCost.toFixed(2)}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {summary.allReceived ? (
                  <div className="flex items-center text-green-600 font-medium">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    All items received - Ready to complete
                  </div>
                ) : summary.excessReceived > 0 ? (
                  <div className="flex items-center text-blue-600 font-medium">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12 7a1 1 0 110-2h.01a1 1 0 110 2H12zm-2 0a1 1 0 110-2h.01a1 1 0 110 2H10zm-2 0a1 1 0 110-2h.01a1 1 0 110 2H8zM6 10a1 1 0 110-2h.01a1 1 0 110 2H6zm2 0a1 1 0 110-2h.01a1 1 0 110 2H8zm2 0a1 1 0 110-2h.01a1 1 0 110 2h-.01zm2 0a1 1 0 110-2h.01a1 1 0 110 2h-.01zM6 13a1 1 0 110-2h.01a1 1 0 110 2H6zm2 0a1 1 0 110-2h.01a1 1 0 110 2H8zm2 0a1 1 0 110-2h.01a1 1 0 110 2h-.01zm2 0a1 1 0 110-2h.01a1 1 0 110 2h-.01z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Excess received - {summary.excessReceived} items with extra
                    quantities
                  </div>
                ) : summary.totalReceivedQty > 0 ? (
                  <div className="flex items-center text-yellow-600 font-medium">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Partial receipt - {summary.notReceived} items pending
                  </div>
                ) : (
                  <div className="flex items-center text-red-600 font-medium">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 0016 0zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    No items received yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="text-sm text-gray-600">
            {isEditing && (
              <p className="text-blue-600 font-medium">
                💡 Edit quantities: less (partial), more (excess), or exact
                match
              </p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-400 transition-all duration-200"
            >
              Cancel
            </button>

            {!isEditing ? (
              <>
                <button
                  onClick={handleEditItems}
                  className="px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-50 border border-yellow-300 rounded-lg hover:bg-yellow-100 focus:ring-2 focus:ring-yellow-400 transition-all duration-200"
                >
                  ✏️ Edit Items
                </button>
                <button
                  onClick={handleAllItemsReceived}
                  disabled={!summary.allReceived}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 ${
                    summary.allReceived
                      ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 cursor-pointer"
                      : "bg-gray-400 cursor-not-allowed opacity-50"
                  }`}
                >
                  ✅ All Items Received
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-400 transition-all duration-200"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmPartialReceipt}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 border border-transparent rounded-lg hover:from-blue-600 hover:to-blue-700 focus:ring-2 focus:ring-blue-400 transition-all duration-200"
                >
                  💾 Confirm Partial Receipt
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiveOrderModal;
