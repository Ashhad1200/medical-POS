const { supabase } = require('../config/supabase');
const { AppError } = require('../utils/errors');
const RefactoredSupplier = require('./RefactoredSupplier');

class RefactoredPurchaseOrder {
    constructor(data = {}) {
        this.id = data.id;
        this.organizationId = data.organization_id || data.organizationId;
        this.poNumber = data.po_number || data.poNumber;
        this.supplierId = data.supplier_id || data.supplierId;
        this.status = data.status || 'pending';
        this.orderDate = data.order_date || data.orderDate;
        this.expectedDeliveryDate = data.expected_delivery_date || data.expectedDeliveryDate;
        this.actualDeliveryDate = data.actual_delivery_date || data.actualDeliveryDate;
        this.taxAmount = parseFloat(data.tax_amount || data.taxAmount || 0);
        this.discountAmount = parseFloat(data.discount || data.discountAmount || 0);
        this.totalAmount = parseFloat(data.total_amount || data.totalAmount || 0);
        this.notes = data.notes;
        this.createdAt = data.created_at || data.createdAt;
        this.updatedAt = data.updated_at || data.updatedAt;
        this.createdBy = data.created_by || data.createdBy;
        this.approvedBy = data.approved_by || data.approvedBy;
        this.approvedAt = data.approved_at || data.approvedAt;
        this.appliedAt = data.applied_at || data.appliedAt;
        
        // Related data
        this.supplier = data.supplier;
        this.items = data.items || [];
        this.creator = data.creator;
    }

    // Validation methods
    validate() {
        const errors = [];

        if (!this.organizationId) {
            errors.push('Organization ID is required');
        }

        if (!this.supplierId) {
            errors.push('Supplier ID is required');
        }

        if (!this.createdBy) {
            errors.push('Created by user ID is required');
        }

        if (!this.orderDate) {
            errors.push('Order date is required');
        }

        if (this.taxAmount < 0) {
            errors.push('Tax amount cannot be negative');
        }

        if (this.discountAmount < 0) {
            errors.push('Discount amount cannot be negative');
        }

        if (this.totalAmount < 0) {
            errors.push('Total amount cannot be negative');
        }

        // Validate status transitions
        if (this.id && !this.isValidStatusTransition()) {
            errors.push('Invalid status transition');
        }

        if (errors.length > 0) {
            throw new AppError('Validation failed: ' + errors.join(', '), 400);
        }

        return true;
    }

    validateItems() {
        if (!this.items || this.items.length === 0) {
            throw new AppError('Purchase order must have at least one item', 400);
        }

        this.items.forEach((item, index) => {
            if (!item.medicine_id && !item.medicineId) {
                throw new AppError(`Item ${index + 1}: Medicine ID is required`, 400);
            }
            if (!item.quantity || item.quantity <= 0) {
                throw new AppError(`Item ${index + 1}: Quantity must be greater than 0`, 400);
            }
            if ((!item.unit_cost && !item.unitCost) || parseFloat(item.unit_cost || item.unitCost) < 0) {
                throw new AppError(`Item ${index + 1}: Unit cost must be 0 or greater`, 400);
            }
        });
    }

    isValidStatusTransition() {
        const validTransitions = {
            'pending': ['received', 'cancelled', 'applied'],
            'received': [],
            'cancelled': [],
            'applied': []
        };

        return validTransitions[this.status] || [];
    }

    canEdit() {
        return ['pending'].includes(this.status);
    }

    canCancel() {
        return ['pending'].includes(this.status);
    }

    canReceive() {
        return ['pending'].includes(this.status);
    }

    canApply() {
        return ['pending'].includes(this.status);
    }

    // Convert to database format
    toDbFormat() {
        return {
            id: this.id,
            organization_id: this.organizationId,
            po_number: this.poNumber,
            supplier_id: this.supplierId,
            status: this.status,
            order_date: this.orderDate,
            expected_delivery: this.expectedDeliveryDate,
            actual_delivery: this.actualDelivery,
            tax_amount: this.taxAmount,
            discount: this.discountAmount, // Map discountAmount to 'discount' column
            total_amount: this.totalAmount,
            notes: this.notes?.trim(),
            created_by: this.createdBy,
            approved_by: this.approvedBy,
            approved_at: this.approvedAt
            // TODO: Add applied_at column to database schema
            // applied_at: this.appliedAt
        };
    }

    // Calculate totals from items
    calculateTotals() {
        const subtotal = this.items.reduce((sum, item) => {
            const unitCost = parseFloat(item.unit_cost || item.unitCost || 0);
            const quantity = parseInt(item.quantity || 0);
            return sum + (unitCost * quantity);
        }, 0);

        this.totalAmount = subtotal + this.taxAmount - this.discountAmount;
        
        // Update item total costs
        this.items.forEach(item => {
            const unitCost = parseFloat(item.unit_cost || item.unitCost || 0);
            const quantity = parseInt(item.quantity || 0);
            item.total_cost = unitCost * quantity;
            item.totalCost = item.total_cost;
        });
    }

    // Static methods for database operations
    static async findById(id, organizationId, includeItems = true) {
        try {
            let query = supabase
                .from('purchase_orders')
                .select(`
                    *,
                    supplier:suppliers(*),
                    creator:users!purchase_orders_created_by_fkey(id, full_name, email)
                `)
                .eq('id', id)
                .eq('organization_id', organizationId)
                .single();

            const { data, error } = await query;

            if (error) {
                if (error.code === 'PGRST116') {
                    throw new AppError('Purchase order not found', 404);
                }
                throw new AppError('Database error: ' + error.message, 500);
            }

            const purchaseOrder = new RefactoredPurchaseOrder(data);

            if (includeItems) {
                await purchaseOrder.loadItems();
            }

            return purchaseOrder;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to fetch purchase order: ' + error.message, 500);
        }
    }

    static async findByOrganization(organizationId, options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                status = null,
                supplierId = null,
                startDate = null,
                endDate = null,
                sortBy = 'order_date',
                sortOrder = 'desc'
            } = options;

            let query = supabase
                .from('purchase_orders')
                .select(`
                    *,
                    supplier:suppliers(id, name, contact_person),
                    creator:users!purchase_orders_created_by_fkey(id, full_name)
                `, { count: 'exact' })
                .eq('organization_id', organizationId);

            // Apply filters
            if (status) {
                query = query.eq('status', status);
            }

            if (supplierId) {
                query = query.eq('supplier_id', supplierId);
            }

            if (startDate) {
                query = query.gte('order_date', startDate);
            }

            if (endDate) {
                query = query.lte('order_date', endDate);
            }

            // Apply sorting
            query = query.order(sortBy, { ascending: sortOrder === 'asc' });

            // Apply pagination
            const offset = (page - 1) * limit;
            query = query.range(offset, offset + limit - 1);

            const { data, error, count } = await query;

            if (error) {
                throw new AppError('Database error: ' + error.message, 500);
            }

            const purchaseOrders = data.map(po => new RefactoredPurchaseOrder(po));

            return {
                purchaseOrders,
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to fetch purchase orders: ' + error.message, 500);
        }
    }

    static async getStats(organizationId) {
        try {
            const { data, error } = await supabase
                .from('purchase_orders')
                .select('status, total_amount')
                .eq('organization_id', organizationId);

            if (error) {
                throw new AppError('Database error: ' + error.message, 500);
            }

            const stats = {
                total: data.length,
                totalValue: data.reduce((sum, po) => sum + parseFloat(po.total_amount || 0), 0),
                statusBreakdown: {}
            };

            data.forEach(po => {
                stats.statusBreakdown[po.status] = (stats.statusBreakdown[po.status] || 0) + 1;
            });

            return stats;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to get purchase order stats: ' + error.message, 500);
        }
    }

    static async generatePoNumber(organizationId) {
        try {
            // Try the database function first
            const { data, error } = await supabase
                .rpc('generate_po_number', { org_id: organizationId });

            if (!error && data) {
                return data;
            }

            // Fallback: Generate PO number manually if database function fails
            console.warn('Database function failed, using fallback PO number generation:', error?.message);
            
            // Get existing PO numbers for this organization to find the next number
            const { data: existingOrders, error: queryError } = await supabase
                .from('purchase_orders')
                .select('po_number')
                .eq('organization_id', organizationId)
                .order('created_at', { ascending: false })
                .limit(100);

            if (queryError) {
                throw new AppError('Failed to query existing PO numbers: ' + queryError.message, 500);
            }

            // Extract numbers from existing PO numbers and find the highest
            let maxNumber = 0;
            const today = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
            
            if (existingOrders && existingOrders.length > 0) {
                existingOrders.forEach(order => {
                    if (order.po_number && order.po_number.startsWith('PO-')) {
                        // Extract number from format PO-YYYYMMDD-XXXXX or PO-timestamp
                        const parts = order.po_number.split('-');
                        if (parts.length >= 3) {
                            const numberPart = parseInt(parts[2]);
                            if (!isNaN(numberPart)) {
                                maxNumber = Math.max(maxNumber, numberPart);
                            }
                        } else if (parts.length === 2) {
                            // Handle old format PO-timestamp
                            const numberPart = parseInt(parts[1]);
                            if (!isNaN(numberPart)) {
                                maxNumber = Math.max(maxNumber, numberPart % 100000); // Take last 5 digits
                            }
                        }
                    }
                });
            }

            // Generate new PO number
            const nextNumber = maxNumber + 1;
            const poNumber = `PO-${today}-${nextNumber.toString().padStart(5, '0')}`;
            
            return poNumber;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to generate PO number: ' + error.message, 500);
        }
    }

    // Instance methods
    async loadItems() {
        try {
            const { data, error } = await supabase
                .from('purchase_order_items')
                .select(`
                    *,
                    medicine:medicines(id, name, generic_name, strength)
                `)
                .eq('purchase_order_id', this.id)
                .order('created_at');

            if (error) {
                throw new AppError('Failed to load purchase order items: ' + error.message, 500);
            }

            this.items = data;
            return this.items;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to load purchase order items: ' + error.message, 500);
        }
    }

    async save(userId) {
        try {
            this.validate();
            this.validateItems();
            this.calculateTotals();

            const dbData = this.toDbFormat();

            if (this.id) {
                // Update existing purchase order
                if (!this.canEdit()) {
                    throw new AppError('Cannot edit purchase order in current status', 400);
                }

                delete dbData.id;
                delete dbData.created_by;

                const { data, error } = await supabase
                    .from('purchase_orders')
                    .update(dbData)
                    .eq('id', this.id)
                    .eq('organization_id', this.organizationId)
                    .select()
                    .single();

                if (error) {
                    throw new AppError('Failed to update purchase order: ' + error.message, 500);
                }

                // Update items
                await this.saveItems();

                Object.assign(this, new RefactoredPurchaseOrder(data));
            } else {
                // Create new purchase order
                if (!this.poNumber) {
                    this.poNumber = await RefactoredPurchaseOrder.generatePoNumber(this.organizationId);
                    dbData.po_number = this.poNumber;
                }

                dbData.created_by = userId;

                const { data, error } = await supabase
                    .from('purchase_orders')
                    .insert(dbData)
                    .select()
                    .single();

                if (error) {
                    throw new AppError('Failed to create purchase order: ' + error.message, 500);
                }

                this.id = data.id;
                
                // Preserve items before Object.assign overwrites them
                const itemsToSave = this.items;
                Object.assign(this, new RefactoredPurchaseOrder(data));
                this.items = itemsToSave;

                // Save items
                await this.saveItems();
            }

            return this;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to save purchase order: ' + error.message, 500);
        }
    }

    async saveItems() {
        try {
            if (!this.items || this.items.length === 0) {
                return true;
            }

            // Delete existing items
            const { error: deleteError } = await supabase
                .from('purchase_order_items')
                .delete()
                .eq('purchase_order_id', this.id);

            if (deleteError) {
                throw new AppError('Failed to delete existing items: ' + deleteError.message, 500);
            }

            // Insert new items
            const itemsToInsert = this.items.map(item => ({
                purchase_order_id: this.id,
                medicine_id: item.medicine_id || item.medicineId,
                quantity: parseInt(item.quantity),
                unit_cost: parseFloat(item.unit_cost || item.unitCost),
                total_cost: parseFloat(item.total_cost || item.totalCost),
                received_quantity: parseInt(item.received_quantity || item.receivedQuantity || 0)
            }));

            const { error: insertError } = await supabase
                .from('purchase_order_items')
                .insert(itemsToInsert);

            if (insertError) {
                throw new AppError('Failed to save items: ' + insertError.message, 500);
            }

            // Compensate for the automatic inventory update caused by the trigger
            // The trigger adds the full quantity to inventory when items are created,
            // but we only want inventory updated when items are received
            for (const item of this.items) {
                const { data: medicineData, error: medicineSelectError } = await supabase
                    .from('medicines')
                    .select('quantity')
                    .eq('id', item.medicine_id || item.medicineId)
                    .single();

                if (medicineSelectError) {
                    throw new AppError(`Failed to get medicine stock: ${medicineSelectError.message}`, 500);
                }

                // Subtract the quantity that was automatically added by the trigger
                const newStock = medicineData.quantity - parseInt(item.quantity);
                const { error: medicineError } = await supabase
                    .from('medicines')
                    .update({
                        quantity: newStock,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', item.medicine_id || item.medicineId);

                if (medicineError) {
                    throw new AppError(`Failed to compensate medicine stock: ${medicineError.message}`, 500);
                }
            }

            return true;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to save purchase order items: ' + error.message, 500);
        }
    }

    async updateStatus(newStatus, userId, notes = null) {
        try {
            const oldStatus = this.status;

            if (!this.isValidStatusTransition().includes(newStatus)) {
                throw new AppError(`Cannot transition from ${oldStatus} to ${newStatus}`, 400);
            }

            this.status = newStatus;

            // Set delivery date if marking as received
            if (newStatus === 'received') {
                this.actualDelivery = new Date().toISOString().split('T')[0];
            }

            // Set applied date if marking as applied
            if (newStatus === 'applied') {
                this.appliedAt = new Date().toISOString();
            }

            // Prepare update data - only include columns that exist in database
            const updateData = {
                status: this.status
            };
            
            // Only add actual_delivery if it's set
            if (this.actualDelivery) {
                updateData.actual_delivery = this.actualDelivery;
            }
            
            // TODO: Add applied_at column to database schema
            // if (this.appliedAt) {
            //     updateData.applied_at = this.appliedAt;
            // }
            
            const { error } = await supabase
                .from('purchase_orders')
                .update(updateData)
                .eq('id', this.id)
                .eq('organization_id', this.organizationId);

            if (error) {
                throw new AppError('Failed to update status: ' + error.message, 500);
            }

            // Log status change
            await this.logStatusChange(oldStatus, newStatus, userId, notes);

            return this;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to update purchase order status: ' + error.message, 500);
        }
    }

    async receiveItems(receivedItems, userId) {
        try {
            if (!this.canReceive()) {
                throw new AppError('Purchase order cannot be received in current status', 400);
            }

            // Process each received item
            for (const item of receivedItems) {
                const receivedQty = parseInt(item.received_quantity);
                if (receivedQty <= 0) continue;

                // Get current item data first
                const { data: itemData, error: itemError } = await supabase
                    .from('purchase_order_items')
                    .select('medicine_id, unit_cost, received_quantity')
                    .eq('id', item.id)
                    .single();

                if (itemError) {
                    throw new AppError(`Failed to get item details: ${itemError.message}`, 500);
                }

                // Calculate new received quantity
                const currentReceived = itemData.received_quantity || 0;
                const newReceivedQuantity = currentReceived + receivedQty;

                // Update purchase order item with received quantity
                const { error: updateError } = await supabase
                    .from('purchase_order_items')
                    .update({
                        received_quantity: newReceivedQuantity
                    })
                    .eq('id', item.id);

                if (updateError) {
                    throw new AppError(`Failed to update item ${item.id}: ${updateError.message}`, 500);
                }

                // Get current medicine stock
                const { data: medicineData, error: medicineSelectError } = await supabase
                    .from('medicines')
                    .select('quantity')
                    .eq('id', itemData.medicine_id)
                    .single();

                if (medicineSelectError) {
                    throw new AppError(`Failed to get medicine stock: ${medicineSelectError.message}`, 500);
                }

                // Calculate new medicine stock
                const currentStock = medicineData.quantity || 0;
                const newStock = currentStock + receivedQty;

                // Update medicine stock
                const { error: medicineError } = await supabase
                    .from('medicines')
                    .update({
                        quantity: newStock,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', itemData.medicine_id);

                if (medicineError) {
                    throw new AppError(`Failed to update medicine stock: ${medicineError.message}`, 500);
                }

                // Create inventory transaction
                const { error: transactionError } = await supabase
                    .from('inventory_transactions')
                    .insert({
                        medicine_id: itemData.medicine_id,
                        organization_id: this.organizationId,
                        transaction_type: 'purchase_receive',
                        quantity: receivedQty,
                        unit_price: itemData.unit_cost,
                        total_amount: itemData.unit_cost * receivedQty,
                        reference_id: this.id,
                        reference_type: 'purchase_order',
                        created_by: userId
                    });

                if (transactionError) {
                    throw new AppError(`Failed to create inventory transaction: ${transactionError.message}`, 500);
                }
            }

            // Calculate totals to determine new status
            const { data: totals, error: totalsError } = await supabase
                .from('purchase_order_items')
                .select('quantity, received_quantity')
                .eq('purchase_order_id', this.id);

            if (totalsError) {
                throw new AppError(`Failed to calculate totals: ${totalsError.message}`, 500);
            }

            const totalOrdered = totals.reduce((sum, item) => sum + (item.quantity || 0), 0);
            const totalReceived = totals.reduce((sum, item) => sum + (item.received_quantity || 0), 0);

            // Update purchase order status
            const newStatus = totalReceived >= totalOrdered ? 'received' : 'partially_received';
            const updateData = {
                status: newStatus,
                updated_at: new Date().toISOString()
            };

            if (newStatus === 'received') {
                updateData.actual_delivery = new Date().toISOString();
            }

            const { error: statusError } = await supabase
                .from('purchase_orders')
                .update(updateData)
                .eq('id', this.id);

            if (statusError) {
                throw new AppError(`Failed to update purchase order status: ${statusError.message}`, 500);
            }

            // Reload the purchase order to get updated status
            const updatedPO = await RefactoredPurchaseOrder.findById(this.id, this.organizationId);
            Object.assign(this, updatedPO);

            return { success: true, message: 'Items received successfully' };
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to receive purchase order items: ' + error.message, 500);
        }
    }

    async cancel(userId, reason = null) {
        try {
            if (!this.canCancel()) {
                throw new AppError('Cannot cancel purchase order in current status', 400);
            }

            await this.updateStatus('cancelled', userId, reason);
            return this;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to cancel purchase order: ' + error.message, 500);
        }
    }

    async logStatusChange(oldStatus, newStatus, userId, notes = null) {
        try {
            const { error } = await supabase
                .from('purchase_order_status_history')
                .insert({
                    purchase_order_id: this.id,
                    old_status: oldStatus,
                    new_status: newStatus,
                    changed_by: userId,
                    notes
                });

            if (error) {
                console.error('Failed to log status change:', error);
            }
        } catch (error) {
            console.error('Failed to log status change:', error);
        }
    }

    async getStatusHistory() {
        try {
            const { data, error } = await supabase
                .from('purchase_order_status_history')
                .select(`
                    *,
                    user:users!purchase_order_status_history_changed_by_fkey(id, full_name)
                `)
                .eq('purchase_order_id', this.id)
                .order('changed_at', { ascending: false });

            if (error) {
                throw new AppError('Failed to get status history: ' + error.message, 500);
            }

            return data;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to get status history: ' + error.message, 500);
        }
    }
}

module.exports = RefactoredPurchaseOrder;