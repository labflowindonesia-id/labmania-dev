import { db, schema } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import type { Document } from '@/lib/db/schema/inventory';

// ============================================
// Types
// ============================================

export interface DocumentFilters {
    search?: string;
    documentType?: 'msds' | 'coa';
    catalogType?: 'reagent' | 'standard';
    page?: number;
    limit?: number;
}

export interface DocumentWithCatalog extends Document {
    catalogName?: string;
}

export interface CreateDocumentData {
    name: string;
    documentType: 'msds' | 'coa';
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
    catalogType: 'reagent' | 'standard';
    catalogId: string;
    uploadedBy?: string;
}

// ============================================
// Document Service
// ============================================

class DocumentService {
    /**
     * Get all documents with pagination and filtering
     */
    async getAll(filters?: DocumentFilters): Promise<{
        data: DocumentWithCatalog[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
    }> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 20;

        let documents = await db.query.documents.findMany({
            orderBy: [desc(schema.documents.uploadedAt)],
        });

        // Apply filters
        if (filters?.documentType) {
            documents = documents.filter(doc => doc.documentType === filters.documentType);
        }
        if (filters?.catalogType) {
            documents = documents.filter(doc => doc.catalogType === filters.catalogType);
        }
        if (filters?.search) {
            const searchLower = filters.search.toLowerCase();
            documents = documents.filter(doc =>
                doc.name.toLowerCase().includes(searchLower)
            );
        }

        // Add catalog name to each document
        const documentsWithCatalog: DocumentWithCatalog[] = await Promise.all(
            documents.map(async (doc) => {
                let catalogName = '';
                if (doc.catalogType === 'reagent') {
                    const reagent = await db.query.reagentCatalog.findFirst({
                        where: eq(schema.reagentCatalog.id, doc.catalogId),
                    });
                    catalogName = reagent?.reagentName || 'Unknown';
                } else if (doc.catalogType === 'standard') {
                    const standard = await db.query.standardCatalog.findFirst({
                        where: eq(schema.standardCatalog.id, doc.catalogId),
                    });
                    catalogName = standard?.standardName || 'Unknown';
                }
                return { ...doc, catalogName };
            })
        );

        const total = documentsWithCatalog.length;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const paginatedDocs = documentsWithCatalog.slice(offset, offset + limit);

        return {
            data: paginatedDocs,
            pagination: { page, limit, total, totalPages },
        };
    }

    /**
     * Get document by ID
     */
    async getById(id: string): Promise<DocumentWithCatalog | null> {
        const doc = await db.query.documents.findFirst({
            where: eq(schema.documents.id, id),
        });

        if (!doc) return null;

        let catalogName = '';
        if (doc.catalogType === 'reagent') {
            const reagent = await db.query.reagentCatalog.findFirst({
                where: eq(schema.reagentCatalog.id, doc.catalogId),
            });
            catalogName = reagent?.reagentName || 'Unknown';
        } else if (doc.catalogType === 'standard') {
            const standard = await db.query.standardCatalog.findFirst({
                where: eq(schema.standardCatalog.id, doc.catalogId),
            });
            catalogName = standard?.standardName || 'Unknown';
        }

        return { ...doc, catalogName };
    }

    /**
     * Get documents by catalog reference
     */
    async getByCatalog(catalogType: 'reagent' | 'standard', catalogId: string): Promise<Document[]> {
        const documents = await db.query.documents.findMany({
            orderBy: [desc(schema.documents.uploadedAt)],
        });

        return documents.filter(
            doc => doc.catalogType === catalogType && doc.catalogId === catalogId
        );
    }

    /**
     * Create new document
     */
    async create(data: CreateDocumentData): Promise<Document> {
        const [document] = await db.insert(schema.documents).values({
            name: data.name,
            documentType: data.documentType,
            fileUrl: data.fileUrl,
            fileSize: data.fileSize,
            mimeType: data.mimeType || 'application/pdf',
            catalogType: data.catalogType,
            catalogId: data.catalogId,
            uploadedBy: data.uploadedBy,
        }).returning();

        // Also update the catalog table's quick-access field
        if (data.catalogType === 'reagent') {
            const updateField = data.documentType === 'msds' ? 'msdsDocument' : 'coaDocument';
            await db.update(schema.reagentCatalog)
                .set({
                    [updateField]: data.fileUrl,
                    updatedAt: new Date(),
                })
                .where(eq(schema.reagentCatalog.id, data.catalogId));
        } else if (data.catalogType === 'standard') {
            const updateField = data.documentType === 'msds' ? 'msdsDocument' : 'coaDocument';
            await db.update(schema.standardCatalog)
                .set({
                    [updateField]: data.fileUrl,
                    updatedAt: new Date(),
                })
                .where(eq(schema.standardCatalog.id, data.catalogId));
        }

        return document;
    }

    /**
     * Update document
     */
    async update(id: string, data: Partial<CreateDocumentData>): Promise<Document | null> {
        const [updated] = await db.update(schema.documents)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(schema.documents.id, id))
            .returning();

        return updated || null;
    }

    /**
     * Delete document
     */
    async delete(id: string): Promise<boolean> {
        // Get document first to update catalog
        const doc = await this.getById(id);
        if (!doc) return false;

        await db.delete(schema.documents)
            .where(eq(schema.documents.id, id));

        // Note: We don't clear the catalog quick-access field because there might be other documents

        return true;
    }

    /**
     * Get document counts by type
     */
    async getStatistics(): Promise<{
        total: number;
        msds: number;
        coa: number;
        byReagent: number;
        byStandard: number;
    }> {
        const documents = await db.query.documents.findMany();

        return {
            total: documents.length,
            msds: documents.filter(d => d.documentType === 'msds').length,
            coa: documents.filter(d => d.documentType === 'coa').length,
            byReagent: documents.filter(d => d.catalogType === 'reagent').length,
            byStandard: documents.filter(d => d.catalogType === 'standard').length,
        };
    }
}

export const documentService = new DocumentService();
