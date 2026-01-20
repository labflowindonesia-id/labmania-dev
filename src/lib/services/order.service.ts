import { db, schema } from '@/lib/db';
import { eq, desc, and, like } from 'drizzle-orm';
import type { Order, NewOrder, OrderItem, NewOrderItem } from '@/lib/db/schema/inventory';

export interface OrderWithItems extends Order {
    items: OrderItem[];
    orderedByUser?: { fullName: string };
    approvedByUser?: { fullName: string };
}

export interface CreateOrderInput {
    orderDate: string;
    orderedBy: string;
    items: { itemName: string; quantity: number; unit?: string; notes?: string }[];
    notes?: string;
}

export interface OrderFilters {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
}

export interface PaginatedOrdersResult {
    data: OrderWithItems[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

class OrderService {
    /**
     * Generate next order number
     */
    private async generateOrderNumber(): Promise<string> {
        const year = new Date().getFullYear();
        const prefix = `ORD-${year}-`;

        // Get the latest order number for this year
        const latestOrder = await db.query.orders.findFirst({
            where: like(schema.orders.orderNumber, `${prefix}%`),
            orderBy: desc(schema.orders.orderNumber),
        });

        let nextNumber = 1;
        if (latestOrder) {
            const currentNumber = parseInt(latestOrder.orderNumber.replace(prefix, ''));
            nextNumber = currentNumber + 1;
        }

        return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
    }

    /**
     * Get all orders with items (paginated)
     */
    async getAll(filters?: OrderFilters): Promise<PaginatedOrdersResult> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 10;

        const orders = await db.query.orders.findMany({
            orderBy: desc(schema.orders.createdAt),
            with: {
                items: true,
                orderedByUser: true,
                approvedByUser: true,
            },
        });

        let filteredOrders = orders as OrderWithItems[];

        if (filters?.search) {
            const searchLower = filters.search.toLowerCase();
            filteredOrders = filteredOrders.filter(
                o => o.orderNumber.toLowerCase().includes(searchLower) ||
                    o.orderedByUser?.fullName.toLowerCase().includes(searchLower)
            );
        }

        if (filters?.status && filters.status !== 'all') {
            filteredOrders = filteredOrders.filter(o => o.status === filters.status);
        }

        // Calculate pagination
        const total = filteredOrders.length;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const paginatedOrders = filteredOrders.slice(offset, offset + limit);

        return {
            data: paginatedOrders,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }

    /**
     * Get order by ID
     */
    async getById(id: string): Promise<OrderWithItems | null> {
        const order = await db.query.orders.findFirst({
            where: eq(schema.orders.id, id),
            with: {
                items: true,
                orderedByUser: true,
                approvedByUser: true,
            },
        });
        return order as OrderWithItems | null;
    }

    /**
     * Create new order with items
     */
    async create(data: CreateOrderInput): Promise<OrderWithItems> {
        const orderNumber = await this.generateOrderNumber();

        // Create order
        const [order] = await db.insert(schema.orders).values({
            orderNumber,
            orderDate: data.orderDate,
            orderedBy: data.orderedBy,
            notes: data.notes,
            status: 'pending',
        }).returning();

        // Create order items
        const items: OrderItem[] = [];
        for (const item of data.items) {
            const [orderItem] = await db.insert(schema.orderItems).values({
                orderId: order.id,
                itemName: item.itemName,
                quantity: item.quantity,
                unit: item.unit,
                notes: item.notes,
            }).returning();
            items.push(orderItem);
        }

        return { ...order, items };
    }

    /**
     * Approve order (manager only)
     */
    async approve(orderId: string, approvedBy: string): Promise<Order | null> {
        const [order] = await db
            .update(schema.orders)
            .set({
                status: 'approved',
                approvedBy,
                approvedDate: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(schema.orders.id, orderId))
            .returning();
        return order || null;
    }

    /**
     * Reject order (manager only)
     */
    async reject(orderId: string, approvedBy: string): Promise<Order | null> {
        const [order] = await db
            .update(schema.orders)
            .set({
                status: 'rejected',
                approvedBy,
                approvedDate: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(schema.orders.id, orderId))
            .returning();
        return order || null;
    }

    /**
     * Mark order as received
     */
    async markReceived(orderId: string): Promise<Order | null> {
        const [order] = await db
            .update(schema.orders)
            .set({
                status: 'received',
                updatedAt: new Date(),
            })
            .where(eq(schema.orders.id, orderId))
            .returning();
        return order || null;
    }

    /**
     * Cancel order
     */
    async cancel(orderId: string): Promise<Order | null> {
        const [order] = await db
            .update(schema.orders)
            .set({
                status: 'cancelled',
                updatedAt: new Date(),
            })
            .where(eq(schema.orders.id, orderId))
            .returning();
        return order || null;
    }

    /**
     * Delete order
     */
    async delete(id: string): Promise<boolean> {
        await db.delete(schema.orders).where(eq(schema.orders.id, id));
        return true;
    }
}

export const orderService = new OrderService();
