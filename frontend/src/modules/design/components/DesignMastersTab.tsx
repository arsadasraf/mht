'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as XLSX from 'xlsx';
import RmBoBulkImportModal from './RmBoBulkImportModal';
import FgBulkImportModal from './FgBulkImportModal';
import {
  Layers,
  Package,
  Boxes,
  Tag,
  Settings,
  Users,
  Search,
  Plus,
  ShieldCheck,
  UserCheck,
  Phone,
  Mail,
  MapPin,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Lock,
  Save,
  RotateCcw,
  Edit2,
  Trash2,
  ChevronDown,
  X,
  Filter,
  Check,
  Eye,
  Image as ImageIcon,
  FileText,
  Download,
  ExternalLink,
  Upload,
  ZoomIn,
  GitBranch,
  Copy,
  Info,
  ChevronRight,
  FileSpreadsheet,
  ArrowUp,
  Workflow
} from 'lucide-react';
import {
  useGetDesignMastersQuery,
  useGetDesignTeamUsersQuery,
  useGetDesignCategoriesQuery,
  useCreateDesignCategoryMutation,
  useUpdateDesignCategoryMutation,
  useDeleteDesignCategoryMutation,
  useUpdateDesignMasterConfigMutation,
  useGetRmItemsQuery,
  useCreateRmItemMutation,
  useUpdateRmItemMutation,
  useDeleteRmItemMutation,
  useLazyGetRmWhereUsedQuery,
  useGetFgItemsQuery,
  useCreateFgItemMutation,
  useUpdateFgItemMutation,
  useCreateFgRevisionMutation,
  useDeleteFgItemMutation,
  useLazyGetFgWhereUsedQuery,
  useUploadDirectToS3Mutation
} from '../api/designApi';
import {
  useGetSubStageMastersQuery,
  useCreateSubStageMasterMutation,
  useUpdateSubStageMasterMutation,
  useDeleteSubStageMasterMutation
} from '../../project-setup/api/projectApi';
import ExcelColumnFilter, { DistinctValueItem } from '../../../components/ui/ExcelColumnFilter';

export type DesignMasterSubTab = 'rm-bo' | 'fg' | 'categories' | 'sub-stages' | 'prefix-policy' | 'team';

interface DesignMastersTabProps {
  initialSubTab?: DesignMasterSubTab;
}

export default function DesignMastersTab({ initialSubTab = 'rm-bo' }: DesignMastersTabProps) {
  const pathname = usePathname();

  // Determine active sub-tab from URL pathname or initial prop
  const currentSubTab: DesignMasterSubTab = useMemo(() => {
    if (pathname?.includes('/design/masters/team')) return 'team';
    if (pathname?.includes('/design/masters/prefix-policy')) return 'prefix-policy';
    if (pathname?.includes('/design/masters/sub-stages')) return 'sub-stages';
    if (pathname?.includes('/design/masters/categories') || pathname?.includes('/design/masters/category')) return 'categories';
    if (pathname?.includes('/design/masters/fg')) return 'fg';
    if (pathname?.includes('/design/masters/rm-bo')) return 'rm-bo';
    return initialSubTab;
  }, [pathname, initialSubTab]);

  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Fetch RM & BO Items from dedicated rm_item_masters API (also available when on FG for BOM selection)
  const {
    data: rmData,
    isLoading: isRmLoading,
    refetch: refetchRm
  } = useGetRmItemsQuery(undefined, { skip: currentSubTab !== 'rm-bo' && currentSubTab !== 'fg' });

  // 1.1 Fetch FG Items from dedicated fg_item_masters API
  const {
    data: fgData,
    isLoading: isFgLoading,
    refetch: refetchFg
  } = useGetFgItemsQuery(undefined, { skip: currentSubTab !== 'fg' });

  const fgItems = fgData?.items || [];
  const [createFgItem, { isLoading: isCreatingFg }] = useCreateFgItemMutation();
  const [updateFgItem, { isLoading: isUpdatingFg }] = useUpdateFgItemMutation();
  const [createFgRevision, { isLoading: isCreatingFgRevision }] = useCreateFgRevisionMutation();
  const [deleteFgItem] = useDeleteFgItemMutation();

  // Dedicated FG In-Line Search Bar State
  const [fgSearch, setFgSearch] = useState('');

  // FG Column-Based Excel Filter States
  const [fgExcelFilters, setFgExcelFilters] = useState<{
    classification: string[] | null;
    name: string[] | null;
    revision: string[] | null;
    category: string[] | null;
    uom: string[] | null;
    hsnCode: string[] | null;
    status: string[] | null;
  }>({
    classification: null,
    name: null,
    revision: null,
    category: null,
    uom: null,
    hsnCode: null,
    status: null
  });

  // FG Table Sorting
  const [fgSortField, setFgSortField] = useState<string>('name');
  const [fgSortDirection, setFgSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleFgSortChange = (field: string, direction: 'asc' | 'desc') => {
    setFgSortField(field);
    setFgSortDirection(direction);
  };

  // FG Modal State
  const [fgModal, setFgModal] = useState<{
    isOpen: boolean;
    mode: 'CREATE' | 'EDIT' | 'REVISION';
    item?: any;
  } | null>(null);

  // FG Preview Dossier State
  const [previewFgItem, setPreviewFgItem] = useState<any | null>(null);
  const [activeFgPreviewTab, setActiveFgPreviewTab] = useState<'details' | 'bom'>('details');
  const [showBomCostingSection, setShowBomCostingSection] = useState(false);
  const [fgCostingMode, setFgCostingMode] = useState<'L2' | 'EXPLODED_RM_BO'>('L2');
  const [fgBomViewMode, setFgBomViewMode] = useState<'consolidated' | 'tree'>('consolidated');
  const [fgBomSearch, setFgBomSearch] = useState('');
  const [fgBomCategoryFilter, setFgBomCategoryFilter] = useState<'ALL' | 'RM_BO' | 'COMPONENT' | 'SUB_ASSEMBLY'>('ALL');
  const [fgBomPricingFilter, setFgBomPricingFilter] = useState<'ALL' | 'PRICED' | 'MISSING'>('ALL');
  const [expandedTreeNodes, setExpandedTreeNodes] = useState<Record<string, boolean>>({});
  const [quickRateModal, setQuickRateModal] = useState<{
    isOpen: boolean;
    item?: any;
    name: string;
    uom: string;
    rate: number;
  } | null>(null);

  // FG Form State
  const [fgForm, setFgForm] = useState({
    name: '',
    classification: 'COMPONENT' as 'COMPONENT' | 'SUB_ASSEMBLY' | 'ASSEMBLY',
    categoryCode: '',
    categoryName: '',
    revision: 'Rev 1.0',
    description: '',
    uom: 'NOS',
    hsnCode: '8479',
    photos: [] as string[],
    photoUrl: '',
    pdfUrl: '',
    pdfName: '',
    bomItems: [] as Array<{
      itemType: 'RM-BO' | 'FG';
      itemId?: string;
      itemName: string;
      quantity: number;
      uom: string;
      description?: string;
    }>
  });

  // Local Media Upload States for FG
  const [fgSelectedPhotoFiles, setFgSelectedPhotoFiles] = useState<File[]>([]);
  const [fgPhotoPreviews, setFgPhotoPreviews] = useState<string[]>([]);
  const [fgSelectedPdfFile, setFgSelectedPdfFile] = useState<File | null>(null);
  const [fgPdfPreviewName, setFgPdfPreviewName] = useState<string>('');
  const [fgFormError, setFgFormError] = useState('');
  const [isUploadingFgMedia, setIsUploadingFgMedia] = useState(false);

  // Dedicated RM In-Line Search Bar State
  const [rmSearch, setRmSearch] = useState('');

  // RM Column-Based Excel Filter States (null = all values allowed)
  const [rmExcelFilters, setRmExcelFilters] = useState<{
    name: string[] | null;
    make: string[] | null;
    category: string[] | null;
    uom: string[] | null;
    hsnCode: string[] | null;
    status: string[] | null;
  }>({
    name: null,
    make: null,
    category: null,
    uom: null,
    hsnCode: null,
    status: null
  });

  // RM Table Sorting
  const [rmSortField, setRmSortField] = useState<string>('name');
  const [rmSortDirection, setRmSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleRmSortChange = (field: string, direction: 'asc' | 'desc') => {
    setRmSortField(field);
    setRmSortDirection(direction);
  };

  const [createRmItem, { isLoading: isCreatingRm }] = useCreateRmItemMutation();
  const [updateRmItem, { isLoading: isUpdatingRm }] = useUpdateRmItemMutation();
  const [deleteRmItem] = useDeleteRmItemMutation();
  const [uploadDirectToS3] = useUploadDirectToS3Mutation();
  const [fetchRmWhereUsed, { data: rmWhereUsedData, isFetching: isRmWhereUsedFetching }] = useLazyGetRmWhereUsedQuery();
  const [fetchFgWhereUsed, { data: fgWhereUsedData, isFetching: isFgWhereUsedFetching }] = useLazyGetFgWhereUsedQuery();

  // RM Creation & Edit Modal State
  const [rmModal, setRmModal] = useState<{
    isOpen: boolean;
    mode: 'CREATE' | 'EDIT';
    item?: any;
  } | null>(null);

  // RM Preview Dossier Modal State
  const [previewRmItem, setPreviewRmItem] = useState<any | null>(null);

  useEffect(() => {
    if (previewRmItem?.id) {
      fetchRmWhereUsed(previewRmItem.id);
    }
  }, [previewRmItem?.id, fetchRmWhereUsed]);

  useEffect(() => {
    if (previewFgItem?.id) {
      fetchFgWhereUsed(previewFgItem.id);
    }
  }, [previewFgItem?.id, fetchFgWhereUsed]);

  // Fullscreen Photo Viewer Modal State
  const [photoViewerModal, setPhotoViewerModal] = useState<{
    isOpen: boolean;
    url: string;
    title: string;
  } | null>(null);

  const [rmForm, setRmForm] = useState({
    name: '',
    description: '',
    make: '',
    categoryCode: '',
    categoryName: '',
    uom: 'Nos',
    hsnCode: '8483',
    standardRateINR: 0,
    photos: [] as string[],
    photoUrl: '',
    pdfUrl: '',
    pdfName: ''
  });

  // Local File Upload States
  const [selectedPhotoFiles, setSelectedPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [pdfPreviewName, setPdfPreviewName] = useState<string>('');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const [categorySearchKeyword, setCategorySearchKeyword] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [rmFormError, setRmFormError] = useState('');

  // 2. Fetch Design Master Items for Finished Goods (FG)
  const { data: mastersData, isLoading: isMastersLoading, refetch: refetchMasters } = useGetDesignMastersQuery(
    { itemType: 'FG' },
    { skip: currentSubTab !== 'fg' }
  );

  // 3. Fetch Design Categories (Always available for selection in RM/FG modal & categories sub-tab)
  const {
    data: categoriesData,
    isLoading: isCategoriesLoading,
    refetch: refetchCategories
  } = useGetDesignCategoriesQuery(currentSubTab === 'categories' ? { includeInactive: true } : undefined);

  const [createCategory, { isLoading: isCreatingCategory }] = useCreateDesignCategoryMutation();
  const [updateCategory, { isLoading: isUpdatingCategory }] = useUpdateDesignCategoryMutation();
  const [deleteCategory] = useDeleteDesignCategoryMutation();

  // Dedicated Category In-Line Search Bar State
  const [categorySearch, setCategorySearch] = useState('');

  // Category Column-Based Excel Filter States
  const [categoryExcelFilters, setCategoryExcelFilters] = useState<{
    name: string[] | null;
    status: string[] | null;
  }>({
    name: null,
    status: null
  });

  // Category Table Sorting
  const [categorySortField, setCategorySortField] = useState<string>('name');
  const [categorySortDirection, setCategorySortDirection] = useState<'asc' | 'desc'>('asc');

  const handleCategorySortChange = (field: string, direction: 'asc' | 'desc') => {
    setCategorySortField(field);
    setCategorySortDirection(direction);
  };

  // Category Creation & Edit Modal State
  const [categoryModal, setCategoryModal] = useState<{
    isOpen: boolean;
    mode: 'CREATE' | 'EDIT';
    item?: any;
  } | null>(null);

  // Category Preview Dossier Modal State
  const [previewCategory, setPreviewCategory] = useState<any | null>(null);

  // Category Form State (Simplified: Name + Description only)
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    isActive: true
  });
  const [categoryFormError, setCategoryFormError] = useState('');

  // 3b. Fetch Project Sub-Stage Masters (Conditionally loaded for 'sub-stages' sub-tab)
  const {
    data: subStagesData,
    isLoading: isSubStagesLoading,
    refetch: refetchSubStages
  } = useGetSubStageMastersQuery(
    currentSubTab === 'sub-stages'
      ? { departmentModule: 'design' }
      : undefined,
    { skip: currentSubTab !== 'sub-stages' }
  );

  const [createSubStage, { isLoading: isCreatingSubStage }] = useCreateSubStageMasterMutation();
  const [updateSubStage, { isLoading: isUpdatingSubStage }] = useUpdateSubStageMasterMutation();
  const [deleteSubStage] = useDeleteSubStageMasterMutation();

  // Dedicated Sub-Stage In-Line Search Bar State
  const [subStageSearch, setSubStageSearch] = useState('');

  // Sub-Stage Column-Based Excel Filter States
  const [subStageExcelFilters, setSubStageExcelFilters] = useState<{
    name: string[] | null;
    status: string[] | null;
  }>({
    name: null,
    status: null
  });

  // Sub-Stage Table Sorting
  const [subStageSortField, setSubStageSortField] = useState<string>('name');
  const [subStageSortDirection, setSubStageSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSubStageSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSubStageSortField(field);
    setSubStageSortDirection(direction);
  };

  // Sub-Stage Creation & Edit Modal State
  const [subStageModal, setSubStageModal] = useState<{
    isOpen: boolean;
    mode: 'CREATE' | 'EDIT';
    item?: any;
  } | null>(null);

  // Sub-Stage Preview Dossier Modal State
  const [previewSubStage, setPreviewSubStage] = useState<any | null>(null);

  // Sub-Stage Form State (Simplified: Name + Description only)
  const [subStageForm, setSubStageForm] = useState({
    name: '',
    description: '',
    isActive: true
  });
  const [subStageFormError, setSubStageFormError] = useState('');

  // 4. Fetch Design Team Users conditionally
  const { data: teamData, isLoading: isTeamLoading } = useGetDesignTeamUsersQuery(undefined, {
    skip: currentSubTab !== 'team'
  });

  // 5. Policy Mutation
  const [updateDesignConfig, { isLoading: isSavingPolicy }] = useUpdateDesignMasterConfigMutation();

  const rmItems = rmData?.items || [];
  const boAndFgItems = mastersData?.items || [];
  const categories = categoriesData?.categories || [];
  const subStages = subStagesData?.subStages || [];
  const teamUsers = teamData?.users || [];
  const backendPolicy = mastersData?.prefixLockPolicy;

  // Filtered categories for searchable dropdown inside modal
  const filteredModalCategories = useMemo(() => {
    if (!categorySearchKeyword.trim()) return categories;
    const q = categorySearchKeyword.toLowerCase();
    return categories.filter(
      (c: any) =>
        c.name?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
    );
  }, [categories, categorySearchKeyword]);

  // Prefix & Lock Policy local edit state
  const [policyForm, setPolicyForm] = useState({
    rmPrefix: 'RM',
    boPrefix: 'BO',
    componentPrefix: 'CMP',
    subAssemblyPrefix: 'SUB',
    assemblyPrefix: 'ASM',
    bomPrefix: 'BOM',
    ecoPrefix: 'ECO',
    lockBomOnFreeze: true,
    autoSendNetDemandToPurchase: true
  });

  useEffect(() => {
    if (backendPolicy) {
      setPolicyForm({
        rmPrefix: backendPolicy.rmPrefix || 'RM',
        boPrefix: backendPolicy.boPrefix || 'BO',
        componentPrefix: backendPolicy.componentPrefix || 'CMP',
        subAssemblyPrefix: backendPolicy.subAssemblyPrefix || 'SUB',
        assemblyPrefix: backendPolicy.assemblyPrefix || 'ASM',
        bomPrefix: backendPolicy.bomPrefix || 'BOM',
        ecoPrefix: backendPolicy.ecoPrefix || 'ECO',
        lockBomOnFreeze: backendPolicy.lockBomOnFreeze !== false,
        autoSendNetDemandToPurchase: backendPolicy.autoSendNetDemandToPurchase !== false
      });
    }
  }, [backendPolicy]);

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateDesignConfig({ prefixLockPolicy: policyForm }).unwrap();
      refetchMasters();
      showToast('All set! Design prefixes and automated lock policy saved.', 'success');
    } catch (err: any) {
      showToast(err?.data?.message || 'Could not save design policy right now.', 'error');
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Open Create RM Modal
  const handleOpenCreateRm = () => {
    const defaultCat = categories[0] || {
      name: 'Raw Material - Steel & Alloys'
    };

    setRmForm({
      name: '',
      description: '',
      make: '',
      categoryCode: defaultCat.name,
      categoryName: defaultCat.name,
      uom: 'Nos',
      hsnCode: '7228',
      standardRateINR: 0,
      photos: [],
      photoUrl: '',
      pdfUrl: '',
      pdfName: ''
    });
    setSelectedPhotoFiles([]);
    setPhotoPreviews([]);
    setSelectedPdfFile(null);
    setPdfPreviewName('');
    setCategorySearchKeyword('');
    setIsCategoryDropdownOpen(false);
    setRmFormError('');
    setRmModal({ isOpen: true, mode: 'CREATE' });
  };

  // Open Edit RM Modal
  const handleOpenEditRm = (it: any) => {
    const initialPhotos = Array.isArray(it.photos) ? it.photos : (it.photoUrl ? [it.photoUrl] : []);
    setRmForm({
      name: it.name || '',
      description: it.description || '',
      make: it.make || '',
      categoryCode: it.categoryCode || '',
      categoryName: it.categoryName || '',
      uom: it.uom || 'Nos',
      hsnCode: it.hsnCode || '8483',
      standardRateINR: Number(it.standardRateINR || 0),
      photos: initialPhotos,
      photoUrl: it.photoUrl || (initialPhotos.length > 0 ? initialPhotos[0] : ''),
      pdfUrl: it.pdfUrl || '',
      pdfName: it.pdfName || ''
    });
    setSelectedPhotoFiles([]);
    setPhotoPreviews([]);
    setSelectedPdfFile(null);
    setPdfPreviewName(it.pdfName || '');
    setCategorySearchKeyword('');
    setIsCategoryDropdownOpen(false);
    setRmFormError('');
    setRmModal({ isOpen: true, mode: 'EDIT', item: it });
  };

  // Submit RM & BO Form
  const handleSaveRm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rmForm.name.trim()) {
      setRmFormError('Item Name is compulsory.');
      return;
    }

    setIsUploadingMedia(true);
    setRmFormError('');

    try {
      const itemSlug = (rmForm.name || 'item')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'item';

      // 1. Upload any newly selected Photos into S3 subfolder design/items/photos/{itemSlug}/
      let uploadedPhotoUrls = [...rmForm.photos];
      for (const pFile of selectedPhotoFiles) {
        try {
          const base64 = await fileToBase64(pFile);
          const cleanName = pFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const key = `design/items/photos/${itemSlug}/${Date.now()}_${cleanName}`;
          const uploadRes = await uploadDirectToS3({
            key,
            contentType: pFile.type || 'image/jpeg',
            base64Data: base64
          }).unwrap();
          if (uploadRes?.url) {
            uploadedPhotoUrls.push(uploadRes.url);
          } else {
            uploadedPhotoUrls.push(base64);
          }
        } catch (uploadErr) {
          console.warn('S3 photo upload fallback to base64', uploadErr);
          const base64 = await fileToBase64(pFile);
          uploadedPhotoUrls.push(base64);
        }
      }

      // 2. Upload any newly selected PDF into S3 subfolder design/items/documents/{itemSlug}/
      let finalPdfUrl = rmForm.pdfUrl;
      let finalPdfName = rmForm.pdfName;
      if (selectedPdfFile) {
        try {
          const base64 = await fileToBase64(selectedPdfFile);
          const cleanName = selectedPdfFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const key = `design/items/documents/${itemSlug}/${Date.now()}_${cleanName}`;
          const uploadRes = await uploadDirectToS3({
            key,
            contentType: selectedPdfFile.type || 'application/pdf',
            base64Data: base64
          }).unwrap();
          finalPdfUrl = uploadRes?.url || base64;
          finalPdfName = selectedPdfFile.name;
        } catch (uploadErr) {
          console.warn('S3 PDF upload fallback to base64', uploadErr);
          const base64 = await fileToBase64(selectedPdfFile);
          finalPdfUrl = base64;
          finalPdfName = selectedPdfFile.name;
        }
      }

      const payload = {
        name: rmForm.name.trim(),
        description: rmForm.description.trim(),
        make: rmForm.make.trim(),
        categoryCode: rmForm.categoryCode,
        categoryName: rmForm.categoryName,
        uom: rmForm.uom,
        hsnCode: rmForm.hsnCode,
        standardRateINR: Number(rmForm.standardRateINR || 0),
        photos: uploadedPhotoUrls,
        photoUrl: uploadedPhotoUrls[0] || null,
        pdfUrl: finalPdfUrl || null,
        pdfName: finalPdfName || null
      };

      if (rmModal?.mode === 'CREATE') {
        const res: any = await createRmItem(payload).unwrap();
        showToast(res?.message || 'All set! Item created successfully.', 'success');
      } else {
        const res: any = await updateRmItem({
          id: rmModal?.item?.id || rmModal?.item?._id,
          ...payload
        }).unwrap();
        showToast(res?.message || 'All set! Changes updated.', 'success');
      }
      setRmModal(null);
      refetchRm();
    } catch (err: any) {
      setRmFormError(err?.data?.message || err?.message || 'We could not save this item right now.');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setSelectedPhotoFiles((prev) => [...prev, ...filesArray]);
      const newPreviews = filesArray.map((file) => URL.createObjectURL(file));
      setPhotoPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const handleRemoveExistingPhoto = (index: number) => {
    setRmForm((prev) => {
      const updatedPhotos = prev.photos.filter((_, i) => i !== index);
      return {
        ...prev,
        photos: updatedPhotos,
        photoUrl: updatedPhotos[0] || ''
      };
    });
  };

  const handleRemoveNewPhoto = (index: number) => {
    setSelectedPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => {
      if (prev[index]) {
        try {
          URL.revokeObjectURL(prev[index]);
        } catch {
          // ignore
        }
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedPdfFile(file);
      setPdfPreviewName(file.name);
    }
  };

  const handleRemovePdf = () => {
    setSelectedPdfFile(null);
    setPdfPreviewName('');
    setRmForm((prev) => ({
      ...prev,
      pdfUrl: '',
      pdfName: ''
    }));
  };

  // Delete or Deactivate RM Item (3-Scenario Policy)
  const handleToggleRmActive = async (it: any) => {
    try {
      const res: any = await deleteRmItem(it.id || it._id).unwrap();
      if (res?.isDeleted) {
        showToast(res.message, 'success');
      } else if (res?.isDeactivated) {
        showToast(res.message, 'info');
      } else {
        showToast(res?.message || 'Updated status.', 'success');
      }
      refetchRm();
    } catch (err: any) {
      showToast(err?.data?.message || 'Could not delete or deactivate item.', 'error');
    }
  };

  // Distinct RM values for Excel column filter popovers
  const distinctRmNames = useMemo<DistinctValueItem[]>(() => {
    const map = new Map<string, number>();
    rmItems.forEach((it: any) => {
      const val = it.name?.trim() || 'N/A';
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [rmItems]);

  const distinctRmMakes = useMemo<DistinctValueItem[]>(() => {
    const map = new Map<string, number>();
    rmItems.forEach((it: any) => {
      const val = it.make?.trim() || 'Unspecified';
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [rmItems]);

  const distinctRmCategories = useMemo<DistinctValueItem[]>(() => {
    const map = new Map<string, number>();
    rmItems.forEach((it: any) => {
      const val = it.categoryName || it.categoryCode || 'General RM';
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [rmItems]);

  const distinctRmUoms = useMemo<DistinctValueItem[]>(() => {
    const map = new Map<string, number>();
    rmItems.forEach((it: any) => {
      const val = it.uom || 'Kg';
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [rmItems]);

  const distinctRmHsns = useMemo<DistinctValueItem[]>(() => {
    const map = new Map<string, number>();
    rmItems.forEach((it: any) => {
      const val = it.hsnCode || 'N/A';
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [rmItems]);

  const distinctRmStatuses = useMemo<DistinctValueItem[]>(() => {
    const map = new Map<string, number>();
    rmItems.forEach((it: any) => {
      const val = it.isActive ? 'Active' : 'Inactive';
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [rmItems]);

  // Filtered and Sorted RM Items
  const filteredAndSortedRmItems = useMemo(() => {
    let result = [...rmItems];

    // Left Dedicated Search Bar
    if (rmSearch.trim()) {
      const q = rmSearch.toLowerCase().trim();
      result = result.filter(
        (it: any) =>
          it.name?.toLowerCase().includes(q) ||
          it.make?.toLowerCase().includes(q) ||
          it.description?.toLowerCase().includes(q) ||
          it.categoryName?.toLowerCase().includes(q) ||
          it.categoryCode?.toLowerCase().includes(q) ||
          it.hsnCode?.toLowerCase().includes(q) ||
          it.uom?.toLowerCase().includes(q)
      );
    }

    // Column Filters
    if (rmExcelFilters.name !== null) {
      const set = new Set(rmExcelFilters.name);
      result = result.filter((it: any) => set.has(it.name?.trim() || 'N/A'));
    }
    if (rmExcelFilters.make !== null) {
      const set = new Set(rmExcelFilters.make);
      result = result.filter((it: any) => set.has(it.make?.trim() || 'Unspecified'));
    }
    if (rmExcelFilters.category !== null) {
      const set = new Set(rmExcelFilters.category);
      result = result.filter((it: any) => set.has(it.categoryName || it.categoryCode || 'General RM'));
    }
    if (rmExcelFilters.uom !== null) {
      const set = new Set(rmExcelFilters.uom);
      result = result.filter((it: any) => set.has(it.uom || 'Kg'));
    }
    if (rmExcelFilters.hsnCode !== null) {
      const set = new Set(rmExcelFilters.hsnCode);
      result = result.filter((it: any) => set.has(it.hsnCode || 'N/A'));
    }
    if (rmExcelFilters.status !== null) {
      const set = new Set(rmExcelFilters.status);
      result = result.filter((it: any) => set.has(it.isActive ? 'Active' : 'Inactive'));
    }

    // Sort
    if (rmSortField) {
      result.sort((a: any, b: any) => {
        let valA = a[rmSortField] ?? '';
        let valB = b[rmSortField] ?? '';

        if (rmSortField === 'standardRateINR') {
          return rmSortDirection === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
        }

        if (rmSortField === 'categoryName') {
          valA = a.categoryName || a.categoryCode || '';
          valB = b.categoryName || b.categoryCode || '';
        }

        if (rmSortField === 'status') {
          valA = a.isActive ? 'Active' : 'Inactive';
          valB = b.isActive ? 'Active' : 'Inactive';
        }

        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = String(valB ?? '').toLowerCase();
        }

        if (valA < valB) return rmSortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return rmSortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [rmItems, rmSearch, rmExcelFilters, rmSortField, rmSortDirection]);

  // Is any filter or search active for RM table?
  const hasActiveRmFilters = useMemo(() => {
    return (
      Boolean(rmSearch.trim()) ||
      rmExcelFilters.name !== null ||
      rmExcelFilters.make !== null ||
      rmExcelFilters.category !== null ||
      rmExcelFilters.uom !== null ||
      rmExcelFilters.hsnCode !== null ||
      rmExcelFilters.status !== null
    );
  }, [rmSearch, rmExcelFilters]);

  // Reset all RM filters and search
  const handleResetRmFilters = () => {
    setRmSearch('');
    setRmExcelFilters({
      name: null,
      make: null,
      category: null,
      uom: null,
      hsnCode: null,
      status: null
    });
    setRmSortField('name');
    setRmSortDirection('asc');
  };

  // Distinct FG values for Excel column filters
  const distinctFgClassifications = useMemo<DistinctValueItem[]>(() => {
    const map = new Map<string, number>();
    fgItems.forEach((it: any) => {
      const val = it.classification || 'COMPONENT';
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [fgItems]);

  const distinctFgNames = useMemo<DistinctValueItem[]>(() => {
    const map = new Map<string, number>();
    fgItems.forEach((it: any) => {
      const val = it.name?.trim() || 'N/A';
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [fgItems]);

  const distinctFgRevisions = useMemo<DistinctValueItem[]>(() => {
    const map = new Map<string, number>();
    fgItems.forEach((it: any) => {
      const val = it.revision?.trim() || 'Rev 1.0';
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [fgItems]);

  const distinctFgCategories = useMemo<DistinctValueItem[]>(() => {
    const map = new Map<string, number>();
    fgItems.forEach((it: any) => {
      const val = it.categoryName?.trim() || it.categoryCode?.trim() || 'Unassigned';
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [fgItems]);

  const distinctFgUoms = useMemo<DistinctValueItem[]>(() => {
    const map = new Map<string, number>();
    fgItems.forEach((it: any) => {
      const val = it.uom?.trim() || 'NOS';
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [fgItems]);

  const distinctFgHsns = useMemo<DistinctValueItem[]>(() => {
    const map = new Map<string, number>();
    fgItems.forEach((it: any) => {
      const val = it.hsnCode?.trim() || 'N/A';
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [fgItems]);

  const distinctFgStatuses = useMemo<DistinctValueItem[]>(() => {
    let activeCount = 0;
    let inactiveCount = 0;
    fgItems.forEach((it: any) => {
      if (it.isActive) activeCount++;
      else inactiveCount++;
    });
    const result: DistinctValueItem[] = [];
    if (activeCount > 0) result.push({ value: 'Active', count: activeCount });
    if (inactiveCount > 0) result.push({ value: 'Inactive', count: inactiveCount });
    return result;
  }, [fgItems]);

  // Filtered and Sorted FG Items
  const filteredAndSortedFgItems = useMemo(() => {
    let result = [...fgItems];

    if (fgSearch.trim()) {
      const q = fgSearch.toLowerCase().trim();
      result = result.filter(
        (it: any) =>
          it.name?.toLowerCase().includes(q) ||
          it.description?.toLowerCase().includes(q) ||
          it.categoryName?.toLowerCase().includes(q) ||
          it.revision?.toLowerCase().includes(q) ||
          it.classification?.toLowerCase().includes(q) ||
          it.hsnCode?.toLowerCase().includes(q)
      );
    }

    if (fgExcelFilters.classification && fgExcelFilters.classification.length > 0) {
      result = result.filter((it: any) =>
        fgExcelFilters.classification!.includes(it.classification || 'COMPONENT')
      );
    }
    if (fgExcelFilters.name && fgExcelFilters.name.length > 0) {
      result = result.filter((it: any) => fgExcelFilters.name!.includes(it.name?.trim() || 'N/A'));
    }
    if (fgExcelFilters.revision && fgExcelFilters.revision.length > 0) {
      result = result.filter((it: any) => fgExcelFilters.revision!.includes(it.revision?.trim() || 'Rev 1.0'));
    }
    if (fgExcelFilters.category && fgExcelFilters.category.length > 0) {
      result = result.filter((it: any) =>
        fgExcelFilters.category!.includes(it.categoryName?.trim() || it.categoryCode?.trim() || 'Unassigned')
      );
    }
    if (fgExcelFilters.uom && fgExcelFilters.uom.length > 0) {
      result = result.filter((it: any) => fgExcelFilters.uom!.includes(it.uom?.trim() || 'NOS'));
    }
    if (fgExcelFilters.hsnCode && fgExcelFilters.hsnCode.length > 0) {
      result = result.filter((it: any) => fgExcelFilters.hsnCode!.includes(it.hsnCode?.trim() || 'N/A'));
    }
    if (fgExcelFilters.status && fgExcelFilters.status.length > 0) {
      result = result.filter((it: any) => {
        const itemStatus = it.isActive ? 'Active' : 'Inactive';
        return fgExcelFilters.status!.includes(itemStatus);
      });
    }

    result.sort((a: any, b: any) => {
      let valA: any = a[fgSortField];
      let valB: any = b[fgSortField];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (valA < valB) return fgSortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return fgSortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [fgItems, fgSearch, fgExcelFilters, fgSortField, fgSortDirection]);

  const hasActiveFgFilters = useMemo(() => {
    return (
      Boolean(fgSearch.trim()) ||
      fgExcelFilters.classification !== null ||
      fgExcelFilters.name !== null ||
      fgExcelFilters.revision !== null ||
      fgExcelFilters.category !== null ||
      fgExcelFilters.uom !== null ||
      fgExcelFilters.hsnCode !== null ||
      fgExcelFilters.status !== null
    );
  }, [fgSearch, fgExcelFilters]);

  const handleResetFgFilters = () => {
    setFgSearch('');
    setFgExcelFilters({
      classification: null,
      name: null,
      revision: null,
      category: null,
      uom: null,
      hsnCode: null,
      status: null
    });
    setFgSortField('name');
    setFgSortDirection('asc');
  };

  // Excel Actions Dropdowns and Bulk Import Modals
  const [isRmExcelMenuOpen, setIsRmExcelMenuOpen] = useState(false);
  const [isFgExcelMenuOpen, setIsFgExcelMenuOpen] = useState(false);
  const [isRmBulkImportOpen, setIsRmBulkImportOpen] = useState(false);
  const [isFgBulkImportOpen, setIsFgBulkImportOpen] = useState(false);
  const rmExcelMenuRef = useRef<HTMLDivElement>(null);
  const fgExcelMenuRef = useRef<HTMLDivElement>(null);

  // Click outside to close excel dropdown menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rmExcelMenuRef.current && !rmExcelMenuRef.current.contains(e.target as Node)) {
        setIsRmExcelMenuOpen(false);
      }
      if (fgExcelMenuRef.current && !fgExcelMenuRef.current.contains(e.target as Node)) {
        setIsFgExcelMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // RM Export & Template Handlers
  const handleExportRmExcel = () => {
    setIsRmExcelMenuOpen(false);
    const exportData = filteredAndSortedRmItems.map((it: any, idx: number) => ({
      '#': idx + 1,
      'Part Number / Item Name': it.name || '',
      'Revision': it.revision || 'Rev 1.0',
      'Description': it.description || '',
      'Make / Brand': it.make || '',
      'Category': it.categoryName || it.categoryCode || '',
      'UOM': it.uom || 'Nos',
      'HSN Code': it.hsnCode || '',
      'Standard Rate (INR)': it.standardRateINR || 0,
      'Status': it.isActive ? 'Active' : 'Deactivated'
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'RM_BO_Items');
    XLSX.writeFile(wb, `MH_RM_BO_Items_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadRmTemplate = () => {
    const headers = [
      'Part Number / Item Name *',
      'Revision',
      'Description',
      'Make / Brand',
      'Category',
      'UOM',
      'HSN Code',
      'Standard Rate (INR)'
    ];
    const sampleRows = [
      headers,
      [
        'EN8 Bright Round Bar 40mm',
        'Rev 1.0',
        'High carbon steel shafting material for winding arbor',
        'Tata Steel',
        'Raw Material - Steel',
        'Kg',
        '7228',
        85
      ],
      [
        'Deep Groove Ball Bearing 6205-2RS',
        'Rev 1.0',
        'Sealed radial bearing for high-speed flyer guide',
        'SKF',
        'Bought Out - Bearings',
        'Nos',
        '8482',
        340
      ]
    ];
    const ws = XLSX.utils.aoa_to_sheet(sampleRows);
    ws['!cols'] = [{ wch: 35 }, { wch: 12 }, { wch: 45 }, { wch: 20 }, { wch: 26 }, { wch: 10 }, { wch: 12 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'RM_BO_Items_Template');
    XLSX.writeFile(wb, 'MH_RM_BO_Items_Template.xlsx');
  };

  // FG Export & Template Handlers
  const handleExportFgExcel = () => {
    setIsFgExcelMenuOpen(false);
    const exportData = filteredAndSortedFgItems.map((it: any, idx: number) => ({
      '#': idx + 1,
      'Part Number / Item Name': it.name || '',
      'Revision': it.revision || 'Rev 1.0',
      'Classification': it.classification || 'COMPONENT',
      'Description': it.description || '',
      'Category': it.categoryName || it.categoryCode || '',
      'UOM': it.uom || 'Nos',
      'HSN Code': it.hsnCode || '',
      'Status': it.isActive ? 'Active' : 'Deactivated'
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'FG_Items');
    XLSX.writeFile(wb, `MH_FG_Items_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadFgTemplate = () => {
    const headers = [
      'Part Number / Item Name *',
      'Revision',
      'Classification *',
      'Description',
      'Category',
      'UOM',
      'HSN Code'
    ];
    const sampleRows = [
      headers,
      [
        'RRO420-01-02-00-01',
        'Rev 1.0',
        'COMPONENT',
        'Hardened precision flyer shaft for winding unit',
        'Flyer Components',
        'Nos',
        '8479'
      ],
      [
        'RRO420-01-02-00-00',
        'Rev 1.0',
        'SUB_ASSEMBLY',
        'Complete flyer spindle sub-assembly with bearings',
        'Spindle Assemblies',
        'Nos',
        '8479'
      ]
    ];
    const ws = XLSX.utils.aoa_to_sheet(sampleRows);
    ws['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 18 }, { wch: 45 }, { wch: 24 }, { wch: 10 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'FG_Items_Template');
    XLSX.writeFile(wb, 'MH_FG_Items_Template.xlsx');
  };

  // FG Photo & PDF Handlers
  const handleFgPhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setFgSelectedPhotoFiles((prev) => [...prev, ...filesArray]);
      const newPreviews = filesArray.map((file) => URL.createObjectURL(file));
      setFgPhotoPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const handleRemoveExistingFgPhoto = (index: number) => {
    setFgForm((prev) => {
      const updatedPhotos = prev.photos.filter((_, i) => i !== index);
      return {
        ...prev,
        photos: updatedPhotos,
        photoUrl: updatedPhotos[0] || ''
      };
    });
  };

  const handleRemoveNewFgPhoto = (index: number) => {
    setFgSelectedPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setFgPhotoPreviews((prev) => {
      if (prev[index]) {
        try {
          URL.revokeObjectURL(prev[index]);
        } catch {
          // ignore
        }
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleFgPdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFgSelectedPdfFile(file);
      setFgPdfPreviewName(file.name);
    }
  };

  const handleRemoveFgPdf = () => {
    setFgSelectedPdfFile(null);
    setFgPdfPreviewName('');
    setFgForm((prev) => ({
      ...prev,
      pdfUrl: '',
      pdfName: ''
    }));
  };

  // FG BOM Line Item Handlers
  const handleAddBomItem = () => {
    setFgForm((prev) => ({
      ...prev,
      bomItems: [
        ...prev.bomItems,
        {
          itemType: 'RM-BO',
          itemName: '',
          quantity: 1,
          uom: 'Nos',
          description: ''
        }
      ]
    }));
  };

  const handleRemoveBomItem = (index: number) => {
    setFgForm((prev) => ({
      ...prev,
      bomItems: prev.bomItems.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateBomItem = (
    index: number,
    updates: Partial<{
      itemType: 'RM-BO' | 'FG';
      itemId?: string;
      itemName: string;
      quantity: number;
      uom: string;
      description?: string;
    }>
  ) => {
    setFgForm((prev) => {
      const updated = [...prev.bomItems];
      updated[index] = { ...updated[index], ...updates };
      return { ...prev, bomItems: updated };
    });
  };

  // Open Create FG Modal
  const handleOpenCreateFg = () => {
    const defaultCat = categories[0] || {
      name: 'Machined Component - Headstock & Spindle'
    };

    setFgForm({
      name: '',
      classification: 'COMPONENT',
      categoryCode: defaultCat.name,
      categoryName: defaultCat.name,
      revision: 'Rev 1.0',
      description: '',
      uom: 'NOS',
      hsnCode: '8479',
      photos: [],
      photoUrl: '',
      pdfUrl: '',
      pdfName: '',
      bomItems: []
    });
    setFgSelectedPhotoFiles([]);
    setFgPhotoPreviews([]);
    setFgSelectedPdfFile(null);
    setFgPdfPreviewName('');
    setFgFormError('');
    setFgModal({ isOpen: true, mode: 'CREATE' });
  };

  // Open Edit FG Modal
  const handleOpenEditFg = (it: any) => {
    const initialPhotos = Array.isArray(it.photos) ? it.photos : (it.photoUrl ? [it.photoUrl] : []);
    const initialBom = Array.isArray(it.bomItems) ? it.bomItems : [];

    setFgForm({
      name: it.name || '',
      classification: it.classification || 'COMPONENT',
      categoryCode: it.categoryCode || '',
      categoryName: it.categoryName || '',
      revision: it.revision || 'Rev 1.0',
      description: it.description || '',
      uom: it.uom || 'NOS',
      hsnCode: it.hsnCode || '8479',
      photos: initialPhotos,
      photoUrl: it.photoUrl || (initialPhotos.length > 0 ? initialPhotos[0] : ''),
      pdfUrl: it.pdfUrl || '',
      pdfName: it.pdfName || '',
      bomItems: initialBom
    });
    setFgSelectedPhotoFiles([]);
    setFgPhotoPreviews([]);
    setFgSelectedPdfFile(null);
    setFgPdfPreviewName(it.pdfName || '');
    setFgFormError('');
    setFgModal({ isOpen: true, mode: 'EDIT', item: it });
  };

  // Open New Revision FG Modal
  const handleOpenRevisionFg = (it: any) => {
    const initialPhotos = Array.isArray(it.photos) ? it.photos : (it.photoUrl ? [it.photoUrl] : []);
    const initialBom = Array.isArray(it.bomItems) ? it.bomItems : [];

    // Calculate next suggested revision code e.g. Rev 1.0 -> Rev 2.0
    let nextRev = 'Rev 2.0';
    const match = (it.revision || '').match(/Rev\s*(\d+(\.\d+)?)/i);
    if (match) {
      const nextNum = (parseFloat(match[1]) + 1).toFixed(1);
      nextRev = `Rev ${nextNum}`;
    }

    setFgForm({
      name: it.name || '',
      classification: it.classification || 'COMPONENT',
      categoryCode: it.categoryCode || '',
      categoryName: it.categoryName || '',
      revision: nextRev,
      description: it.description || '',
      uom: it.uom || 'NOS',
      hsnCode: it.hsnCode || '8479',
      photos: initialPhotos,
      photoUrl: it.photoUrl || (initialPhotos.length > 0 ? initialPhotos[0] : ''),
      pdfUrl: it.pdfUrl || '',
      pdfName: it.pdfName || '',
      bomItems: initialBom
    });
    setFgSelectedPhotoFiles([]);
    setFgPhotoPreviews([]);
    setFgSelectedPdfFile(null);
    setFgPdfPreviewName(it.pdfName || '');
    setFgFormError('');
    setFgModal({ isOpen: true, mode: 'REVISION', item: it });
  };

  // Delete or Deactivate FG Item (3-Scenario Policy)
  const handleToggleFgActive = async (it: any) => {
    try {
      const res: any = await deleteFgItem(it.id || it._id).unwrap();
      if (res?.isDeleted) {
        showToast(res.message, 'success');
      } else if (res?.isDeactivated) {
        showToast(res.message, 'info');
      } else {
        showToast(res?.message || 'Updated status.', 'success');
      }
      refetchFg();
    } catch (err: any) {
      showToast(err?.data?.message || 'Could not delete or deactivate item.', 'error');
    }
  };

  // Submit FG Form
  const handleSaveFg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fgForm.name.trim()) {
      setFgFormError('Item Name is compulsory.');
      return;
    }
    if (!fgForm.revision.trim()) {
      setFgFormError('Revision code is compulsory.');
      return;
    }

    setIsUploadingFgMedia(true);
    setFgFormError('');

    try {
      const itemSlug = (fgForm.name || 'fg-item')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'fg-item';

      // 1. Upload any newly selected Photos into S3 subfolder design/fg/photos/{itemSlug}/
      let uploadedPhotoUrls = [...fgForm.photos];
      for (const pFile of fgSelectedPhotoFiles) {
        try {
          const base64 = await fileToBase64(pFile);
          const cleanName = pFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const key = `design/fg/photos/${itemSlug}/${Date.now()}_${cleanName}`;
          const uploadRes = await uploadDirectToS3({
            key,
            contentType: pFile.type || 'image/jpeg',
            base64Data: base64
          }).unwrap();
          if (uploadRes?.url) {
            uploadedPhotoUrls.push(uploadRes.url);
          } else {
            uploadedPhotoUrls.push(base64);
          }
        } catch (uploadErr) {
          console.warn('S3 FG photo upload fallback to base64', uploadErr);
          const base64 = await fileToBase64(pFile);
          uploadedPhotoUrls.push(base64);
        }
      }

      // 2. Upload any newly selected PDF into S3 subfolder design/fg/documents/{itemSlug}/
      let finalPdfUrl = fgForm.pdfUrl;
      let finalPdfName = fgForm.pdfName;
      if (fgSelectedPdfFile) {
        try {
          const base64 = await fileToBase64(fgSelectedPdfFile);
          const cleanName = fgSelectedPdfFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const key = `design/fg/documents/${itemSlug}/${Date.now()}_${cleanName}`;
          const uploadRes = await uploadDirectToS3({
            key,
            contentType: fgSelectedPdfFile.type || 'application/pdf',
            base64Data: base64
          }).unwrap();
          finalPdfUrl = uploadRes?.url || base64;
          finalPdfName = fgSelectedPdfFile.name;
        } catch (uploadErr) {
          console.warn('S3 FG PDF upload fallback to base64', uploadErr);
          const base64 = await fileToBase64(fgSelectedPdfFile);
          finalPdfUrl = base64;
          finalPdfName = fgSelectedPdfFile.name;
        }
      }

      const payload = {
        name: fgForm.name.trim(),
        classification: fgForm.classification,
        categoryCode: fgForm.categoryCode,
        categoryName: fgForm.categoryName,
        revision: fgForm.revision.trim(),
        description: fgForm.description.trim(),
        uom: fgForm.uom.trim(),
        hsnCode: fgForm.hsnCode.trim(),
        photos: uploadedPhotoUrls,
        photoUrl: uploadedPhotoUrls[0] || null,
        pdfUrl: finalPdfUrl || null,
        pdfName: finalPdfName || null,
        bomItems: fgForm.bomItems
      };

      if (fgModal?.mode === 'CREATE') {
        const res: any = await createFgItem(payload).unwrap();
        showToast(res?.message || 'All set! FG item created successfully.', 'success');
      } else if (fgModal?.mode === 'REVISION') {
        const res: any = await createFgRevision({
          id: fgModal?.item?.id || fgModal?.item?._id,
          revision: fgForm.revision.trim(),
          changeNotes: fgForm.description
        }).unwrap();
        showToast(res?.message || `All set! New revision ${fgForm.revision} created.`, 'success');
      } else {
        const res: any = await updateFgItem({
          id: fgModal?.item?.id || fgModal?.item?._id,
          ...payload
        }).unwrap();
        showToast(res?.message || 'All set! FG item updated.', 'success');
      }

      setFgModal(null);
      refetchFg();
    } catch (err: any) {
      setFgFormError(err?.data?.message || err?.message || 'We could not save this FG item right now.');
    } finally {
      setIsUploadingFgMedia(false);
    }
  };

  // Open FG Preview Dossier Handler
  const handleOpenPreviewFg = (it: any) => {
    setPreviewFgItem(it);
    setActiveFgPreviewTab('details');
    setShowBomCostingSection(false); // Costing section hidden by default
    setFgCostingMode('L2');
    setFgBomViewMode('consolidated');
    setFgBomSearch('');
    setFgBomCategoryFilter('ALL');
    setFgBomPricingFilter('ALL');
    setBomExcelFilters({
      name: null,
      category: null,
      classification: null,
      parentUsage: null,
      vendorStatus: null
    });
    setBomSortField('name');
    setBomSortDirection('asc');
  };

  interface BomLineNode {
    key: string;
    level: number;
    rawType: 'RM-BO' | 'FG';
    itemType: 'RM_BO' | 'COMPONENT' | 'SUB_ASSEMBLY';
    name: string;
    description: string;
    category: string;
    parentName: string;
    parentUsage: string;
    quantity: number;
    directQuantity: number;
    uom: string;
    unitRate: number;
    extendedCost: number;
    hasRate: boolean;
    makeOrVendor: string;
    rawRef?: any;
    children?: BomLineNode[];
  }

  // Recursive Multi-Level BOM & Costing Calculator (Zero separation of RM & BO)
  const multiLevelBomData = useMemo(() => {
    if (!previewFgItem) {
      return {
        tree: [] as BomLineNode[],
        consolidated: [] as BomLineNode[],
        totalCost: 0,
        totalPartsQty: 0,
        pricedCount: 0,
        missingCount: 0,
        priceCoverage: 0,
        rmBoCost: 0,
        fgCost: 0
      };
    }

    const visitedFg = new Set<string>();

    const parseChildren = (
      lines: any[],
      parentName: string,
      parentQtyMultiplier: number,
      level: number,
      parentKey: string
    ): BomLineNode[] => {
      if (!Array.isArray(lines)) return [];

      return lines.map((line, idx) => {
        const key = `${parentKey}-${level}-${idx}-${line.itemName || idx}`;
        const directQty = Number(line.quantity || 0);
        const effectiveQty = directQty * parentQtyMultiplier;
        const isFg = line.itemType === 'FG';

        if (isFg) {
          const childFg = fgItems.find(
            (f: any) =>
              f.name?.toLowerCase().trim() === line.itemName?.toLowerCase().trim() ||
              (line.itemId && (f.id === line.itemId || f._id === line.itemId))
          );
          const rawClass = String(childFg?.classification || 'COMPONENT').toUpperCase();
          const classification: 'COMPONENT' | 'SUB_ASSEMBLY' =
            rawClass === 'SUB_ASSEMBLY' || rawClass === 'SUB-ASSEMBLY' ? 'SUB_ASSEMBLY' : 'COMPONENT';

          let nestedChildren: BomLineNode[] = [];
          if (
            childFg &&
            Array.isArray(childFg.bomItems) &&
            childFg.bomItems.length > 0 &&
            !visitedFg.has(childFg.name)
          ) {
            visitedFg.add(childFg.name);
            nestedChildren = parseChildren(
              childFg.bomItems,
              childFg.name,
              effectiveQty,
              level + 1,
              key
            );
            visitedFg.delete(childFg.name);
          }

          const childCost = nestedChildren.reduce((sum, c) => sum + c.extendedCost, 0);
          const unitRate = directQty > 0 ? childCost / directQty : 0;
          const extendedCost = childCost;

          return {
            key,
            level,
            rawType: 'FG',
            itemType: classification,
            name: line.itemName || childFg?.name || 'Child Assembly',
            description: line.description || childFg?.description || '',
            category: childFg?.categoryName || (classification === 'SUB_ASSEMBLY' ? 'Sub-Assembly' : 'Component'),
            parentName,
            parentUsage: `L${level} ${parentName}: ${directQty} ${line.uom || 'NOS'}`,
            quantity: effectiveQty,
            directQuantity: directQty,
            uom: line.uom || childFg?.uom || 'NOS',
            unitRate,
            extendedCost,
            hasRate: unitRate > 0,
            makeOrVendor: childFg ? `${childFg.revision || 'Rev 1.0'} (${classification})` : classification,
            rawRef: childFg,
            children: nestedChildren
          };
        } else {
          // RM-BO Combined
          const matchedRm = rmItems.find(
            (r: any) =>
              r.name?.toLowerCase().trim() === line.itemName?.toLowerCase().trim() ||
              (line.itemId && (r.id === line.itemId || r._id === line.itemId))
          );

          const unitRate = Number(matchedRm?.standardRateINR || 0);
          const extendedCost = effectiveQty * unitRate;

          return {
            key,
            level,
            rawType: 'RM-BO',
            itemType: 'RM_BO',
            name: line.itemName || matchedRm?.name || 'Raw Material / Bought-Out',
            description: line.description || matchedRm?.description || '',
            category: matchedRm?.categoryName || 'RM & BO Item',
            parentName,
            parentUsage: `L${level} ${parentName}: ${directQty} ${line.uom || matchedRm?.uom || 'Nos'}`,
            quantity: effectiveQty,
            directQuantity: directQty,
            uom: line.uom || matchedRm?.uom || 'Nos',
            unitRate,
            extendedCost,
            hasRate: unitRate > 0,
            makeOrVendor: matchedRm?.make || (unitRate > 0 ? 'Standard Rate' : 'Pending Rate'),
            rawRef: matchedRm,
            children: []
          };
        }
      });
    };

    const tree = parseChildren(previewFgItem.bomItems || [], previewFgItem.name, 1, 1, 'root');

    const flattenNodes = (nodes: BomLineNode[]): BomLineNode[] => {
      const list: BomLineNode[] = [];
      nodes.forEach((n) => {
        list.push(n);
        if (n.children && n.children.length > 0) {
          list.push(...flattenNodes(n.children));
        }
      });
      return list;
    };

    const allFlat = flattenNodes(tree);

    let consolidated: BomLineNode[] = [];
    if (fgCostingMode === 'L2') {
      consolidated = tree;
    } else {
      // Exploded leaf RM-BO items
      consolidated = allFlat.filter((n) => n.itemType === 'RM_BO');
    }

    let totalCost = 0;
    let totalPartsQty = 0;
    let pricedCount = 0;
    let missingCount = 0;
    let rmBoCost = 0;
    let fgCost = 0;

    consolidated.forEach((part) => {
      totalCost += part.extendedCost;
      totalPartsQty += part.quantity;
      if (part.hasRate) pricedCount++;
      else missingCount++;

      if (part.itemType === 'RM_BO') rmBoCost += part.extendedCost;
      else fgCost += part.extendedCost;
    });

    const totalParts = pricedCount + missingCount;
    const priceCoverage = totalParts > 0 ? Math.round((pricedCount / totalParts) * 100) : 0;

    return {
      tree,
      consolidated,
      totalCost,
      totalPartsQty: Number(totalPartsQty.toFixed(2)),
      pricedCount,
      missingCount,
      priceCoverage,
      rmBoCost,
      fgCost
    };
  }, [previewFgItem, fgItems, rmItems, fgCostingMode]);

  // BOM Excel-Style Column Filters State
  const [bomExcelFilters, setBomExcelFilters] = useState<{
    name: string[] | null;
    category: string[] | null;
    classification: string[] | null;
    parentUsage: string[] | null;
    vendorStatus: string[] | null;
  }>({
    name: null,
    category: null,
    classification: null,
    parentUsage: null,
    vendorStatus: null
  });
  const [bomSortField, setBomSortField] = useState<string>('name');
  const [bomSortDirection, setBomSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleBomSortChange = (field: string, direction: 'asc' | 'desc') => {
    setBomSortField(field);
    setBomSortDirection(direction);
  };

  // Distinct values for BOM Excel Column Filters
  const distinctBomNames = useMemo<DistinctValueItem[]>(() => {
    const map = new Map<string, number>();
    multiLevelBomData.consolidated.forEach((p) => {
      const val = p.name?.trim() || 'N/A';
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [multiLevelBomData.consolidated]);

  const distinctBomCategories = useMemo<DistinctValueItem[]>(() => {
    const map = new Map<string, number>();
    multiLevelBomData.consolidated.forEach((p) => {
      const val = p.category?.trim() || 'Unassigned';
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [multiLevelBomData.consolidated]);

  const distinctBomClassifications = useMemo<DistinctValueItem[]>(() => {
    const map = new Map<string, number>();
    multiLevelBomData.consolidated.forEach((p) => {
      const val = p.itemType === 'RM_BO' ? 'RM-BO' : p.itemType === 'SUB_ASSEMBLY' ? 'Sub-Assembly' : 'Component';
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [multiLevelBomData.consolidated]);

  const distinctBomParentUsages = useMemo<DistinctValueItem[]>(() => {
    const map = new Map<string, number>();
    multiLevelBomData.consolidated.forEach((p) => {
      const val = p.parentUsage?.trim() || 'Direct L2';
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [multiLevelBomData.consolidated]);

  const distinctBomVendorStatuses = useMemo<DistinctValueItem[]>(() => {
    let priced = 0;
    let unpriced = 0;
    multiLevelBomData.consolidated.forEach((p) => {
      if (p.hasRate) priced++;
      else unpriced++;
    });
    const result: DistinctValueItem[] = [];
    if (priced > 0) result.push({ value: 'Priced (Has Rate)', count: priced });
    if (unpriced > 0) result.push({ value: 'Missing Rate', count: unpriced });
    return result;
  }, [multiLevelBomData.consolidated]);

  // Filtered and Sorted BOM Parts
  const filteredBomParts = useMemo(() => {
    let result = [...multiLevelBomData.consolidated];

    if (fgBomSearch.trim()) {
      const q = fgBomSearch.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.makeOrVendor.toLowerCase().includes(q)
      );
    }

    if (fgBomCategoryFilter !== 'ALL') {
      result = result.filter((p) => p.itemType === fgBomCategoryFilter);
    }

    if (fgBomPricingFilter === 'PRICED') {
      result = result.filter((p) => p.hasRate);
    } else if (fgBomPricingFilter === 'MISSING') {
      result = result.filter((p) => !p.hasRate);
    }

    // Excel Column Filters
    if (bomExcelFilters.name && bomExcelFilters.name.length > 0) {
      result = result.filter((p) => bomExcelFilters.name!.includes(p.name?.trim() || 'N/A'));
    }
    if (bomExcelFilters.category && bomExcelFilters.category.length > 0) {
      result = result.filter((p) => bomExcelFilters.category!.includes(p.category?.trim() || 'Unassigned'));
    }
    if (bomExcelFilters.classification && bomExcelFilters.classification.length > 0) {
      result = result.filter((p) => {
        const label = p.itemType === 'RM_BO' ? 'RM-BO' : p.itemType === 'SUB_ASSEMBLY' ? 'Sub-Assembly' : 'Component';
        return bomExcelFilters.classification!.includes(label);
      });
    }
    if (bomExcelFilters.parentUsage && bomExcelFilters.parentUsage.length > 0) {
      result = result.filter((p) => bomExcelFilters.parentUsage!.includes(p.parentUsage?.trim() || 'Direct L2'));
    }
    if (bomExcelFilters.vendorStatus && bomExcelFilters.vendorStatus.length > 0) {
      result = result.filter((p) => {
        const status = p.hasRate ? 'Priced (Has Rate)' : 'Missing Rate';
        return bomExcelFilters.vendorStatus!.includes(status);
      });
    }

    // Sorting
    result.sort((a, b) => {
      let valA: any = a[bomSortField as keyof BomLineNode];
      let valB: any = b[bomSortField as keyof BomLineNode];
      if (bomSortField === 'unitRate' || bomSortField === 'extendedCost' || bomSortField === 'quantity') {
        return bomSortDirection === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
      }
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = String(valB ?? '').toLowerCase();
      if (valA < valB) return bomSortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return bomSortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [
    multiLevelBomData.consolidated,
    fgBomSearch,
    fgBomCategoryFilter,
    fgBomPricingFilter,
    bomExcelFilters,
    bomSortField,
    bomSortDirection
  ]);

  const hasActiveBomFilters = useMemo(() => {
    return (
      Boolean(fgBomSearch.trim()) ||
      fgBomCategoryFilter !== 'ALL' ||
      fgBomPricingFilter !== 'ALL' ||
      bomExcelFilters.name !== null ||
      bomExcelFilters.category !== null ||
      bomExcelFilters.classification !== null ||
      bomExcelFilters.parentUsage !== null ||
      bomExcelFilters.vendorStatus !== null
    );
  }, [fgBomSearch, fgBomCategoryFilter, fgBomPricingFilter, bomExcelFilters]);

  const handleResetBomFilters = () => {
    setFgBomSearch('');
    setFgBomCategoryFilter('ALL');
    setFgBomPricingFilter('ALL');
    setBomExcelFilters({
      name: null,
      category: null,
      classification: null,
      parentUsage: null,
      vendorStatus: null
    });
    setBomSortField('name');
    setBomSortDirection('asc');
  };

  // BOM Category counts for filter pills (RM-BO Combined)
  const bomCategoryCounts = useMemo(() => {
    const counts = { ALL: 0, RM_BO: 0, COMPONENT: 0, SUB_ASSEMBLY: 0 };
    multiLevelBomData.consolidated.forEach((p) => {
      counts.ALL++;
      if (p.itemType === 'RM_BO') counts.RM_BO++;
      else if (p.itemType === 'COMPONENT') counts.COMPONENT++;
      else if (p.itemType === 'SUB_ASSEMBLY') counts.SUB_ASSEMBLY++;
    });
    return counts;
  }, [multiLevelBomData.consolidated]);

  // Export BOM to Excel (CSV)
  const handleExportBomExcel = () => {
    if (!previewFgItem) return;
    const parts = multiLevelBomData.consolidated;
    const headers = [
      '#',
      'Component / Item Name',
      'Description',
      'Classification',
      'Category',
      'Parent Usage',
      'Total Qty',
      'UOM',
      'Unit Rate (INR)',
      'Extended Cost (INR)'
    ];
    const rows = parts.map((p, idx) => [
      idx + 1,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${(p.description || '').replace(/"/g, '""')}"`,
      p.itemType,
      `"${(p.category || '').replace(/"/g, '""')}"`,
      `"${(p.parentUsage || '').replace(/"/g, '""')}"`,
      p.quantity,
      p.uom,
      p.unitRate.toFixed(2),
      p.extendedCost.toFixed(2)
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${previewFgItem.name}_BOM_Costing_${fgCostingMode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('BOM Costing exported to CSV.', 'success');
  };

  // Toggle tree node expansion
  const toggleTreeNode = (key: string) => {
    setExpandedTreeNodes((prev) => ({
      ...prev,
      [key]: prev[key] === undefined ? false : !prev[key]
    }));
  };

  // Quick Rate Modal Handlers
  const handleOpenQuickRate = (part: any) => {
    setQuickRateModal({
      isOpen: true,
      item: part.rawRef,
      name: part.name,
      uom: part.uom,
      rate: part.unitRate || 0
    });
  };

  const handleSaveQuickRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickRateModal) return;

    try {
      if (quickRateModal.item && (quickRateModal.item.id || quickRateModal.item._id)) {
        await updateRmItem({
          id: quickRateModal.item.id || quickRateModal.item._id,
          standardRateINR: Number(quickRateModal.rate)
        }).unwrap();
        showToast(
          `Updated standard rate for ${quickRateModal.name} to ₹${quickRateModal.rate}/${quickRateModal.uom}`,
          'success'
        );
        refetchRm();
      } else {
        showToast('Only RM & BO items standard rates can be updated directly.', 'error');
      }
      setQuickRateModal(null);
    } catch (err: any) {
      showToast(err?.data?.message || 'Could not update rate.', 'error');
    }
  };

  // Filter BO & FG items by search
  const filteredBoAndFgItems = useMemo(() => {
    if (!searchTerm.trim()) return boAndFgItems;
    const q = searchTerm.toLowerCase();
    return boAndFgItems.filter(
      (it: any) =>
        it.itemCode?.toLowerCase().includes(q) ||
        it.itemName?.toLowerCase().includes(q) ||
        it.category?.toLowerCase().includes(q) ||
        it.subAssemblyGroup?.toLowerCase().includes(q) ||
        it.drawingNumber?.toLowerCase().includes(q)
    );
  }, [boAndFgItems, searchTerm]);

  // Distinct Category values for Excel column filters

  const distinctCategoryNames = useMemo<DistinctValueItem[]>(() => {
    const map = new Map<string, number>();
    categories.forEach((cat: any) => {
      const val = cat.name || 'N/A';
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [categories]);

  const distinctCategoryStatuses = useMemo<DistinctValueItem[]>(() => {
    let activeCount = 0;
    let inactiveCount = 0;
    categories.forEach((cat: any) => {
      if (cat.isActive !== false) activeCount++;
      else inactiveCount++;
    });
    const result: DistinctValueItem[] = [];
    if (activeCount > 0) result.push({ value: 'Active', count: activeCount });
    if (inactiveCount > 0) result.push({ value: 'Inactive', count: inactiveCount });
    return result;
  }, [categories]);

  // Filtered and Sorted Categories (Simplified: Name + Description + Status)
  const filteredAndSortedCategories = useMemo(() => {
    let result = [...categories];

    if (categorySearch.trim()) {
      const q = categorySearch.toLowerCase().trim();
      result = result.filter(
        (c: any) =>
          c.name?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q)
      );
    }

    if (categoryExcelFilters.name && categoryExcelFilters.name.length > 0) {
      result = result.filter((c: any) => categoryExcelFilters.name!.includes(c.name || 'N/A'));
    }
    if (categoryExcelFilters.status && categoryExcelFilters.status.length > 0) {
      result = result.filter((c: any) => {
        const status = c.isActive !== false ? 'Active' : 'Inactive';
        return categoryExcelFilters.status!.includes(status);
      });
    }

    result.sort((a: any, b: any) => {
      let valA: any = a[categorySortField];
      let valB: any = b[categorySortField];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (valA < valB) return categorySortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return categorySortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [categories, categorySearch, categoryExcelFilters, categorySortField, categorySortDirection]);

  const hasActiveCategoryFilters = useMemo(() => {
    return (
      Boolean(categorySearch.trim()) ||
      categoryExcelFilters.name !== null ||
      categoryExcelFilters.status !== null
    );
  }, [categorySearch, categoryExcelFilters]);

  const handleResetCategoryFilters = () => {
    setCategorySearch('');
    setCategoryExcelFilters({
      name: null,
      status: null
    });
    setCategorySortField('name');
    setCategorySortDirection('asc');
  };

  // Open Create Category Modal
  const handleOpenCreateCategory = () => {
    setCategoryForm({
      name: '',
      description: '',
      isActive: true
    });
    setCategoryFormError('');
    setCategoryModal({ isOpen: true, mode: 'CREATE' });
  };

  // Open Edit Category Modal
  const handleOpenEditCategory = (cat: any) => {
    setCategoryForm({
      name: cat.name || '',
      description: cat.description || '',
      isActive: cat.isActive !== false
    });
    setCategoryFormError('');
    setCategoryModal({ isOpen: true, mode: 'EDIT', item: cat });
  };

  // Toggle Category Active Status
  const handleToggleCategoryActive = async (cat: any) => {
    try {
      const res: any = await deleteCategory(cat.id || cat._id).unwrap();
      showToast(res?.message || 'Updated category status.', 'success');
      refetchCategories();
    } catch (err: any) {
      showToast(err?.data?.message || 'Could not update category status.', 'error');
    }
  };

  // Submit Category Form (Name + Description only)
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      setCategoryFormError('Category Name is compulsory.');
      return;
    }

    setCategoryFormError('');

    try {
      if (categoryModal?.mode === 'CREATE') {
        const res: any = await createCategory({
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim()
        }).unwrap();
        showToast(res?.message || 'All set! Category created successfully.', 'success');
      } else {
        const res: any = await updateCategory({
          id: categoryModal?.item?.id || categoryModal?.item?._id,
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim(),
          isActive: categoryForm.isActive
        }).unwrap();
        showToast(res?.message || 'All set! Category updated successfully.', 'success');
      }

      setCategoryModal(null);
      refetchCategories();
    } catch (err: any) {
      setCategoryFormError(err?.data?.message || err?.message || 'We could not save this category right now.');
    }
  };

  // Sub-Stage Distinct Values for Column-Based Excel Filters
  const distinctSubStageNames = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    subStages.forEach((s: any) => {
      const val = (s.name || s.subStageName || '').trim();
      if (val) counts.set(val, (counts.get(val) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [subStages]);

  const distinctSubStageStatuses = useMemo<DistinctValueItem[]>(() => {
    let activeCount = 0;
    let inactiveCount = 0;
    subStages.forEach((s: any) => {
      if (s.isActive !== false) activeCount++;
      else inactiveCount++;
    });
    const items: DistinctValueItem[] = [];
    if (activeCount > 0) items.push({ value: 'Active', count: activeCount });
    if (inactiveCount > 0) items.push({ value: 'Inactive', count: inactiveCount });
    return items;
  }, [subStages]);

  // Sub-Stage Filtered and Sorted Table Data
  const filteredAndSortedSubStages = useMemo(() => {
    let result = [...subStages];

    // 1. In-line search
    if (subStageSearch.trim()) {
      const q = subStageSearch.toLowerCase().trim();
      result = result.filter(
        (s: any) =>
          (s.name || s.subStageName || '').toLowerCase().includes(q) ||
          (s.description || '').toLowerCase().includes(q)
      );
    }

    // 2. Excel filter: Name
    if (subStageExcelFilters.name && subStageExcelFilters.name.length > 0) {
      result = result.filter((s: any) =>
        subStageExcelFilters.name!.includes((s.name || s.subStageName || '').trim())
      );
    }

    // 3. Excel filter: Status
    if (subStageExcelFilters.status && subStageExcelFilters.status.length > 0) {
      result = result.filter((s: any) => {
        const statusStr = s.isActive !== false ? 'Active' : 'Inactive';
        return subStageExcelFilters.status!.includes(statusStr);
      });
    }

    // 4. Sorting
    result.sort((a: any, b: any) => {
      let valA: any = a[subStageSortField] || a.name || a.subStageName;
      let valB: any = b[subStageSortField] || b.name || b.subStageName;
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (valA < valB) return subStageSortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return subStageSortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [subStages, subStageSearch, subStageExcelFilters, subStageSortField, subStageSortDirection]);

  const hasActiveSubStageFilters = useMemo(() => {
    return (
      Boolean(subStageSearch.trim()) ||
      subStageExcelFilters.name !== null ||
      subStageExcelFilters.status !== null
    );
  }, [subStageSearch, subStageExcelFilters]);

  const handleResetSubStageFilters = () => {
    setSubStageSearch('');
    setSubStageExcelFilters({
      name: null,
      status: null
    });
    setSubStageSortField('name');
    setSubStageSortDirection('asc');
  };

  const handleOpenCreateSubStage = () => {
    setSubStageForm({
      name: '',
      description: '',
      isActive: true
    });
    setSubStageFormError('');
    setSubStageModal({ isOpen: true, mode: 'CREATE' });
  };

  const handleOpenEditSubStage = (s: any) => {
    setSubStageForm({
      name: s.name || s.subStageName || '',
      description: s.description || '',
      isActive: s.isActive !== false
    });
    setSubStageFormError('');
    setSubStageModal({ isOpen: true, mode: 'EDIT', item: s });
  };

  const handleToggleSubStageActive = async (s: any) => {
    try {
      const res: any = await updateSubStage({
        id: s.id || s._id,
        isActive: s.isActive === false ? true : false,
        departmentModule: 'design'
      }).unwrap();
      showToast(res?.message || 'Updated sub-stage status.', 'success');
      refetchSubStages();
    } catch (err: any) {
      showToast(err?.data?.message || 'Could not update sub-stage status.', 'error');
    }
  };

  const handleSaveSubStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subStageForm.name.trim()) {
      setSubStageFormError('Sub-Stage Name is compulsory.');
      return;
    }

    setSubStageFormError('');

    try {
      if (subStageModal?.mode === 'CREATE') {
        const res: any = await createSubStage({
          name: subStageForm.name.trim(),
          description: subStageForm.description.trim(),
          departmentModule: 'design'
        }).unwrap();
        showToast(res?.message || 'All set! Sub-stage created successfully.', 'success');
      } else {
        const res: any = await updateSubStage({
          id: subStageModal?.item?.id || subStageModal?.item?._id,
          name: subStageForm.name.trim(),
          description: subStageForm.description.trim(),
          isActive: subStageForm.isActive,
          departmentModule: 'design'
        }).unwrap();
        showToast(res?.message || 'All set! Sub-stage updated successfully.', 'success');
      }

      setSubStageModal(null);
      refetchSubStages();
    } catch (err: any) {
      setSubStageFormError(err?.data?.message || err?.message || 'We could not save this sub-stage right now.');
    }
  };

  // Filter team users by search
  const filteredTeam = useMemo(() => {
    if (!searchTerm.trim()) return teamUsers;
    const q = searchTerm.toLowerCase();
    return teamUsers.filter(
      (u: any) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.roleName?.toLowerCase().includes(q) ||
        u.designation?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q)
    );
  }, [teamUsers, searchTerm]);

  // Team summary metrics
  const teamMetrics = useMemo(() => {
    const total = teamUsers.length;
    const online = teamUsers.filter((u: any) => u.isOnline).length;
    const leads = teamUsers.filter(
      (u: any) =>
        u.isSuperAdmin ||
        u.roleSlug === 'design-engineer' ||
        u.department === 'DESIGN_ENGINEERING'
    ).length;
    return { total, online, leads };
  }, [teamUsers]);

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold text-white transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600'
              : toastMessage.type === 'info'
              ? 'bg-slate-800'
              : 'bg-red-600'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 size={16} />
          ) : toastMessage.type === 'info' ? (
            <AlertTriangle size={16} className="text-amber-400" />
          ) : (
            <AlertCircle size={16} />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Button-Type Sub-Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* RM & BO Items */}
          <Link
            href="/design/masters/rm-bo"
            className={`px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 ${
              currentSubTab === 'rm-bo'
                ? 'bg-orange-500 text-white font-semibold shadow-xs shadow-orange-500/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
            }`}
          >
            <Layers size={14} />
            <span>RM &amp; BO Items</span>
            {currentSubTab === 'rm-bo' && rmItems.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white text-orange-600 font-bold">
                {rmItems.length}
              </span>
            )}
          </Link>

          {/* FG Items */}
          <Link
            href="/design/masters/fg"
            className={`px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 ${
              currentSubTab === 'fg'
                ? 'bg-orange-500 text-white font-semibold shadow-xs shadow-orange-500/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
            }`}
          >
            <Boxes size={14} />
            <span>FG Items</span>
            {currentSubTab === 'fg' && fgItems.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white text-orange-600 font-bold">
                {fgItems.length}
              </span>
            )}
          </Link>

          {/* Categories */}
          <Link
            href="/design/masters/categories"
            className={`px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 ${
              currentSubTab === 'categories'
                ? 'bg-orange-500 text-white font-semibold shadow-xs shadow-orange-500/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
            }`}
          >
            <Tag size={14} />
            <span>Categories</span>
            {categories.length > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  currentSubTab === 'categories' ? 'bg-white text-orange-600' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {categories.length}
              </span>
            )}
          </Link>

          {/* Project Sub-Stages */}
          <Link
            href="/design/masters/sub-stages"
            className={`px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 ${
              currentSubTab === 'sub-stages'
                ? 'bg-orange-500 text-white font-semibold shadow-xs shadow-orange-500/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
            }`}
          >
            <Workflow size={14} />
            <span>Sub-Stages</span>
            {subStages.length > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  currentSubTab === 'sub-stages' ? 'bg-white text-orange-600' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {subStages.length}
              </span>
            )}
          </Link>

          {/* Prefix & Lock Policy */}
          <Link
            href="/design/masters/prefix-policy"
            className={`px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 ${
              currentSubTab === 'prefix-policy'
                ? 'bg-orange-500 text-white font-semibold shadow-xs shadow-orange-500/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
            }`}
          >
            <Settings size={14} />
            <span>Prefix &amp; Lock Policy</span>
          </Link>

          {/* Design Team */}
          <Link
            href="/design/masters/team"
            className={`px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 ${
              currentSubTab === 'team'
                ? 'bg-orange-500 text-white font-semibold shadow-xs shadow-orange-500/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
            }`}
          >
            <Users size={14} />
            <span>Design Team</span>
            {teamUsers.length > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  currentSubTab === 'team' ? 'bg-white text-orange-600' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {teamUsers.length}
              </span>
            )}
          </Link>
        </div>

        {/* Search Input (Shown for other tabs with table searches) */}
        {currentSubTab !== 'prefix-policy' && currentSubTab !== 'rm-bo' && (
          <div className="relative w-full sm:w-60">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                currentSubTab === 'team'
                  ? 'Search team members...'
                  : currentSubTab === 'categories'
                  ? 'Search categories...'
                  : `Search ${currentSubTab.toUpperCase()} items...`
              }
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-orange-500 text-slate-800"
            />
          </div>
        )}
      </div>

      {/* SUB-TAB 1: RM & BO ITEMS */}
      {currentSubTab === 'rm-bo' && (
        <div className="space-y-4">
          {/* Dedicated In-Line Table Action Toolbar (Search on Left, Add New & Reset on Right) */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Left: Dedicated In-Line Search Bar */}
            <div className="relative flex-1 min-w-[260px] max-w-lg">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search RM & BO items by name, make, category, HSN..."
                value={rmSearch}
                onChange={(e) => setRmSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium transition-all"
              />
              {rmSearch && (
                <button
                  type="button"
                  onClick={() => setRmSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Right: Excel Actions + Reset Filters + Add RM/BO Item Button */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Excel Actions Dropdown Menu */}
              <div className="relative" ref={rmExcelMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsRmExcelMenuOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer shadow-2xs"
                  title="Excel Export, Import & Template Actions"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Excel Actions</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isRmExcelMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={handleExportRmExcel}
                      className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-orange-600 flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-slate-400" />
                      <span>Export RM &amp; BO Items (Excel)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsRmExcelMenuOpen(false);
                        setIsRmBulkImportOpen(true);
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-orange-600 flex items-center gap-2 cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <span>Import in Bulk (Excel / CSV)</span>
                    </button>

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsRmExcelMenuOpen(false);
                        handleDownloadRmTemplate();
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-orange-600 flex items-center gap-2 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-orange-500" />
                      <span>Download Sample Template</span>
                    </button>
                  </div>
                )}
              </div>

              {hasActiveRmFilters && (
                <button
                  type="button"
                  onClick={handleResetRmFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-all cursor-pointer shadow-2xs"
                  title="Reset all active column filters and search"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filters</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenCreateRm}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
              >
                <Plus size={14} />
                <span>Add RM / BO Item</span>
              </button>
            </div>
          </div>

          {/* RM & BO Items Table with Column-Based Excel Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-600">
                  <tr>
                    {/* Non-Filter Header: Row Serial Number */}
                    <th className="py-3 px-4 w-12 text-center">#</th>

                    {/* Excel Filter: Item Name */}
                    <th className="py-3 px-4 min-w-[240px]">
                      <ExcelColumnFilter
                        title="Item Name *"
                        columnKey="name"
                        distinctValues={distinctRmNames}
                        selectedValues={rmExcelFilters.name}
                        onFilterChange={(selected) => setRmExcelFilters((prev) => ({ ...prev, name: selected }))}
                        currentSortField={rmSortField}
                        currentSortDirection={rmSortDirection}
                        onSortChange={handleRmSortChange}
                      />
                    </th>

                    {/* Non-Filter Header: Description */}
                    <th className="py-3 px-4 min-w-[200px]">Description &amp; Specifications</th>

                    {/* Excel Filter: Make / Brand */}
                    <th className="py-3 px-4 min-w-[140px]">
                      <ExcelColumnFilter
                        title="Make / Brand"
                        columnKey="make"
                        distinctValues={distinctRmMakes}
                        selectedValues={rmExcelFilters.make}
                        onFilterChange={(selected) => setRmExcelFilters((prev) => ({ ...prev, make: selected }))}
                        currentSortField={rmSortField}
                        currentSortDirection={rmSortDirection}
                        onSortChange={handleRmSortChange}
                      />
                    </th>

                    {/* Excel Filter: Category */}
                    <th className="py-3 px-4 min-w-[170px]">
                      <ExcelColumnFilter
                        title="Category"
                        columnKey="categoryName"
                        distinctValues={distinctRmCategories}
                        selectedValues={rmExcelFilters.category}
                        onFilterChange={(selected) => setRmExcelFilters((prev) => ({ ...prev, category: selected }))}
                        currentSortField={rmSortField}
                        currentSortDirection={rmSortDirection}
                        onSortChange={handleRmSortChange}
                      />
                    </th>

                    {/* Excel Filter: UOM */}
                    <th className="py-3 px-4 text-center min-w-[90px]">
                      <ExcelColumnFilter
                        title="UOM"
                        columnKey="uom"
                        distinctValues={distinctRmUoms}
                        selectedValues={rmExcelFilters.uom}
                        onFilterChange={(selected) => setRmExcelFilters((prev) => ({ ...prev, uom: selected }))}
                        currentSortField={rmSortField}
                        currentSortDirection={rmSortDirection}
                        onSortChange={handleRmSortChange}
                        align="left"
                      />
                    </th>

                    {/* Excel Filter: HSN Code */}
                    <th className="py-3 px-4 text-center min-w-[110px]">
                      <ExcelColumnFilter
                        title="HSN Code"
                        columnKey="hsnCode"
                        distinctValues={distinctRmHsns}
                        selectedValues={rmExcelFilters.hsnCode}
                        onFilterChange={(selected) => setRmExcelFilters((prev) => ({ ...prev, hsnCode: selected }))}
                        currentSortField={rmSortField}
                        currentSortDirection={rmSortDirection}
                        onSortChange={handleRmSortChange}
                        align="left"
                      />
                    </th>

                    {/* Non-Filter Header: Standard Rate */}
                    <th className="py-3 px-4 text-right min-w-[120px]">Standard Rate (₹)</th>

                    {/* Excel Filter: Status */}
                    <th className="py-3 px-4 text-center min-w-[100px]">
                      <ExcelColumnFilter
                        title="Status"
                        columnKey="status"
                        distinctValues={distinctRmStatuses}
                        selectedValues={rmExcelFilters.status}
                        onFilterChange={(selected) => setRmExcelFilters((prev) => ({ ...prev, status: selected }))}
                        currentSortField={rmSortField}
                        currentSortDirection={rmSortDirection}
                        onSortChange={handleRmSortChange}
                        align="right"
                      />
                    </th>

                    {/* Non-Filter Header: Actions */}
                    <th className="py-3 px-4 text-center min-w-[90px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isRmLoading ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        Loading Raw Materials...
                      </td>
                    </tr>
                  ) : filteredAndSortedRmItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                          <Layers size={32} className="text-slate-300" />
                          <span className="text-xs font-semibold text-slate-600">
                            {hasActiveRmFilters ? 'No raw materials match your filters' : 'No Raw Material items found'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {hasActiveRmFilters
                              ? 'Try clearing column filters or search term'
                              : 'Click "Add RM Item" to record your first raw stock.'}
                          </span>
                          {hasActiveRmFilters && (
                            <button
                              type="button"
                              onClick={handleResetRmFilters}
                              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 transition-all cursor-pointer shadow-xs"
                            >
                              <RotateCcw size={13} />
                              <span>Reset All Filters</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedRmItems.map((item: any, idx: number) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPreviewRmItem(item)}
                              className="font-extrabold text-slate-900 hover:text-orange-600 transition-colors text-left cursor-pointer group block"
                              title="Click to view details & audit trail"
                            >
                              <span className="underline decoration-slate-300 group-hover:decoration-orange-500 underline-offset-2">
                                {item.name}
                              </span>
                            </button>
                            <div className="flex items-center gap-1 shrink-0">
                              {((Array.isArray(item.photos) && item.photos.length > 0) || item.photoUrl) && (
                                <span
                                  className="p-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200"
                                  title={`${(item.photos?.length) || 1} photo(s) attached`}
                                >
                                  <ImageIcon size={11} />
                                </span>
                              )}
                              {item.pdfUrl && (
                                <span
                                  className="p-1 rounded-md bg-red-50 text-red-600 border border-red-200"
                                  title="Technical datasheet PDF attached"
                                >
                                  <FileText size={11} />
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-[11px] text-slate-600 max-w-sm truncate" title={item.description}>
                            {item.description || '—'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {item.make || 'Commercial'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-slate-700 font-medium">
                            {item.categoryName || item.categoryCode || 'Raw Material'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                          {item.uom || 'Kg'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-600">
                          {item.hsnCode || '7228'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          ₹{Number(item.standardRateINR || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              item.isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${item.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}
                            />
                            <span>{item.isActive ? 'Active' : 'Inactive'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setPreviewRmItem(item)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-orange-50 text-slate-500 hover:text-orange-600 transition-colors cursor-pointer"
                              title="Preview Details & Audit Trail"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditRm(item)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                              title="Edit Raw Material"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleRmActive(item)}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                item.isActive
                                  ? 'border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-600'
                                  : 'border-emerald-200 hover:bg-emerald-50 text-emerald-600'
                              }`}
                              title={item.isActive ? 'Deactivate' : 'Activate'}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: FG ITEMS */}
      {currentSubTab === 'fg' && (
        <div className="space-y-4">
          {/* Dedicated In-Line Table Action Toolbar (Search on Left, Add New & Reset on Right) */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Left: Dedicated In-Line Search Bar */}
            <div className="relative flex-1 min-w-[260px] max-w-lg">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search FG items by name, classification, revision, category, HSN..."
                value={fgSearch}
                onChange={(e) => setFgSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium transition-all"
              />
              {fgSearch && (
                <button
                  type="button"
                  onClick={() => setFgSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Right: Excel Actions + Reset Filters + Add FG Item Button */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Excel Actions Dropdown Menu */}
              <div className="relative" ref={fgExcelMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsFgExcelMenuOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer shadow-2xs"
                  title="Excel Export, Import & Template Actions"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Excel Actions</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isFgExcelMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={handleExportFgExcel}
                      className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-orange-600 flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-slate-400" />
                      <span>Export FG Items (Excel)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsFgExcelMenuOpen(false);
                        setIsFgBulkImportOpen(true);
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-orange-600 flex items-center gap-2 cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <span>Import in Bulk (Excel / CSV)</span>
                    </button>

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsFgExcelMenuOpen(false);
                        handleDownloadFgTemplate();
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-orange-600 flex items-center gap-2 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-orange-500" />
                      <span>Download Sample Template</span>
                    </button>
                  </div>
                )}
              </div>

              {hasActiveFgFilters && (
                <button
                  type="button"
                  onClick={handleResetFgFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-all cursor-pointer shadow-2xs"
                  title="Reset all active column filters and search"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filters</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenCreateFg}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
              >
                <Plus size={14} />
                <span>Add FG Item</span>
              </button>
            </div>
          </div>

          {/* FG Items Table with Column-Based Excel Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-600">
                  <tr>
                    {/* Non-Filter Header: Row Serial Number */}
                    <th className="py-3 px-4 w-12 text-center">#</th>

                    {/* Excel Filter: Classification */}
                    <th className="py-3 px-4 min-w-[150px]">
                      <ExcelColumnFilter
                        title="Classification"
                        columnKey="classification"
                        distinctValues={distinctFgClassifications}
                        selectedValues={fgExcelFilters.classification}
                        onFilterChange={(selected) => setFgExcelFilters((prev) => ({ ...prev, classification: selected }))}
                        currentSortField={fgSortField}
                        currentSortDirection={fgSortDirection}
                        onSortChange={handleFgSortChange}
                      />
                    </th>

                    {/* Excel Filter: Item Name */}
                    <th className="py-3 px-4 min-w-[240px]">
                      <ExcelColumnFilter
                        title="Item Name *"
                        columnKey="name"
                        distinctValues={distinctFgNames}
                        selectedValues={fgExcelFilters.name}
                        onFilterChange={(selected) => setFgExcelFilters((prev) => ({ ...prev, name: selected }))}
                        currentSortField={fgSortField}
                        currentSortDirection={fgSortDirection}
                        onSortChange={handleFgSortChange}
                      />
                    </th>

                    {/* Excel Filter: Revision */}
                    <th className="py-3 px-4 text-center min-w-[110px]">
                      <ExcelColumnFilter
                        title="Revision"
                        columnKey="revision"
                        distinctValues={distinctFgRevisions}
                        selectedValues={fgExcelFilters.revision}
                        onFilterChange={(selected) => setFgExcelFilters((prev) => ({ ...prev, revision: selected }))}
                        currentSortField={fgSortField}
                        currentSortDirection={fgSortDirection}
                        onSortChange={handleFgSortChange}
                        align="left"
                      />
                    </th>

                    {/* Non-Filter Header: Description */}
                    <th className="py-3 px-4 min-w-[200px]">Description &amp; Specifications</th>

                    {/* Excel Filter: Category */}
                    <th className="py-3 px-4 min-w-[170px]">
                      <ExcelColumnFilter
                        title="Category"
                        columnKey="categoryName"
                        distinctValues={distinctFgCategories}
                        selectedValues={fgExcelFilters.category}
                        onFilterChange={(selected) => setFgExcelFilters((prev) => ({ ...prev, category: selected }))}
                        currentSortField={fgSortField}
                        currentSortDirection={fgSortDirection}
                        onSortChange={handleFgSortChange}
                      />
                    </th>

                    {/* Non-Filter Header: BOM Materials */}
                    <th className="py-3 px-4 text-center min-w-[120px]">BOM Attached</th>

                    {/* Excel Filter: Primary UOM */}
                    <th className="py-3 px-4 text-center min-w-[90px]">
                      <ExcelColumnFilter
                        title="UOM"
                        columnKey="uom"
                        distinctValues={distinctFgUoms}
                        selectedValues={fgExcelFilters.uom}
                        onFilterChange={(selected) => setFgExcelFilters((prev) => ({ ...prev, uom: selected }))}
                        currentSortField={fgSortField}
                        currentSortDirection={fgSortDirection}
                        onSortChange={handleFgSortChange}
                        align="left"
                      />
                    </th>

                    {/* Excel Filter: HSN Code */}
                    <th className="py-3 px-4 text-center min-w-[110px]">
                      <ExcelColumnFilter
                        title="HSN Code"
                        columnKey="hsnCode"
                        distinctValues={distinctFgHsns}
                        selectedValues={fgExcelFilters.hsnCode}
                        onFilterChange={(selected) => setFgExcelFilters((prev) => ({ ...prev, hsnCode: selected }))}
                        currentSortField={fgSortField}
                        currentSortDirection={fgSortDirection}
                        onSortChange={handleFgSortChange}
                        align="left"
                      />
                    </th>

                    {/* Excel Filter: Status */}
                    <th className="py-3 px-4 text-center min-w-[100px]">
                      <ExcelColumnFilter
                        title="Status"
                        columnKey="status"
                        distinctValues={distinctFgStatuses}
                        selectedValues={fgExcelFilters.status}
                        onFilterChange={(selected) => setFgExcelFilters((prev) => ({ ...prev, status: selected }))}
                        currentSortField={fgSortField}
                        currentSortDirection={fgSortDirection}
                        onSortChange={handleFgSortChange}
                        align="right"
                      />
                    </th>

                    {/* Non-Filter Header: Actions */}
                    <th className="py-3 px-4 text-center min-w-[110px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isFgLoading ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400">
                        Loading Finished Goods Items...
                      </td>
                    </tr>
                  ) : filteredAndSortedFgItems.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                          <Boxes size={32} className="text-slate-300" />
                          <span className="text-xs font-semibold text-slate-600">
                            {hasActiveFgFilters ? 'No FG items match your filters' : 'No Finished Goods items found'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {hasActiveFgFilters
                              ? 'Try clearing column filters or search term'
                              : 'Click "Add FG Item" to create your first component, sub-assembly, or assembly.'}
                          </span>
                          {hasActiveFgFilters && (
                            <button
                              type="button"
                              onClick={handleResetFgFilters}
                              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 transition-all cursor-pointer shadow-xs"
                            >
                              <RotateCcw size={13} />
                              <span>Reset All Filters</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedFgItems.map((item: any, idx: number) => {
                      const bomCount = Array.isArray(item.bomItems) ? item.bomItems.length : 0;
                      const isAssembly = item.classification === 'ASSEMBLY';
                      const isSubAssembly = item.classification === 'SUB_ASSEMBLY';

                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>

                          {/* Classification Badge */}
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border tracking-wider uppercase inline-flex items-center gap-1 ${
                                isAssembly
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : isSubAssembly
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-sky-50 text-sky-700 border-sky-200'
                              }`}
                            >
                              {isAssembly ? 'Assembly' : isSubAssembly ? 'Sub-Assembly' : 'Component'}
                            </span>
                          </td>

                          {/* Item Name + Attachment Icons */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenPreviewFg(item)}
                                className="font-extrabold text-slate-900 hover:text-orange-600 transition-colors text-left cursor-pointer group block"
                                title="Click to view full preview & audit trail"
                              >
                                <span className="underline decoration-slate-300 group-hover:decoration-orange-500 underline-offset-2">
                                  {item.name}
                                </span>
                              </button>
                              <div className="flex items-center gap-1 shrink-0">
                                {((Array.isArray(item.photos) && item.photos.length > 0) || item.photoUrl) && (
                                  <span
                                    className="p-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200"
                                    title={`${(item.photos?.length) || 1} photo(s) attached`}
                                  >
                                    <ImageIcon size={11} />
                                  </span>
                                )}
                                {item.pdfUrl && (
                                  <span
                                    className="p-1 rounded-md bg-red-50 text-red-600 border border-red-200"
                                    title="Technical drawing / datasheet PDF attached"
                                  >
                                    <FileText size={11} />
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Revision Pill */}
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-300">
                              {item.revision || 'Rev 1.0'}
                            </span>
                          </td>

                          {/* Description */}
                          <td className="py-3 px-4">
                            <div className="text-[11px] text-slate-600 max-w-xs truncate" title={item.description}>
                              {item.description || '—'}
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3 px-4">
                            <span className="text-slate-700 font-medium">
                              {item.categoryName || item.categoryCode || 'Component Master'}
                            </span>
                          </td>

                          {/* BOM Attached Count */}
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                                bomCount > 0
                                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                                  : 'bg-slate-50 text-slate-400 border-slate-200'
                              }`}
                            >
                              {bomCount} {bomCount === 1 ? 'Material' : 'Materials'}
                            </span>
                          </td>

                          {/* Primary UOM */}
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                            {item.uom || 'NOS'}
                          </td>

                          {/* HSN Code */}
                          <td className="py-3 px-4 text-center font-mono text-slate-600">
                            {item.hsnCode || '8479'}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                item.isActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${item.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}
                              />
                              <span>{item.isActive ? 'Active' : 'Inactive'}</span>
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-1">
                              {/* Preview Eye */}
                              <button
                                type="button"
                                onClick={() => handleOpenPreviewFg(item)}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-orange-50 text-slate-500 hover:text-orange-600 transition-colors cursor-pointer"
                                title="Preview Details, BOM & Audit Trail"
                              >
                                <Eye size={13} />
                              </button>

                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditFg(item)}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                                title="Edit FG Item Specifications & BOM"
                              >
                                <Edit2 size={13} />
                              </button>

                              {/* New Revision */}
                              <button
                                type="button"
                                onClick={() => handleOpenRevisionFg(item)}
                                className="p-1.5 rounded-lg border border-purple-200 hover:bg-purple-50 text-purple-600 transition-colors cursor-pointer"
                                title="Branch New Revision (Keep Current, Clone BOM)"
                              >
                                <GitBranch size={13} />
                              </button>

                              {/* Toggle Active */}
                              <button
                                type="button"
                                onClick={() => handleToggleFgActive(item)}
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                  item.isActive
                                    ? 'border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-600'
                                    : 'border-emerald-200 hover:bg-emerald-50 text-emerald-600'
                                }`}
                                title={item.isActive ? 'Deactivate FG Item' : 'Activate FG Item'}
                              >
                                {item.isActive ? <Lock size={13} /> : <CheckCircle2 size={13} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: CATEGORIES */}
      {currentSubTab === 'categories' && (
        <div className="space-y-4">
          {/* Dedicated In-Line Table Action Toolbar (Search on Left, Add New & Reset on Right) */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Left: Dedicated In-Line Search Bar */}
            <div className="relative flex-1 min-w-[260px] max-w-lg">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search categories by code, name, type, description..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium transition-all"
              />
              {categorySearch && (
                <button
                  type="button"
                  onClick={() => setCategorySearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Right: Reset Filters + Add Category Button */}
            <div className="flex items-center gap-2 shrink-0">
              {hasActiveCategoryFilters && (
                <button
                  type="button"
                  onClick={handleResetCategoryFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-all cursor-pointer shadow-2xs"
                  title="Reset all active column filters and search"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filters</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenCreateCategory}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
              >
                <Plus size={14} />
                <span>Add Category</span>
              </button>
            </div>
          </div>

          {/* Categories Table with Column-Based Excel Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-600">
                  <tr>
                    {/* Non-Filter Header: Row Serial Number */}
                    <th className="py-3 px-4 w-12 text-center">#</th>

                    {/* Excel Filter: Category Name */}
                    <th className="py-3 px-4 min-w-[280px]">
                      <ExcelColumnFilter
                        title="Category Name *"
                        columnKey="name"
                        distinctValues={distinctCategoryNames}
                        selectedValues={categoryExcelFilters.name}
                        onFilterChange={(selected) => setCategoryExcelFilters((prev) => ({ ...prev, name: selected }))}
                        currentSortField={categorySortField}
                        currentSortDirection={categorySortDirection}
                        onSortChange={handleCategorySortChange}
                      />
                    </th>

                    {/* Non-Filter Header: Description */}
                    <th className="py-3 px-4 min-w-[320px]">Description</th>

                    {/* Excel Filter: Status */}
                    <th className="py-3 px-4 text-center min-w-[120px]">
                      <ExcelColumnFilter
                        title="Status"
                        columnKey="status"
                        distinctValues={distinctCategoryStatuses}
                        selectedValues={categoryExcelFilters.status}
                        onFilterChange={(selected) => setCategoryExcelFilters((prev) => ({ ...prev, status: selected }))}
                        currentSortField={categorySortField}
                        currentSortDirection={categorySortDirection}
                        onSortChange={handleCategorySortChange}
                        align="right"
                      />
                    </th>

                    {/* Non-Filter Header: Actions */}
                    <th className="py-3 px-4 text-center min-w-[110px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isCategoriesLoading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Loading Categories...
                      </td>
                    </tr>
                  ) : filteredAndSortedCategories.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                          <Tag size={32} className="text-slate-300" />
                          <span className="text-xs font-semibold text-slate-600">
                            {hasActiveCategoryFilters ? 'No categories match your filters' : 'No Categories found'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {hasActiveCategoryFilters
                              ? 'Try clearing column filters or search term'
                              : 'Click "Add Category" to create your first design category.'}
                          </span>
                          {hasActiveCategoryFilters && (
                            <button
                              type="button"
                              onClick={handleResetCategoryFilters}
                              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 transition-all cursor-pointer shadow-xs"
                            >
                              <RotateCcw size={13} />
                              <span>Reset All Filters</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedCategories.map((cat: any, idx: number) => {
                      const isActive = cat.isActive !== false;
                      return (
                        <tr key={cat.id || idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>

                          {/* Category Name (Clickable Identifier) */}
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => setPreviewCategory(cat)}
                              className="font-extrabold text-slate-900 hover:text-orange-600 transition-colors text-left cursor-pointer group block"
                              title="Click to view details & audit trail"
                            >
                              <span className="underline decoration-slate-300 group-hover:decoration-orange-500 underline-offset-2">
                                {cat.name}
                              </span>
                            </button>
                          </td>

                          {/* Description */}
                          <td className="py-3 px-4 text-slate-600 max-w-md truncate" title={cat.description}>
                            {cat.description || '—'}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}
                              />
                              <span>{isActive ? 'Active' : 'Inactive'}</span>
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-1">
                              {/* Preview Eye */}
                              <button
                                type="button"
                                onClick={() => setPreviewCategory(cat)}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-orange-50 text-slate-500 hover:text-orange-600 transition-colors cursor-pointer"
                                title="Preview Details & Audit Trail"
                              >
                                <Eye size={13} />
                              </button>

                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditCategory(cat)}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                                title="Edit Category"
                              >
                                <Edit2 size={13} />
                              </button>

                              {/* Toggle Active */}
                              <button
                                type="button"
                                onClick={() => handleToggleCategoryActive(cat)}
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                  isActive
                                    ? 'border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-600'
                                    : 'border-emerald-200 hover:bg-emerald-50 text-emerald-600'
                                }`}
                                title={isActive ? 'Deactivate Category' : 'Activate Category'}
                              >
                                {isActive ? <Lock size={13} /> : <CheckCircle2 size={13} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB: PROJECT SUB-STAGES */}
      {currentSubTab === 'sub-stages' && (
        <div className="space-y-4">
          {/* Dedicated In-Line Table Action Toolbar (Search on Left, Add New & Reset on Right) */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Left: Dedicated In-Line Search Bar */}
            <div className="relative flex-1 min-w-[260px] max-w-lg">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search sub-stages by name, description..."
                value={subStageSearch}
                onChange={(e) => setSubStageSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium transition-all"
              />
              {subStageSearch && (
                <button
                  type="button"
                  onClick={() => setSubStageSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Right: Reset Filters + Add Sub-Stage Button */}
            <div className="flex items-center gap-2 shrink-0">
              {hasActiveSubStageFilters && (
                <button
                  type="button"
                  onClick={handleResetSubStageFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-all cursor-pointer shadow-2xs"
                  title="Reset all active column filters and search"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filters</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenCreateSubStage}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
              >
                <Plus size={14} />
                <span>Add Sub-Stage</span>
              </button>
            </div>
          </div>

          {/* Sub-Stages Table with Column-Based Excel Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-600">
                  <tr>
                    {/* Non-Filter Header: Row Serial Number */}
                    <th className="py-3 px-4 w-12 text-center">#</th>

                    {/* Excel Filter: Sub-Stage Name */}
                    <th className="py-3 px-4 min-w-[280px]">
                      <ExcelColumnFilter
                        title="Sub-Stage Name *"
                        columnKey="name"
                        distinctValues={distinctSubStageNames}
                        selectedValues={subStageExcelFilters.name}
                        onFilterChange={(selected) => setSubStageExcelFilters((prev) => ({ ...prev, name: selected }))}
                        currentSortField={subStageSortField}
                        currentSortDirection={subStageSortDirection}
                        onSortChange={handleSubStageSortChange}
                      />
                    </th>

                    {/* Non-Filter Header: Description */}
                    <th className="py-3 px-4 min-w-[320px]">Description</th>

                    {/* Excel Filter: Status */}
                    <th className="py-3 px-4 text-center min-w-[120px]">
                      <ExcelColumnFilter
                        title="Status"
                        columnKey="status"
                        distinctValues={distinctSubStageStatuses}
                        selectedValues={subStageExcelFilters.status}
                        onFilterChange={(selected) => setSubStageExcelFilters((prev) => ({ ...prev, status: selected }))}
                        currentSortField={subStageSortField}
                        currentSortDirection={subStageSortDirection}
                        onSortChange={handleSubStageSortChange}
                        align="right"
                      />
                    </th>

                    {/* Non-Filter Header: Actions */}
                    <th className="py-3 px-4 text-center min-w-[110px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isSubStagesLoading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Loading Sub-Stages...
                      </td>
                    </tr>
                  ) : filteredAndSortedSubStages.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                          <Workflow size={32} className="text-slate-300" />
                          <span className="text-xs font-semibold text-slate-600">
                            {hasActiveSubStageFilters ? 'No sub-stages match your filters' : 'No Sub-Stages found'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {hasActiveSubStageFilters
                              ? 'Try clearing column filters or search term'
                              : 'Click "Add Sub-Stage" to create your first project sub-stage.'}
                          </span>
                          {hasActiveSubStageFilters && (
                            <button
                              type="button"
                              onClick={handleResetSubStageFilters}
                              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 transition-all cursor-pointer shadow-xs"
                            >
                              <RotateCcw size={13} />
                              <span>Reset All Filters</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedSubStages.map((s: any, idx: number) => {
                      const isActive = s.isActive !== false;
                      const displayName = s.name || s.subStageName || 'Unnamed Sub-Stage';
                      return (
                        <tr key={s.id || idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>

                          {/* Sub-Stage Name (Clickable Identifier) */}
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => setPreviewSubStage(s)}
                              className="font-extrabold text-slate-900 hover:text-orange-600 transition-colors text-left cursor-pointer group block"
                              title="Click to view details & audit trail"
                            >
                              <span className="underline decoration-slate-300 group-hover:decoration-orange-500 underline-offset-2">
                                {displayName}
                              </span>
                            </button>
                          </td>

                          {/* Description */}
                          <td className="py-3 px-4 text-slate-600 max-w-md truncate" title={s.description}>
                            {s.description || <span className="text-slate-300 italic">—</span>}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isActive ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                              />
                              <span>{isActive ? 'Active' : 'Inactive'}</span>
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-1">
                              {/* Preview */}
                              <button
                                type="button"
                                onClick={() => setPreviewSubStage(s)}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-orange-50 text-slate-500 hover:text-orange-600 transition-colors cursor-pointer"
                                title="Preview Details & Audit Trail"
                              >
                                <Eye size={13} />
                              </button>

                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditSubStage(s)}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                                title="Edit Sub-Stage"
                              >
                                <Edit2 size={13} />
                              </button>

                              {/* Toggle Active */}
                              <button
                                type="button"
                                onClick={() => handleToggleSubStageActive(s)}
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                  isActive
                                    ? 'border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-600'
                                    : 'border-emerald-200 hover:bg-emerald-50 text-emerald-600'
                                }`}
                                title={isActive ? 'Deactivate Sub-Stage' : 'Activate Sub-Stage'}
                              >
                                {isActive ? <Lock size={13} /> : <CheckCircle2 size={13} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: PREFIX & LOCK POLICY */}
      {currentSubTab === 'prefix-policy' && (
        <form onSubmit={handleSavePolicy} className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Settings size={16} className="text-orange-500" />
                <span>Design Prefixes &amp; Automated Lock Policy</span>
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isSavingPolicy}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all disabled:opacity-50"
              >
                <Save size={13} />
                <span>{isSavingPolicy ? 'Saving Policy...' : 'Save Design Policy'}</span>
              </button>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Sparkles size={14} className="text-orange-500" />
              <span>Standard Engineering Item Prefixes</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Raw Material (RM) Prefix
                </label>
                <input
                  type="text"
                  required
                  value={policyForm.rmPrefix}
                  onChange={(e) => setPolicyForm({ ...policyForm, rmPrefix: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900 focus:bg-white focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Bought-Out (BO) Prefix
                </label>
                <input
                  type="text"
                  required
                  value={policyForm.boPrefix}
                  onChange={(e) => setPolicyForm({ ...policyForm, boPrefix: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900 focus:bg-white focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Component (CMP) Prefix
                </label>
                <input
                  type="text"
                  required
                  value={policyForm.componentPrefix}
                  onChange={(e) => setPolicyForm({ ...policyForm, componentPrefix: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900 focus:bg-white focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Sub-Assembly (SUB) Prefix
                </label>
                <input
                  type="text"
                  required
                  value={policyForm.subAssemblyPrefix}
                  onChange={(e) => setPolicyForm({ ...policyForm, subAssemblyPrefix: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900 focus:bg-white focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Assembly / Machine Model (ASM)
                </label>
                <input
                  type="text"
                  required
                  value={policyForm.assemblyPrefix}
                  onChange={(e) => setPolicyForm({ ...policyForm, assemblyPrefix: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900 focus:bg-white focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  BOM Identifier Prefix
                </label>
                <input
                  type="text"
                  required
                  value={policyForm.bomPrefix}
                  onChange={(e) => setPolicyForm({ ...policyForm, bomPrefix: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900 focus:bg-white focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ECO / Freeze Order Prefix
                </label>
                <input
                  type="text"
                  required
                  value={policyForm.ecoPrefix}
                  onChange={(e) => setPolicyForm({ ...policyForm, ecoPrefix: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900 focus:bg-white focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Lock size={14} className="text-orange-500" />
              <span>Automated Locking &amp; Sourcing Governance</span>
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-900 block">
                    Lock BOM Lines on ECO / Freeze Approval
                  </span>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    When an Engineering Change Order (ECO) is approved, automatically freezes linked active BOM items and blocks direct edits without an ECO revision.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPolicyForm({ ...policyForm, lockBomOnFreeze: !policyForm.lockBomOnFreeze })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    policyForm.lockBomOnFreeze ? 'bg-orange-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      policyForm.lockBomOnFreeze ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-900 block">
                    Auto-Send Net Shortage Demand to Purchase
                  </span>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    On final BOM baseline approval, automatically deducts unreserved stock in store and dispatches net purchase demand directly to Purchase &amp; Sourcing module.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setPolicyForm({
                      ...policyForm,
                      autoSendNetDemandToPurchase: !policyForm.autoSendNetDemandToPurchase
                    })
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    policyForm.autoSendNetDemandToPurchase ? 'bg-orange-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      policyForm.autoSendNetDemandToPurchase ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* SUB-TAB 6: DESIGN TEAM (Work Assignment Roster) */}
      {currentSubTab === 'team' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Users size={16} className="text-orange-500" />
                <span>Design Engineering Team</span>
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-xs">
                <span className="text-[10px] font-bold uppercase text-orange-800 mr-1.5">Design Team:</span>
                <span className="font-mono font-extrabold text-orange-900">{teamMetrics.total}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                <span className="text-[10px] font-bold uppercase text-emerald-800 mr-1.5">Online Now:</span>
                <span className="font-mono font-extrabold text-emerald-900">{teamMetrics.online}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-600">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Engineer / User</th>
                    <th className="py-3 px-4">Role &amp; Designation</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Contact Email &amp; Phone</th>
                    <th className="py-3 px-4">Plant Works</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Work Assignment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isTeamLoading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Loading Design Team...
                      </td>
                    </tr>
                  ) : filteredTeam.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                          <Users size={32} className="text-slate-300" />
                          <span className="text-xs font-semibold text-slate-600">No Design Team members found</span>
                          <span className="text-[11px] text-slate-400">
                            {searchTerm ? 'Try adjusting your search filter' : 'No users currently assigned to Design.'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTeam.map((member: any, idx: number) => {
                      const initials = `${(member.firstName || member.name || 'D')[0]}${
                        (member.lastName || '')[0] || ''
                      }`.toUpperCase();

                      return (
                        <tr key={member.id || idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                          
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="relative w-9 h-9 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center font-bold text-orange-700 text-xs shrink-0">
                                {initials}
                                {member.isOnline && (
                                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-300" />
                                )}
                              </div>
                              <div>
                                <div className="font-extrabold text-slate-900">{member.name}</div>
                                <div className="text-[11px] font-mono text-slate-500">{member.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-800">{member.roleName}</div>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              {member.accessBadge || 'Design Access'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-700">
                              {member.departmentLabel || member.department}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px]">
                                <Mail size={12} className="text-slate-400" />
                                <span>{member.email}</span>
                              </div>
                              {member.phone && (
                                <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px]">
                                  <Phone size={12} className="text-slate-400" />
                                  <span>{member.phone}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                            <div className="flex items-center gap-1">
                              <MapPin size={12} className="text-slate-400 shrink-0" />
                              <span className="truncate max-w-[160px]">{member.plantLocation}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {member.isOnline ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Online</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                <Clock size={11} className="text-slate-400" />
                                <span>Offline</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200 shadow-xs">
                              <UserCheck size={12} />
                              <span>Eligible for Tasks</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RM ITEM CREATION & EDIT MODAL (Standard Action Form Sizing & Ribbon) */}
      {rmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 md:p-6 overflow-y-auto">
          <div className="w-full max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto">
            {/* Header Ribbon Standard */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                    {rmModal.mode === 'EDIT' ? 'Edit RM & BO Item' : 'Add New RM / BO Item'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRmModal(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveRm} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                {rmFormError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2.5">
                    <AlertCircle size={16} className="text-red-600 shrink-0" />
                    <span className="font-medium">{rmFormError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name (Compulsory & Unique) */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Item Name * <span className="text-orange-600 font-normal">(Compulsory &amp; Unique Identifier)</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={rmForm.name}
                      onChange={(e) => setRmForm({ ...rmForm, name: e.target.value })}
                      placeholder="e.g. EN24 Alloy Steel Round Bar Dia 40mm or Siemens 1FK7 Servo Motor"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-orange-500"
                    />
                  </div>

                  {/* Make / Brand */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Make / Brand / Manufacturer
                    </label>
                    <input
                      type="text"
                      value={rmForm.make}
                      onChange={(e) => setRmForm({ ...rmForm, make: e.target.value })}
                      placeholder="e.g. Tata Steel, Siemens, THK, Festo, Jindal, Omron"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500"
                    />
                  </div>

                  {/* Category (Searchable from Category Master) */}
                  <div className="relative">
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Category * <span className="text-slate-400 font-normal">(from Category Master)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-left text-slate-900 flex items-center justify-between hover:bg-white hover:border-orange-500 transition-colors cursor-pointer"
                    >
                      <span className="truncate">{rmForm.categoryName || 'Select Category...'}</span>
                      <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />
                    </button>

                    {isCategoryDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-2xl z-50 p-2 space-y-1.5 max-h-56 overflow-y-auto">
                        <div className="relative">
                          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            autoFocus
                            value={categorySearchKeyword}
                            onChange={(e) => setCategorySearchKeyword(e.target.value)}
                            placeholder="Type keyword to filter categories..."
                            className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div className="space-y-0.5">
                          {filteredModalCategories.map((c: any) => (
                            <button
                              key={c.id || c.name}
                              type="button"
                              onClick={() => {
                                setRmForm({ ...rmForm, categoryCode: c.name, categoryName: c.name });
                                setIsCategoryDropdownOpen(false);
                                setCategorySearchKeyword('');
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-orange-50 hover:text-orange-900 transition-colors cursor-pointer ${
                                rmForm.categoryName === c.name ? 'bg-orange-100/70 text-orange-950 font-bold' : 'text-slate-700'
                              }`}
                            >
                              <div className="truncate pr-2">
                                <div className="font-semibold text-slate-900">{c.name}</div>
                                {c.description && <div className="text-[10px] text-slate-400 truncate">{c.description}</div>}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* UOM */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Unit of Measurement (UOM) *
                    </label>
                    <select
                      value={rmForm.uom}
                      onChange={(e) => setRmForm({ ...rmForm, uom: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-orange-500"
                    >
                      <option value="Kg">Kg (Kilograms)</option>
                      <option value="Meters">Meters</option>
                      <option value="Nos">Nos (Pieces)</option>
                      <option value="Sheet">Sheet</option>
                      <option value="Bar">Bar</option>
                      <option value="Feet">Feet</option>
                      <option value="Roll">Roll</option>
                    </select>
                  </div>

                  {/* HSN Code */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      HSN / Tariff Code
                    </label>
                    <input
                      type="text"
                      value={rmForm.hsnCode}
                      onChange={(e) => setRmForm({ ...rmForm, hsnCode: e.target.value })}
                      placeholder="e.g. 7228, 7208, 7407"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:border-orange-500"
                    />
                  </div>

                  {/* Standard Rate INR */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Standard Rate (₹ per {rmForm.uom})
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={rmForm.standardRateINR}
                      onChange={(e) => setRmForm({ ...rmForm, standardRateINR: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-orange-500"
                    />
                  </div>

                  {/* Description */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Description &amp; Technical Specifications
                    </label>
                    <textarea
                      rows={3}
                      value={rmForm.description}
                      onChange={(e) => setRmForm({ ...rmForm, description: e.target.value })}
                      placeholder="e.g. Ultrasonic tested EN24 rod for main winding spindle shaft, tolerance ±0.1mm, annealed condition..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500"
                    />
                  </div>

                  {/* Photos Upload Section */}
                  <div className="sm:col-span-2 space-y-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                        <ImageIcon size={14} className="text-orange-500" />
                        <span>Item Photos &amp; Images</span>
                      </label>
                      <span className="text-[10px] text-slate-400">Organized in S3 photos folder</span>
                    </div>

                    {/* Previews Grid & Upload Trigger */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {/* Existing Photos */}
                      {rmForm.photos.map((photoUrl, pIdx) => (
                        <div key={`existing-${pIdx}`} className="relative group aspect-square rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shadow-2xs">
                          <img
                            src={photoUrl}
                            alt={`Item Photo ${pIdx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingPhoto(pIdx)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-black/60 hover:bg-red-600 text-white flex items-center justify-center transition-colors cursor-pointer"
                            title="Remove photo"
                          >
                            <X size={12} />
                          </button>
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/60 text-white">
                            Saved
                          </span>
                        </div>
                      ))}

                      {/* Newly Selected Photos Previews */}
                      {photoPreviews.map((previewUrl, nIdx) => (
                        <div key={`new-${nIdx}`} className="relative group aspect-square rounded-xl border-2 border-orange-400 bg-orange-50/20 overflow-hidden shadow-2xs">
                          <img
                            src={previewUrl}
                            alt={`New Photo ${nIdx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveNewPhoto(nIdx)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-black/60 hover:bg-red-600 text-white flex items-center justify-center transition-colors cursor-pointer"
                            title="Remove photo"
                          >
                            <X size={12} />
                          </button>
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-500 text-white">
                            New
                          </span>
                        </div>
                      ))}

                      {/* Add Photos Dropzone / Button */}
                      <label className="aspect-square flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 hover:border-orange-500 rounded-xl bg-slate-50 hover:bg-orange-50/30 transition-all cursor-pointer group text-center">
                        <Upload size={18} className="text-slate-400 group-hover:text-orange-500 transition-colors mb-1" />
                        <span className="text-[11px] font-bold text-slate-600 group-hover:text-orange-600 transition-colors">
                          Add Photos
                        </span>
                        <span className="text-[9px] text-slate-400 mt-0.5">JPG, PNG, WebP</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Technical Datasheet / Drawing PDF Section */}
                  <div className="sm:col-span-2 space-y-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText size={14} className="text-red-500" />
                        <span>Technical Datasheet / Drawing (PDF)</span>
                      </label>
                      <span className="text-[10px] text-slate-400">Organized in S3 documents folder</span>
                    </div>

                    {(selectedPdfFile || rmForm.pdfUrl) ? (
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                            <FileText size={18} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 truncate block">
                              {selectedPdfFile ? selectedPdfFile.name : (rmForm.pdfName || 'Technical_Datasheet.pdf')}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-100 text-red-700 font-mono">
                                PDF
                              </span>
                              {selectedPdfFile ? (
                                <span className="text-[10px] font-semibold text-orange-600">
                                  Ready to upload ({(selectedPdfFile.size / 1024).toFixed(0)} KB)
                                </span>
                              ) : (
                                <a
                                  href={rmForm.pdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-sky-600 hover:text-sky-800 font-semibold underline flex items-center gap-0.5"
                                >
                                  View Current File
                                  <ExternalLink size={10} />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <label className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-[11px] font-bold cursor-pointer transition-colors">
                            Replace
                            <input
                              type="file"
                              accept=".pdf,application/pdf"
                              onChange={handlePdfFileChange}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={handleRemovePdf}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                            title="Remove PDF"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col sm:flex-row items-center justify-between p-3.5 border-2 border-dashed border-slate-300 hover:border-orange-500 rounded-xl bg-slate-50 hover:bg-orange-50/20 transition-all cursor-pointer group">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-400 group-hover:text-orange-500 group-hover:border-orange-300 flex items-center justify-center transition-colors shrink-0">
                            <Upload size={16} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-800 group-hover:text-orange-600 transition-colors block">
                              Attach Technical Datasheet / Specification Drawing (PDF)
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Saves in dedicated design documents folder in S3 storage
                            </span>
                          </div>
                        </div>
                        <span className="mt-2 sm:mt-0 px-3 py-1.5 rounded-lg bg-white group-hover:bg-orange-500 text-slate-700 group-hover:text-white border border-slate-200 group-hover:border-orange-500 text-[11px] font-bold shadow-2xs transition-all">
                          Select PDF
                        </span>
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          onChange={handlePdfFileChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setRmModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingRm || isUpdatingRm || isUploadingMedia}
                  className="inline-flex items-center gap-1.5 px-6 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>
                    {isUploadingMedia
                      ? 'Uploading Files to S3...'
                      : isCreatingRm || isUpdatingRm
                      ? 'Saving...'
                      : rmModal.mode === 'EDIT'
                      ? 'Update Item'
                      : 'Save Item'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RM & BO PREVIEW DOSSIER MODAL WITH FULL AUDIT TRAIL */}
      {previewRmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 md:p-6 overflow-y-auto">
          <div className="w-full max-w-3xl lg:max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header Ribbon Standard (Crisp White Header with Amber Top Stripe) */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                    {previewRmItem.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200 font-mono">
                      {previewRmItem.categoryCode?.toUpperCase().includes('BO') ? 'BO' : 'RM'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {previewRmItem.categoryName || previewRmItem.categoryCode || 'Engineering Item'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const it = previewRmItem;
                    setPreviewRmItem(null);
                    handleOpenEditRm(it);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  <Edit2 size={13} className="text-slate-500" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewRmItem(null)}
                  className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Dossier Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* Key Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Make / Brand</span>
                  <span className="text-xs font-bold text-slate-900 block mt-1">
                    {previewRmItem.make || 'Commercial / Unspecified'}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unit of Measure (UOM)</span>
                  <span className="text-xs font-bold font-mono text-slate-900 block mt-1">
                    {previewRmItem.uom || 'Kg'}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">HSN / Tariff Code</span>
                  <span className="text-xs font-bold font-mono text-slate-900 block mt-1">
                    {previewRmItem.hsnCode || '—'}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Standard Rate</span>
                  <span className="text-xs font-bold font-mono text-slate-900 block mt-1">
                    ₹{Number(previewRmItem.standardRateINR || 0).toLocaleString('en-IN')} / {previewRmItem.uom || 'Kg'}
                  </span>
                </div>
              </div>

              {/* Description & Technical Specifications */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers size={14} className="text-orange-500" />
                  Description &amp; Specifications
                </span>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {previewRmItem.description || 'No detailed specifications recorded for this raw material.'}
                </p>
              </div>

              {/* Photos Gallery Preview (if photos exist) */}
              {(() => {
                const photosList: string[] = Array.isArray(previewRmItem.photos) && previewRmItem.photos.length > 0
                  ? previewRmItem.photos
                  : (previewRmItem.photoUrl ? [previewRmItem.photoUrl] : []);

                if (photosList.length === 0) return null;

                return (
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                        <ImageIcon size={14} className="text-orange-500" />
                        <span>Item Photos &amp; Visuals ({photosList.length})</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Click any image to enlarge</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {photosList.map((pUrl, pIdx) => (
                        <div
                          key={pIdx}
                          onClick={() =>
                            setPhotoViewerModal({
                              isOpen: true,
                              url: pUrl,
                              title: `${previewRmItem.name} — Photo ${pIdx + 1}`
                            })
                          }
                          className="group relative aspect-square rounded-xl border border-slate-200 bg-slate-100 overflow-hidden cursor-pointer shadow-2xs hover:shadow-md transition-all hover:border-orange-400"
                        >
                          <img
                            src={pUrl}
                            alt={`${previewRmItem.name} photo ${pIdx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <ZoomIn size={20} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* PDF Technical Datasheet / Drawing Document (if PDF exists) */}
              {previewRmItem.pdfUrl && (
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText size={14} className="text-red-500" />
                    <span>Technical Datasheet &amp; Drawing Document</span>
                  </span>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                        <FileText size={20} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 block truncate">
                          {previewRmItem.pdfName || `${previewRmItem.name}_Datasheet.pdf`}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                          PDF Technical Document • Stored in S3 Documents
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                      {/* See PDF Button */}
                      <a
                        href={previewRmItem.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold shadow-2xs transition-colors"
                      >
                        <ExternalLink size={13} className="text-slate-500" />
                        <span>See PDF</span>
                      </a>

                      {/* Download PDF Button */}
                      <a
                        href={previewRmItem.pdfUrl}
                        download={previewRmItem.pdfName || `${previewRmItem.name}_Datasheet.pdf`}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-xs transition-colors"
                      >
                        <Download size={13} />
                        <span>Download PDF</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Status & Category Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">Category Classification</span>
                  <span className="text-xs font-semibold text-slate-900">
                    {previewRmItem.categoryName || previewRmItem.categoryCode || 'Raw Material'}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">Material Status</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      previewRmItem.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        previewRmItem.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    <span>{previewRmItem.isActive ? 'Active Material' : 'Deactivated'}</span>
                  </span>
                </div>
              </div>

              {/* Where-Used / BOM Attachments & Transaction Footprint */}
              <div className="pt-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Layers size={14} className="text-orange-500" />
                    <span>Where-Used &amp; BOM Attachments</span>
                  </span>
                  {rmWhereUsedData?.bomCheck && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        rmWhereUsedData.bomCheck.isAttached
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {rmWhereUsedData.bomCheck.isAttached
                        ? `Attached to ${rmWhereUsedData.bomCheck.count} BOM(s)`
                        : 'Zero BOM Attachments'}
                    </span>
                  )}
                </span>

                <div className="space-y-2.5">
                  {isRmWhereUsedFetching ? (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500 font-medium">
                      Loading BOM attachment references...
                    </div>
                  ) : rmWhereUsedData?.bomCheck?.isAttached ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                      <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span>Attached Assembly / Project BOM</span>
                        <span>Quantity Required</span>
                      </div>
                      <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto text-xs">
                        {rmWhereUsedData.bomCheck.attachments.map((att: any, aIdx: number) => (
                          <div key={aIdx} className="px-3.5 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-600">
                                {att.classification || att.type}
                              </span>
                              <span className="font-bold text-slate-900">{att.name || att.assemblyName}</span>
                            </div>
                            <span className="font-semibold text-slate-700 text-[11px]">
                              {att.quantity} {att.uom || 'Nos'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                      <span>Not attached to any BOM. (Safe to delete if no past transactions exist).</span>
                    </div>
                  )}

                  {rmWhereUsedData?.txCheck && (
                    <div
                      className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between ${
                        rmWhereUsedData.txCheck.hasTransactions
                          ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <span className="font-bold">Transaction History:</span>
                      <span className="text-[11px]">
                        {rmWhereUsedData.txCheck.hasTransactions
                          ? `${rmWhereUsedData.txCheck.summary} (Deactivation only)`
                          : 'No past transactions (Clean record)'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Record Audit & Universal Action Tracking Trail */}
              <div className="pt-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-orange-500" />
                  <span>Audit Trail &amp; Record History</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Created By Card */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3 shadow-2xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                        <UserCheck size={16} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Created By
                        </span>
                        <span className="text-xs font-bold text-slate-900 block mt-0.5">
                          {previewRmItem.createdByName || 'System Provisioned'}
                        </span>
                        {previewRmItem.createdById && (
                          <span className="text-[10px] font-mono text-slate-400 block">
                            User ID: {previewRmItem.createdById.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-end gap-1">
                        <Clock size={11} className="text-slate-400" />
                        Created At
                      </span>
                      <span className="text-[11px] font-semibold text-slate-700 block mt-0.5">
                        {previewRmItem.createdAt
                          ? new Date(previewRmItem.createdAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })
                          : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Last Updated By Card */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3 shadow-2xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                        <UserCheck size={16} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Last Updated By
                        </span>
                        <span className="text-xs font-bold text-slate-900 block mt-0.5">
                          {previewRmItem.updatedByName || previewRmItem.createdByName || 'System Provisioned'}
                        </span>
                        {previewRmItem.updatedById && (
                          <span className="text-[10px] font-mono text-slate-400 block">
                            User ID: {previewRmItem.updatedById.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-end gap-1">
                        <Clock size={11} className="text-slate-400" />
                        Updated At
                      </span>
                      <span className="text-[11px] font-semibold text-slate-700 block mt-0.5">
                        {previewRmItem.updatedAt
                          ? new Date(previewRmItem.updatedAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT / REVISION FG ITEM MODAL */}
      {fgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 md:p-6 overflow-y-auto">
          <div className="w-full max-w-6xl xl:max-w-7xl max-h-[92vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header Ribbon Standard (Crisp White Header with Amber Top Stripe) */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Boxes size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                    {fgModal.mode === 'CREATE'
                      ? 'Add New FG Item'
                      : fgModal.mode === 'REVISION'
                      ? `Create New Revision — ${fgForm.name}`
                      : `Edit FG Item — ${fgForm.name}`}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase font-mono">
                      {fgForm.classification.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {fgModal.mode === 'REVISION'
                        ? 'Clones specifications and BOM into a new revision version'
                        : 'Configure item classification, attached BOM materials, drawings, and photos'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFgModal(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form Body (2-Column Master Layout) */}
            <form onSubmit={handleSaveFg} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                {fgFormError && (
                  <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{fgFormError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* LEFT COLUMN: Item Details, Storage & Inventory, Drawings & Photos */}
                  <div className="lg:col-span-5 space-y-5">
                    {/* CARD 1: ITEM DETAILS */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3.5">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                          Item Details
                        </h4>
                      </div>

                      {/* Classification, Category & Revision */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* 3 Fixed Classifications */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-800 mb-1">
                            Classification *
                          </label>
                          <select
                            value={fgForm.classification}
                            onChange={(e) =>
                              setFgForm({
                                ...fgForm,
                                classification: e.target.value as 'COMPONENT' | 'SUB_ASSEMBLY' | 'ASSEMBLY'
                              })
                            }
                            className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-orange-500"
                          >
                            <option value="COMPONENT">Component</option>
                            <option value="SUB_ASSEMBLY">Sub-Assembly</option>
                            <option value="ASSEMBLY">Assembly</option>
                          </select>
                        </div>

                        {/* Category */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-800 mb-1">
                            Category
                          </label>
                          <select
                            value={fgForm.categoryName}
                            onChange={(e) => {
                              setFgForm({
                                ...fgForm,
                                categoryCode: e.target.value,
                                categoryName: e.target.value
                              });
                            }}
                            className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500 truncate"
                          >
                            <option value="">Select Category...</option>
                            {categories.map((c: any) => (
                              <option key={c.id || c.name} value={c.name}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Revision */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-800 mb-1">
                            Revision *
                          </label>
                          <input
                            type="text"
                            value={fgForm.revision}
                            onChange={(e) => setFgForm({ ...fgForm, revision: e.target.value })}
                            placeholder="e.g. Rev 1.0"
                            className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-orange-500"
                            required
                          />
                        </div>
                      </div>

                      {/* Item Name */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-800 mb-1">
                          Item Name *
                        </label>
                        <input
                          type="text"
                          value={fgForm.name}
                          onChange={(e) => setFgForm({ ...fgForm, name: e.target.value })}
                          disabled={fgModal.mode === 'REVISION'}
                          placeholder="e.g. RRO420-01-02-00-01"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-orange-500 disabled:opacity-75 disabled:bg-slate-100"
                          required
                        />
                        {fgModal.mode === 'REVISION' && (
                          <span className="text-[10px] text-purple-600 mt-1 block">
                            Item name is locked during revision creation.
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-800 mb-1">
                          Description
                        </label>
                        <textarea
                          rows={2}
                          value={fgForm.description}
                          onChange={(e) => setFgForm({ ...fgForm, description: e.target.value })}
                          placeholder="e.g. TROLLEY SHAFT MACHINED - CNC turned and precision ground main spindle shaft..."
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500"
                        />
                      </div>
                    </div>

                    {/* CARD 2: UNITS & TAX CLASSIFICATION */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3.5">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <div className="w-1.5 h-4 bg-sky-500 rounded-full" />
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                          Unit &amp; Tax Classification
                        </h4>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Primary Unit (UOM) */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-800 mb-1">
                            Primary Unit *
                          </label>
                          <input
                            type="text"
                            value={fgForm.uom}
                            onChange={(e) => setFgForm({ ...fgForm, uom: e.target.value })}
                            placeholder="e.g. NOS, Set, Kg"
                            className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-orange-500 uppercase"
                            required
                          />
                        </div>

                        {/* HSN Code */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-800 mb-1">
                            HSN / SAC Code
                          </label>
                          <input
                            type="text"
                            value={fgForm.hsnCode}
                            onChange={(e) => setFgForm({ ...fgForm, hsnCode: e.target.value })}
                            placeholder="e.g. 8479, 84381010"
                            className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:border-orange-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* CARD 3: DRAWINGS & PHOTOS */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3.5">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                            Drawings &amp; Photos
                          </h4>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">PDF / Images</span>
                      </div>

                      {/* Photos Upload Section */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                            <ImageIcon size={13} className="text-orange-500" />
                            <span>Photos</span>
                          </label>
                          <span className="text-[10px] text-slate-400">JPG, PNG</span>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                          {/* Existing Photos */}
                          {fgForm.photos.map((pUrl, pIdx) => (
                            <div key={`existing-${pIdx}`} className="relative group aspect-square rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                              <img src={pUrl} alt={`Photo ${pIdx + 1}`} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => handleRemoveExistingFgPhoto(pIdx)}
                                className="absolute top-1 right-1 w-5 h-5 rounded-md bg-black/60 hover:bg-red-600 text-white flex items-center justify-center transition-colors cursor-pointer"
                                title="Remove photo"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))}

                          {/* New Photo Previews */}
                          {fgPhotoPreviews.map((pUrl, nIdx) => (
                            <div key={`new-${nIdx}`} className="relative group aspect-square rounded-xl border-2 border-orange-400 bg-orange-50/20 overflow-hidden">
                              <img src={pUrl} alt={`New Photo ${nIdx + 1}`} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => handleRemoveNewFgPhoto(nIdx)}
                                className="absolute top-1 right-1 w-5 h-5 rounded-md bg-black/60 hover:bg-red-600 text-white flex items-center justify-center transition-colors cursor-pointer"
                                title="Remove photo"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))}

                          {/* Add Photos Button */}
                          <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-orange-500 rounded-xl bg-slate-50 hover:bg-orange-50/20 transition-all cursor-pointer group text-center p-2">
                            <Upload size={14} className="text-slate-400 group-hover:text-orange-500 mb-1" />
                            <span className="text-[10px] font-bold text-slate-600 group-hover:text-orange-600">
                              + Photos
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleFgPhotoFileChange}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>

                      {/* PDF Technical Drawing / Datasheet Section */}
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                          <FileText size={13} className="text-red-500" />
                          <span>Technical Drawing / Spec Sheet (PDF)</span>
                        </label>

                        {(fgSelectedPdfFile || fgForm.pdfUrl) ? (
                          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                                <FileText size={16} />
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-slate-900 truncate block">
                                  {fgSelectedPdfFile ? fgSelectedPdfFile.name : (fgForm.pdfName || 'Drawing.pdf')}
                                </span>
                                {fgSelectedPdfFile ? (
                                  <span className="text-[10px] font-semibold text-orange-600 block">
                                    Ready to upload ({(fgSelectedPdfFile.size / 1024).toFixed(0)} KB)
                                  </span>
                                ) : (
                                  <a
                                    href={fgForm.pdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-sky-600 hover:text-sky-800 font-semibold underline flex items-center gap-0.5"
                                  >
                                    View Current PDF
                                    <ExternalLink size={9} />
                                  </a>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <label className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-[10px] font-bold cursor-pointer">
                                Replace
                                <input
                                  type="file"
                                  accept=".pdf,application/pdf"
                                  onChange={handleFgPdfFileChange}
                                  className="hidden"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={handleRemoveFgPdf}
                                className="p-1 rounded-lg border border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                                title="Remove PDF"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="flex items-center justify-between p-3 border-2 border-dashed border-slate-300 hover:border-orange-500 rounded-xl bg-slate-50 hover:bg-orange-50/20 transition-all cursor-pointer group">
                            <div className="flex items-center gap-2.5">
                              <Upload size={14} className="text-slate-400 group-hover:text-orange-500" />
                              <span className="text-xs font-bold text-slate-700 group-hover:text-orange-600">
                                Choose files to attach (PDF)
                              </span>
                            </div>
                            <span className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 text-[10px] font-bold">
                              Select PDF
                            </span>
                            <input
                              type="file"
                              accept=".pdf,application/pdf"
                              onChange={handleFgPdfFileChange}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: BILL OF MATERIALS (BOM) EDITOR */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-4">
                      {/* BOM Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-4 bg-purple-500 rounded-full" />
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                            Bill of Materials (BOM)
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            {fgForm.bomItems.length} {fgForm.bomItems.length === 1 ? 'item' : 'items'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddBomItem}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold shadow-2xs cursor-pointer transition-all"
                        >
                          <Plus size={13} />
                          <span>+ Add Material</span>
                        </button>
                      </div>

                      {/* BOM Items List */}
                      {fgForm.bomItems.length === 0 ? (
                        <div className="py-12 px-4 rounded-xl border-2 border-dashed border-slate-200 text-center">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <Layers size={28} className="text-slate-300" />
                            <span className="text-xs font-bold text-slate-600">
                              No materials attached to this BOM yet
                            </span>
                            <p className="text-[11px] text-slate-400 max-w-sm">
                              Attach RM-BO items (raw stocks, bought-out hardware) or FG items (child components and sub-assemblies).
                            </p>
                            <button
                              type="button"
                              onClick={handleAddBomItem}
                              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
                            >
                              <Plus size={13} />
                              <span>Add First BOM Item</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {fgForm.bomItems.map((line, lIdx) => {
                            const isRmBo = line.itemType === 'RM-BO';

                            return (
                              <div
                                key={lIdx}
                                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-orange-300 transition-all space-y-2.5 shadow-2xs"
                              >
                                {/* Row Top Toolbar */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-600 text-[10px] font-mono font-bold flex items-center justify-center">
                                      #{lIdx + 1}
                                    </span>

                                    {/* Two-Type Switcher Pill (RM-BO vs FG) */}
                                    <div className="inline-flex rounded-lg p-0.5 bg-slate-200/70 border border-slate-300">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleUpdateBomItem(lIdx, {
                                            itemType: 'RM-BO',
                                            itemName: '',
                                            uom: 'Nos'
                                          })
                                        }
                                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                          isRmBo
                                            ? 'bg-orange-500 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                      >
                                        RM-BO
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleUpdateBomItem(lIdx, {
                                            itemType: 'FG',
                                            itemName: '',
                                            uom: 'NOS'
                                          })
                                        }
                                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                          !isRmBo
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                      >
                                        FG
                                      </button>
                                    </div>

                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase font-mono ${
                                        isRmBo
                                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                      }`}
                                    >
                                      {isRmBo ? 'Raw Material / Bought-Out' : 'Component / Sub-Assembly'}
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBomItem(lIdx)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                    title="Delete BOM Item"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>

                                {/* Item Selector & Quantity Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                                  {/* Item Dropdown */}
                                  <div className="sm:col-span-8">
                                    <select
                                      value={line.itemName}
                                      onChange={(e) => {
                                        const selectedName = e.target.value;
                                        if (isRmBo) {
                                          const matched = rmItems.find((r: any) => r.name === selectedName);
                                          handleUpdateBomItem(lIdx, {
                                            itemName: selectedName,
                                            itemId: matched?.id || matched?._id,
                                            uom: matched?.uom || 'Nos',
                                            description: matched?.description || ''
                                          });
                                        } else {
                                          const matched = fgItems.find((f: any) => f.name === selectedName);
                                          handleUpdateBomItem(lIdx, {
                                            itemName: selectedName,
                                            itemId: matched?.id || matched?._id,
                                            uom: matched?.uom || 'NOS',
                                            description: matched?.description || ''
                                          });
                                        }
                                      }}
                                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-orange-500 truncate"
                                      required
                                    >
                                      <option value="">
                                        {isRmBo ? '— Select RM & BO Item —' : '— Select Child FG Item —'}
                                      </option>
                                      {isRmBo
                                        ? rmItems.map((r: any) => (
                                            <option key={r.id || r._id} value={r.name}>
                                              {r.name} ({r.uom || 'Nos'}) — {r.make || 'Standard'}
                                            </option>
                                          ))
                                        : fgItems
                                            .filter((f: any) => f.name !== fgForm.name)
                                            .map((f: any) => (
                                              <option key={f.id || f._id} value={f.name}>
                                                {f.name} ({f.revision}) — {f.classification}
                                              </option>
                                            ))}
                                    </select>
                                  </div>

                                  {/* Quantity */}
                                  <div className="sm:col-span-2">
                                    <input
                                      type="number"
                                      min={0.001}
                                      step="any"
                                      value={line.quantity}
                                      onChange={(e) =>
                                        handleUpdateBomItem(lIdx, {
                                          quantity: Number(e.target.value)
                                        })
                                      }
                                      className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 text-center focus:border-orange-500"
                                      placeholder="Qty"
                                      required
                                    />
                                  </div>

                                  {/* Primary UOM Badge */}
                                  <div className="sm:col-span-2">
                                    <div className="px-2.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 text-center truncate">
                                      {line.uom || 'NOS'}
                                    </div>
                                  </div>
                                </div>

                                {/* Optional Line Description / Tolerance */}
                                <div>
                                  <input
                                    type="text"
                                    value={line.description || ''}
                                    onChange={(e) =>
                                      handleUpdateBomItem(lIdx, { description: e.target.value })
                                    }
                                    placeholder="Line notes, cutting length, tolerance or assembly note (optional)..."
                                    className="w-full px-3 py-1.5 bg-white/70 border border-slate-200 rounded-lg text-[11px] text-slate-700 placeholder-slate-400 focus:bg-white focus:border-orange-500"
                                  />
                                </div>
                              </div>
                            );
                          })}

                          {/* + Add Another BOM Item button */}
                          <button
                            type="button"
                            onClick={handleAddBomItem}
                            className="w-full py-2.5 border-2 border-dashed border-slate-300 hover:border-purple-400 rounded-xl text-slate-600 hover:text-purple-600 hover:bg-purple-50/20 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Plus size={14} />
                            <span>+ Add Another BOM Item</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setFgModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingFg || isUpdatingFg || isCreatingFgRevision || isUploadingFgMedia}
                  className="inline-flex items-center gap-1.5 px-6 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>
                    {isUploadingFgMedia
                      ? 'Uploading media to S3...'
                      : isCreatingFg
                      ? 'Saving FG Item...'
                      : isCreatingFgRevision
                      ? 'Branching Revision...'
                      : fgModal.mode === 'REVISION'
                      ? 'Create Revision'
                      : fgModal.mode === 'EDIT'
                      ? 'Update FG Item'
                      : 'Save FG Item'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FG PREVIEW DOSSIER MODAL WITH FULL AUDIT TRAIL & BOM BREAKDOWN & COSTING WORKBENCH */}
      {previewFgItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div className="w-full max-w-6xl xl:max-w-7xl max-h-[94vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header Ribbon Standard (Crisp White Header with Amber Top Stripe) */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-5 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-700 border border-purple-300/40 flex items-center justify-center shrink-0">
                  <Boxes size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-extrabold tracking-tight text-slate-900 truncate">
                      {previewFgItem.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase font-mono">
                      {previewFgItem.classification}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-300">
                      {previewFgItem.revision || 'Rev 1.0'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-medium">
                    <span>FG Code: {previewFgItem.code || (previewFgItem.id ? previewFgItem.id.slice(0, 8) : 'FG-001')}</span>
                    <span>•</span>
                    <span>Category: {previewFgItem.categoryName || previewFgItem.categoryCode || 'Finished Goods'}</span>
                  </div>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Export Excel Button */}
                <button
                  type="button"
                  onClick={handleExportBomExcel}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                  title="Export BOM Breakdown & Costing to CSV/Excel"
                >
                  <FileSpreadsheet size={13} />
                  <span className="hidden sm:inline">Export Excel</span>
                </button>

                {/* Download Full BOM PDF Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (previewFgItem.pdfUrl) {
                      window.open(previewFgItem.pdfUrl, '_blank');
                    } else {
                      window.print();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer"
                  title="Download or Print Multi-Level Engineering BOM"
                >
                  <Download size={13} />
                  <span className="hidden sm:inline">Download Full BOM PDF</span>
                </button>

                {/* Branch Revision */}
                <button
                  type="button"
                  onClick={() => {
                    const it = previewFgItem;
                    setPreviewFgItem(null);
                    handleOpenRevisionFg(it);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                  title="Create a new revision based on this item"
                >
                  <GitBranch size={13} />
                  <span className="hidden md:inline">New Revision</span>
                </button>

                {/* Edit */}
                <button
                  type="button"
                  onClick={() => {
                    const it = previewFgItem;
                    setPreviewFgItem(null);
                    handleOpenEditFg(it);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  <Edit2 size={13} className="text-slate-500" />
                  <span>Edit</span>
                </button>

                {/* Close */}
                <button
                  type="button"
                  onClick={() => setPreviewFgItem(null)}
                  className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Dossier Navigation: Modern Button-Type Pill Tabs */}
            <div className="bg-slate-50 border-b border-slate-200 px-5 sm:px-6 py-2.5 flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveFgPreviewTab('details')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeFgPreviewTab === 'details'
                    ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Info size={14} />
                <span>Basic Details</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFgPreviewTab('bom')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeFgPreviewTab === 'bom'
                    ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Layers size={14} />
                <span>BOM Breakdown &amp; Costing</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    activeFgPreviewTab === 'bom'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {multiLevelBomData.consolidated.length} Items
                </span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* TAB 1: BASIC DETAILS */}
              {activeFgPreviewTab === 'details' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Key Attributes Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Classification</span>
                      <span className="text-xs font-bold text-slate-900 block mt-1 uppercase">
                        {previewFgItem.classification}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Revision</span>
                      <span className="text-xs font-bold font-mono text-slate-900 block mt-1">
                        {previewFgItem.revision || 'Rev 1.0'}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Primary Unit (UOM)</span>
                      <span className="text-xs font-bold font-mono text-slate-900 block mt-1">
                        {previewFgItem.uom || 'NOS'}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">HSN / SAC</span>
                      <span className="text-xs font-bold font-mono text-slate-900 block mt-1">
                        {previewFgItem.hsnCode || '8479'}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                      <Layers size={14} className="text-orange-500" />
                      <span>Description &amp; Specifications</span>
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {previewFgItem.description || 'No detailed specifications recorded for this FG item.'}
                    </p>
                  </div>

                  {/* Attached Bill of Materials (BOM) Quick Summary */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                        <Layers size={14} className="text-purple-600" />
                        <span>Attached Direct BOM Line Items</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveFgPreviewTab('bom')}
                        className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Full Breakdown &amp; Costing</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>

                    {(!previewFgItem.bomItems || previewFgItem.bomItems.length === 0) ? (
                      <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        No BOM child materials attached to this item.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-600">
                            <tr>
                              <th className="py-2.5 px-3 w-10 text-center">#</th>
                              <th className="py-2.5 px-3 min-w-[90px]">Type</th>
                              <th className="py-2.5 px-3 min-w-[200px]">Item Name</th>
                              <th className="py-2.5 px-3 text-right min-w-[80px]">Quantity</th>
                              <th className="py-2.5 px-3 text-center min-w-[70px]">UOM</th>
                              <th className="py-2.5 px-3 min-w-[160px]">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {previewFgItem.bomItems.map((bItem: any, bIdx: number) => {
                              const isRm = bItem.itemType === 'RM-BO';
                              return (
                                <tr key={bIdx} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="py-2.5 px-3 text-center font-mono text-slate-400">{bIdx + 1}</td>
                                  <td className="py-2.5 px-3">
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[9px] font-bold font-mono uppercase border ${
                                        isRm
                                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                      }`}
                                    >
                                      {isRm ? 'RM-BO' : 'FG'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-slate-900">
                                    {bItem.itemName}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                    {bItem.quantity}
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                                    {bItem.uom || 'NOS'}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                                    {bItem.description || '—'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Photos Gallery Preview (if photos exist) */}
                  {(() => {
                    const photosList: string[] = Array.isArray(previewFgItem.photos) && previewFgItem.photos.length > 0
                      ? previewFgItem.photos
                      : (previewFgItem.photoUrl ? [previewFgItem.photoUrl] : []);

                    if (photosList.length === 0) return null;

                    return (
                      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                            <ImageIcon size={14} className="text-orange-500" />
                            <span>Item Photos &amp; Visuals ({photosList.length})</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">Click any image to enlarge</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {photosList.map((pUrl, pIdx) => (
                            <div
                              key={pIdx}
                              onClick={() =>
                                setPhotoViewerModal({
                                  isOpen: true,
                                  url: pUrl,
                                  title: `${previewFgItem.name} — Photo ${pIdx + 1}`
                                })
                              }
                              className="group relative aspect-square rounded-xl border border-slate-200 bg-slate-100 overflow-hidden cursor-pointer shadow-2xs hover:shadow-md transition-all hover:border-orange-400"
                            >
                              <img
                                src={pUrl}
                                alt={`${previewFgItem.name} photo ${pIdx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                <ZoomIn size={20} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* PDF Technical Datasheet / Drawing Document (if PDF exists) */}
                  {previewFgItem.pdfUrl && (
                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5 shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText size={14} className="text-red-500" />
                        <span>Technical Drawing &amp; Specification Document</span>
                      </span>

                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                            <FileText size={20} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 block truncate">
                              {previewFgItem.pdfName || `${previewFgItem.name}_Drawing.pdf`}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                              PDF Technical Drawing • Stored in S3 Documents
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                          {/* See PDF Button */}
                          <a
                            href={previewFgItem.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold shadow-2xs transition-colors"
                          >
                            <ExternalLink size={13} className="text-slate-500" />
                            <span>See PDF</span>
                          </a>

                          {/* Download PDF Button */}
                          <a
                            href={previewFgItem.pdfUrl}
                            download={previewFgItem.pdfName || `${previewFgItem.name}_Drawing.pdf`}
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-xs transition-colors"
                          >
                            <Download size={13} />
                            <span>Download PDF</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Item Lifecycle Status */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">Item Lifecycle Status</span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        previewFgItem.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          previewFgItem.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                      <span>{previewFgItem.isActive ? 'Active Design' : 'Deactivated'}</span>
                    </span>
                  </div>

                  {/* Where-Used / BOM Attachments & Transaction Footprint */}
                  <div className="pt-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Layers size={14} className="text-orange-500" />
                        <span>Where-Used &amp; BOM Attachments</span>
                      </span>
                      {fgWhereUsedData?.bomCheck && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            fgWhereUsedData.bomCheck.isAttached
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {fgWhereUsedData.bomCheck.isAttached
                            ? `Attached to ${fgWhereUsedData.bomCheck.count} BOM(s)`
                            : 'Zero BOM Attachments'}
                        </span>
                      )}
                    </span>

                    <div className="space-y-2.5">
                      {isFgWhereUsedFetching ? (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500 font-medium">
                          Loading BOM attachment references...
                        </div>
                      ) : fgWhereUsedData?.bomCheck?.isAttached ? (
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                          <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between text-[11px] font-bold text-slate-700">
                            <span>Attached Higher-Level Assembly / Project BOM</span>
                            <span>Quantity Required</span>
                          </div>
                          <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto text-xs">
                            {fgWhereUsedData.bomCheck.attachments.map((att: any, aIdx: number) => (
                              <div key={aIdx} className="px-3.5 py-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-600">
                                    {att.classification || att.type}
                                  </span>
                                  <span className="font-bold text-slate-900">{att.name || att.assemblyName}</span>
                                </div>
                                <span className="font-semibold text-slate-700 text-[11px]">
                                  {att.quantity} {att.uom || 'Nos'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
                          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                          <span>Not attached to any higher-level BOM. (Safe to delete if no past transactions exist).</span>
                        </div>
                      )}

                      {fgWhereUsedData?.txCheck && (
                        <div
                          className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between ${
                            fgWhereUsedData.txCheck.hasTransactions
                              ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          <span className="font-bold">Transaction History:</span>
                          <span className="text-[11px]">
                            {fgWhereUsedData.txCheck.hasTransactions
                              ? `${fgWhereUsedData.txCheck.summary} (Deactivation only)`
                              : 'No past transactions (Clean record)'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Record Audit & Universal Action Tracking Trail */}
                  <div className="pt-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-orange-500" />
                      <span>Audit Trail &amp; Record History</span>
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Created By Card */}
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3 shadow-2xs">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                            <UserCheck size={16} />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Created By
                            </span>
                            <span className="text-xs font-bold text-slate-900 block mt-0.5">
                              {previewFgItem.createdByName || 'System Provisioned'}
                            </span>
                            {previewFgItem.createdById && (
                              <span className="text-[10px] font-mono text-slate-400 block">
                                User ID: {previewFgItem.createdById.slice(0, 8)}...
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-end gap-1">
                            <Clock size={11} className="text-slate-400" />
                            Created At
                          </span>
                          <span className="text-[11px] font-semibold text-slate-700 block mt-0.5">
                            {previewFgItem.createdAt
                              ? new Date(previewFgItem.createdAt).toLocaleString('en-IN', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short'
                                })
                              : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Last Updated By Card */}
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3 shadow-2xs">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                            <UserCheck size={16} />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Last Updated By
                            </span>
                            <span className="text-xs font-bold text-slate-900 block mt-0.5">
                              {previewFgItem.updatedByName || previewFgItem.createdByName || 'System Provisioned'}
                            </span>
                            {previewFgItem.updatedById && (
                              <span className="text-[10px] font-mono text-slate-400 block">
                                User ID: {previewFgItem.updatedById.slice(0, 8)}...
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-end gap-1">
                            <Clock size={11} className="text-slate-400" />
                            Updated At
                          </span>
                          <span className="text-[11px] font-semibold text-slate-700 block mt-0.5">
                            {previewFgItem.updatedAt
                              ? new Date(previewFgItem.updatedAt).toLocaleString('en-IN', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short'
                                })
                              : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: BOM BREAKDOWN & COSTING */}
              {activeFgPreviewTab === 'bom' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Costing Section Toggle Button (Hidden by default as requested) */}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowBomCostingSection(!showBomCostingSection)}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        showBomCostingSection
                          ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200 shadow-2xs'
                      }`}
                    >
                      <Sparkles size={14} className={showBomCostingSection ? 'text-white' : 'text-orange-500'} />
                      <span>{showBomCostingSection ? 'Hide Costing & Price Analytics' : 'Show Costing & Price Analytics'}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          showBomCostingSection ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        Est. ₹{multiLevelBomData.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${showBomCostingSection ? 'rotate-180 text-white' : 'text-slate-400'}`}
                      />
                    </button>
                  </div>

                  {/* Dynamic Assembly Costing Mode Bar & 5 KPI Cards (Rendered only when toggled open) */}
                  {showBomCostingSection && (
                    <div className="space-y-3.5 animate-in fade-in duration-150">
                      {/* Dynamic Assembly Costing Mode Bar (Unified RM-BO) */}
                      <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-900">
                            <Sparkles size={14} className="text-orange-500" />
                            <span>Dynamic Assembly Costing Mode</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {fgCostingMode === 'L2'
                              ? 'Mode 1 (Default): Cost calculated strictly from Level 2 (L2) direct items (RM-BO + direct Sub-assemblies).'
                              : 'Mode 2: Pure leaf-level raw materials & bought-out breakdown across the entire assembly tree.'}
                          </p>
                        </div>

                        <div className="inline-flex p-1 bg-white border border-slate-200 rounded-xl shadow-2xs self-start md:self-auto">
                          <button
                            type="button"
                            onClick={() => setFgCostingMode('L2')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              fgCostingMode === 'L2'
                                ? 'bg-orange-500 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                          >
                            1. Direct (L2) Items Costing
                          </button>
                          <button
                            type="button"
                            onClick={() => setFgCostingMode('EXPLODED_RM_BO')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              fgCostingMode === 'EXPLODED_RM_BO'
                                ? 'bg-orange-500 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                          >
                            2. Exploded (Deep RM-BO) Costing
                          </button>
                        </div>
                      </div>

                      {/* 5 Summary KPI Chips Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {/* 1: EST. BOM COST */}
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-2xs">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                            Est. BOM Cost
                          </span>
                          <div className="text-xl font-extrabold text-slate-900 mt-1 font-mono">
                            ₹{multiLevelBomData.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium block mt-1">
                            Per 1 {previewFgItem.uom || 'Nos'} of FG
                          </span>
                        </div>

                        {/* 2: PRICE COVERAGE */}
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                              Price Coverage
                            </span>
                            <CheckCircle2 size={13} className="text-emerald-500" />
                          </div>
                          <div className="text-xl font-extrabold text-emerald-600 mt-1 font-mono">
                            {multiLevelBomData.priceCoverage}%
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${multiLevelBomData.priceCoverage}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium block mt-1">
                            {multiLevelBomData.pricedCount} of {multiLevelBomData.pricedCount + multiLevelBomData.missingCount} parts priced
                          </span>
                        </div>

                        {/* 3: MISSING PRICES */}
                        <div
                          onClick={() => setFgBomPricingFilter('MISSING')}
                          className="p-3.5 rounded-2xl border border-red-200 bg-red-50/40 shadow-2xs cursor-pointer hover:border-red-400 transition-colors"
                          title="Click to filter parts missing prices"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-700">
                              Missing Prices
                            </span>
                            <AlertCircle size={13} className="text-red-500" />
                          </div>
                          <div className="text-xl font-extrabold text-red-600 mt-1 font-mono">
                            {multiLevelBomData.missingCount}
                          </div>
                          <span className="text-[10px] text-red-600 font-bold block mt-1 hover:underline">
                            Filter missing parts →
                          </span>
                        </div>

                        {/* 4: TOTAL PARTS QTY */}
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-2xs">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                            Total Parts Qty
                          </span>
                          <div className="text-xl font-extrabold text-sky-600 mt-1 font-mono">
                            {multiLevelBomData.totalPartsQty}
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium block mt-1">
                            Across all levels
                          </span>
                        </div>

                        {/* 5: COST BY TYPE (Combined RM-BO) */}
                        <div className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-2xs text-[11px] space-y-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                            Cost by Type
                          </span>
                          <div className="flex justify-between font-mono text-[11px] pt-1">
                            <span className="text-slate-600">RM-BO Items:</span>
                            <span className="font-bold text-slate-900">₹{multiLevelBomData.rmBoCost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-mono text-[11px] pt-0.5">
                            <span className="text-slate-600">FG / Sub-Assy:</span>
                            <span className="font-bold text-slate-900">₹{multiLevelBomData.fgCost.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Multi-Level Engineering BOM Breakdown Section */}
                  <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3.5">
                    {/* Top In-Line Table Toolbar (Dedicated Search on Left, View Switcher & Actions on Right) */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                      {/* Left: Search Bar & Reset Filters */}
                      <div className="flex items-center gap-2 flex-1 max-w-md">
                        <div className="relative flex-1">
                          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={fgBomSearch}
                            onChange={(e) => setFgBomSearch(e.target.value)}
                            placeholder="Search BOM by item name, description, category..."
                            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                          />
                          {fgBomSearch && (
                            <button
                              type="button"
                              onClick={() => setFgBomSearch('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        {hasActiveBomFilters && (
                          <button
                            type="button"
                            onClick={handleResetBomFilters}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors shrink-0 cursor-pointer"
                            title="Reset all search and Excel column filters"
                          >
                            <RotateCcw size={13} />
                            <span>Reset Filters</span>
                          </button>
                        )}
                      </div>

                      {/* Right: View Switcher (Tree View vs Consolidated Table) */}
                      <div className="inline-flex p-1 bg-slate-100 border border-slate-200 rounded-xl self-start md:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => setFgBomViewMode('consolidated')}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            fgBomViewMode === 'consolidated'
                              ? 'bg-white text-orange-600 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Layers size={13} />
                          <span>Consolidated Table</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFgBomViewMode('tree')}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            fgBomViewMode === 'tree'
                              ? 'bg-white text-orange-600 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <GitBranch size={13} />
                          <span>Tree View</span>
                        </button>
                      </div>
                    </div>

                    {/* Filter Category & Pricing Pills */}
                    <div className="space-y-2">
                      {/* Category Pills (Combined RM-BO) */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mr-1">
                          Category:
                        </span>
                        <button
                          type="button"
                          onClick={() => setFgBomCategoryFilter('ALL')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            fgBomCategoryFilter === 'ALL'
                              ? 'bg-orange-500 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          All Items ({bomCategoryCounts.ALL})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFgBomCategoryFilter('RM_BO')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            fgBomCategoryFilter === 'RM_BO'
                              ? 'bg-amber-500 text-white shadow-2xs'
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                          }`}
                        >
                          RM-BO Items ({bomCategoryCounts.RM_BO})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFgBomCategoryFilter('COMPONENT')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            fgBomCategoryFilter === 'COMPONENT'
                              ? 'bg-indigo-500 text-white shadow-2xs'
                              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                          }`}
                        >
                          Components ({bomCategoryCounts.COMPONENT})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFgBomCategoryFilter('SUB_ASSEMBLY')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            fgBomCategoryFilter === 'SUB_ASSEMBLY'
                              ? 'bg-purple-500 text-white shadow-2xs'
                              : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                          }`}
                        >
                          Sub-Assemblies ({bomCategoryCounts.SUB_ASSEMBLY})
                        </button>
                      </div>

                      {/* Pricing Status Pills */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mr-1">
                          Pricing Filter:
                        </span>
                        <button
                          type="button"
                          onClick={() => setFgBomPricingFilter('ALL')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            fgBomPricingFilter === 'ALL'
                              ? 'bg-slate-800 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          All Pricing Status ({multiLevelBomData.consolidated.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFgBomPricingFilter('PRICED')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            fgBomPricingFilter === 'PRICED'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          Priced Only ({multiLevelBomData.pricedCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFgBomPricingFilter('MISSING')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            fgBomPricingFilter === 'MISSING'
                              ? 'bg-red-600 text-white'
                              : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                          }`}
                        >
                          Missing Prices Only ({multiLevelBomData.missingCount})
                        </button>
                      </div>
                    </div>

                    {/* VIEW 1: CONSOLIDATED TABLE WITH EXCEL COLUMN FILTERS */}
                    {fgBomViewMode === 'consolidated' && (
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-600">
                            <tr>
                              <th className="py-2.5 px-3 w-10 text-center font-bold text-slate-700 tracking-wider text-[11px]">#</th>

                              {/* Component / Item Name Column with Excel Filter */}
                              <th className="py-2.5 px-3 min-w-[220px]">
                                <ExcelColumnFilter
                                  title="Component / Item Name"
                                  columnKey="name"
                                  distinctValues={distinctBomNames}
                                  selectedValues={bomExcelFilters.name}
                                  onFilterChange={(selected) => setBomExcelFilters((prev) => ({ ...prev, name: selected }))}
                                  currentSortField={bomSortField}
                                  currentSortDirection={bomSortDirection}
                                  onSortChange={(field, direction) => {
                                    setBomSortField(field);
                                    setBomSortDirection(direction);
                                  }}
                                />
                              </th>

                              {/* Subcategory Column with Excel Filter */}
                              <th className="py-2.5 px-3 min-w-[140px]">
                                <ExcelColumnFilter
                                  title="Subcategory"
                                  columnKey="category"
                                  distinctValues={distinctBomCategories}
                                  selectedValues={bomExcelFilters.category}
                                  onFilterChange={(selected) => setBomExcelFilters((prev) => ({ ...prev, category: selected }))}
                                  currentSortField={bomSortField}
                                  currentSortDirection={bomSortDirection}
                                  onSortChange={(field, direction) => {
                                    setBomSortField(field);
                                    setBomSortDirection(direction);
                                  }}
                                />
                              </th>

                              {/* Classification Column with Excel Filter */}
                              <th className="py-2.5 px-3 min-w-[120px]">
                                <ExcelColumnFilter
                                  title="Classification"
                                  columnKey="classification"
                                  distinctValues={distinctBomClassifications}
                                  selectedValues={bomExcelFilters.classification}
                                  onFilterChange={(selected) => setBomExcelFilters((prev) => ({ ...prev, classification: selected }))}
                                />
                              </th>

                              {/* Parent Usages Column with Excel Filter */}
                              <th className="py-2.5 px-3 min-w-[180px]">
                                <ExcelColumnFilter
                                  title="Parent Usages"
                                  columnKey="parentUsage"
                                  distinctValues={distinctBomParentUsages}
                                  selectedValues={bomExcelFilters.parentUsage}
                                  onFilterChange={(selected) => setBomExcelFilters((prev) => ({ ...prev, parentUsage: selected }))}
                                />
                              </th>

                              {/* Total Qty (1 FG) Column */}
                              <th className="py-2.5 px-3 text-right min-w-[110px]">
                                <button
                                  type="button"
                                  onClick={() => handleBomSortChange('quantity', bomSortDirection === 'asc' ? 'desc' : 'asc')}
                                  className="inline-flex items-center justify-end gap-1 font-bold text-slate-700 tracking-wider text-[11px] hover:text-slate-900 cursor-pointer ml-auto"
                                  title="Click to sort by total quantity"
                                >
                                  <span>Total Qty (1 FG)</span>
                                  <ArrowUp
                                    size={11}
                                    className={`transition-transform ${
                                      bomSortField === 'quantity'
                                        ? bomSortDirection === 'desc'
                                          ? 'rotate-180 text-orange-500'
                                          : 'text-orange-500'
                                        : 'text-slate-300'
                                    }`}
                                  />
                                </button>
                              </th>

                              {/* Unit Rate & Vendor Column with Excel Filter */}
                              <th className="py-2.5 px-3 text-right min-w-[150px]">
                                <div className="flex justify-end">
                                  <ExcelColumnFilter
                                    title="Unit Rate & Status"
                                    columnKey="vendorStatus"
                                    distinctValues={distinctBomVendorStatuses}
                                    selectedValues={bomExcelFilters.vendorStatus}
                                    onFilterChange={(selected) => setBomExcelFilters((prev) => ({ ...prev, vendorStatus: selected }))}
                                    currentSortField={bomSortField}
                                    currentSortDirection={bomSortDirection}
                                    onSortChange={(field, direction) => {
                                      setBomSortField(field);
                                      setBomSortDirection(direction);
                                    }}
                                    align="right"
                                  />
                                </div>
                              </th>

                              {/* Extended Cost Column */}
                              <th className="py-2.5 px-3 text-right min-w-[120px]">
                                <button
                                  type="button"
                                  onClick={() => handleBomSortChange('extendedCost', bomSortDirection === 'asc' ? 'desc' : 'asc')}
                                  className="inline-flex items-center justify-end gap-1 font-bold text-slate-700 tracking-wider text-[11px] hover:text-slate-900 cursor-pointer ml-auto"
                                  title="Click to sort by extended cost"
                                >
                                  <span>Extended Cost (₹)</span>
                                  <ArrowUp
                                    size={11}
                                    className={`transition-transform ${
                                      bomSortField === 'extendedCost'
                                        ? bomSortDirection === 'desc'
                                          ? 'rotate-180 text-orange-500'
                                          : 'text-orange-500'
                                        : 'text-slate-300'
                                    }`}
                                  />
                                </button>
                              </th>

                              {/* Action Column */}
                              <th className="py-2.5 px-3 text-center min-w-[90px] font-bold text-slate-700 tracking-wider text-[11px]">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredBomParts.length === 0 ? (
                              <tr>
                                <td colSpan={9} className="py-8 text-center text-xs text-slate-400">
                                  No BOM parts match the selected search or filters.
                                </td>
                              </tr>
                            ) : (
                              filteredBomParts.map((part, pIdx) => (
                                <tr key={part.key || pIdx} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                                    {pIdx + 1}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="font-bold text-slate-900 leading-tight">
                                      {part.name}
                                    </div>
                                    {part.description && (
                                      <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                                        {part.description}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-700">
                                    {part.category || '—'}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[9px] font-bold font-mono uppercase border ${
                                        part.itemType === 'RM_BO'
                                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                                          : part.itemType === 'SUB_ASSEMBLY'
                                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                      }`}
                                    >
                                      {part.itemType === 'RM_BO'
                                        ? 'RM-BO'
                                        : part.itemType === 'SUB_ASSEMBLY'
                                        ? 'Sub-Assembly'
                                        : 'Component'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200">
                                      {part.parentUsage || `L${part.level} ${part.parentName}`}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                    {part.quantity} {part.uom}
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    {part.hasRate ? (
                                      <div>
                                        <div className="font-mono font-bold text-slate-900">
                                          ₹{part.unitRate.toFixed(2)}
                                        </div>
                                        <div className="text-[10px] text-slate-400 truncate max-w-[120px] ml-auto">
                                          {part.makeOrVendor}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
                                        <AlertCircle size={10} />
                                        <span>No Rate</span>
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                    ₹{part.extendedCost.toFixed(2)}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenQuickRate(part)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-colors cursor-pointer"
                                      title="Update standard cost / rate"
                                    >
                                      <span>+ Price</span>
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* VIEW 2: HIERARCHICAL TREE VIEW */}
                    {fgBomViewMode === 'tree' && (
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                        {multiLevelBomData.tree.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-400">
                            No tree nodes to display.
                          </div>
                        ) : (
                          (() => {
                            const renderNode = (node: BomLineNode, depth: number = 0) => {
                              const hasChildren = node.children && node.children.length > 0;
                              const isExpanded = expandedTreeNodes[node.key] !== false; // default open

                              return (
                                <div key={node.key} className="space-y-1">
                                  <div
                                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                                      depth === 0
                                        ? 'bg-white border-slate-200 shadow-2xs'
                                        : 'bg-white/80 border-slate-200'
                                    }`}
                                    style={{ marginLeft: `${depth * 20}px` }}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      {hasChildren ? (
                                        <button
                                          type="button"
                                          onClick={() => toggleTreeNode(node.key)}
                                          className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                                        >
                                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </button>
                                      ) : (
                                        <div className="w-5.5" />
                                      )}

                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                                          node.rawType === 'FG'
                                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                                        }`}
                                      >
                                        L{node.level} • {node.itemType === 'RM_BO' ? 'RM-BO' : node.itemType}
                                      </span>

                                      <span className="font-bold text-xs text-slate-900 truncate">
                                        {node.name}
                                      </span>

                                      {node.description && (
                                        <span className="text-[11px] text-slate-400 hidden sm:inline truncate max-w-xs">
                                          ({node.description})
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
                                      <span className="text-slate-700 font-semibold">
                                        Qty: <strong className="text-slate-900">{node.quantity}</strong> {node.uom}
                                      </span>

                                      <span className="text-slate-700 hidden sm:inline">
                                        Rate: {node.hasRate ? `₹${node.unitRate.toFixed(2)}` : 'No Rate'}
                                      </span>

                                      <span className="font-bold text-slate-900">
                                        ₹{node.extendedCost.toFixed(2)}
                                      </span>

                                      <button
                                        type="button"
                                        onClick={() => handleOpenQuickRate(node)}
                                        className="px-2 py-0.5 rounded text-[10px] font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 cursor-pointer"
                                      >
                                        + Price
                                      </button>
                                    </div>
                                  </div>

                                  {hasChildren && isExpanded && (
                                    <div className="space-y-1">
                                      {node.children!.map((child) => renderNode(child, depth + 1))}
                                    </div>
                                  )}
                                </div>
                              );
                            };

                            return multiLevelBomData.tree.map((rootNode) => renderNode(rootNode, 0));
                          })()
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QUICK RATE CONFIGURATION MODAL */}
      {quickRateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-500/15 text-orange-700 border border-orange-300/40 flex items-center justify-center shrink-0">
                  <Sparkles size={16} />
                </div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Update Standard Rate (INR)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setQuickRateModal(null)}
                className="text-slate-400 hover:text-slate-800 p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveQuickRate} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Item Name
                </label>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900">
                  {quickRateModal.name}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Standard Rate (₹ per {quickRateModal.uom}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={quickRateModal.rate}
                  onChange={(e) =>
                    setQuickRateModal({ ...quickRateModal, rate: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                  placeholder="0.00"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickRateModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save Standard Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT CATEGORY MODAL */}
      {categoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 md:p-6 overflow-y-auto">
          <div className="w-full max-w-xl lg:max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header Ribbon Standard (Crisp White Header with Amber Top Stripe) */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Tag size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                    {categoryModal.mode === 'CREATE' ? 'Add New Category' : `Edit Category — ${categoryForm.name}`}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCategoryModal(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveCategory} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                {categoryFormError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{categoryFormError}</span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Category Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      placeholder="e.g. Raw Material - Steel & Alloys"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-orange-500"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                      placeholder="e.g. EN24, EN8, EN19, IS2062 round bars, square rods, and plates for heavy duty machine frame fabrication..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setCategoryModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCategory || isUpdatingCategory}
                  className="inline-flex items-center gap-1.5 px-6 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>
                    {isCreatingCategory || isUpdatingCategory
                      ? 'Saving...'
                      : categoryModal.mode === 'EDIT'
                      ? 'Update Category'
                      : 'Save Category'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CATEGORY PREVIEW DOSSIER MODAL WITH FULL AUDIT TRAIL */}
      {previewCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 md:p-6 overflow-y-auto">
          <div className="w-full max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header Ribbon Standard (Crisp White Header with Amber Top Stripe) */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Tag size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                    {previewCategory.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        previewCategory.isActive !== false
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          previewCategory.isActive !== false ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                      <span>{previewCategory.isActive !== false ? 'Active' : 'Inactive'}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const cat = previewCategory;
                    setPreviewCategory(null);
                    handleOpenEditCategory(cat);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  <Edit2 size={13} className="text-slate-500" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewCategory(null)}
                  className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Dossier Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* Description & Scope */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers size={14} className="text-orange-500" />
                  Category Description
                </span>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {previewCategory.description || 'No description recorded for this category.'}
                </p>
              </div>

              {/* Record Audit & Universal Action Tracking Trail */}
              <div className="pt-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-orange-500" />
                  <span>Audit Trail &amp; Record History</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Created By Card */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3 shadow-2xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                        <UserCheck size={16} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Created By
                        </span>
                        <span className="text-xs font-bold text-slate-900 block mt-0.5">
                          {previewCategory.createdByName || 'System Provisioned'}
                        </span>
                        {previewCategory.createdById && (
                          <span className="text-[10px] font-mono text-slate-400 block">
                            User ID: {previewCategory.createdById.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-end gap-1">
                        <Clock size={11} className="text-slate-400" />
                        Created At
                      </span>
                      <span className="text-[11px] font-semibold text-slate-700 block mt-0.5">
                        {previewCategory.createdAt
                          ? new Date(previewCategory.createdAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })
                          : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Last Updated By Card */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3 shadow-2xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                        <UserCheck size={16} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Last Updated By
                        </span>
                        <span className="text-xs font-bold text-slate-900 block mt-0.5">
                          {previewCategory.updatedByName || previewCategory.createdByName || 'System Provisioned'}
                        </span>
                        {previewCategory.updatedById && (
                          <span className="text-[10px] font-mono text-slate-400 block">
                            User ID: {previewCategory.updatedById.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-end gap-1">
                        <Clock size={11} className="text-slate-400" />
                        Updated At
                      </span>
                      <span className="text-[11px] font-semibold text-slate-700 block mt-0.5">
                        {previewCategory.updatedAt
                          ? new Date(previewCategory.updatedAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT SUB-STAGE MODAL */}
      {subStageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 md:p-6 overflow-y-auto">
          <div className="w-full max-w-xl lg:max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header Ribbon Standard (Crisp White Header with Amber Top Stripe) */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Workflow size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                    {subStageModal.mode === 'CREATE' ? 'Add New Sub-Stage' : `Edit Sub-Stage — ${subStageForm.name}`}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSubStageModal(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveSubStage} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                {subStageFormError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{subStageFormError}</span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Sub-Stage Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Sub-Stage Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={subStageForm.name}
                      onChange={(e) => setSubStageForm({ ...subStageForm, name: e.target.value })}
                      placeholder="e.g. 3D CAD Modeling & Kinematic Simulation"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-orange-500"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={subStageForm.description}
                      onChange={(e) => setSubStageForm({ ...subStageForm, description: e.target.value })}
                      placeholder="Briefly describe the deliverables, verification criteria, or engineering scope for this sub-stage..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setSubStageModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSubStage || isUpdatingSubStage}
                  className="inline-flex items-center gap-1.5 px-6 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>
                    {isCreatingSubStage || isUpdatingSubStage
                      ? 'Saving...'
                      : subStageModal.mode === 'EDIT'
                      ? 'Update Sub-Stage'
                      : 'Save Sub-Stage'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-STAGE PREVIEW DOSSIER MODAL WITH FULL AUDIT TRAIL */}
      {previewSubStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 md:p-6 overflow-y-auto">
          <div className="w-full max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header Ribbon Standard (Crisp White Header with Amber Top Stripe) */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Workflow size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                    {previewSubStage.name || previewSubStage.subStageName}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        previewSubStage.isActive !== false
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          previewSubStage.isActive !== false ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                      <span>{previewSubStage.isActive !== false ? 'Active' : 'Inactive'}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const s = previewSubStage;
                    setPreviewSubStage(null);
                    handleOpenEditSubStage(s);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  <Edit2 size={13} className="text-slate-500" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSubStage(null)}
                  className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Dossier Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* Description & Scope */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers size={14} className="text-orange-500" />
                  Sub-Stage Description
                </span>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {previewSubStage.description || 'No description recorded for this sub-stage.'}
                </p>
              </div>

              {/* Record Audit & Universal Action Tracking Trail */}
              <div className="pt-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-orange-500" />
                  <span>Audit Trail &amp; Record History</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Created By Card */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3 shadow-2xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                        <UserCheck size={16} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Created By
                        </span>
                        <span className="text-xs font-bold text-slate-900 block mt-0.5">
                          {previewSubStage.createdByName || 'System Provisioned'}
                        </span>
                        {previewSubStage.createdById && (
                          <span className="text-[10px] font-mono text-slate-400 block">
                            User ID: {previewSubStage.createdById.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-end gap-1">
                        <Clock size={11} className="text-slate-400" />
                        Created At
                      </span>
                      <span className="text-[11px] font-semibold text-slate-700 block mt-0.5">
                        {previewSubStage.createdAt
                          ? new Date(previewSubStage.createdAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })
                          : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Last Updated By Card */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3 shadow-2xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                        <UserCheck size={16} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Last Updated By
                        </span>
                        <span className="text-xs font-bold text-slate-900 block mt-0.5">
                          {previewSubStage.updatedByName || previewSubStage.createdByName || 'System Provisioned'}
                        </span>
                        {previewSubStage.updatedById && (
                          <span className="text-[10px] font-mono text-slate-400 block">
                            User ID: {previewSubStage.updatedById.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-end gap-1">
                        <Clock size={11} className="text-slate-400" />
                        Updated At
                      </span>
                      <span className="text-[11px] font-semibold text-slate-700 block mt-0.5">
                        {previewSubStage.updatedAt
                          ? new Date(previewSubStage.updatedAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN PHOTO VIEWER MODAL */}
      {photoViewerModal?.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setPhotoViewerModal(null)}
              className="absolute -top-10 right-0 text-white hover:text-orange-400 p-1.5 transition-colors cursor-pointer"
              title="Close full-size photo"
            >
              <X size={24} />
            </button>
            <img
              src={photoViewerModal.url}
              alt={photoViewerModal.title}
              className="max-w-full max-h-[80vh] object-contain rounded-xl border border-white/20 shadow-2xl"
            />
            <div className="mt-3 px-4 py-1.5 rounded-full bg-black/60 text-white text-xs font-medium border border-white/10 backdrop-blur-xs">
              {photoViewerModal.title}
            </div>
          </div>
        </div>
      )}
      {/* BULK IMPORT MODALS */}
      <RmBoBulkImportModal
        isOpen={isRmBulkImportOpen}
        onClose={() => setIsRmBulkImportOpen(false)}
        existingItems={rmItems}
        onSuccess={() => {
          refetchRm();
          refetchCategories();
          showToast('All set! RM & BO items imported successfully.');
        }}
      />

      <FgBulkImportModal
        isOpen={isFgBulkImportOpen}
        onClose={() => setIsFgBulkImportOpen(false)}
        existingItems={fgItems}
        onSuccess={() => {
          refetchFg();
          refetchCategories();
          showToast('All set! FG items imported successfully.');
        }}
      />
    </div>
  );
}
