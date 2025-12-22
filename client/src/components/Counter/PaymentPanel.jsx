import React, { useState, useEffect, useMemo } from "react";

const PaymentPanel = ({
  totals,
  paymentMethod,
  onPaymentMethodChange,
  onCompleteOrder,
  onSaveOrder,
  isProcessing,
  amountReceived,
  onAmountReceivedChange,
}) => {
  // Local state for input (allows typing before parent sync)
  const [localAmount, setLocalAmount] = useState("");

  // Initialize local amount when totals change
  useEffect(() => {
    if (amountReceived !== undefined && amountReceived !== null) {
      setLocalAmount(String(amountReceived));
    } else if (totals.grandTotal > 0) {
      setLocalAmount(String(totals.grandTotal.toFixed(2)));
    }
  }, [totals.grandTotal]);

  // Sync with parent when local amount changes
  useEffect(() => {
    const parsed = parseFloat(localAmount);
    if (!isNaN(parsed) && onAmountReceivedChange) {
      onAmountReceivedChange(parsed);
    }
  }, [localAmount]);

  // Calculate change or due
  const paymentCalc = useMemo(() => {
    const received = parseFloat(localAmount) || 0;
    const total = totals.grandTotal || 0;

    if (received >= total) {
      return { type: 'change', amount: received - total };
    } else if (received > 0) {
      return { type: 'due', amount: total - received };
    } else {
      return { type: 'due', amount: total };
    }
  }, [localAmount, totals.grandTotal]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 2,
    })
      .format(amount)
      .replace("PKR", "Rs.");
  };

  const handleAmountFocus = (e) => {
    e.target.select();
  };

  const handleQuickAmount = (amount) => {
    setLocalAmount(String(amount));
  };

  const paymentMethods = [
    {
      id: "cash",
      name: "Cash",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      description: "Cash payment",
    },
    {
      id: "upi",
      name: "UPI/Digital",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      ),
      description: "UPI/Digital wallet",
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <svg
            className="w-5 h-5 mr-2 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
            />
          </svg>
          Payment
        </h2>
      </div>

      <div className="p-4 space-y-4">
        {/* Order Total Display */}
        <div className="bg-green-50 rounded-lg p-3">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(totals.grandTotal)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {totals.itemCount} items • Profit: {formatCurrency(totals.profit)}
            </p>
          </div>
        </div>

        {/* Amount Received Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount Received
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rs.</span>
            <input
              type="number"
              value={localAmount}
              onChange={(e) => setLocalAmount(e.target.value)}
              onFocus={handleAmountFocus}
              className="w-full pl-10 pr-4 py-3 text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors text-right"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
          {/* Quick Amount Buttons */}
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => handleQuickAmount(totals.grandTotal)}
              className="flex-1 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              Exact
            </button>
            <button
              type="button"
              onClick={() => handleQuickAmount(Math.ceil(totals.grandTotal / 100) * 100)}
              className="flex-1 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              Round ↑
            </button>
            <button
              type="button"
              onClick={() => handleQuickAmount(0)}
              className="flex-1 py-1 text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 rounded transition-colors"
            >
              Credit
            </button>
          </div>
        </div>

        {/* Change / Due Display */}
        <div className={`rounded-lg p-3 text-center ${paymentCalc.type === 'change'
            ? 'bg-blue-50 border border-blue-200'
            : 'bg-orange-50 border border-orange-200'
          }`}>
          <p className={`text-sm font-medium ${paymentCalc.type === 'change' ? 'text-blue-600' : 'text-orange-600'
            }`}>
            {paymentCalc.type === 'change' ? '💵 Change to Return' : '⚠️ Amount Due'}
          </p>
          <p className={`text-2xl font-bold ${paymentCalc.type === 'change' ? 'text-blue-700' : 'text-orange-700'
            }`}>
            {formatCurrency(paymentCalc.amount)}
          </p>
          {paymentCalc.type === 'due' && paymentCalc.amount > 0 && (
            <p className="text-xs text-orange-600 mt-1">
              Order will be saved as credit/partial payment
            </p>
          )}
        </div>

        {/* Payment Method Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Method
          </label>
          <div className="grid grid-cols-2 gap-2">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => onPaymentMethodChange(method.id)}
                className={`relative flex flex-col items-center p-2 rounded-lg border-2 transition-colors ${paymentMethod === method.id
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-gray-300 text-gray-700"
                  }`}
              >
                <div
                  className={`mb-1 ${paymentMethod === method.id
                    ? "text-blue-600"
                    : "text-gray-400"
                    }`}
                >
                  {method.icon}
                </div>
                <span className="text-xs font-medium">{method.name}</span>
                {paymentMethod === method.id && (
                  <div className="absolute top-1 right-1">
                    <svg
                      className="w-3 h-3 text-blue-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Actions */}
        <div className="space-y-2">
          {/* Complete Order Button */}
          <button
            id="complete-order-btn"
            onClick={onCompleteOrder}
            disabled={isProcessing || !paymentMethod || totals.grandTotal <= 0}
            className={`w-full flex items-center justify-center px-6 py-3 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${paymentCalc.type === 'due' && paymentCalc.amount > 0
                ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
                : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
              }`}
          >
            {isProcessing ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {paymentCalc.type === 'due' && paymentCalc.amount > 0
                  ? `Complete (Due: ${formatCurrency(paymentCalc.amount)})`
                  : 'Complete Order'}
              </>
            )}
          </button>

          {/* Save Order Button */}
          {onSaveOrder && (
            <button
              onClick={onSaveOrder}
              disabled={isProcessing || totals.grandTotal <= 0}
              className="w-full flex items-center justify-center px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                />
              </svg>
              Save as Pending
            </button>
          )}
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="p-2 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500 text-center">
            <span className="font-medium">Shortcuts:</span>{" "}
            <span className="bg-gray-200 px-1 rounded">F1</span> Cash •{" "}
            <span className="bg-gray-200 px-1 rounded">F3</span> UPI •{" "}
            <span className="bg-gray-200 px-1 rounded">F12</span> Complete
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPanel;

