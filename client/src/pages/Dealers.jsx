import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { useAuthContext } from "../contexts/AuthContext";
import { customerService } from "../services/customerService";
import {
  searchMedicines,
  clearSearchResults,
} from "../store/slices/medicineSlice";
import {
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  setCustomerInfo,
  setPaymentMethod,
  createOrder,
} from "../store/slices/orderSlice";

// Components
import QuickSearchBar from "../components/Counter/QuickSearchBar";
import MedicineSearchResults from "../components/Counter/MedicineSearchResults";
import ShoppingCart from "../components/Counter/ShoppingCart";
import PaymentPanel from "../components/Counter/PaymentPanel";
import ReceiptModal from "../components/Counter/ReceiptModal";

const Dealers = () => {
  const dispatch = useDispatch();
  const { profile } = useAuthContext();
  const { searchResults, isSearching } = useSelector(
    (state) => state.medicines
  );
  const { cart, customerInfo, paymentMethod, isCreating } = useSelector(
    (state) => state.orders
  );

  // State management
  const [activeTab, setActiveTab] = useState("customers"); // customers, order, history
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [medicineSearchQuery, setMedicineSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [customerOrderHistory, setCustomerOrderHistory] = useState([]);
  const [customerPendingBalance, setCustomerPendingBalance] = useState(0);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrderData, setLastOrderData] = useState(null);
  const [showAddCustomerForm, setShowAddCustomerForm] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    date_of_birth: '',
    gender: '',
    allergies: '',
    emergency_contact: '',
    emergency_phone: ''
  });
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  // API call functions
  const searchCustomersAPI = async (query) => {
    try {
      setIsSearchingCustomers(true);
      const response = await customerService.searchCustomers(query);
      setCustomerSearchResults(response.data?.customers || []);
    } catch (error) {
      console.error('Error searching customers:', error);
      // Fallback to mock data if API fails
      const mockCustomers = [
        {
          id: 1,
          name: "John Doe",
          phone: "+1234567890",
          email: "john@example.com",
          address: "123 Main St, City",
          pendingBalance: 150.75,
          totalOrders: 25,
          lastOrderDate: "2024-01-15",
        },
        {
          id: 2,
          name: "Jane Smith",
          phone: "+1234567891",
          email: "jane@example.com",
          address: "456 Oak Ave, City",
          pendingBalance: 0,
          totalOrders: 12,
          lastOrderDate: "2024-01-10",
        },
        {
          id: 3,
          name: "Bob Johnson",
          phone: "+1234567892",
          email: "bob@example.com",
          address: "789 Pine St, City",
          pendingBalance: 75.25,
          totalOrders: 8,
          lastOrderDate: "2024-01-08",
        },
      ];
      const filtered = mockCustomers.filter((customer) =>
        customer.name.toLowerCase().includes(query.toLowerCase()) ||
        customer.phone.includes(query) ||
        customer.email.toLowerCase().includes(query.toLowerCase())
      );
      setCustomerSearchResults(filtered);
      toast.error('Using offline data - API connection failed');
    } finally {
      setIsSearchingCustomers(false);
    }
  };

  const loadCustomerOrderHistory = async (customerId) => {
    try {
      const response = await customerService.getCustomerOrderHistory(customerId);
      // Fix: Access response.data.orders instead of response.orders
      const orders = response.data?.orders || [];
      
      // Transform the data to match the UI expectations
      const transformedOrders = orders.map(order => ({
        id: order.id,
        date: new Date(order.created_at).toLocaleDateString(),
        total: order.total_amount || 0,
        status: order.status,
        items: order.order_items?.map(item => ({
          name: item.medicines?.name || 'Unknown Medicine',
          quantity: item.quantity,
          price: item.unit_price
        })) || []
      }));
      
      setCustomerOrderHistory(transformedOrders);
    } catch (error) {
      console.error('Error loading customer order history:', error);
      // Fallback to mock data
      const mockOrderHistory = [
        {
          id: 1,
          date: "2024-01-15",
          total: 125.50,
          status: "completed",
          items: [
            { name: "Paracetamol 650mg", quantity: 2, price: 5.00 },
            { name: "Crocin Advance", quantity: 1, price: 15.00 },
          ],
        },
        {
          id: 2,
          date: "2024-01-10",
          total: 89.25,
          status: "pending",
          items: [
            { name: "Combiflam", quantity: 3, price: 25.00 },
            { name: "ORS Powder", quantity: 2, price: 12.00 },
          ],
        },
      ];
      setCustomerOrderHistory(mockOrderHistory);
      toast.error('Using offline data - API connection failed');
    }
  };

  const loadCustomerPendingBalance = async (customerId) => {
    try {
      const response = await customerService.getCustomerPendingBalance(customerId);
      // Fix: Access response.data.pendingBalance instead of response.pendingBalance
      setCustomerPendingBalance(response.data?.pendingBalance || 0);
    } catch (error) {
      console.error('Error loading customer pending balance:', error);
      // Use the balance from selected customer as fallback
      setCustomerPendingBalance(selectedCustomer?.pendingBalance || 0);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    
    if (!newCustomerData.name.trim() || !newCustomerData.phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }

    try {
      setIsCreatingCustomer(true);
      const response = await customerService.createCustomer(newCustomerData);
      
      if (response.success) {
        toast.success('Customer created successfully');
        setShowAddCustomerForm(false);
        setNewCustomerData({
          name: '',
          phone: '',
          email: '',
          address: '',
          date_of_birth: '',
          gender: '',
          allergies: '',
          emergency_contact: '',
          emergency_phone: ''
        });
        // Refresh customer search if there's a query
        if (customerSearchQuery.trim()) {
          searchCustomersAPI(customerSearchQuery.trim());
        }
      } else {
        toast.error(response.message || 'Failed to create customer');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error('Failed to create customer');
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const handleInputChange = (field, value) => {
    setNewCustomerData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Search customers with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (customerSearchQuery.trim().length >= 2) {
        searchCustomersAPI(customerSearchQuery.trim());
      } else {
        setCustomerSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [customerSearchQuery]);

  // Search medicines with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (medicineSearchQuery.trim().length >= 2) {
        dispatch(
          searchMedicines({
            query: medicineSearchQuery.trim(),
            limit: 50,
          })
        );
      } else {
        dispatch(clearSearchResults());
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [medicineSearchQuery, dispatch]);

  // Load customer order history when customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      loadCustomerOrderHistory(selectedCustomer.id);
      loadCustomerPendingBalance(selectedCustomer.id);
      dispatch(setCustomerInfo({
        name: selectedCustomer.name,
        phone: selectedCustomer.phone,
        email: selectedCustomer.email,
        address: selectedCustomer.address,
      }));
    }
  }, [selectedCustomer, dispatch]);

  // Calculate order totals
  const orderTotals = React.useMemo(() => {
    const subtotal = cart.reduce((total, item) => {
      const itemTotal = (item.unitPrice || 0) * (item.quantity || 1);
      const itemDiscount = (itemTotal * (item.discountPercent || 0)) / 100;
      const itemGst = (item.gstPerUnit || 0) * (item.quantity || 1);
      return total + (itemTotal - itemDiscount + itemGst);
    }, 0);

    const globalDiscount = Math.min(discountAmount, subtotal);
    const grandTotal = subtotal - globalDiscount;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      globalDiscount: Math.round(globalDiscount * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      itemCount: cart.reduce((total, item) => total + (item.quantity || 0), 0),
    };
  }, [cart, discountAmount]);

  // Event handlers
  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    
    // Set customer info in Redux store
    dispatch(setCustomerInfo({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
    }));

    // Switch to order tab to allow user to add items and complete order
    setActiveTab("order");
    
    toast.success(`Customer ${customer.name} selected. You can now add items to create an order.`);
  };

  const handleAddToCart = (medicine, quantity = 1, discountPercent = 0) => {
    if (quantity > medicine.quantity) {
      toast.error(`Only ${medicine.quantity} units available in stock`);
      return;
    }

    const cartItem = {
      medicineId: medicine.id,
      name: medicine.name,
      unitPrice: medicine.selling_price,
      cost_price: medicine.cost_price,
      quantity: quantity,
      discountPercent: discountPercent,
      available_stock: medicine.quantity,
      gstPerUnit: medicine.gst_per_unit || 0,
      manufacturer: medicine.manufacturer,
      batch_number: medicine.batch_number,
    };

    dispatch(addToCart(cartItem));
    toast.success(`${medicine.name} added to cart`);
  };

  const handleUpdateCartItem = (medicineId, updates) => {
    dispatch(updateCartItem({ medicineId, updates }));
  };

  const handleRemoveFromCart = (medicineId) => {
    dispatch(removeFromCart(medicineId));
    toast.success("Item removed from cart");
  };

  const handleClearCart = () => {
    dispatch(clearCart());
    toast.success("Cart cleared");
  };

  const handleReorderItem = (item) => {
    // Create a cart item from the history item
    const cartItem = {
      medicineId: item.medicineId || `reorder-${Date.now()}`, // Use existing ID or generate one
      name: item.name,
      unitPrice: item.price,
      cost_price: item.price * 0.7, // Estimate cost price if not available
      quantity: item.quantity,
      discountPercent: 0,
      available_stock: 999, // Assume stock is available for reorder
      gstPerUnit: 0, // Will be calculated if needed
      manufacturer: 'Unknown',
      batch_number: 'REORDER'
    };

    dispatch(addToCart(cartItem));
    toast.success(`${item.name} added to cart for reorder`);
    setActiveTab("order");
  };

  const handleReorderAll = (order) => {
    // Clear existing cart first
    dispatch(clearCart());
    
    // Add all items from the order to cart
    order.items.forEach(item => {
      const cartItem = {
        medicineId: item.medicineId || `reorder-${Date.now()}-${Math.random()}`,
        name: item.name,
        unitPrice: item.price,
        cost_price: item.price * 0.7,
        quantity: item.quantity,
        discountPercent: 0,
        available_stock: 999,
        gstPerUnit: 0,
        manufacturer: 'Unknown',
        batch_number: 'REORDER'
      };
      dispatch(addToCart(cartItem));
    });
    
    toast.success(`All items from Order #${order.id} added to cart`);
    setActiveTab("order");
  };

  const handleCompleteOrder = async () => {
    if (!selectedCustomer) {
      toast.error("Please select a customer first");
      return;
    }

    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    try {
      const orderData = {
        // Customer information
        customer_name: selectedCustomer.name || '',
        customer_phone: selectedCustomer.phone || '',
        customer_email: selectedCustomer.email || '',
        
        // Calculate total GST amount
        tax_amount: cart.reduce((total, item) => total + ((item.gstPerUnit || 0) * (item.quantity || 1)), 0),
        
        // Order totals (flattened)
        total_amount: orderTotals.grandTotal || 0,
        subtotal: orderTotals.subtotal || 0,
        tax_percent: 0, // GST is calculated per item
        profit: cart.reduce((total, item) => {
          const itemProfit = ((item.unitPrice || 0) - (item.cost_price || (item.unitPrice || 0) * 0.7)) * (item.quantity || 1);
          return total + itemProfit;
        }, 0),
        discount: orderTotals.globalDiscount || 0,
        discount_percent: orderTotals.subtotal > 0 ? ((orderTotals.globalDiscount || 0) / orderTotals.subtotal * 100) : 0,
        
        // Payment information
        payment_method: paymentMethod || 'cash',
        payment_status: 'completed',
        status: "completed",
        completed_at: new Date().toISOString(),
        
        // Order items
        items: cart.map((item) => {
          const itemSubtotal = (item.quantity || 1) * (item.unitPrice || 0);
          const itemDiscount = itemSubtotal * ((item.discountPercent || 0) / 100);
          const itemAfterDiscount = itemSubtotal - itemDiscount;
          const gstAmount = (item.gstPerUnit || 0) * (item.quantity || 1);
          const itemTotal = itemAfterDiscount + gstAmount;
          const itemProfit = ((item.unitPrice || 0) - (item.cost_price || (item.unitPrice || 0) * 0.7)) * (item.quantity || 1);
          
          return {
            medicine_id: item.medicineId,
            quantity: item.quantity || 1,
            unit_price: item.unitPrice || 0,
            total_price: itemTotal,
            discount: itemDiscount,
            discount_percent: item.discountPercent || 0,
            cost_price: item.cost_price || (item.unitPrice || 0) * 0.7,
            profit: itemProfit,
            gst_amount: gstAmount,
          };
        }),
      };

      const result = await dispatch(createOrder(orderData)).unwrap();
      
      setLastOrderData({
        orderId: result.orderId || result.id,
        items: cart,
        customer: {
          name: selectedCustomer.name,
          phone: selectedCustomer.phone,
          email: selectedCustomer.email,
        },
        totals: orderTotals,
        paymentMethod,
        timestamp: new Date().toISOString(),
      });
      
      setShowReceipt(true);
      dispatch(clearCart());
      setDiscountAmount(0);
      
      toast.success("Order completed successfully!");
    } catch (error) {
      toast.error(error.message || "Failed to create order");
    }
  };

  const renderCustomerSearch = () => (
    <div className="space-y-6">
      {/* Customer Search */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Search Customers
          </h2>
          <button
            onClick={() => setShowAddCustomerForm(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Customer
          </button>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={customerSearchQuery}
            onChange={(e) => setCustomerSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {isSearchingCustomers && (
            <div className="absolute right-3 top-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      </div>



      {/* Add Customer Form Modal */}
      {showAddCustomerForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Add New Customer</h2>
                <button
                  onClick={() => setShowAddCustomerForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleCreateCustomer} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={newCustomerData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      value={newCustomerData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={newCustomerData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={newCustomerData.date_of_birth}
                      onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gender
                    </label>
                    <select
                      value={newCustomerData.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Emergency Contact
                    </label>
                    <input
                      type="text"
                      value={newCustomerData.emergency_contact}
                      onChange={(e) => handleInputChange('emergency_contact', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Emergency Phone
                    </label>
                    <input
                      type="tel"
                      value={newCustomerData.emergency_phone}
                      onChange={(e) => handleInputChange('emergency_phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    value={newCustomerData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Allergies
                  </label>
                  <textarea
                    value={newCustomerData.allergies}
                    onChange={(e) => handleInputChange('allergies', e.target.value)}
                    rows={2}
                    placeholder="List any known allergies..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddCustomerForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingCustomer}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isCreatingCustomer && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    {isCreatingCustomer ? 'Creating...' : 'Create Customer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Customer Search Results */}
      {customerSearchResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Search Results ({customerSearchResults.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {customerSearchResults.map((customer) => (
              <div
                key={customer.id}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleCustomerSelect(customer)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-900">
                      {customer.name}
                    </h4>
                    <p className="text-sm text-gray-600">{customer.phone}</p>
                    <p className="text-sm text-gray-600">{customer.email}</p>
                    <p className="text-sm text-gray-500">{customer.address}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex flex-col space-y-1">
                      <span className="text-sm text-gray-500">
                        Total Orders: {customer.totalOrders}
                      </span>
                      <span className="text-sm text-gray-500">
                        Last Order: {customer.lastOrderDate}
                      </span>
                      {customer.pendingBalance > 0 && (
                        <span className="text-sm font-medium text-red-600">
                          Pending: Rs.{customer.pendingBalance.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderOrderCreation = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Medicine Search & Selection */}
      <div className="lg:col-span-2 space-y-6">
        {/* Selected Customer Info */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedCustomer?.name}
              </h3>
              <p className="text-sm text-gray-600">{selectedCustomer?.phone}</p>
              {customerPendingBalance > 0 && (
                <p className="text-sm font-medium text-red-600">
                  Pending Balance: Rs.{customerPendingBalance.toFixed(2)}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setSelectedCustomer(null);
                setActiveTab("customers");
                dispatch(clearCart());
              }}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Change Customer
            </button>
          </div>
        </div>

        {/* Medicine Search */}
        <QuickSearchBar
          searchQuery={medicineSearchQuery}
          onSearchChange={setMedicineSearchQuery}
          isSearching={isSearching}
        />

        {/* Medicine Search Results */}
        <MedicineSearchResults
          medicines={searchResults}
          onAddToCart={handleAddToCart}
          isSearching={isSearching}
          searchQuery={medicineSearchQuery}
        />
      </div>

      {/* Right Column - Cart & Payment */}
      <div className="space-y-6">
        {/* Shopping Cart */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Shopping Cart ({orderTotals.itemCount} items)
            </h2>
          </div>
          <ShoppingCart
            cart={cart}
            onUpdateItem={handleUpdateCartItem}
            onRemoveItem={handleRemoveFromCart}
            onClearCart={handleClearCart}
            totals={orderTotals}
            discountAmount={discountAmount}
            setDiscountAmount={setDiscountAmount}
            isCounterStaff={false}
            isMobile={false}
          />
        </div>

        {/* Payment */}
        <PaymentPanel
          totals={orderTotals}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={(method) => dispatch(setPaymentMethod(method))}
          onCompleteOrder={handleCompleteOrder}
          isProcessing={isCreating}
        />
      </div>
    </div>
  );

  const renderCustomerHistory = () => (
    <div className="space-y-6">
      {/* Customer Info Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {selectedCustomer?.name}
            </h2>
            <p className="text-gray-600">{selectedCustomer?.phone}</p>
            <p className="text-gray-600">{selectedCustomer?.email}</p>
          </div>
          <div className="text-right">
            <div className="space-y-1">
              <p className="text-sm text-gray-500">
                Total Orders: {selectedCustomer?.totalOrders}
              </p>
              {customerPendingBalance > 0 && (
                <p className="text-lg font-semibold text-red-600">
                  Pending Balance: Rs.{customerPendingBalance.toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Order History */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Order History
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {customerOrderHistory.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 mb-2">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No Order History</h3>
              <p className="text-gray-500">This customer hasn't placed any orders yet.</p>
            </div>
          ) : (
            customerOrderHistory.map((order) => (
              <div key={order.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">
                      Order #{order.id}
                    </p>
                    <p className="text-sm text-gray-600">{order.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      Rs.{order.total.toFixed(2)}
                    </p>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        order.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                   {order.items.map((item, index) => (
                      <div 
                        key={index} 
                        className="flex justify-between items-center text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 p-2 rounded cursor-pointer transition-colors border border-transparent hover:border-blue-200"
                        onClick={() => handleReorderItem(item)}
                        title="Click to add this item to cart"
                      >
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-2 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          {item.name} x{item.quantity}
                        </span>
                        <span className="flex items-center">
                          Rs.{(item.price * item.quantity).toFixed(2)}
                          <svg className="w-4 h-4 ml-2 text-blue-500 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                          </svg>
                        </span>
                      </div>
                    ))}
                 </div>
                 <div className="mt-3 pt-3 border-t border-gray-100">
                   <button
                     onClick={() => handleReorderAll(order)}
                     className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                   >
                     Reorder All Items
                   </button>
                 </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Dealers</h1>
              {selectedCustomer && (
                <span className="text-sm text-gray-500">
                  • {selectedCustomer.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("customers")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "customers"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Search Customers
            </button>
            <button
              onClick={() => setActiveTab("order")}
              disabled={!selectedCustomer}
              className={`py-4 px-1 border-b-2 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                activeTab === "order"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Create Order
            </button>
            <button
              onClick={() => setActiveTab("history")}
              disabled={!selectedCustomer}
              className={`py-4 px-1 border-b-2 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                activeTab === "history"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Customer History
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "customers" && renderCustomerSearch()}
        {activeTab === "order" && selectedCustomer && renderOrderCreation()}
        {activeTab === "history" && selectedCustomer && renderCustomerHistory()}
      </div>

      {/* Receipt Modal */}
      <ReceiptModal
        show={showReceipt}
        onClose={() => setShowReceipt(false)}
        orderId={lastOrderData?.orderId}
        orderData={lastOrderData}
      />
    </div>
  );
};

export default Dealers;