const { supabase } = require("../../config/supabase");

class Order {
  constructor(data = {}) {
    this.id = data.id;
    this.order_number = data.order_number;
    this.user_id = data.user_id;
    this.customer_name = data.customer_name;
    this.customer_phone = data.customer_phone;
    this.customer_email = data.customer_email;
    this.organization_id = data.organization_id;
    this.total_amount = data.total_amount || 0;
    this.tax_amount = data.tax_amount || 0;
    this.tax_percent = data.tax_percent || 0;
    this.subtotal = data.subtotal || 0;
    this.profit = data.profit || 0;
    this.discount = data.discount || 0;
    this.discount_percent = data.discount_percent || 0;
    this.payment_method = data.payment_method || "cash";
    this.payment_status = data.payment_status || "pending";
    this.status = data.status || "pending";
    this.notes = data.notes;
    this.completed_at = data.completed_at;
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();

    // Related data
    this.order_items = data.order_items || [];
    this.users = data.users;
  }

  // Static methods for database operations
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          users (
            id,
            username,
            fullName,
            email,
            role
          ),
          order_items (
            id,
            quantity,
            unitPrice,
            totalPrice,
            discount,
            medicines (
              id,
              name,
              manufacturer,
              batchNumber,
              costPrice
            )
          )
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      return data ? new Order(data) : null;
    } catch (error) {
      console.error("Error finding order by ID:", error);
      throw error;
    }
  }

  static async findByOrganization(organizationId, options = {}) {
    try {
      let query = supabase
        .from("orders")
        .select(
          `
          *,
          users (
            id,
            username,
            fullName,
            email,
            role
          ),
          order_items (
            id,
            quantity,
            unitPrice,
            totalPrice,
            discount,
            medicines (
              id,
              name,
              manufacturer,
              batchNumber,
              costPrice
            )
          )
        `
        )
        .eq("organization_id", organizationId);

      if (options.status) {
        query = query.eq("status", options.status);
      }

      if (options.userId) {
        query = query.eq("user_id", options.userId);
      }

      if (options.paymentMethod) {
        query = query.eq("payment_method", options.paymentMethod);
      }

      if (options.dateFrom) {
        query = query.gte("created_at", options.dateFrom);
      }

      if (options.dateTo) {
        query = query.lte("created_at", options.dateTo);
      }

      // Sorting
      if (options.sortBy) {
        const sortOrder = options.sortOrder || "desc";
        query = query.order(options.sortBy, { ascending: sortOrder === "asc" });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      // Pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(
          options.offset,
          options.offset + (options.limit || 100) - 1
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data ? data.map((order) => new Order(order)) : [];
    } catch (error) {
      console.error("Error finding orders by organization:", error);
      throw error;
    }
  }

  static async findByDateRange(organizationId, startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          users (
            id,
            username,
            fullName,
            email,
            role
          ),
          order_items (
            id,
            quantity,
            unitPrice,
            totalPrice,
            discount,
            medicines (
              id,
              name,
              manufacturer,
              batchNumber,
              costPrice
            )
          )
        `
        )
        .eq("organization_id", organizationId)
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ? data.map((order) => new Order(order)) : [];
    } catch (error) {
      console.error("Error finding orders by date range:", error);
      throw error;
    }
  }

  static async findByStatus(organizationId, status) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          users (
            id,
            username,
            fullName,
            email,
            role
          ),
          order_items (
            id,
            quantity,
            unitPrice,
            totalPrice,
            discount,
            medicines (
              id,
              name,
              manufacturer,
              batchNumber,
              costPrice
            )
          )
        `
        )
        .eq("organizationId", organizationId)
        .eq("status", status)
        .order("createdAt", { ascending: false });

      if (error) throw error;
      return data ? data.map((order) => new Order(order)) : [];
    } catch (error) {
      console.error("Error finding orders by status:", error);
      throw error;
    }
  }

  static async create(orderData) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .insert([orderData])
        .select()
        .single();

      if (error) throw error;
      return new Order(data);
    } catch (error) {
      console.error("Error creating order:", error);
      throw error;
    }
  }

  async save() {
    try {
      this.updatedAt = new Date().toISOString();

      if (this.id) {
        // Update existing order
        const { data, error } = await supabase
          .from("orders")
          .update(this.toJSON())
          .eq("id", this.id)
          .select()
          .single();

        if (error) throw error;
        return new Order(data);
      } else {
        // Create new order
        return await Order.create(this.toJSON());
      }
    } catch (error) {
      console.error("Error saving order:", error);
      throw error;
    }
  }

  async addItem(itemData) {
    try {
      const { data, error } = await supabase
        .from("order_items")
        .insert([
          {
            orderId: this.id,
            ...itemData,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Refresh order items
      await this.loadItems();
      return data;
    } catch (error) {
      console.error("Error adding order item:", error);
      throw error;
    }
  }

  async loadItems() {
    try {
      const { data, error } = await supabase
        .from("order_items")
        .select(
          `
          id,
          quantity,
          unitPrice,
          totalPrice,
          discount,
          medicines (
            id,
            name,
            manufacturer,
            batchNumber,
            costPrice
          )
        `
        )
        .eq("orderId", this.id);

      if (error) throw error;
      this.items = data || [];
      return this.items;
    } catch (error) {
      console.error("Error loading order items:", error);
      throw error;
    }
  }

  async complete() {
    try {
      this.status = "completed";
      this.completedAt = new Date().toISOString();
      this.updatedAt = new Date().toISOString();

      const { data, error } = await supabase
        .from("orders")
        .update({
          status: this.status,
          completedAt: this.completedAt,
          updatedAt: this.updatedAt,
        })
        .eq("id", this.id)
        .select()
        .single();

      if (error) throw error;
      Object.assign(this, data);
      return this;
    } catch (error) {
      console.error("Error completing order:", error);
      throw error;
    }
  }

  async cancel() {
    try {
      this.status = "cancelled";
      this.updatedAt = new Date().toISOString();

      const { data, error } = await supabase
        .from("orders")
        .update({
          status: this.status,
          updatedAt: this.updatedAt,
        })
        .eq("id", this.id)
        .select()
        .single();

      if (error) throw error;
      Object.assign(this, data);
      return this;
    } catch (error) {
      console.error("Error cancelling order:", error);
      throw error;
    }
  }

  // Static method to get daily sales report
  static async getDailySalesReport(organizationId, date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("orders")
        .select("totalAmount, profit, subtotal, taxAmount, discount")
        .eq("organizationId", organizationId)
        .eq("status", "completed")
        .gte("createdAt", startOfDay.toISOString())
        .lte("createdAt", endOfDay.toISOString());

      if (error) throw error;

      const report = {
        totalOrders: data.length,
        totalRevenue: data.reduce((sum, order) => sum + order.totalAmount, 0),
        totalProfit: data.reduce((sum, order) => sum + order.profit, 0),
        totalSubtotal: data.reduce((sum, order) => sum + order.subtotal, 0),
        totalTax: data.reduce((sum, order) => sum + order.taxAmount, 0),
        totalDiscount: data.reduce((sum, order) => sum + order.discount, 0),
        averageOrderValue:
          data.length > 0
            ? data.reduce((sum, order) => sum + order.totalAmount, 0) /
              data.length
            : 0,
      };

      return report;
    } catch (error) {
      console.error("Error getting daily sales report:", error);
      throw error;
    }
  }

  // Static method to get monthly sales report
  static async getMonthlySalesReport(organizationId, year, month) {
    try {
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

      const { data, error } = await supabase
        .from("orders")
        .select("totalAmount, profit, subtotal, taxAmount, discount, createdAt")
        .eq("organizationId", organizationId)
        .eq("status", "completed")
        .gte("createdAt", startOfMonth.toISOString())
        .lte("createdAt", endOfMonth.toISOString());

      if (error) throw error;

      // Group by day
      const dailyData = {};
      data.forEach((order) => {
        const day = new Date(order.createdAt).getDate();
        if (!dailyData[day]) {
          dailyData[day] = {
            totalRevenue: 0,
            totalProfit: 0,
            totalOrders: 0,
          };
        }
        dailyData[day].totalRevenue += order.totalAmount;
        dailyData[day].totalProfit += order.profit;
        dailyData[day].totalOrders += 1;
      });

      const report = {
        totalOrders: data.length,
        totalRevenue: data.reduce((sum, order) => sum + order.totalAmount, 0),
        totalProfit: data.reduce((sum, order) => sum + order.profit, 0),
        totalSubtotal: data.reduce((sum, order) => sum + order.subtotal, 0),
        totalTax: data.reduce((sum, order) => sum + order.taxAmount, 0),
        totalDiscount: data.reduce((sum, order) => sum + order.discount, 0),
        averageOrderValue:
          data.length > 0
            ? data.reduce((sum, order) => sum + order.totalAmount, 0) /
              data.length
            : 0,
        dailyData,
      };

      return report;
    } catch (error) {
      console.error("Error getting monthly sales report:", error);
      throw error;
    }
  }

  // Static method to get top selling medicines
  static async getTopSellingMedicines(organizationId, limit = 10, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from("order_items")
        .select(
          `
          quantity,
          medicines (
            id,
            name,
            manufacturer
          )
        `
        )
        .eq("orders.organizationId", organizationId)
        .eq("orders.status", "completed")
        .gte("orders.createdAt", startDate.toISOString());

      if (error) throw error;

      // Group by medicine
      const medicineSales = {};
      data.forEach((item) => {
        if (item.medicines) {
          const medicineId = item.medicines.id;
          if (!medicineSales[medicineId]) {
            medicineSales[medicineId] = {
              id: medicineId,
              name: item.medicines.name,
              manufacturer: item.medicines.manufacturer,
              totalQuantity: 0,
            };
          }
          medicineSales[medicineId].totalQuantity += item.quantity;
        }
      });

      // Sort by total quantity and return top N
      const topMedicines = Object.values(medicineSales)
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, limit);

      return topMedicines;
    } catch (error) {
      console.error("Error getting top selling medicines:", error);
      throw error;
    }
  }

  // Computed properties
  get formattedDate() {
    return new Date(this.createdAt).toLocaleDateString();
  }

  get formattedTime() {
    return new Date(this.createdAt).toLocaleTimeString();
  }

  get totalItems() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  get profitMargin() {
    if (this.totalAmount === 0) return 0;
    return Math.round((this.profit / this.totalAmount) * 100);
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      organizationId: this.organizationId,
      totalAmount: this.totalAmount,
      taxAmount: this.taxAmount,
      taxPercent: this.taxPercent,
      subtotal: this.subtotal,
      profit: this.profit,
      discount: this.discount,
      paymentMethod: this.paymentMethod,
      status: this.status,
      completedAt: this.completedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      // Computed properties
      formattedDate: this.formattedDate,
      formattedTime: this.formattedTime,
      totalItems: this.totalItems,
      profitMargin: this.profitMargin,
      // Related data
      items: this.items,
      user: this.user,
    };
  }

  // Static method to get order count by organization
  static async countByOrganization(organizationId) {
    try {
      const { count, error } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("organizationId", organizationId);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error("Error counting orders by organization:", error);
      throw error;
    }
  }
}

module.exports = Order;
