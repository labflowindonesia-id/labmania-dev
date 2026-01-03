import { db, schema } from '@/lib/db';

interface ChatContext {
    stockSummary: {
        reagents: { total: number; lowStock: number; outOfStock: number };
        standards: { total: number; lowStock: number; outOfStock: number };
        items: { total: number; lowStock: number; outOfStock: number };
    };
    upcomingCalibrations: { name: string; daysUntilDue: number }[];
    expiringChemicals: { name: string; daysUntilExpiry: number }[];
}

class ChatService {
    private webhookUrl = process.env.N8N_WEBHOOK_URL!;

    /**
     * Build context from database for AI assistant
     */
    private async buildContext(): Promise<ChatContext> {
        // Get stock summary
        const reagents = await db.query.reagentCatalog.findMany();
        const standards = await db.query.standardCatalog.findMany();
        const items = await db.query.itemsCatalog.findMany();
        const warehouseChemicals = await db.query.warehouseChemicals.findMany();
        const warehouseItems = await db.query.warehouseItems.findMany();

        // Calculate reagent stock counts
        const reagentStock = {
            total: reagents.length,
            lowStock: 0,
            outOfStock: 0,
        };

        for (const reagent of reagents) {
            const stock = warehouseChemicals.filter(
                wc => wc.catalogId === reagent.id && wc.catalogType === 'reagent'
            ).length;
            if (stock === 0) reagentStock.outOfStock++;
            else if (stock <= reagent.minimumStockLevel) reagentStock.lowStock++;
        }

        // Standard stock counts (similar logic)
        const standardStock = {
            total: standards.length,
            lowStock: 0,
            outOfStock: 0,
        };

        for (const standard of standards) {
            const stock = warehouseChemicals.filter(
                wc => wc.catalogId === standard.id && wc.catalogType === 'standard'
            ).length;
            if (stock === 0) standardStock.outOfStock++;
            else if (stock <= standard.minimumStockLevel) standardStock.lowStock++;
        }

        // Items stock counts
        const itemStock = {
            total: items.length,
            lowStock: 0,
            outOfStock: 0,
        };

        for (const item of items) {
            const stock = warehouseItems
                .filter(wi => wi.catalogId === item.id)
                .reduce((sum, wi) => sum + wi.currentQuantity, 0);
            if (stock === 0) itemStock.outOfStock++;
            else if (stock <= item.minimumStockLevel) itemStock.lowStock++;
        }

        // Get upcoming calibrations
        const instruments = await db.query.instruments.findMany();
        const today = new Date();
        const upcomingCalibrations = instruments
            .filter(inst => inst.nextCalibrationDate)
            .map(inst => {
                const nextDate = new Date(inst.nextCalibrationDate!);
                const diffTime = nextDate.getTime() - today.getTime();
                const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return { name: inst.name, daysUntilDue };
            })
            .filter(c => c.daysUntilDue <= 60) // Only next 60 days
            .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
            .slice(0, 5);

        // Get expiring chemicals
        const expiringChemicals = warehouseChemicals
            .map(wc => {
                const expDate = new Date(wc.expiredDate);
                const diffTime = expDate.getTime() - today.getTime();
                const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return { name: wc.name, daysUntilExpiry };
            })
            .filter(c => c.daysUntilExpiry <= 30 && c.daysUntilExpiry > 0)
            .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
            .slice(0, 5);

        return {
            stockSummary: {
                reagents: reagentStock,
                standards: standardStock,
                items: itemStock,
            },
            upcomingCalibrations,
            expiringChemicals,
        };
    }

    /**
     * Send message to n8n webhook with database context
     */
    async sendMessage(userMessage: string): Promise<string> {
        try {
            const context = await this.buildContext();

            // Get API key for webhook authentication
            const apiKey = process.env.N8N_WEBHOOK_API_KEY;
            if (!apiKey) {
                console.warn('N8N_WEBHOOK_API_KEY not configured');
            }

            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(apiKey && { 'X-API-Key': apiKey }),
                },
                body: JSON.stringify({
                    message: userMessage,
                    context: {
                        timestamp: new Date().toISOString(),
                        stockSummary: context.stockSummary,
                        upcomingCalibrations: context.upcomingCalibrations,
                        expiringChemicals: context.expiringChemicals,
                    },
                }),
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    console.error('Webhook authentication failed');
                }
                throw new Error(`Webhook responded with status: ${response.status}`);
            }

            const data = await response.json();
            return data.response || data.message || 'Tidak ada respons dari asisten.';
        } catch (error) {
            console.error('Chat service error:', error);
            return 'Maaf, terjadi kesalahan saat menghubungi asisten. Silakan coba lagi.';
        }
    }
}

export const chatService = new ChatService();
