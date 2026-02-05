"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    FileText,
    Search,
    Filter,
    Eye,
    Download,
    Trash2,
    RefreshCw,
    Loader2,
    ChevronLeft,
    ChevronRight,
    FileWarning,
    Upload,
    ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";

// Types
interface DocumentItem {
    id: string;
    name: string;
    documentType: 'msds' | 'coa';
    fileUrl: string;
    fileSize: number | null;
    mimeType: string;
    catalogType: 'reagent' | 'standard';
    catalogId: string;
    catalogName?: string;
    uploadedAt: string;
    createdAt: string;
}

interface DocumentStats {
    total: number;
    msds: number;
    coa: number;
    byReagent: number;
    byStandard: number;
}

export default function DocumentLibraryPage() {
    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });
    const [stats, setStats] = useState<DocumentStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [search, setSearch] = useState("");
    const [documentTypeFilter, setDocumentTypeFilter] = useState<string>("all");
    const [catalogTypeFilter, setCatalogTypeFilter] = useState<string>("all");

    // Preview
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewDocument, setPreviewDocument] = useState<DocumentItem | null>(null);

    // Upload Dialog
    const [uploadOpen, setUploadOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadForm, setUploadForm] = useState({
        name: "",
        documentType: "msds" as "msds" | "coa",
        catalogType: "reagent" as "reagent" | "standard",
        catalogId: "",
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [catalogs, setCatalogs] = useState<{ id: string; name: string }[]>([]);
    const [loadingCatalogs, setLoadingCatalogs] = useState(false);

    // Fetch catalogs based on selected type
    const fetchCatalogs = useCallback(async (type: "reagent" | "standard") => {
        setLoadingCatalogs(true);
        try {
            const endpoint = type === "reagent" ? "/api/inventory/reagents" : "/api/inventory/standards";
            const response = await fetch(endpoint);
            if (response.ok) {
                const result = await response.json();
                const items = result.data || result;
                setCatalogs(
                    items.map((item: { id: string; reagentName?: string; standardName?: string; name?: string }) => ({
                        id: item.id,
                        name: item.reagentName || item.standardName || item.name || "Unknown",
                    }))
                );
            }
        } catch (err) {
            console.error("Failed to fetch catalogs:", err);
            setCatalogs([]);
        } finally {
            setLoadingCatalogs(false);
        }
    }, []);

    // Handle catalog type change
    useEffect(() => {
        if (uploadOpen) {
            fetchCatalogs(uploadForm.catalogType);
            setUploadForm(prev => ({ ...prev, catalogId: "" }));
        }
    }, [uploadForm.catalogType, uploadOpen, fetchCatalogs]);

    // Handle file selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            const allowedTypes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];
            if (!allowedTypes.includes(file.type)) {
                alert("Tipe file tidak didukung. Hanya PDF, DOC, dan DOCX yang diizinkan.");
                return;
            }
            // Validate file size (10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert("Ukuran file terlalu besar. Maksimal 10MB.");
                return;
            }
            setSelectedFile(file);
            // Auto-fill name if empty
            if (!uploadForm.name) {
                setUploadForm(prev => ({ ...prev, name: file.name.replace(/\.[^/.]+$/, '') }));
            }
        }
    };

    // Handle upload
    const handleUpload = async () => {
        if (!uploadForm.name || !selectedFile || !uploadForm.catalogId) {
            alert("Semua field wajib diisi!");
            return;
        }

        setIsUploading(true);
        try {
            // Step 1: Upload file to Supabase Storage
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('catalogType', uploadForm.catalogType);
            formData.append('catalogId', uploadForm.catalogId);
            formData.append('documentType', uploadForm.documentType);

            const uploadResponse = await fetch("/api/inventory/documents/upload", {
                method: "POST",
                body: formData,
            });

            if (!uploadResponse.ok) {
                const err = await uploadResponse.json();
                throw new Error(err.error || "Gagal mengupload file");
            }

            const uploadResult = await uploadResponse.json();

            // Step 2: Create document record in database
            const response = await fetch("/api/inventory/documents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: uploadForm.name,
                    documentType: uploadForm.documentType,
                    fileUrl: uploadResult.publicUrl,
                    fileSize: uploadResult.fileSize,
                    mimeType: uploadResult.mimeType,
                    catalogType: uploadForm.catalogType,
                    catalogId: uploadForm.catalogId,
                }),
            });

            if (response.ok) {
                setUploadOpen(false);
                setUploadForm({
                    name: "",
                    documentType: "msds",
                    catalogType: "reagent",
                    catalogId: "",
                });
                setSelectedFile(null);
                fetchDocuments();
                fetchStats();
            } else {
                const err = await response.json();
                alert(err.error || "Gagal menyimpan dokumen");
            }
        } catch (err) {
            console.error("Upload error:", err);
            alert(err instanceof Error ? err.message : "Terjadi kesalahan saat upload");
        } finally {
            setIsUploading(false);
        }
    };

    // Fetch documents
    const fetchDocuments = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            params.set("page", pagination.page.toString());
            params.set("limit", "20");
            if (search) params.set("search", search);
            if (documentTypeFilter !== "all") params.set("documentType", documentTypeFilter);
            if (catalogTypeFilter !== "all") params.set("catalogType", catalogTypeFilter);

            const response = await fetch(`/api/inventory/documents?${params.toString()}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Gagal mengambil data");
            }
            const result = await response.json();
            setDocuments(result.data);
            setPagination(result.pagination);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        } finally {
            setIsLoading(false);
        }
    }, [pagination.page, search, documentTypeFilter, catalogTypeFilter]);

    // Fetch stats
    const fetchStats = useCallback(async () => {
        try {
            const response = await fetch("/api/inventory/documents/stats");
            if (response.ok) {
                const result = await response.json();
                setStats(result.stats);
            }
        } catch (err) {
            console.error("Failed to fetch stats:", err);
        }
    }, []);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setPagination(prev => ({ ...prev, page: 1 }));
            fetchDocuments();
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Handle filter changes
    const handleFilterChange = () => {
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    useEffect(() => {
        handleFilterChange();
    }, [documentTypeFilter, catalogTypeFilter]);

    // Preview document
    const handlePreview = (doc: DocumentItem) => {
        setPreviewDocument(doc);
        setPreviewUrl(doc.fileUrl);
        setPreviewOpen(true);
    };

    // Delete document
    const handleDelete = async (id: string) => {
        if (!confirm("Yakin ingin menghapus dokumen ini?")) return;

        try {
            const response = await fetch(`/api/inventory/documents/${id}`, {
                method: "DELETE",
            });
            if (response.ok) {
                fetchDocuments();
                fetchStats();
            }
        } catch (err) {
            console.error("Failed to delete:", err);
        }
    };

    // Format file size
    const formatFileSize = (bytes: number | null): string => {
        if (!bytes) return "-";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Document Library</h1>
                    <p className="text-muted-foreground">
                        Pusat dokumen MSDS dan CoA untuk reagent dan standard
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button onClick={() => setUploadOpen(true)}>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Dokumen
                    </Button>
                    <Button variant="outline" onClick={() => { fetchDocuments(); fetchStats(); }} disabled={isLoading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center space-x-2">
                            <FileText className="h-5 w-5 text-blue-500" />
                            <div>
                                <p className="text-2xl font-bold">{stats?.total || 0}</p>
                                <p className="text-xs text-muted-foreground">Total Dokumen</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center space-x-2">
                            <FileWarning className="h-5 w-5 text-orange-500" />
                            <div>
                                <p className="text-2xl font-bold">{stats?.msds || 0}</p>
                                <p className="text-xs text-muted-foreground">MSDS</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center space-x-2">
                            <FileText className="h-5 w-5 text-green-500" />
                            <div>
                                <p className="text-2xl font-bold">{stats?.coa || 0}</p>
                                <p className="text-xs text-muted-foreground">CoA</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center space-x-2">
                            <div className="h-3 w-3 rounded-full bg-purple-500" />
                            <div>
                                <p className="text-2xl font-bold">{stats?.byReagent || 0}</p>
                                <p className="text-xs text-muted-foreground">Reagent</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center space-x-2">
                            <div className="h-3 w-3 rounded-full bg-cyan-500" />
                            <div>
                                <p className="text-2xl font-bold">{stats?.byStandard || 0}</p>
                                <p className="text-xs text-muted-foreground">Standard</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Filter & Pencarian</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cari nama dokumen..."
                                    className="pl-8"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Tipe Dokumen" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Tipe</SelectItem>
                                <SelectItem value="msds">MSDS</SelectItem>
                                <SelectItem value="coa">CoA</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={catalogTypeFilter} onValueChange={setCatalogTypeFilter}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Kategori" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Kategori</SelectItem>
                                <SelectItem value="reagent">Reagent</SelectItem>
                                <SelectItem value="standard">Standard</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Documents Table */}
            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <p className="text-destructive">{error}</p>
                            <Button onClick={fetchDocuments}>Coba Lagi</Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama Dokumen</TableHead>
                                    <TableHead>Tipe</TableHead>
                                    <TableHead>Kategori</TableHead>
                                    <TableHead>Item Terkait</TableHead>
                                    <TableHead>Ukuran</TableHead>
                                    <TableHead>Diupload</TableHead>
                                    <TableHead className="text-center">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {documents.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                            <p>Belum ada dokumen</p>
                                            <p className="text-sm">Upload dokumen MSDS atau CoA dari halaman katalog</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    documents.map((doc) => (
                                        <TableRow key={doc.id}>
                                            <TableCell>
                                                <div className="flex items-center space-x-2">
                                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-medium">{doc.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={doc.documentType === 'msds' ? 'default' : 'secondary'}
                                                    className={doc.documentType === 'msds' ? 'bg-orange-500' : 'bg-green-500'}
                                                >
                                                    {doc.documentType?.toUpperCase() || '-'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {doc.catalogType === 'reagent' ? 'Reagent' : doc.catalogType === 'standard' ? 'Standard' : '-'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{doc.catalogName || '-'}</TableCell>
                                            <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                                            <TableCell>
                                                {format(new Date(doc.uploadedAt), 'dd MMM yyyy', { locale: localeID })}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-center space-x-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handlePreview(doc)}
                                                        title="Preview"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => window.open(doc.fileUrl, '_blank')}
                                                        title="Download"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(doc.id)}
                                                        className="text-destructive hover:text-destructive"
                                                        title="Hapus"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between p-4 border-t">
                            <p className="text-sm text-muted-foreground">
                                Menampilkan {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total} dokumen
                            </p>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                    disabled={pagination.page <= 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm">
                                    Hal {pagination.page} / {pagination.totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                    disabled={pagination.page >= pagination.totalPages}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Preview Dialog */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                            <FileText className="h-5 w-5" />
                            <span>{previewDocument?.name}</span>
                        </DialogTitle>
                        <DialogDescription>
                            {previewDocument?.catalogName || '-'} • {previewDocument?.documentType?.toUpperCase() || '-'}
                        </DialogDescription>
                    </DialogHeader>

                    {previewUrl && (
                        <div className="h-[60vh] border rounded-md overflow-hidden">
                            <iframe
                                src={previewUrl}
                                className="w-full h-full"
                                title="Document Preview"
                            />
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                            Tutup
                        </Button>
                        <Button onClick={() => previewUrl && window.open(previewUrl, '_blank')}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Buka di Tab Baru
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Upload Dialog */}
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                            <Upload className="h-5 w-5" />
                            <span>Upload Dokumen Baru</span>
                        </DialogTitle>
                        <DialogDescription>
                            Upload dokumen MSDS atau CoA untuk reagent atau standard
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Document Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nama Dokumen *</label>
                            <Input
                                placeholder="Contoh: MSDS - Methanol"
                                value={uploadForm.name}
                                onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>

                        {/* Document Type */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tipe Dokumen *</label>
                            <Select
                                value={uploadForm.documentType}
                                onValueChange={(value: "msds" | "coa") => setUploadForm(prev => ({ ...prev, documentType: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="msds">MSDS (Material Safety Data Sheet)</SelectItem>
                                    <SelectItem value="coa">CoA (Certificate of Analysis)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Catalog Type */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Kategori *</label>
                            <Select
                                value={uploadForm.catalogType}
                                onValueChange={(value: "reagent" | "standard") => setUploadForm(prev => ({ ...prev, catalogType: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="reagent">Reagent</SelectItem>
                                    <SelectItem value="standard">Standard</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Catalog Item */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Item Terkait *</label>
                            <Select
                                value={uploadForm.catalogId}
                                onValueChange={(value) => setUploadForm(prev => ({ ...prev, catalogId: value }))}
                                disabled={loadingCatalogs}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={loadingCatalogs ? "Loading..." : "Pilih item"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {catalogs.map((item) => (
                                        <SelectItem key={item.id} value={item.id}>
                                            {item.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* File Upload */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">File Dokumen (PDF/DOC/DOCX) *</label>
                            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    id="file-upload"
                                />
                                <label htmlFor="file-upload" className="cursor-pointer">
                                    {selectedFile ? (
                                        <div className="flex items-center justify-center space-x-2">
                                            <FileText className="h-5 w-5 text-primary" />
                                            <span className="text-sm font-medium">{selectedFile.name}</span>
                                            <Badge variant="secondary">
                                                {(selectedFile.size / 1024).toFixed(1)} KB
                                            </Badge>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center space-y-2">
                                            <Upload className="h-8 w-8 text-muted-foreground" />
                                            <span className="text-sm text-muted-foreground">
                                                Klik untuk pilih file atau drag & drop
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                PDF, DOC, DOCX (Maks. 10MB)
                                            </span>
                                        </div>
                                    )}
                                </label>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setUploadOpen(false)}>
                            Batal
                        </Button>
                        <Button onClick={handleUpload} disabled={isUploading}>
                            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
