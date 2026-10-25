'use client';

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Layers,
  Building2,
  DollarSign,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  Coins,
  Copy,
  ExternalLink,
  ShieldCheck,
  Globe,
  Phone,
  Mail,
  FileText,
  AlertCircle,
  Eye,
  X,
  Sparkles,
  Upload,
  Edit,
  Tag,
  FileDown,
  ChevronRight,
  Image as ImageIcon,
  Users,
  Search,
  Sliders
} from 'lucide-react';
import CustomerMasterSubTab from './CustomerMasterSubTab';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import {
  useGetCrmMastersQuery,
  useUpdateCrmMastersMutation,
  useDeleteProductFromMasterMutation,
  useDeleteAllProductsFromMasterMutation,
  useLazyGetS3PresignedUploadQuery,
  useAddCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation
} from '../api/crmApi';

const PRESET_SOURCES = [
  { name: 'IndiaMART Lead Manager', slug: 'INDIAMART', credentials: { syncStatus: 'CONNECTED', autoSyncEnabled: true } },
  { name: 'TradeIndia Marketplace', slug: 'TRADEINDIA', credentials: { syncStatus: 'IDLE', autoSyncEnabled: false } },
  { name: 'Direct Sales & Works Visit', slug: 'DIRECT_SALES', credentials: { syncStatus: 'IDLE', autoSyncEnabled: false } },
  { name: 'Official Website Enquiry Form', slug: 'WEBSITE', credentials: { syncStatus: 'CONNECTED', autoSyncEnabled: true } },
  { name: 'Client Referral / Repeat Customer', slug: 'REFERRAL', credentials: { syncStatus: 'IDLE', autoSyncEnabled: false } },
  { name: 'Trade Show / Industrial Exhibition', slug: 'EXHIBITION', credentials: { syncStatus: 'IDLE', autoSyncEnabled: false } }
];

export const getCurrencySymbol = (curr = 'INR') => {
  switch (curr) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    default: return '₹';
  }
};

export default function CrmMastersTab() {
  const { data, isLoading, refetch } = useGetCrmMastersQuery();
  const [updateCrmMasters, { isLoading: isSaving }] = useUpdateCrmMastersMutation();
  const [deleteProductFromMaster] = useDeleteProductFromMasterMutation();
  const [deleteAllProductsFromMaster, { isLoading: isDeletingAll }] = useDeleteAllProductsFromMasterMutation();

  const [addCategory, { isLoading: isAddingCategory }] = useAddCategoryMutation();
  const [updateCategory, { isLoading: isUpdatingCategory }] = useUpdateCategoryMutation();
  const [deleteCategory, { isLoading: isDeletingCategory }] = useDeleteCategoryMutation();

  const [triggerGetUploadUrl] = useLazyGetS3PresignedUploadQuery();
  const [isUploadingPhotoS3, setIsUploadingPhotoS3] = useState(false);
  const [isUploadingCatalogS3, setIsUploadingCatalogS3] = useState(false);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);

  // Active Sub-Tab: 'products' | 'companyInfo'
  const [activeSubTab, setActiveSubTab] = useState('products');

  // Product Filter & Search
  const [productCategoryFilter, setProductCategoryFilter] = useState('');
  const [productSearch, setProductSearch] = useState('');

  // Modals & Viewers
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null);

  // Category Management Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryDesc, setEditingCategoryDesc] = useState('');

  // Product Preview Modal State
  const [selectedProductForPreview, setSelectedProductForPreview] = useState<any>(null);
  const [previewActivePhotoIndex, setPreviewActivePhotoIndex] = useState(0);

  // Photo URL Paste Helper in Modal
  const [pastedPhotoUrl, setPastedPhotoUrl] = useState('');

  // Delete Confirmation States (Pure ConfirmModal Standard)
  const [productToDelete, setProductToDelete] = useState<{ index: number; product: any } | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);

  // Currency Calculator Helper
  const [calcAmount, setCalcAmount] = useState(1000);
  const [calcCurrency, setCalcCurrency] = useState('USD');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success'); // 'success' | 'info' | 'error'

  const showToast = (msg: string, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 4500);
  };

  // Local Editable State
  const [masters, setMasters] = useState<any>({
    categories: [],
    machines: [],
    sources: PRESET_SOURCES,
    lossReasons: [],
    paymentTerms: [],
    exchangeRates: { USD: 85.0, EUR: 92.0, GBP: 110.0, JPY: 0.58 },
    companyBillingInfo: {
      companyName: 'Machine House - Winding Technologies',
      tagline: 'House of Innovations.....',
      worksAddress: 'No. 3, Muniyappa Building, Hommadevanahalli, Gottigere Post, Bengaluru - 560083, Karnataka, India',
      phone: '+91 8047640100 / +91 9845012345',
      email: 'sales@machinehousetechnologies.in',
      website: 'www.machinehousetechnologies.in',
      gstin: '29AAACM1234F1Z5',
      pan: 'AAACM1234F',
      bankName: 'State Bank of India',
      bankBranch: 'Peenya Industrial Estate Branch, Bengaluru',
      accountNumber: '39482019283',
      ifscCode: 'SBIN0040182',
      swiftCode: 'SBININBB482',
      authorizedSignatory: 'For Machine House Technologies — Authorized Signatory',
      standardTerms: ''
    }
  });

  // Product Form State for Add / Edit Modal
  const [productForm, setProductForm] = useState({
    modelCode: '',
    modelName: '',
    category: '',
    description: '',
    price: 0,
    currency: 'INR',
    photos: [] as string[],
    photoUrl: '',
    catalogUrl: '',
    catalogName: '',
    technicalSpecifications: [{ parameter: '', value: '' }] as Array<{ parameter: string; value: string }>,
    standardLeadWeeks: 4,
    basePriceINR: 0,
    basePriceUSD: 0,
    basePriceEUR: 0,
    basePriceGBP: 0
  });

  useEffect(() => {
    if (data?.masters) {
      setMasters({
        categories: data.masters.categories || [],
        machines: data.masters.machines || [],
        sources: data.masters.sources?.length ? data.masters.sources : PRESET_SOURCES,
        lossReasons: data.masters.lossReasons || [],
        paymentTerms: data.masters.paymentTerms || [],
        exchangeRates: data.masters.exchangeRates || { USD: 85.0, EUR: 92.0, GBP: 110.0, JPY: 0.58 },
        companyBillingInfo: {
          companyName: data.masters.companyBillingInfo?.companyName || 'Machine House - Winding Technologies',
          tagline: data.masters.companyBillingInfo?.tagline || 'House of Innovations.....',
          worksAddress: data.masters.companyBillingInfo?.worksAddress || 'No. 3, Muniyappa Building, Hommadevanahalli, Gottigere Post, Bengaluru - 560083, Karnataka, India',
          phone: data.masters.companyBillingInfo?.phone || '+91 8047640100 / +91 9845012345',
          email: data.masters.companyBillingInfo?.email || 'sales@machinehousetechnologies.in',
          website: data.masters.companyBillingInfo?.website || 'www.machinehousetechnologies.in',
          gstin: data.masters.companyBillingInfo?.gstin || '29AAACM1234F1Z5',
          pan: data.masters.companyBillingInfo?.pan || 'AAACM1234F',
          bankName: data.masters.companyBillingInfo?.bankName || 'State Bank of India',
          bankBranch: data.masters.companyBillingInfo?.bankBranch || 'Peenya Industrial Estate Branch, Bengaluru',
          accountNumber: data.masters.companyBillingInfo?.accountNumber || '39482019283',
          ifscCode: data.masters.companyBillingInfo?.ifscCode || 'SBIN0040182',
          swiftCode: data.masters.companyBillingInfo?.swiftCode || 'SBININBB482',
          authorizedSignatory: data.masters.companyBillingInfo?.authorizedSignatory || 'For Machine House Technologies — Authorized Signatory',
          standardTerms: data.masters.companyBillingInfo?.standardTerms || '1. Prices are Ex-Works Bengaluru.\n2. Taxes: GST 18% extra as applicable.\n3. Payment: 30% advance with PO, 60% against proforma invoice before dispatch, 10% after commissioning.\n4. Delivery: 4-8 weeks from date of technically & commercially clear order.\n5. Warranty: 12 months from dispatch.'
        }
      });
    }
  }, [data]);

  const handleSaveAll = async () => {
    try {
      await updateCrmMasters(masters).unwrap();
      showToast('All CRM Master configurations saved successfully!');
      refetch();
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to update CRM masters', 'error');
    }
  };

  // Dedicated Save Handlers for Each Sub-Tab
  const handleSaveProducts = async () => {
    try {
      await updateCrmMasters({ machines: masters.machines, categories: masters.categories }).unwrap();
      showToast('Products catalog saved successfully to database!');
      refetch();
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to save products', 'error');
    }
  };

  const handleSaveCompanyInfo = async () => {
    try {
      await updateCrmMasters({
        companyBillingInfo: masters.companyBillingInfo,
        exchangeRates: masters.exchangeRates
      }).unwrap();
      showToast('Company billing details & currency rates saved successfully!');
      refetch();
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to save company settings', 'error');
    }
  };

  // Copy text to clipboard helper
  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`, 'info');
  };

  // Category Actions
  const handleAddCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCategoryName.trim()) {
      showToast('Category name is required', 'error');
      return;
    }
    try {
      const res = await addCategory({
        name: newCategoryName.trim(),
        description: newCategoryDesc.trim()
      }).unwrap();
      showToast(`Category "${newCategoryName.trim()}" created successfully!`, 'success');
      setNewCategoryName('');
      setNewCategoryDesc('');
      if (res?.categories) {
        setMasters((prev: any) => ({ ...prev, categories: res.categories }));
      }
      refetch();
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to create category', 'error');
    }
  };

  const handleStartEditCategory = (cat: any) => {
    setEditingCategoryId(cat._id || cat.slug);
    setEditingCategoryName(cat.name);
    setEditingCategoryDesc(cat.description || '');
  };

  const handleSaveEditCategory = async (catId: string) => {
    if (!editingCategoryName.trim()) {
      showToast('Category name is required', 'error');
      return;
    }
    try {
      const res = await updateCategory({
        id: catId,
        name: editingCategoryName.trim(),
        description: editingCategoryDesc.trim()
      }).unwrap();
      showToast('Category updated successfully!', 'success');
      setEditingCategoryId(null);
      if (res?.categories) {
        setMasters((prev: any) => ({ ...prev, categories: res.categories }));
      }
      refetch();
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to update category', 'error');
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (!window.confirm(`Are you sure you want to delete category "${catName}"? Products in this category will keep their text.`)) return;
    try {
      const res = await deleteCategory(catId).unwrap();
      showToast(`Category "${catName}" deleted successfully!`, 'success');
      if (res?.categories) {
        setMasters((prev: any) => ({ ...prev, categories: res.categories }));
      }
      refetch();
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to delete category', 'error');
    }
  };

  // Open Add Product Modal
  const handleOpenAddProduct = () => {
    setEditingProductIndex(null);
    setProductForm({
      modelCode: '',
      modelName: '',
      category: masters.categories?.[0]?.name || '',
      description: '',
      price: 0,
      currency: 'INR',
      photos: [],
      photoUrl: '',
      catalogUrl: '',
      catalogName: '',
      technicalSpecifications: [{ parameter: '', value: '' }],
      standardLeadWeeks: 4,
      basePriceINR: 0,
      basePriceUSD: 0,
      basePriceEUR: 0,
      basePriceGBP: 0
    });
    setIsProductModalOpen(true);
  };

  // Open Edit Product Modal
  const handleOpenEditProduct = (index: number) => {
    const p = masters.machines[index];
    if (!p) return;
    setEditingProductIndex(index);

    const existingPhotos = Array.isArray(p.photos) && p.photos.length > 0
      ? p.photos
      : p.photoUrl ? [p.photoUrl] : [];

    const existingSpecs = Array.isArray(p.technicalSpecifications) && p.technicalSpecifications.length > 0
      ? p.technicalSpecifications
      : [{ parameter: '', value: '' }];

    setProductForm({
      modelCode: p.modelCode || '',
      modelName: p.modelName || '',
      category: p.category || (masters.categories?.[0]?.name || ''),
      description: p.description || '',
      price: p.price !== undefined ? p.price : (p.basePriceINR || 0),
      currency: p.currency || 'INR',
      photos: existingPhotos,
      photoUrl: existingPhotos[0] || p.photoUrl || '',
      catalogUrl: p.catalogUrl || '',
      catalogName: p.catalogName || '',
      technicalSpecifications: existingSpecs,
      standardLeadWeeks: p.standardLeadWeeks || 4,
      basePriceINR: p.basePriceINR || 0,
      basePriceUSD: p.basePriceUSD || 0,
      basePriceEUR: p.basePriceEUR || 0,
      basePriceGBP: p.basePriceGBP || 0
    });
    setIsProductModalOpen(true);
  };

  // Helper to read file as Data URL (Base64) with automatic client-side canvas compression for instant preview
  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (typeof window !== 'undefined' && file.type.startsWith('image/')) {
          const img = new Image();
          img.onload = () => {
            const maxDim = 1200;
            let width = img.width;
            let height = img.height;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.85));
            } else {
              resolve(result);
            }
          };
          img.onerror = () => resolve(result);
          img.src = result;
        } else {
          resolve(result);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Upload / Attach Multiple Product Photos with Instant Preview
  const handleUploadProductPhotosToS3 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhotoS3(true);
    const code = (productForm.modelCode || 'PRODUCT').toUpperCase().replace(/[^A-Z0-9_-]/g, '_');

    try {
      const addedDataUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const dataUrl = await readFileAsDataURL(file);
        addedDataUrls.push(dataUrl);
      }

      if (addedDataUrls.length > 0) {
        // Immediately populate form photos so preview is instant
        setProductForm((prev) => {
          const combined = [...prev.photos, ...addedDataUrls];
          return {
            ...prev,
            photos: combined,
            photoUrl: prev.photoUrl || combined[0] || ''
          };
        });
        showToast(`All set! ${addedDataUrls.length} photo(s) added with instant preview.`, 'success');

        // Optional background S3 upload attempt for remote hosting if configured
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (!file.type.startsWith('image/')) continue;
          try {
            const s3Key = `crm/products/${code}/${Date.now()}_${i}_${file.name.replace(/\s+/g, '_')}`;
            const res = await triggerGetUploadUrl({
              key: s3Key,
              contentType: file.type || 'image/jpeg'
            }).unwrap();

            if (res?.url && !(res as any).isMock && !res.url.startsWith('/api/')) {
              const putRes = await fetch(res.url, {
                method: 'PUT',
                headers: { 'Content-Type': file.type || 'image/jpeg' },
                body: file
              });
              if (putRes.ok) {
                const s3PublicUrl = `https://${res.bucket || 'aws-mht'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'ap-south-2'}.amazonaws.com/${s3Key}`;
                setProductForm((prev) => {
                  const updatedPhotos = prev.photos.map((p) => (p === addedDataUrls[i] ? s3PublicUrl : p));
                  return {
                    ...prev,
                    photos: updatedPhotos,
                    photoUrl: prev.photoUrl === addedDataUrls[i] ? s3PublicUrl : prev.photoUrl
                  };
                });
              }
            }
          } catch {
            // Retain high-quality compressed dataUrl
          }
        }
      } else {
        showToast('Please select valid image files (JPG, PNG, WebP).', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Could not load the selected photo(s).', 'error');
    } finally {
      setIsUploadingPhotoS3(false);
      e.target.value = '';
    }
  };

  // Add Photo via URL
  const handleAddPastedPhoto = () => {
    if (!pastedPhotoUrl.trim()) return;
    setProductForm((prev) => {
      const combined = [...prev.photos, pastedPhotoUrl.trim()];
      return {
        ...prev,
        photos: combined,
        photoUrl: prev.photoUrl || combined[0] || ''
      };
    });
    setPastedPhotoUrl('');
    showToast('Photo added to gallery!', 'success');
  };

  const handleRemovePhoto = (photoIdx: number) => {
    setProductForm((prev) => {
      const newPhotos = prev.photos.filter((_, idx) => idx !== photoIdx);
      return {
        ...prev,
        photos: newPhotos,
        photoUrl: newPhotos[0] || ''
      };
    });
  };

  const handleSetCoverPhoto = (photoIdx: number) => {
    setProductForm((prev) => {
      const selected = prev.photos[photoIdx];
      const otherPhotos = prev.photos.filter((_, idx) => idx !== photoIdx);
      const newPhotos = [selected, ...otherPhotos];
      return {
        ...prev,
        photos: newPhotos,
        photoUrl: selected
      };
    });
    showToast('Primary cover photo updated!', 'info');
  };

  // Upload Product Catalog PDF/Doc to S3 with local data URL fallback
  const handleUploadCatalogToS3 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCatalogS3(true);
    const code = (productForm.modelCode || 'PRODUCT').toUpperCase().replace(/[^A-Z0-9_-]/g, '_');

    try {
      const base64Data = await readFileAsDataURL(file);
      let catalogUrl = base64Data;

      try {
        const s3Key = `crm/catalogs/${code}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const res = await triggerGetUploadUrl({
          key: s3Key,
          contentType: file.type || 'application/pdf'
        }).unwrap();

        if (res?.url && !(res as any).isMock && !res.url.startsWith('/api/')) {
          const putRes = await fetch(res.url, {
            method: 'PUT',
            headers: { 'Content-Type': file.type || 'application/pdf' },
            body: file
          });
          if (putRes.ok) {
            catalogUrl = `https://${res.bucket || 'aws-mht'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'ap-south-2'}.amazonaws.com/${s3Key}`;
          }
        }
      } catch {
        // Keep base64Data on S3 failure or dev mode
      }

      setProductForm((prev) => ({
        ...prev,
        catalogUrl,
        catalogName: file.name
      }));
      showToast(`Catalog "${file.name}" attached successfully!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to attach catalog.', 'error');
    } finally {
      setIsUploadingCatalogS3(false);
      e.target.value = '';
    }
  };

  const handleRemoveCatalog = () => {
    setProductForm((prev) => ({
      ...prev,
      catalogUrl: '',
      catalogName: ''
    }));
    showToast('Catalog removed.', 'info');
  };

  // Dynamic Technical Specifications Lines
  const handleAddSpecLine = () => {
    setProductForm((prev) => ({
      ...prev,
      technicalSpecifications: [...prev.technicalSpecifications, { parameter: '', value: '' }]
    }));
  };

  const handleRemoveSpecLine = (specIndex: number) => {
    setProductForm((prev) => {
      const nextSpecs = prev.technicalSpecifications.filter((_, idx) => idx !== specIndex);
      return {
        ...prev,
        technicalSpecifications: nextSpecs.length > 0 ? nextSpecs : [{ parameter: '', value: '' }]
      };
    });
  };

  const handleSpecChange = (specIndex: number, field: 'parameter' | 'value', value: string) => {
    setProductForm((prev) => {
      const nextSpecs = [...prev.technicalSpecifications];
      nextSpecs[specIndex] = { ...nextSpecs[specIndex], [field]: value };
      return { ...prev, technicalSpecifications: nextSpecs };
    });
  };

  // Save Product from Modal
  const handleSaveProductModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.modelCode.trim() || !productForm.modelName.trim()) {
      showToast('Model Code and Product Name are required.', 'error');
      return;
    }

    const priceNum = Number(productForm.price) || 0;
    const currency = productForm.currency || 'INR';
    const rates = masters.exchangeRates || { USD: 85, EUR: 92, GBP: 110 };

    let basePriceINR = priceNum;
    let basePriceUSD = 0;
    let basePriceEUR = 0;
    let basePriceGBP = 0;

    if (currency === 'INR') {
      basePriceINR = priceNum;
      basePriceUSD = Number((priceNum / (rates.USD || 85)).toFixed(2));
      basePriceEUR = Number((priceNum / (rates.EUR || 92)).toFixed(2));
      basePriceGBP = Number((priceNum / (rates.GBP || 110)).toFixed(2));
    } else if (currency === 'USD') {
      basePriceINR = Math.round(priceNum * (rates.USD || 85));
      basePriceUSD = priceNum;
      basePriceEUR = Number(((priceNum * (rates.USD || 85)) / (rates.EUR || 92)).toFixed(2));
      basePriceGBP = Number(((priceNum * (rates.USD || 85)) / (rates.GBP || 110)).toFixed(2));
    } else if (currency === 'EUR') {
      basePriceINR = Math.round(priceNum * (rates.EUR || 92));
      basePriceEUR = priceNum;
      basePriceUSD = Number(((priceNum * (rates.EUR || 92)) / (rates.USD || 85)).toFixed(2));
      basePriceGBP = Number(((priceNum * (rates.EUR || 92)) / (rates.GBP || 110)).toFixed(2));
    } else if (currency === 'GBP') {
      basePriceINR = Math.round(priceNum * (rates.GBP || 110));
      basePriceGBP = priceNum;
      basePriceUSD = Number(((priceNum * (rates.GBP || 110)) / (rates.USD || 85)).toFixed(2));
      basePriceEUR = Number(((priceNum * (rates.GBP || 110)) / (rates.EUR || 92)).toFixed(2));
    }

    const cleanSpecs = productForm.technicalSpecifications
      .filter((s) => s.parameter.trim() || s.value.trim())
      .map((s) => ({ parameter: s.parameter.trim(), value: s.value.trim() }));

    const cleanPhotos = productForm.photos.filter((p) => p && p.trim());
    const primaryPhoto = cleanPhotos[0] || productForm.photoUrl.trim() || '/branding/mh_icon.png';

    const productPayload = {
      modelCode: productForm.modelCode.toUpperCase().trim(),
      modelName: productForm.modelName.trim(),
      category: productForm.category.trim(),
      description: productForm.description.trim(),
      price: priceNum,
      currency,
      basePriceINR,
      basePriceUSD,
      basePriceEUR,
      basePriceGBP,
      photos: cleanPhotos,
      photoUrl: primaryPhoto,
      catalogUrl: productForm.catalogUrl?.trim() || '',
      catalogName: productForm.catalogName?.trim() || '',
      technicalSpecifications: cleanSpecs,
      standardLeadWeeks: Number(productForm.standardLeadWeeks) || 4,
      isActive: true
    };

    const updatedMachines = [...(masters.machines || [])];
    if (editingProductIndex !== null) {
      updatedMachines[editingProductIndex] = {
        ...updatedMachines[editingProductIndex],
        ...productPayload
      };
    } else {
      updatedMachines.push(productPayload);
    }

    const updatedMasters = { ...masters, machines: updatedMachines };
    setMasters(updatedMasters);
    setIsProductModalOpen(false);

    try {
      await updateCrmMasters(updatedMasters).unwrap();
      showToast(`Product ${productPayload.modelCode} saved and synced to database!`, 'success');
      refetch();
    } catch (err: any) {
      showToast(err.data?.message || 'Product saved locally, but failed to sync to database.', 'error');
    }
  };

  // Delete Product Permanently Trigger
  const handleDeleteProduct = (index: number) => {
    const p = masters.machines?.[index];
    if (!p) return;
    setProductToDelete({ index, product: p });
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    const { index, product: p } = productToDelete;
    const idOrCode = p._id || p.modelCode;
    setIsDeletingProduct(true);

    try {
      await deleteProductFromMaster(idOrCode).unwrap();
      setMasters((prev: any) => ({
        ...prev,
        machines: (prev.machines || []).filter((_: any, i: number) => i !== index)
      }));
      if (selectedProductForPreview?.modelCode === p.modelCode) {
        setSelectedProductForPreview(null);
      }
      showToast(`Product ${p.modelCode} removed from catalog.`, 'success');
      setProductToDelete(null);
      refetch();
    } catch (err: any) {
      showToast(err.data?.message || err.message || 'We could not delete this product right now. Please try again.', 'error');
    } finally {
      setIsDeletingProduct(false);
    }
  };

  // Delete All Products Trigger
  const handleDeleteAllProducts = () => {
    const count = masters.machines?.length || 0;
    if (count === 0) {
      showToast('The product catalog is already empty.', 'info');
      return;
    }
    setIsDeleteAllOpen(true);
  };

  const confirmDeleteAllProducts = async () => {
    const count = masters.machines?.length || 0;

    try {
      await deleteAllProductsFromMaster().unwrap();
      setMasters((prev: any) => ({
        ...prev,
        machines: []
      }));
      setSelectedProductForPreview(null);
      showToast(`All set! All ${count} products cleared from catalog.`, 'success');
      setIsDeleteAllOpen(false);
      refetch();
    } catch (err: any) {
      showToast(err.data?.message || err.message || 'We could not clear the products right now. Please try again.', 'error');
    }
  };

  // Company Billing Field Change Helper
  const handleCompanyBillingChange = (field: string, value: any) => {
    setMasters((prev: any) => ({
      ...prev,
      companyBillingInfo: {
        ...prev.companyBillingInfo,
        [field]: value
      }
    }));
  };

  // Forex Rate Change Helper
  const handleForexRateChange = (currency: string, rate: any) => {
    setMasters((prev: any) => ({
      ...prev,
      exchangeRates: {
        ...prev.exchangeRates,
        [currency]: Number(rate)
      }
    }));
  };

  // Filtered Products List
  const filteredProducts = (masters.machines || []).filter((m: any) => {
    if (!productSearch) return true;
    const query = productSearch.toLowerCase();
    return (
      m.modelCode?.toLowerCase().includes(query) ||
      m.modelName?.toLowerCase().includes(query) ||
      m.description?.toLowerCase().includes(query) ||
      m.category?.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700">Loading CRM Masters & Products Catalog...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl text-white text-xs sm:text-sm font-semibold shadow-2xl flex items-center space-x-2.5 animate-in fade-in slide-in-from-bottom-3 ${
            toastType === 'error'
              ? 'bg-red-600'
              : toastType === 'info'
              ? 'bg-slate-900'
              : 'bg-emerald-600'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 2 Core Sub-Tabs Selector (Mandatory Button-Type Pill Tabs) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveSubTab('products')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'products'
              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
              : 'bg-slate-100/80 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
          }`}
        >
          <Cpu className={`w-4 h-4 ${activeSubTab === 'products' ? 'text-white' : 'text-slate-500'}`} />
          <span>Product</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeSubTab === 'products' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {masters.machines?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('customers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'customers'
              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
              : 'bg-slate-100/80 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
          }`}
        >
          <Users className={`w-4 h-4 ${activeSubTab === 'customers' ? 'text-white' : 'text-slate-500'}`} />
          <span>Customer Master</span>
        </button>

        <button
          onClick={() => setActiveSubTab('companyInfo')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'companyInfo'
              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
              : 'bg-slate-100/80 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
          }`}
        >
          <Building2 className={`w-4 h-4 ${activeSubTab === 'companyInfo' ? 'text-white' : 'text-slate-500'}`} />
          <span>Company Info & Currency Values</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeSubTab === 'companyInfo' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            PDF & Bank Setup
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: PRODUCT CATALOG                                                */}
      {/* ========================================================================= */}
      {activeSubTab === 'products' && (
        <div className="space-y-4">
          {/* Search & Add Product Action Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search products by model code, name, or description..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={handleOpenAddProduct}
                className="flex items-center justify-center space-x-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </button>
            </div>
          </div>

          {/* Product Data Table or Empty State */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                {productSearch ? 'No Matching Products Found' : 'No Products in Catalog'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {productSearch
                  ? 'Try adjusting your search query.'
                  : 'The product master is currently empty. Click "Add Product" to define machine models with photos, technical specifications, brochures, and multi-currency pricing.'}
              </p>
              {!productSearch && (
                <button
                  type="button"
                  onClick={handleOpenAddProduct}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add First Product</span>
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3.5 px-4 w-20 text-center">Photo</th>
                      <th className="py-3.5 px-4 w-36">Model Code</th>
                      <th className="py-3.5 px-4 min-w-[260px]">Product Name</th>
                      <th className="py-3.5 px-4 w-44 text-right">Selling Price</th>
                      <th className="py-3.5 px-4 min-w-[220px]">Key Specifications</th>
                      <th className="py-3.5 px-4 w-28 text-center">Brochure</th>
                      <th className="py-3.5 px-4 w-20 text-center">Status</th>
                      <th className="py-3.5 px-4 w-28 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((machine: any, index: number) => {
                      const photosList = Array.isArray(machine.photos) && machine.photos.length > 0
                        ? machine.photos
                        : machine.photoUrl ? [machine.photoUrl] : [];
                      const coverPhoto = photosList[0] || '/branding/mh_icon.png';
                      const currency = machine.currency || 'INR';
                      const displayPrice = machine.price !== undefined ? machine.price : (machine.basePriceINR || 0);

                      // Find index in master array for edit/delete
                      const originalIndex = masters.machines.findIndex(
                        (m: any) => m.modelCode === machine.modelCode
                      );
                      const targetIndex = originalIndex >= 0 ? originalIndex : index;

                      return (
                        <tr
                          key={machine._id || machine.modelCode || index}
                          onClick={() => {
                            setSelectedProductForPreview(machine);
                            setPreviewActivePhotoIndex(0);
                          }}
                          className="hover:bg-orange-50/40 transition-colors cursor-pointer group"
                        >
                          {/* Photo Thumbnail with Multi-Photo Badge */}
                          <td className="py-3 px-4 text-center">
                            <div className="relative inline-block w-14 h-14 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 shadow-2xs group-hover:border-orange-300 transition-colors">
                              <img
                                src={coverPhoto}
                                alt={machine.modelName}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              {photosList.length > 1 && (
                                <span className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-white text-[9px] font-extrabold py-0.5 text-center backdrop-blur-xs">
                                  {photosList.length} pics
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Model Code */}
                          <td className="py-3 px-4 font-mono">
                            <span className="font-extrabold text-xs text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200/60 inline-block">
                              {machine.modelCode}
                            </span>
                          </td>

                          {/* Product Name */}
                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-900 text-sm group-hover:text-orange-600 transition-colors block">
                                {machine.modelName}
                              </span>
                              {machine.description && (
                                <p className="text-xs text-slate-500 line-clamp-1 max-w-md">
                                  {machine.description}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Selling Price */}
                          <td className="py-3 px-4 text-right">
                            <div className="font-mono font-extrabold text-sm text-slate-900">
                              {getCurrencySymbol(currency)} {Number(displayPrice || 0).toLocaleString('en-IN')}
                            </div>
                            {currency !== 'INR' && machine.basePriceINR > 0 && (
                              <div className="text-[10px] text-slate-500 font-medium">
                                Base: ₹{Number(machine.basePriceINR).toLocaleString('en-IN')}
                              </div>
                            )}
                          </td>

                          {/* Key Specifications */}
                          <td className="py-3 px-4">
                            {Array.isArray(machine.technicalSpecifications) && machine.technicalSpecifications.length > 0 ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {machine.technicalSpecifications.slice(0, 2).map((spec: any, sIdx: number) => (
                                    <span
                                      key={sIdx}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200/80"
                                    >
                                      <span className="text-slate-400">{spec.parameter}:</span>
                                      <strong className="text-slate-800 font-semibold">{spec.value}</strong>
                                    </span>
                                  ))}
                                  {machine.technicalSpecifications.length > 2 && (
                                    <span className="text-[10px] text-orange-600 font-bold">
                                      +{machine.technicalSpecifications.length - 2} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs italic">—</span>
                            )}
                          </td>

                          {/* Brochure */}
                          <td className="py-3 px-4 text-center">
                            {machine.catalogUrl ? (
                              <a
                                href={machine.catalogUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title={machine.catalogName || 'View PDF Brochure'}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 text-[11px] font-bold border border-orange-200 transition-colors"
                              >
                                <FileDown className="w-3.5 h-3.5" />
                                <span>PDF</span>
                              </a>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                title="Preview Full Product Dossier"
                                onClick={() => {
                                  setSelectedProductForPreview(machine);
                                  setPreviewActivePhotoIndex(0);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                title="Edit Product"
                                onClick={() => handleOpenEditProduct(targetIndex)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                title="Delete Product"
                                onClick={() => handleDeleteProduct(targetIndex)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium">
                  Showing <strong>{filteredProducts.length}</strong> of <strong>{masters.machines.length}</strong> products
                </span>
                <span className="text-slate-400 text-[11px] hidden sm:inline">
                  💡 Tip: Click anywhere on a product row to open the full interactive photo gallery and technical dossier.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: CUSTOMER MASTER                                                */}
      {/* ========================================================================= */}
      {activeSubTab === 'customers' && <CustomerMasterSubTab />}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: COMPANY INFO & CURRENCY VALUES (FOR QUOTATION PDFS)           */}
      {/* ========================================================================= */}
      {activeSubTab === 'companyInfo' && (
        <div className="space-y-4">
          <div className="bg-white px-5 py-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-orange-500" />
              <span className="font-bold text-slate-900 text-sm">Company Information & Currency Values</span>
              <span className="text-[11px] font-semibold text-slate-500">Quotation PDF & Bank Setup</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPdfPreviewOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                <FileText size={13} className="text-orange-500" />
                <span>Preview Quotation PDF</span>
              </button>

              <button
                type="button"
                onClick={handleSaveCompanyInfo}
                disabled={isSaving}
                className="flex items-center justify-center space-x-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Settings...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Company & Currency Settings</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column (2 Cols): Official Company Details for Quotations */}
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Official Corporate & Billing Information
                  </h3>
                  <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={masters.companyBillingInfo?.companyName || ''}
                    onChange={(e) => handleCompanyBillingChange('companyName', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tagline / Subtitle
                  </label>
                  <input
                    type="text"
                    value={masters.companyBillingInfo?.tagline || ''}
                    onChange={(e) => handleCompanyBillingChange('tagline', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-orange-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Works & Factory Address *
                  </label>
                  <textarea
                    rows={2}
                    value={masters.companyBillingInfo?.worksAddress || ''}
                    onChange={(e) => handleCompanyBillingChange('worksAddress', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sales Email *
                  </label>
                  <input
                    type="email"
                    value={masters.companyBillingInfo?.email || ''}
                    onChange={(e) => handleCompanyBillingChange('email', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Phone Numbers *
                  </label>
                  <input
                    type="text"
                    value={masters.companyBillingInfo?.phone || ''}
                    onChange={(e) => handleCompanyBillingChange('phone', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Official Website URL
                  </label>
                  <input
                    type="text"
                    value={masters.companyBillingInfo?.website || ''}
                    onChange={(e) => handleCompanyBillingChange('website', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GSTIN Number *
                  </label>
                  <input
                    type="text"
                    value={masters.companyBillingInfo?.gstin || ''}
                    onChange={(e) => handleCompanyBillingChange('gstin', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 uppercase"
                  />
                </div>
              </div>

              {/* Bank Details for PO Advances */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-orange-500" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Bank Account Details (Printed on Quotation PDFs for Client Advance)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={masters.companyBillingInfo?.bankName || ''}
                      onChange={(e) => handleCompanyBillingChange('bankName', e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Branch</label>
                    <input
                      type="text"
                      value={masters.companyBillingInfo?.bankBranch || ''}
                      onChange={(e) => handleCompanyBillingChange('bankBranch', e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={masters.companyBillingInfo?.accountNumber || ''}
                      onChange={(e) => handleCompanyBillingChange('accountNumber', e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={masters.companyBillingInfo?.ifscCode || ''}
                      onChange={(e) => handleCompanyBillingChange('ifscCode', e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">SWIFT / BIC Code (Export)</label>
                    <input
                      type="text"
                      value={masters.companyBillingInfo?.swiftCode || ''}
                      onChange={(e) => handleCompanyBillingChange('swiftCode', e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Authorized Signatory Title</label>
                    <input
                      type="text"
                      value={masters.companyBillingInfo?.authorizedSignatory || ''}
                      onChange={(e) => handleCompanyBillingChange('authorizedSignatory', e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Standard Terms & Conditions for Quotations */}
              <div className="pt-3 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Default Quotation Terms & Conditions Template (Feeds all quotation PDFs)
                </label>
                <textarea
                  rows={4}
                  value={masters.companyBillingInfo?.standardTerms || ''}
                  onChange={(e) => handleCompanyBillingChange('standardTerms', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-700 leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Right Column (1 Col): Currency Values & Live Conversion Engine */}
          <div className="space-y-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Coins className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Currency Values & Forex Rates
                  </h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  Base: INR (₹)
                </span>
              </div>

              {/* Forex inputs */}
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900">1 USD ($) in INR</span>
                    <span className="text-[10px] text-slate-400 block">US Dollar</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-slate-500">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      value={masters.exchangeRates?.USD || 85.0}
                      onChange={(e) => handleForexRateChange('USD', e.target.value)}
                      className="w-24 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 text-right"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900">1 EUR (€) in INR</span>
                    <span className="text-[10px] text-slate-400 block">Euro</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-slate-500">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      value={masters.exchangeRates?.EUR || 92.0}
                      onChange={(e) => handleForexRateChange('EUR', e.target.value)}
                      className="w-24 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 text-right"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900">1 GBP (£) in INR</span>
                    <span className="text-[10px] text-slate-400 block">British Pound</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-slate-500">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      value={masters.exchangeRates?.GBP || 110.0}
                      onChange={(e) => handleForexRateChange('GBP', e.target.value)}
                      className="w-24 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 text-right"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900">1 JPY (¥) in INR</span>
                    <span className="text-[10px] text-slate-400 block">Japanese Yen</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-slate-500">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      value={masters.exchangeRates?.JPY || 0.58}
                      onChange={(e) => handleForexRateChange('JPY', e.target.value)}
                      className="w-24 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 text-right"
                    />
                  </div>
                </div>
              </div>

              {/* Interactive Currency Converter Tester */}
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 block">
                  Interactive Conversion Check
                </span>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={calcAmount}
                    onChange={(e) => setCalcAmount(Number(e.target.value) || 0)}
                    className="w-28 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                  />
                  <select
                    value={calcCurrency}
                    onChange={(e) => setCalcCurrency(e.target.value)}
                    className="px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>

                <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-orange-900">Calculated Value:</span>
                  <span className="text-sm font-mono font-extrabold text-orange-600">
                    ₹
                    {(
                      Number(calcAmount || 0) * (masters.exchangeRates?.[calcCurrency] || 1)
                    ).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* ========================================================================= */}
      {/* CATEGORY MANAGEMENT MODAL (ADD, EDIT, DELETE CUSTOM CATEGORIES)           */}
      {/* ========================================================================= */}
      {isCategoryModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
          onClick={() => setIsCategoryModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/75">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 font-bold">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Manage Product Categories</h2>
                  <p className="text-xs text-slate-500">
                    Create, edit, or delete customer categories for your product catalog
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Add New Category Form */}
              <form onSubmit={handleAddCategory} className="p-4 rounded-xl bg-orange-50/50 border border-orange-200/80 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-800 block">
                  Add New Custom Category
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g. Table Top Coil Winders"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={newCategoryDesc}
                      onChange={(e) => setNewCategoryDesc(e.target.value)}
                      placeholder="e.g. Compact precision winders"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-orange-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isAddingCategory || !newCategoryName.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isAddingCategory ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>Add Category</span>
                  </button>
                </div>
              </form>

              {/* Existing Categories List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Existing Categories ({masters.categories?.length || 0})
                  </span>
                </div>

                {(!masters.categories || masters.categories.length === 0) ? (
                  <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                    No custom categories created yet. Add one above to organize your products.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    {masters.categories.map((cat: any) => {
                      const isEditing = editingCategoryId === (cat._id || cat.slug);

                      return (
                        <div key={cat._id || cat.slug || cat.name} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                          {isEditing ? (
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={editingCategoryName}
                                onChange={(e) => setEditingCategoryName(e.target.value)}
                                className="px-2.5 py-1.5 bg-white border border-orange-300 rounded-lg text-xs font-semibold"
                                placeholder="Category Name"
                              />
                              <input
                                type="text"
                                value={editingCategoryDesc}
                                onChange={(e) => setEditingCategoryDesc(e.target.value)}
                                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                                placeholder="Description"
                              />
                            </div>
                          ) : (
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900 truncate">
                                  {cat.name}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  ({cat.slug || cat.name?.toLowerCase().replace(/\s+/g, '-')})
                                </span>
                              </div>
                              {cat.description && (
                                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                  {cat.description}
                                </p>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditCategory(cat._id || cat.slug)}
                                  disabled={isUpdatingCategory}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCategoryId(null)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditCategory(cat)}
                                  className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Category Name"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(cat._id || cat.slug, cat.name)}
                                  disabled={isDeletingCategory}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Category"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRODUCT FORM MODAL (EXPANSIVE DESKTOP WIDTH: max-w-6xl xl:max-w-7xl)       */}
      {/* ========================================================================= */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl xl:max-w-7xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 font-bold">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    {editingProductIndex !== null ? 'Edit Product' : 'Add New Product'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Configure machine model, multiple photos, technical brochure, specifications, and commercial pricing
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveProductModal} className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* --------------------------------------------------------------- */}
                {/* LEFT COLUMN: CORE PRODUCT INFORMATION & PRICING                 */}
                {/* --------------------------------------------------------------- */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-600 block">
                      1. General &amp; Commercial Info
                    </span>
                  </div>

                  {/* Model Code & Product Name in Responsive Unified Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Model Code * (e.g. MHT-2100)
                      </label>
                      <input
                        type="text"
                        required
                        value={productForm.modelCode}
                        onChange={(e) => setProductForm({ ...productForm, modelCode: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold uppercase focus:outline-hidden focus:border-orange-500"
                        placeholder="e.g. MHT-2100"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Product Name / Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={productForm.modelName}
                        onChange={(e) => setProductForm({ ...productForm, modelName: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-hidden focus:border-orange-500"
                        placeholder="e.g. MHT-2100 Table Top CNC Coil Winding Machine"
                      />
                    </div>
                  </div>

                  {/* Price with Currency Selection */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <label className="block text-xs font-semibold text-slate-800">
                      Product Pricing &amp; Currency *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                          Currency
                        </label>
                        <select
                          value={productForm.currency}
                          onChange={(e) => setProductForm({ ...productForm, currency: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 cursor-pointer focus:outline-hidden focus:border-orange-500"
                        >
                          <option value="INR">INR (₹)</option>
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                          Unit Selling Price
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">
                            {getCurrencySymbol(productForm.currency)}
                          </span>
                          <input
                            type="number"
                            min="0"
                            required
                            value={productForm.price || ''}
                            onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) || 0 })}
                            className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-orange-600 focus:outline-hidden focus:border-orange-500"
                            placeholder="285000"
                          />
                        </div>
                      </div>
                    </div>

                    {productForm.currency !== 'INR' && productForm.price > 0 && (
                      <div className="text-[11px] text-slate-500 font-medium">
                        Converted Base Price: <strong className="text-slate-800">₹{(productForm.price * (masters.exchangeRates?.[productForm.currency] || 85)).toLocaleString('en-IN')} INR</strong> (at rate 1 {productForm.currency} = ₹{masters.exchangeRates?.[productForm.currency] || 85})
                      </div>
                    )}
                  </div>

                  {/* Product Description */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Product Description (Used in Quotations &amp; Catalog)
                    </label>
                    <textarea
                      rows={3}
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-orange-500"
                      placeholder="High-speed precision table-top coil winder engineered for transformer coils, relay bobbins, and solenoid windings with synchronized microprocessor wire traversing..."
                    />
                  </div>
                </div>

                {/* --------------------------------------------------------------- */}
                {/* RIGHT COLUMN: MULTIPLE PHOTOS, CATALOG & TECHNICAL SPECS        */}
                {/* --------------------------------------------------------------- */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-600 block">
                      2. Media, Brochure &amp; Specifications
                    </span>
                  </div>

                  {/* Multiple Photos Upload Section with Instant Previews */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Product Photos ({productForm.photos.length} Attached)
                        </label>
                        <span className="text-[11px] text-slate-500 block">
                          Attach machine photographs with instant preview
                        </span>
                      </div>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all">
                        {isUploadingPhotoS3 ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>{isUploadingPhotoS3 ? 'Processing...' : 'Upload Photos'}</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          disabled={isUploadingPhotoS3}
                          onChange={handleUploadProductPhotosToS3}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Quick Paste Image URL Input */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <ImageIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="url"
                          value={pastedPhotoUrl}
                          onChange={(e) => setPastedPhotoUrl(e.target.value)}
                          placeholder="Or paste direct image URL (https://...)"
                          className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-orange-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddPastedPhoto}
                        disabled={!pastedPhotoUrl.trim()}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shrink-0"
                      >
                        + Add Link
                      </button>
                    </div>

                    {/* Photos Preview Gallery */}
                    {productForm.photos.length === 0 ? (
                      <div className="p-5 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center space-y-1.5">
                        <ImageIcon className="w-7 h-7 text-slate-400 mx-auto" />
                        <p className="text-xs font-medium text-slate-700">No photos attached yet</p>
                        <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                          Click <strong>Upload Photos</strong> to select images from your computer or paste an image link above.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                          {productForm.photos.map((photoUrl, pIdx) => {
                            const isCover = pIdx === 0;

                            return (
                              <div
                                key={pIdx}
                                className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white aspect-square shadow-2xs"
                              >
                                <img
                                  src={photoUrl}
                                  alt={`Product ${pIdx + 1}`}
                                  className="w-full h-full object-cover"
                                />

                                {isCover && (
                                  <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-emerald-600 text-white shadow-xs">
                                    Cover Photo
                                  </span>
                                )}

                                {/* Action Overlay */}
                                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                                  {!isCover && (
                                    <button
                                      type="button"
                                      onClick={() => handleSetCoverPhoto(pIdx)}
                                      title="Set as Primary Cover Photo"
                                      className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 text-[10px] font-bold cursor-pointer transition-colors"
                                    >
                                      Make Cover
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePhoto(pIdx)}
                                    title="Delete Photo"
                                    className="p-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white cursor-pointer transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-slate-400 italic">
                          💡 The first photo marked with <strong>Cover Photo</strong> will be used as the primary display photo in catalogs, CRM lists, and quotations.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Catalog / Brochure Upload Section */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Technical Catalog / Brochure (PDF)
                    </label>

                    {productForm.catalogUrl ? (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-orange-50/70 border border-orange-200">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-orange-600 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 truncate block">
                              {productForm.catalogName || 'Technical Catalog (PDF)'}
                            </span>
                            <a
                              href={productForm.catalogUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 hover:underline"
                            >
                              <span>View Attached Document</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleRemoveCatalog}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove Attached Catalog"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl cursor-pointer transition-colors text-xs font-semibold text-slate-600">
                        {isUploadingCatalogS3 ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                            <span>Uploading Brochure to S3...</span>
                          </>
                        ) : (
                          <>
                            <FileDown className="w-4 h-4 text-orange-500" />
                            <span>Upload Technical Catalog (PDF / DOC)</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          disabled={isUploadingCatalogS3}
                          onChange={handleUploadCatalogToS3}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* Dynamic Technical Specifications Section */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700">
                        Technical Specifications
                      </label>
                      <button
                        type="button"
                        onClick={handleAddSpecLine}
                        className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Line</span>
                      </button>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {productForm.technicalSpecifications.map((spec, sIdx) => (
                        <div key={sIdx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={spec.parameter}
                            onChange={(e) => handleSpecChange(sIdx, 'parameter', e.target.value)}
                            placeholder="Parameter (e.g. Wire Range)"
                            className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-orange-500"
                          />
                          <input
                            type="text"
                            value={spec.value}
                            onChange={(e) => handleSpecChange(sIdx, 'value', e.target.value)}
                            placeholder="Value (e.g. 0.02 - 1.6 mm)"
                            className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-orange-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveSpecLine(sIdx)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove Specification Line"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-xs cursor-pointer"
                >
                  {editingProductIndex !== null ? 'Update Product' : 'Add Product to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRODUCT PREVIEW MODAL (ALL INFO, MULTI-PHOTOS, SPECS, EDIT & DELETE)       */}
      {/* ========================================================================= */}
      {selectedProductForPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
          onClick={() => setSelectedProductForPreview(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80 shrink-0">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 font-bold shrink-0">
                  <Cpu className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-extrabold text-orange-600">
                      {selectedProductForPreview.modelCode}
                    </span>
                    {selectedProductForPreview.category && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-900 text-white">
                        {selectedProductForPreview.category}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active Model
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                    {selectedProductForPreview.modelName}
                  </h2>
                </div>
              </div>

              {/* Action Buttons: Edit, Delete, Close */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const idx = masters.machines.findIndex(
                      (m: any) => m.modelCode === selectedProductForPreview.modelCode
                    );
                    setSelectedProductForPreview(null);
                    handleOpenEditProduct(idx >= 0 ? idx : 0);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-orange-600 hover:bg-orange-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5 text-orange-500" />
                  <span>Edit Product</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const idx = masters.machines.findIndex(
                      (m: any) => m.modelCode === selectedProductForPreview.modelCode
                    );
                    if (idx >= 0) {
                      handleDeleteProduct(idx);
                    }
                  }}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                  title="Delete Product"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedProductForPreview(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Two-Column Split Layout on Desktop */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* ----------------------------------------------------------- */}
                {/* LEFT COLUMN: MULTI-PHOTOS SHOWCASE & THUMBNAIL GALLERY       */}
                {/* ----------------------------------------------------------- */}
                <div className="lg:col-span-6 space-y-3">
                  {(() => {
                    const photos = Array.isArray(selectedProductForPreview.photos) && selectedProductForPreview.photos.length > 0
                      ? selectedProductForPreview.photos
                      : selectedProductForPreview.photoUrl ? [selectedProductForPreview.photoUrl] : ['/branding/mh_icon.png'];
                    const activePhoto = photos[previewActivePhotoIndex] || photos[0];

                    return (
                      <div className="space-y-3">
                        {/* Big High-Contrast Showcase */}
                        <div className="relative w-full h-80 sm:h-96 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center p-3 border border-slate-800 shadow-inner">
                          <img
                            src={activePhoto}
                            alt={selectedProductForPreview.modelName}
                            className="max-h-full max-w-full object-contain"
                          />
                          {photos.length > 1 && (
                            <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-900/80 backdrop-blur-xs text-white border border-white/20">
                              Photo {previewActivePhotoIndex + 1} of {photos.length}
                            </span>
                          )}
                        </div>

                        {/* Interactive Thumbnail Gallery */}
                        {photos.length > 1 && (
                          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                            {photos.map((pic: string, pIdx: number) => (
                              <button
                                key={pIdx}
                                type="button"
                                onClick={() => setPreviewActivePhotoIndex(pIdx)}
                                className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 cursor-pointer transition-all ${
                                  previewActivePhotoIndex === pIdx
                                    ? 'border-orange-500 shadow-sm scale-105'
                                    : 'border-slate-200 opacity-60 hover:opacity-100'
                                }`}
                              >
                                <img src={pic} alt="" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* ----------------------------------------------------------- */}
                {/* RIGHT COLUMN: PRICING, SPECS & BROCHURE DOSSIER             */}
                {/* ----------------------------------------------------------- */}
                <div className="lg:col-span-6 space-y-4">
                  {/* Pricing Highlight Card */}
                  <div className="p-4 bg-orange-50/70 border border-orange-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 block">
                        Selling Price ({selectedProductForPreview.currency || 'INR'})
                      </span>
                      <span className="text-2xl font-mono font-extrabold text-slate-900">
                        {getCurrencySymbol(selectedProductForPreview.currency || 'INR')}{' '}
                        {Number(selectedProductForPreview.price !== undefined ? selectedProductForPreview.price : selectedProductForPreview.basePriceINR || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    {selectedProductForPreview.currency !== 'INR' && selectedProductForPreview.basePriceINR > 0 && (
                      <div className="text-right">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                          Base INR Equivalent
                        </span>
                        <span className="text-lg font-mono font-bold text-slate-700">
                          ₹{Number(selectedProductForPreview.basePriceINR).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Product Description */}
                  {selectedProductForPreview.description && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                        Product Description
                      </span>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
                        {selectedProductForPreview.description}
                      </p>
                    </div>
                  )}

                  {/* Technical Catalog Download Card */}
                  {selectedProductForPreview.catalogUrl && (
                    <div className="p-4 bg-orange-50/50 border border-orange-200 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                          <FileDown className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {selectedProductForPreview.catalogName || 'Technical Product Brochure (PDF)'}
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Official technical specification sheet and dimensional drawings
                          </p>
                        </div>
                      </div>

                      <a
                        href={selectedProductForPreview.catalogUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
                      >
                        <span>Download / View Brochure</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  {/* Technical Specifications Table */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                      Technical Specifications
                    </span>

                    {Array.isArray(selectedProductForPreview.technicalSpecifications) && selectedProductForPreview.technicalSpecifications.length > 0 ? (
                      <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] sticky top-0">
                            <tr>
                              <th className="py-2.5 px-4">Parameter</th>
                              <th className="py-2.5 px-4">Specification Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {selectedProductForPreview.technicalSpecifications.map((spec: any, sIdx: number) => (
                              <tr key={sIdx} className="hover:bg-slate-50/80">
                                <td className="py-2.5 px-4 font-semibold text-slate-700 w-1/2">
                                  {spec.parameter}
                                </td>
                                <td className="py-2.5 px-4 font-mono font-medium text-slate-900 w-1/2">
                                  {spec.value}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-400">
                        No technical specifications configured for this model.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-mono">
                Model: <strong>{selectedProductForPreview.modelCode}</strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedProductForPreview(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUOTATION PDF PREVIEW MODAL (WITH COMPANY MASTER & PRODUCTS)              */}
      {/* ========================================================================= */}
      {isPdfPreviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 overflow-y-auto"
          onClick={() => setIsPdfPreviewOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-orange-400" />
                <span className="font-bold text-sm tracking-tight">
                  Quotation PDF Layout Preview (Populated from Company Master)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold"
                >
                  Print / Save PDF
                </button>
                <button
                  onClick={() => setIsPdfPreviewOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Quotation Sheet Body */}
            <div className="p-8 space-y-6 bg-white font-sans text-slate-900 max-h-[80vh] overflow-y-auto">
              {/* Quotation Letterhead Header */}
              <div className="flex items-start justify-between pb-6 border-b-2 border-slate-900">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center p-2">
                    <img src="/branding/mh_icon.png" alt="Machine House Logo" className="object-contain" />
                  </div>
                  <div>
                    <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none uppercase">
                      {masters.companyBillingInfo?.companyName || 'Machine House - Winding Technologies'}
                    </h1>
                    <div className="text-xs font-bold text-orange-600 uppercase tracking-widest mt-1">
                      {masters.companyBillingInfo?.tagline || 'House of Innovations.....'}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-md leading-snug">
                      {masters.companyBillingInfo?.worksAddress}
                    </p>
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-600 space-y-0.5 font-mono">
                  <div><strong>Phone:</strong> {masters.companyBillingInfo?.phone}</div>
                  <div><strong>Email:</strong> {masters.companyBillingInfo?.email}</div>
                  <div><strong>GSTIN:</strong> {masters.companyBillingInfo?.gstin}</div>
                  <div><strong>PAN:</strong> {masters.companyBillingInfo?.pan}</div>
                </div>
              </div>

              {/* Document Title Banner */}
              <div className="flex items-center justify-between bg-slate-100 p-3 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Document Type</span>
                  <span className="text-base font-extrabold text-slate-900">COMMERCIAL &amp; TECHNICAL QUOTATION</span>
                </div>
                <div className="text-right font-mono text-xs">
                  <div><strong>Quote Ref:</strong> QT-2026-SPECIMEN</div>
                  <div><strong>Date:</strong> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
              </div>

              {/* Sample Quotation Items Table */}
              <div className="space-y-2">
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-[10px] text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3">Item #</th>
                      <th className="py-2.5 px-3">Machine Model &amp; Technical Specifications</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price (INR)</th>
                      <th className="py-2.5 px-3 text-right">Total (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {masters.machines?.length > 0 ? (
                      masters.machines.slice(0, 2).map((m: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-3 px-3 font-mono font-bold text-slate-500">{idx + 1}</td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{m.modelName}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Wire Range: {m.wireRange || '—'} • Spindle: {m.maxRpm || '—'} RPM • {m.controllerType || 'Standard'}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold">1</td>
                          <td className="py-3 px-3 text-right font-mono font-bold">₹{Number(m.basePriceINR || 0).toLocaleString('en-IN')}</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-orange-600">₹{Number(m.basePriceINR || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-xs text-slate-400 italic">
                          No machine models currently registered in catalog.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Banking & Remittance Details */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <h4 className="font-extrabold text-slate-900 uppercase text-[11px] mb-1">
                    Bank Account Details for Wire Transfer / Advance
                  </h4>
                  <div className="space-y-0.5 text-slate-600">
                    <div><strong>Bank:</strong> {masters.companyBillingInfo?.bankName} ({masters.companyBillingInfo?.bankBranch})</div>
                    <div><strong>A/C No:</strong> <span className="font-mono font-bold">{masters.companyBillingInfo?.accountNumber}</span></div>
                    <div><strong>IFSC Code:</strong> <span className="font-mono font-bold">{masters.companyBillingInfo?.ifscCode}</span></div>
                    <div><strong>SWIFT:</strong> <span className="font-mono font-bold">{masters.companyBillingInfo?.swiftCode}</span></div>
                  </div>
                </div>

                <div className="text-right flex flex-col justify-end items-end">
                  <div className="text-xs font-bold text-slate-700">{masters.companyBillingInfo?.authorizedSignatory}</div>
                  <div className="text-[10px] text-slate-400 mt-4">Authorized Signature &amp; Digital Seal</div>
                </div>
              </div>

              {/* Standard Terms */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <span className="font-extrabold text-slate-900 uppercase text-[10px] block">Standard Terms &amp; Conditions</span>
                <p className="whitespace-pre-line leading-relaxed">{masters.companyBillingInfo?.standardTerms}</p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Product Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(productToDelete)}
        title={productToDelete ? `Delete Product "${productToDelete.product.modelCode}"?` : 'Delete Product?'}
        message={
          productToDelete
            ? `Are you sure you want to delete ${productToDelete.product.modelName}? Once deleted, this machine model will be permanently removed from your CRM product catalog.`
            : ''
        }
        confirmText="Yes, Delete Product"
        cancelText="Keep Product"
        variant="danger"
        isLoading={isDeletingProduct}
        onConfirm={confirmDeleteProduct}
        onClose={() => setProductToDelete(null)}
      />

      {/* Delete All Products Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteAllOpen}
        title="Clear All Products from Catalog?"
        message={`Are you sure you want to permanently delete ALL ${masters.machines.length} products? This action cannot be undone and will empty your CRM product catalog.`}
        confirmText="Yes, Clear All Products"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeletingAll}
        onConfirm={confirmDeleteAllProducts}
        onClose={() => setIsDeleteAllOpen(false)}
      />
    </div>
  );
}
