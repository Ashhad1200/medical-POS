const { supabase } = require('../config/supabase');
const { validateEmail, validatePhone } = require('../utils/validators');
const { AppError } = require('../utils/errors');

class RefactoredSupplier {
    constructor(data = {}) {
        this.id = data.id;
        this.organizationId = data.organization_id || data.organizationId;
        this.supplierCode = data.supplier_code || data.supplierCode || null;
        this.name = data.name;
        this.contactPerson = data.contact_person || data.contactPerson;
        this.email = data.email;
        this.phone = data.phone;
        this.address = data.address;
        this.city = data.city;
        this.state = data.state;
        this.postalCode = data.postal_code || data.postalCode;
        this.country = data.country || 'Pakistan';
        this.taxNumber = data.tax_number || data.taxNumber || null;
        this.creditLimit = parseFloat(data.credit_limit || data.creditLimit || 0);
        this.paymentTerms = parseInt(data.payment_terms || data.paymentTerms || 30);
        this.isActive = data.is_active !== undefined ? data.is_active : data.isActive !== undefined ? data.isActive : true;
        this.notes = data.notes;
        this.createdAt = data.created_at || data.createdAt;
        this.updatedAt = data.updated_at || data.updatedAt;
        this.createdBy = data.created_by || data.createdBy;
        // this.updatedBy = data.updated_by || data.updatedBy; // Column doesn't exist in database
    }

    // Validation methods
    validate() {
        const errors = [];

        if (!this.name || this.name.trim().length === 0) {
            errors.push('Supplier name is required');
        }

        if (!this.organizationId) {
            errors.push('Organization ID is required');
        }

        if (this.email && !validateEmail(this.email)) {
            errors.push('Invalid email format');
        }

        if (this.phone && !validatePhone(this.phone)) {
            errors.push('Invalid phone number format');
        }

        if (this.creditLimit < 0) {
            errors.push('Credit limit cannot be negative');
        }

        if (this.paymentTerms < 0) {
            errors.push('Payment terms cannot be negative');
        }

        if (errors.length > 0) {
            throw new AppError('Validation failed: ' + errors.join(', '), 400);
        }

        return true;
    }

    // Convert to database format
    toDbFormat() {
        const baseData = {
            id: this.id,
            organization_id: this.organizationId,
            name: this.name?.trim(),
            contact_person: this.contactPerson?.trim(),
            email: this.email?.toLowerCase().trim(),
            phone: this.phone?.trim(),
            address: this.address?.trim(),
            is_active: this.isActive,
            created_by: this.createdBy
        };

        // Add optional fields that might not exist in all database schemas
        if (this.supplierCode) {
            baseData.supplier_code = this.supplierCode;
        }
        if (this.city) {
            baseData.city = this.city.trim();
        }
        if (this.state) {
            baseData.state = this.state.trim();
        }
        if (this.postalCode) {
            baseData.postal_code = this.postalCode.trim();
        }
        if (this.country) {
            baseData.country = this.country.trim();
        }
        if (this.taxNumber) {
            baseData.tax_number = this.taxNumber.trim();
        }
        if (this.creditLimit !== undefined && this.creditLimit !== null) {
            baseData.credit_limit = parseFloat(this.creditLimit) || 0;
        }
        if (this.paymentTerms !== undefined && this.paymentTerms !== null) {
            baseData.payment_terms = parseInt(this.paymentTerms) || 30;
        }
        if (this.notes) {
            baseData.notes = this.notes.trim();
        }

        return baseData;
    }

    // Static methods for database operations
    static async findById(id, organizationId) {
        try {
            const { data, error } = await supabase
                .from('suppliers')
                .select('*')
                .eq('id', id)
                .eq('organization_id', organizationId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    throw new AppError('Supplier not found', 404);
                }
                throw new AppError('Database error: ' + error.message, 500);
            }

            return new RefactoredSupplier(data);
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to fetch supplier: ' + error.message, 500);
        }
    }

    static async findByOrganization(organizationId, options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                search = '',
                isActive = null,
                sortBy = 'name',
                sortOrder = 'asc'
            } = options;

            let query = supabase
                .from('suppliers')
                .select('*', { count: 'exact' })
                .eq('organization_id', organizationId);

            // Apply filters
            if (isActive !== null) {
                query = query.eq('is_active', isActive);
            }

            if (search) {
                query = query.or(`name.ilike.%${search}%,contact_person.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
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

            const suppliers = data.map(supplier => new RefactoredSupplier(supplier));

            return {
                suppliers,
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to fetch suppliers: ' + error.message, 500);
        }
    }

    static async searchSuppliers(organizationId, searchTerm) {
        try {
            const { data, error } = await supabase
                .from('suppliers')
                .select('id, name, contact_person, email, phone, is_active')
                .eq('organization_id', organizationId)
                .eq('is_active', true)
                .or(`name.ilike.%${searchTerm}%,contact_person.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
                .order('name')
                .limit(20);

            if (error) {
                throw new AppError('Database error: ' + error.message, 500);
            }

            return data.map(supplier => new RefactoredSupplier(supplier));
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to search suppliers: ' + error.message, 500);
        }
    }

    static async getStats(organizationId) {
        try {
            const { data, error } = await supabase
                .from('suppliers')
                .select('is_active')
                .eq('organization_id', organizationId);

            if (error) {
                throw new AppError('Database error: ' + error.message, 500);
            }

            const total = data.length;
            const active = data.filter(s => s.is_active).length;
            const inactive = total - active;

            return { total, active, inactive };
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to get supplier stats: ' + error.message, 500);
        }
    }

    static async checkDuplicateEmail(email, organizationId, excludeId = null) {
        try {
            let query = supabase
                .from('suppliers')
                .select('id')
                .eq('organization_id', organizationId)
                .eq('email', email.toLowerCase().trim());

            if (excludeId) {
                query = query.neq('id', excludeId);
            }

            const { data, error } = await query;

            if (error) {
                throw new AppError('Database error: ' + error.message, 500);
            }

            return data.length > 0;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to check duplicate email: ' + error.message, 500);
        }
    }

    static async generateSupplierCode(organizationId, supplierName) {
        try {
            const { data, error } = await supabase
                .rpc('generate_supplier_code', {
                    org_id: organizationId,
                    supplier_name: supplierName
                });

            if (error) {
                throw new AppError('Failed to generate supplier code: ' + error.message, 500);
            }

            return data;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to generate supplier code: ' + error.message, 500);
        }
    }

    // Instance methods
    async save(userId) {
        try {
            this.validate();

            // Check for duplicate email
            if (this.email) {
                const isDuplicate = await RefactoredSupplier.checkDuplicateEmail(
                    this.email,
                    this.organizationId,
                    this.id
                );
                if (isDuplicate) {
                    throw new AppError('Email already exists for another supplier', 400);
                }
            }

            const dbData = this.toDbFormat();

            if (this.id) {
                // Update existing supplier
                // dbData.updated_by = userId; // Column doesn't exist in database
                delete dbData.id;
                delete dbData.created_by;

                const { data, error } = await supabase
                    .from('suppliers')
                    .update(dbData)
                    .eq('id', this.id)
                    .eq('organization_id', this.organizationId)
                    .select()
                    .single();

                if (error) {
                    throw new AppError('Failed to update supplier: ' + error.message, 500);
                }

                // Log audit trail
                await this.logAudit('updated', userId, dbData);

                Object.assign(this, new RefactoredSupplier(data));
            } else {
                // Create new supplier
                if (!this.supplierCode) {
                    try {
                        this.supplierCode = await RefactoredSupplier.generateSupplierCode(
                            this.organizationId,
                            this.name
                        );
                        dbData.supplier_code = this.supplierCode;
                    } catch (codeError) {
                        // If supplier code generation fails, continue without it
                        console.warn('Failed to generate supplier code:', codeError.message);
                        delete dbData.supplier_code;
                    }
                }

                dbData.created_by = userId;
                // dbData.updated_by = userId; // Column doesn't exist in database

                const { data, error } = await supabase
                    .from('suppliers')
                    .insert(dbData)
                    .select()
                    .single();

                if (error) {
                    throw new AppError('Failed to create supplier: ' + error.message, 500);
                }

                // Log audit trail
                try {
                    await this.logAudit('created', userId, data);
                } catch (auditError) {
                    console.warn('Failed to log audit trail:', auditError.message);
                }

                Object.assign(this, new RefactoredSupplier(data));
            }

            return this;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to save supplier: ' + error.message, 500);
        }
    }

    async delete(userId) {
        try {
            // Check if supplier has any purchase orders
            const { data: purchaseOrders, error: poError } = await supabase
                .from('purchase_orders')
                .select('id')
                .eq('supplier_id', this.id)
                .limit(1);

            if (poError) {
                throw new AppError('Failed to check purchase orders: ' + poError.message, 500);
            }

            if (purchaseOrders.length > 0) {
                // Soft delete - deactivate supplier
                this.isActive = false;
                await this.save(userId);
                await this.logAudit('deactivated', userId, { is_active: false });
                return { deleted: false, deactivated: true };
            } else {
                // Hard delete
                const { error } = await supabase
                    .from('suppliers')
                    .delete()
                    .eq('id', this.id)
                    .eq('organization_id', this.organizationId);

                if (error) {
                    throw new AppError('Failed to delete supplier: ' + error.message, 500);
                }

                await this.logAudit('deleted', userId, this.toDbFormat());
                return { deleted: true, deactivated: false };
            }
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to delete supplier: ' + error.message, 500);
        }
    }

    async toggleStatus(userId) {
        try {
            this.isActive = !this.isActive;
            await this.save(userId);
            await this.logAudit(this.isActive ? 'activated' : 'deactivated', userId, {
                is_active: this.isActive
            });
            return this;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to toggle supplier status: ' + error.message, 500);
        }
    }

    async logAudit(action, userId, changes = {}) {
        try {
            const { error } = await supabase
                .from('supplier_audit_log')
                .insert({
                    supplier_id: this.id,
                    action,
                    new_values: changes,
                    changed_by: userId
                });

            if (error) {
                console.error('Failed to log audit trail:', error);
            }
        } catch (error) {
            console.error('Failed to log audit trail:', error);
        }
    }

    // Get supplier's purchase order summary
    async getPurchaseOrderSummary() {
        try {
            const { data, error } = await supabase
                .from('purchase_orders')
                .select('status, total_amount')
                .eq('supplier_id', this.id);

            if (error) {
                throw new AppError('Failed to get purchase order summary: ' + error.message, 500);
            }

            const summary = {
                totalOrders: data.length,
                totalAmount: data.reduce((sum, po) => sum + parseFloat(po.total_amount || 0), 0),
                statusBreakdown: {}
            };

            data.forEach(po => {
                summary.statusBreakdown[po.status] = (summary.statusBreakdown[po.status] || 0) + 1;
            });

            return summary;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to get purchase order summary: ' + error.message, 500);
        }
    }
}

module.exports = RefactoredSupplier;