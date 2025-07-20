import React from "react";

const AddMedicineModal = ({
  show,
  onClose,
  newMedicine,
  setNewMedicine,
  onSubmit,
  isLoading,
}) => {
  if (!show) return null;

  const handleInputChange = (field, value) => {
    setNewMedicine((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    const required = [
      "name",
      "manufacturer",
      "batch_number",
      "selling_price",
      "cost_price",
      "quantity",
      "expiry_date",
    ];
    return required.every((field) => newMedicine[field]);
  };

  const isFormValid = validateForm();

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="glass-card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/5 border-b border-white/10 px-6 py-4 rounded-t-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Add New Medicine
                </h2>
                <p className="text-sm text-gray-300 mt-1">
                  Fill in the details to add a new medicine to inventory
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
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
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Basic Information
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Medicine Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newMedicine.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200 backdrop-blur-sm"
                      placeholder="Enter medicine name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Manufacturer *
                    </label>
                    <input
                      type="text"
                      required
                      value={newMedicine.manufacturer}
                      onChange={(e) =>
                        handleInputChange("manufacturer", e.target.value)
                      }
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200 backdrop-blur-sm"
                      placeholder="Enter manufacturer name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Batch Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={newMedicine.batch_number}
                      onChange={(e) =>
                        handleInputChange("batch_number", e.target.value)
                      }
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200 backdrop-blur-sm"
                      placeholder="Batch number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={newMedicine.description}
                      onChange={(e) =>
                        handleInputChange("description", e.target.value)
                      }
                      rows={3}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200 backdrop-blur-sm"
                      placeholder="Enter medicine description"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing & Stock */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Pricing & Stock
                </h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Selling Price (Rs.) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={newMedicine.selling_price}
                        onChange={(e) =>
                          handleInputChange("selling_price", e.target.value)
                        }
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200 backdrop-blur-sm"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Cost Price (Rs.) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={newMedicine.cost_price}
                        onChange={(e) =>
                          handleInputChange("cost_price", e.target.value)
                        }
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200 backdrop-blur-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        GST Per Unit (Rs.)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newMedicine.gst_per_unit}
                        onChange={(e) =>
                          handleInputChange("gst_per_unit", e.target.value)
                        }
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200 backdrop-blur-sm"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={newMedicine.quantity}
                        onChange={(e) =>
                          handleInputChange("quantity", e.target.value)
                        }
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200 backdrop-blur-sm"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Expiry Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={newMedicine.expiry_date}
                        onChange={(e) =>
                          handleInputChange("expiry_date", e.target.value)
                        }
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200 backdrop-blur-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Min Stock Level
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={newMedicine.low_stock_threshold}
                        onChange={(e) =>
                          handleInputChange("low_stock_threshold", e.target.value)
                        }
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200 backdrop-blur-sm"
                        placeholder="10"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Alert when stock falls below this level
                      </p>
                    </div>
                  </div>

                  {/* Profit Calculation */}
                  {newMedicine.selling_price && newMedicine.cost_price && (
                    <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-4 backdrop-blur-sm">
                      <h4 className="text-sm font-medium text-green-300 mb-2">
                        Profit Analysis
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-green-300">
                            Profit per unit:
                          </span>
                          <span className="font-semibold text-green-200 ml-2">
                            Rs.
                            {(
                              parseFloat(newMedicine.selling_price) -
                              parseFloat(newMedicine.cost_price)
                            ).toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-green-300">Profit margin:</span>
                          <span className="font-semibold text-green-200 ml-2">
                            {newMedicine.cost_price > 0
                              ? (
                                  ((parseFloat(newMedicine.selling_price) -
                                    parseFloat(newMedicine.cost_price)) /
                                    parseFloat(newMedicine.cost_price)) *
                                  100
                                ).toFixed(1)
                              : 0}
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="sticky bottom-0 bg-white/5 border-t border-white/20 px-6 py-4 mt-8 -mx-6 -mb-6 rounded-b-xl backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-300">* Required fields</p>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-200 backdrop-blur-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid || isLoading}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Adding...
                    </div>
                  ) : (
                    "Add Medicine"
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMedicineModal;
