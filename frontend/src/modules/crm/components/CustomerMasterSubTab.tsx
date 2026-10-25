'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  X,
  Eye,
  Edit,
  Trash2,
  Download,
  Copy,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  ShieldCheck,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  RotateCcw,
  FileSpreadsheet,
  Upload,
  Users
} from 'lucide-react';
import {
  useGetCustomersQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation
} from '../api/crmApi';
import { Customer, CustomerContactPerson } from '../types';
import CustomerBulkImportModal from './CustomerBulkImportModal';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import ExcelColumnFilter from '../../../components/ui/ExcelColumnFilter';

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh'
];

export default function CustomerMasterSubTab() {
  const { data, isLoading, refetch } = useGetCustomersQuery();
  const [createCustomer, { isLoading: isCreating }] = useCreateCustomerMutation();
  const [updateCustomer, { isLoading: isUpdating }] = useUpdateCustomerMutation();
  const [deleteCustomer] = useDeleteCustomerMutation();

  const customers: Customer[] = data?.customers || [];

  // Toast feedback
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 4500);
  };

  // Excel-Style Per-Column Filters & Global Search
  const [globalSearch, setGlobalSearch] = useState('');

  // Excel Actions Dropdown & Bulk Import Modal State
  const [isExcelMenuOpen, setIsExcelMenuOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const excelMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (excelMenuRef.current && !excelMenuRef.current.contains(event.target as Node)) {
        setIsExcelMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Excel Column Filter states (null = no filter on that column)
  const [excelFilters, setExcelFilters] = useState<{
    customerCode: string[] | null;
    companyName: string[] | null;
    location: string[] | null;
    primaryContact: string[] | null;
    gstin: string[] | null;
    currency: string[] | null;
  }>({
    customerCode: null,
    companyName: null,
    location: null,
    primaryContact: null,
    gstin: null,
    currency: null
  });

  // Sorting
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Extract distinct values with counts for Excel-style filter popovers
  const distinctCodeValues = useMemo(() => {
    const map = new Map<string, number>();
    customers.forEach(c => {
      const val = c.customerCode || 'N/A';
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [customers]);

  const distinctCompanyValues = useMemo(() => {
    const map = new Map<string, number>();
    customers.forEach(c => {
      const val = c.companyName || 'Untitled';
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [customers]);

  const distinctLocationValues = useMemo(() => {
    const map = new Map<string, number>();
    customers.forEach(c => {
      const city = c.billingAddress?.city?.trim();
      const state = c.billingAddress?.state?.trim();
      let loc = '(Not Specified)';
      if (city && state) loc = `${city}, ${state}`;
      else if (city) loc = city;
      else if (state) loc = state;
      map.set(loc, (map.get(loc) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [customers]);

  const distinctContactValues = useMemo(() => {
    const map = new Map<string, number>();
    customers.forEach(c => {
      const val = c.primaryContact?.name?.trim() || '(No Contact)';
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [customers]);

  const distinctGstinValues = useMemo(() => {
    const map = new Map<string, number>();
    customers.forEach(c => {
      const val = c.gstin?.trim() || (c.pan?.trim() ? `PAN: ${c.pan.trim()}` : '(Unregistered)');
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [customers]);

  const distinctCurrencyValues = useMemo(() => {
    const map = new Map<string, number>();
    customers.forEach(c => {
      const curr = c.currency || 'INR';
      const terms = c.paymentTerms || (c.creditPeriodDays ? `${c.creditPeriodDays}d` : 'Immediate');
      const val = `${curr} • ${terms}`;
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [customers]);

  // Reset all filters
  const handleResetFilters = () => {
    setGlobalSearch('');
    setExcelFilters({
      customerCode: null,
      companyName: null,
      location: null,
      primaryContact: null,
      gstin: null,
      currency: null
    });
  };

  const isAnyFilterActive = useMemo(() => {
    return (
      globalSearch.trim() !== '' ||
      Object.values(excelFilters).some(val => val !== null)
    );
  }, [globalSearch, excelFilters]);

  // Filtered & Sorted Customer Data
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      // Global Search
      if (globalSearch.trim()) {
        const q = globalSearch.toLowerCase();
        const matchesGlobal =
          c.customerCode?.toLowerCase().includes(q) ||
          c.companyName?.toLowerCase().includes(q) ||
          c.gstin?.toLowerCase().includes(q) ||
          c.pan?.toLowerCase().includes(q) ||
          c.primaryContact?.name?.toLowerCase().includes(q) ||
          c.primaryContact?.email?.toLowerCase().includes(q) ||
          c.primaryContact?.mobile?.includes(q) ||
          c.billingAddress?.city?.toLowerCase().includes(q) ||
          c.billingAddress?.state?.toLowerCase().includes(q);

        if (!matchesGlobal) return false;
      }

      // Column Filters (Excel Style Checklist matching)
      if (excelFilters.customerCode !== null) {
        const val = c.customerCode || 'N/A';
        if (!excelFilters.customerCode.includes(val)) return false;
      }

      if (excelFilters.companyName !== null) {
        const val = c.companyName || 'Untitled';
        if (!excelFilters.companyName.includes(val)) return false;
      }

      if (excelFilters.location !== null) {
        const city = c.billingAddress?.city?.trim();
        const state = c.billingAddress?.state?.trim();
        let loc = '(Not Specified)';
        if (city && state) loc = `${city}, ${state}`;
        else if (city) loc = city;
        else if (state) loc = state;
        if (!excelFilters.location.includes(loc)) return false;
      }

      if (excelFilters.primaryContact !== null) {
        const val = c.primaryContact?.name?.trim() || '(No Contact)';
        if (!excelFilters.primaryContact.includes(val)) return false;
      }

      if (excelFilters.gstin !== null) {
        const val = c.gstin?.trim() || (c.pan?.trim() ? `PAN: ${c.pan.trim()}` : '(Unregistered)');
        if (!excelFilters.gstin.includes(val)) return false;
      }

      if (excelFilters.currency !== null) {
        const curr = c.currency || 'INR';
        const terms = c.paymentTerms || (c.creditPeriodDays ? `${c.creditPeriodDays}d` : 'Immediate');
        const val = `${curr} • ${terms}`;
        if (!excelFilters.currency.includes(val)) return false;
      }

      return true;
    }).sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'location') {
        valA = `${a.billingAddress?.city || ''} ${a.billingAddress?.state || ''}`.trim();
        valB = `${b.billingAddress?.city || ''} ${b.billingAddress?.state || ''}`.trim();
      } else if (sortField === 'primaryContact') {
        valA = a.primaryContact?.name || '';
        valB = b.primaryContact?.name || '';
      } else if (sortField === 'gstin') {
        valA = a.gstin || a.pan || '';
        valB = b.gstin || b.pan || '';
      } else if (sortField === 'currency') {
        valA = a.currency || '';
        valB = b.currency || '';
      }

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [customers, globalSearch, excelFilters, sortField, sortDirection]);

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedCustomerForPreview, setSelectedCustomerForPreview] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);

  // Form State - Streamlined Single Form
  const initialFormState = {
    customerCode: '',
    companyName: '',
    currency: 'INR' as Customer['currency'],
    paymentTerms: '30% Advance, 60% Against Proforma, 10% Post Commissioning',
    creditPeriodDays: 30,
    creditLimitINR: 1000000,

    billingAddress: {
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: 'Karnataka',
      stateCode: '29',
      pincode: '',
      country: 'India'
    },

    shippingAddress: {
      sameAsBilling: true,
      consigneeName: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: 'Karnataka',
      stateCode: '29',
      pincode: '',
      country: 'India'
    },

    primaryContact: {
      name: '',
      designation: 'Head of Purchase',
      department: 'Procurement',
      mobile: '',
      phone: '',
      email: ''
    },

    additionalContacts: [] as CustomerContactPerson[],

    gstin: '',
    pan: '',
    cin: '',
    tan: '',
    msmeRegistrationNo: '',

    bankDetails: {
      accountName: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      branchName: '',
      swiftCode: '',
      accountType: 'CURRENT' as 'CURRENT' | 'SAVINGS' | 'CASH_CREDIT' | 'OVERDRAFT'
    },

    notes: '',
    specialShippingInstructions: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingCustomerId(null);
    setFormData(initialFormState);
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomerId(customer._id);
    setFormData({
      customerCode: customer.customerCode || '',
      companyName: customer.companyName || '',
      currency: customer.currency || 'INR',
      paymentTerms: customer.paymentTerms || '30% Advance, 60% Against Proforma, 10% Post Commissioning',
      creditPeriodDays: customer.creditPeriodDays ?? 30,
      creditLimitINR: customer.creditLimitINR ?? 0,

      billingAddress: {
        addressLine1: customer.billingAddress?.addressLine1 || '',
        addressLine2: customer.billingAddress?.addressLine2 || '',
        city: customer.billingAddress?.city || '',
        state: customer.billingAddress?.state || 'Karnataka',
        stateCode: customer.billingAddress?.stateCode || '29',
        pincode: customer.billingAddress?.pincode || '',
        country: customer.billingAddress?.country || 'India'
      },

      shippingAddress: {
        sameAsBilling: customer.shippingAddress?.sameAsBilling ?? true,
        consigneeName: customer.shippingAddress?.consigneeName || '',
        addressLine1: customer.shippingAddress?.addressLine1 || '',
        addressLine2: customer.shippingAddress?.addressLine2 || '',
        city: customer.shippingAddress?.city || '',
        state: customer.shippingAddress?.state || 'Karnataka',
        stateCode: customer.shippingAddress?.stateCode || '29',
        pincode: customer.shippingAddress?.pincode || '',
        country: customer.shippingAddress?.country || 'India'
      },

      primaryContact: {
        name: customer.primaryContact?.name || '',
        designation: customer.primaryContact?.designation || '',
        department: customer.primaryContact?.department || '',
        mobile: customer.primaryContact?.mobile || '',
        phone: customer.primaryContact?.phone || '',
        email: customer.primaryContact?.email || ''
      },

      additionalContacts: customer.additionalContacts ? [...customer.additionalContacts] : [],

      gstin: customer.gstin || '',
      pan: customer.pan || '',
      cin: customer.cin || '',
      tan: customer.tan || '',
      msmeRegistrationNo: customer.msmeRegistrationNo || '',

      bankDetails: {
        accountName: customer.bankDetails?.accountName || '',
        bankName: customer.bankDetails?.bankName || '',
        accountNumber: customer.bankDetails?.accountNumber || '',
        ifscCode: customer.bankDetails?.ifscCode || '',
        branchName: customer.bankDetails?.branchName || '',
        swiftCode: customer.bankDetails?.swiftCode || '',
        accountType: customer.bankDetails?.accountType || 'CURRENT'
      },

      notes: customer.notes || '',
      specialShippingInstructions: customer.specialShippingInstructions || ''
    });
    setIsFormModalOpen(true);
  };

  // Open Preview Modal
  const handleOpenPreview = (customer: Customer) => {
    setSelectedCustomerForPreview(customer);
    setIsPreviewModalOpen(true);
  };

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`, 'info');
  };

  // Sync Billing to Shipping Address
  const handleSyncBillingToShipping = () => {
    setFormData(prev => ({
      ...prev,
      shippingAddress: {
        ...prev.shippingAddress,
        sameAsBilling: true,
        addressLine1: prev.billingAddress.addressLine1,
        addressLine2: prev.billingAddress.addressLine2,
        city: prev.billingAddress.city,
        state: prev.billingAddress.state,
        stateCode: prev.billingAddress.stateCode,
        pincode: prev.billingAddress.pincode,
        country: prev.billingAddress.country
      }
    }));
    showToast('Shipping address synced with billing address', 'info');
  };

  // Dynamic Contact Persons helpers
  const handleAddContact = () => {
    setFormData(prev => ({
      ...prev,
      additionalContacts: [
        ...prev.additionalContacts,
        { name: '', designation: '', department: '', mobile: '', email: '', isPrimary: false }
      ]
    }));
  };

  const handleRemoveContact = (index: number) => {
    setFormData(prev => ({
      ...prev,
      additionalContacts: prev.additionalContacts.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateContact = (index: number, field: keyof CustomerContactPerson, value: any) => {
    setFormData(prev => {
      const updated = [...prev.additionalContacts];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, additionalContacts: updated };
    });
  };

  // GSTIN change auto-extracts PAN & state code
  const handleGstinChange = (value: string) => {
    const val = value.toUpperCase().trim();
    let panExtracted = formData.pan;
    let stateCodeExtracted = formData.billingAddress.stateCode;

    if (val.length >= 2) {
      stateCodeExtracted = val.substring(0, 2);
    }
    if (val.length >= 12 && !formData.pan) {
      panExtracted = val.substring(2, 12);
    }

    setFormData(prev => ({
      ...prev,
      gstin: val,
      pan: panExtracted || prev.pan,
      billingAddress: {
        ...prev.billingAddress,
        stateCode: stateCodeExtracted || prev.billingAddress.stateCode
      }
    }));
  };

  // Save Customer (Create or Update)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.companyName.trim()) {
      showToast('Company Name is required', 'error');
      return;
    }
    if (!formData.billingAddress.addressLine1.trim() || !formData.billingAddress.city.trim() || !formData.billingAddress.pincode.trim()) {
      showToast('Complete Billing Address (Line 1, City, PIN) is required', 'error');
      return;
    }
    if (!formData.primaryContact.name.trim() || !formData.primaryContact.mobile.trim() || !formData.primaryContact.email.trim()) {
      showToast('Primary Contact Person (Name, Mobile, Email) is required', 'error');
      return;
    }

    try {
      if (editingCustomerId) {
        await updateCustomer({ id: editingCustomerId, ...formData }).unwrap();
        showToast(`Customer "${formData.companyName}" updated successfully!`, 'success');
      } else {
        await createCustomer(formData).unwrap();
        showToast(`Customer "${formData.companyName}" registered successfully!`, 'success');
      }
      setIsFormModalOpen(false);
      refetch();
    } catch (err: any) {
      showToast(err.data?.message || err.message || 'Failed to save customer', 'error');
    }
  };

  // Delete Customer Confirmation Trigger
  const handleDeleteCustomer = (customer: Customer) => {
    setCustomerToDelete(customer);
  };

  const handleConfirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setIsDeletingCustomer(true);

    try {
      await deleteCustomer(customerToDelete._id).unwrap();
      showToast(`Customer "${customerToDelete.companyName}" was deleted.`, 'info');
      setCustomerToDelete(null);
      refetch();
    } catch (err: any) {
      showToast(err.data?.message || err.message || "Couldn't delete customer right now. Please try again.", 'error');
    } finally {
      setIsDeletingCustomer(false);
    }
  };

  // Export to Excel / CSV
  const handleExportCsv = () => {
    if (filteredCustomers.length === 0) {
      showToast('No customer data to export.', 'info');
      return;
    }

    const headers = [
      'Customer Code',
      'Company Name',
      'Currency',
      'GSTIN',
      'PAN',
      'CIN',
      'TAN',
      'MSME Reg No',
      'Primary Contact Person',
      'Contact Designation',
      'Department',
      'Mobile',
      'Phone',
      'Email',
      'Billing Address Line 1',
      'Billing Address Line 2',
      'Billing City',
      'Billing State',
      'Billing PIN',
      'Country',
      'Shipping Consignee',
      'Shipping Address Line 1',
      'Shipping City',
      'Shipping State',
      'Shipping PIN',
      'Bank Name',
      'Account Number',
      'IFSC Code',
      'Branch Name',
      'Payment Terms',
      'Credit Days',
      'Credit Limit INR'
    ];

    const rows = filteredCustomers.map(c => [
      `"${c.customerCode || ''}"`,
      `"${(c.companyName || '').replace(/"/g, '""')}"`,
      `"${c.currency || 'INR'}"`,
      `"${c.gstin || ''}"`,
      `"${c.pan || ''}"`,
      `"${c.cin || ''}"`,
      `"${c.tan || ''}"`,
      `"${c.msmeRegistrationNo || ''}"`,
      `"${(c.primaryContact?.name || '').replace(/"/g, '""')}"`,
      `"${(c.primaryContact?.designation || '').replace(/"/g, '""')}"`,
      `"${(c.primaryContact?.department || '').replace(/"/g, '""')}"`,
      `"${c.primaryContact?.mobile || ''}"`,
      `"${c.primaryContact?.phone || ''}"`,
      `"${c.primaryContact?.email || ''}"`,
      `"${(c.billingAddress?.addressLine1 || '').replace(/"/g, '""')}"`,
      `"${(c.billingAddress?.addressLine2 || '').replace(/"/g, '""')}"`,
      `"${c.billingAddress?.city || ''}"`,
      `"${c.billingAddress?.state || ''}"`,
      `"${c.billingAddress?.pincode || ''}"`,
      `"${c.billingAddress?.country || 'India'}"`,
      `"${(c.shippingAddress?.consigneeName || '').replace(/"/g, '""')}"`,
      `"${(c.shippingAddress?.addressLine1 || '').replace(/"/g, '""')}"`,
      `"${c.shippingAddress?.city || ''}"`,
      `"${c.shippingAddress?.state || ''}"`,
      `"${c.shippingAddress?.pincode || ''}"`,
      `"${c.bankDetails?.bankName || ''}"`,
      `"${c.bankDetails?.accountNumber || ''}"`,
      `"${c.bankDetails?.ifscCode || ''}"`,
      `"${c.bankDetails?.branchName || ''}"`,
      `"${(c.paymentTerms || '').replace(/"/g, '""')}"`,
      c.creditPeriodDays ?? 30,
      c.creditLimitINR ?? 0
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MH_Customers_Master_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredCustomers.length} customers to CSV successfully!`, 'success');
  };

  // Download official CSV import template
  const handleDownloadSampleTemplate = () => {
    const csvContent =
      'Company Name,Primary Contact Person,Designation,Mobile,Email,Address Line 1,Address Line 2,City,State,PIN Code,Country,GSTIN,PAN,Bank Name,Account Number,IFSC Code,Currency,Payment Terms\n' +
      '"Bharat Heavy Electricals Ltd","K. S. Narayanan","Head of Sourcing","+91 9845012345","narayanan.ks@bhel.in","BHEL Industrial Complex, Piplani","Works Gate No. 3","Bhopal","Madhya Pradesh","462022","India","23AAACB1234A1Z5","AAACB1234A","State Bank of India","10982390192","SBIN0040182","INR","30% Advance, 60% Against Proforma, 10% Post Commissioning"\n' +
      '"Schneider Electric India Pvt Ltd","Deepak Verma","Senior Procurement Lead","+91 9876543210","deepak.verma@se.com","Plot 88A, Attibele Industrial Area","Near Toll Gate","Bengaluru","Karnataka","562107","India","29AAACS5678B1Z2","AAACS5678B","HDFC Bank","50200012345678","HDFC0001234","INR","Net 30 Days"\n' +
      '"Voltamp Transformers Limited","Alok Mehta","GM Procurement","+91 9825011223","alok.mehta@voltamptransformers.com","Makarpura Industrial Estate","Near GIDC Office","Vadodara","Gujarat","390014","India","24AAACV1234C1Z9","AAACV1234C","ICICI Bank","001205001928","ICIC0000012","INR","30% Advance, 70% Before Dispatch"\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'MH_Customer_Bulk_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Customer import template downloaded successfully!', 'success');
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
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

      {/* Unified In-Line Action Toolbar (Search Bar, Excel Actions, Filters, Reset, Add Customer) */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        {/* Left: Global In-Line Search Bar */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers by company name, code, contact person, phone, email, GSTIN, city..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium"
          />
          {globalSearch && (
            <button
              onClick={() => setGlobalSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: In-Line Actions (Excel Actions Dropdown, Filter Toggle, Reset, Add Customer) */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          {/* Excel Actions Dropdown Menu */}
          <div className="relative" ref={excelMenuRef}>
            <button
              type="button"
              onClick={() => setIsExcelMenuOpen(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer shadow-2xs"
              title="Excel Export, Import & Template Actions"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel Actions</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isExcelMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsExcelMenuOpen(false);
                    handleExportCsv();
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-orange-600 flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-400" />
                  <span>Export Customers (CSV)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsExcelMenuOpen(false);
                    setIsBulkImportOpen(true);
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
                    setIsExcelMenuOpen(false);
                    handleDownloadSampleTemplate();
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-orange-600 flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-orange-500" />
                  <span>Download Sample Template</span>
                </button>
              </div>
            )}
          </div>

          {/* Reset Filters */}
          {isAnyFilterActive && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-colors cursor-pointer"
              title="Clear all active filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}

          {/* Add New Customer Primary CTA */}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Modern Industrial Table with Exact Excel-Style Column Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-xs text-slate-700 min-w-[950px]">
            {/* Header Row with Exact Excel-Style Column Filters */}
            <thead className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3.5 w-36">
                  <ExcelColumnFilter
                    title="Code"
                    columnKey="customerCode"
                    distinctValues={distinctCodeValues}
                    selectedValues={excelFilters.customerCode}
                    onFilterChange={(selected) => setExcelFilters(p => ({ ...p, customerCode: selected }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={(field, dir) => {
                      setSortField(field);
                      setSortDirection(dir);
                    }}
                  />
                </th>
                <th className="py-2.5 px-3.5">
                  <ExcelColumnFilter
                    title="Company / Customer Name"
                    columnKey="companyName"
                    distinctValues={distinctCompanyValues}
                    selectedValues={excelFilters.companyName}
                    onFilterChange={(selected) => setExcelFilters(p => ({ ...p, companyName: selected }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={(field, dir) => {
                      setSortField(field);
                      setSortDirection(dir);
                    }}
                  />
                </th>
                <th className="py-2.5 px-3.5">
                  <ExcelColumnFilter
                    title="Location"
                    columnKey="location"
                    distinctValues={distinctLocationValues}
                    selectedValues={excelFilters.location}
                    onFilterChange={(selected) => setExcelFilters(p => ({ ...p, location: selected }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={(field, dir) => {
                      setSortField(field);
                      setSortDirection(dir);
                    }}
                  />
                </th>
                <th className="py-2.5 px-3.5">
                  <ExcelColumnFilter
                    title="Primary Contact"
                    columnKey="primaryContact"
                    distinctValues={distinctContactValues}
                    selectedValues={excelFilters.primaryContact}
                    onFilterChange={(selected) => setExcelFilters(p => ({ ...p, primaryContact: selected }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={(field, dir) => {
                      setSortField(field);
                      setSortDirection(dir);
                    }}
                  />
                </th>
                <th className="py-2.5 px-3.5">
                  <ExcelColumnFilter
                    title="GSTIN / PAN"
                    columnKey="gstin"
                    distinctValues={distinctGstinValues}
                    selectedValues={excelFilters.gstin}
                    onFilterChange={(selected) => setExcelFilters(p => ({ ...p, gstin: selected }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={(field, dir) => {
                      setSortField(field);
                      setSortDirection(dir);
                    }}
                  />
                </th>
                <th className="py-2.5 px-3.5">
                  <ExcelColumnFilter
                    title="Currency & Terms"
                    columnKey="currency"
                    distinctValues={distinctCurrencyValues}
                    selectedValues={excelFilters.currency}
                    onFilterChange={(selected) => setExcelFilters(p => ({ ...p, currency: selected }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={(field, dir) => {
                      setSortField(field);
                      setSortDirection(dir);
                    }}
                  />
                </th>
                <th className="py-2.5 px-3.5 text-right w-28 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-orange-500 mb-2" />
                    <span>Loading customers directory...</span>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-800 font-bold text-sm">No customers found</p>
                    <p className="text-slate-500 text-xs mt-1">
                      {isAnyFilterActive
                        ? 'Try clearing your active filters or global search query.'
                        : 'Start by adding your first enterprise customer to the directory.'}
                    </p>
                    {isAnyFilterActive ? (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-3 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 transition-colors cursor-pointer"
                      >
                        Reset All Filters
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleOpenAdd}
                        className="mt-3 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors cursor-pointer"
                      >
                        + Register First Customer
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(customer => {
                  return (
                    <tr
                      key={customer._id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Code */}
                      <td className="py-3 px-3.5">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 text-[11px]">
                          {customer.customerCode}
                        </span>
                      </td>

                      {/* Company Name */}
                      <td className="py-3 px-3.5">
                        <button
                          type="button"
                          onClick={() => handleOpenPreview(customer)}
                          className="font-bold text-slate-900 hover:text-orange-600 text-left transition-colors cursor-pointer"
                        >
                          {customer.companyName}
                        </button>
                      </td>

                      {/* Location */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <div className="flex flex-col text-xs">
                            <span className="font-semibold text-slate-800">
                              {customer.billingAddress?.city || '—'}, {customer.billingAddress?.state || '—'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              PIN: {customer.billingAddress?.pincode || '—'} • {customer.billingAddress?.country || 'India'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Primary Contact Person */}
                      <td className="py-3 px-3.5">
                        <div className="flex flex-col text-xs">
                          <span className="font-semibold text-slate-900">
                            {customer.primaryContact?.name || '—'}
                          </span>
                          {customer.primaryContact?.designation && (
                            <span className="text-[10px] text-slate-500">
                              {customer.primaryContact.designation}
                            </span>
                          )}
                          <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                            {customer.primaryContact?.mobile && (
                              <a
                                href={`tel:${customer.primaryContact.mobile}`}
                                className="text-slate-600 hover:text-orange-600 inline-flex items-center gap-0.5"
                                title="Call Mobile"
                              >
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{customer.primaryContact.mobile}</span>
                              </a>
                            )}
                            {customer.primaryContact?.email && (
                              <a
                                href={`mailto:${customer.primaryContact.email}`}
                                className="text-slate-400 hover:text-orange-600"
                                title="Send Email"
                              >
                                <Mail className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* GSTIN / PAN */}
                      <td className="py-3 px-3.5">
                        {customer.gstin ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                              {customer.gstin}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(customer.gstin || '', 'GSTIN')}
                              className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
                              title="Copy GSTIN"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Unregistered / SEZ</span>
                        )}
                        {customer.pan && (
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            PAN: {customer.pan}
                          </span>
                        )}
                      </td>

                      {/* Currency & Terms */}
                      <td className="py-3 px-3.5">
                        <div className="flex flex-col text-xs">
                          <span className="font-bold text-slate-900">
                            {customer.currency || 'INR'}
                            {customer.creditPeriodDays ? ` • ${customer.creditPeriodDays}d Credit` : ''}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate max-w-[180px]" title={customer.paymentTerms}>
                            {customer.paymentTerms || 'Standard Terms'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(customer)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer"
                            title="View Complete Profile Dossier"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(customer)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Edit Customer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomer(customer)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete Customer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

        {/* Footer Summary Bar */}
        <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>
              Total Directory: <strong className="text-slate-900">{customers.length}</strong>
            </span>
            <span>•</span>
            <span>
              Filtered: <strong className="text-orange-600">{filteredCustomers.length}</strong>
            </span>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            Machine House Technologies • Customer Master Directory
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ADD / EDIT CUSTOMER MODAL (STANDARDIZED DESKTOP WIDTH: max-w-6xl xl:max-w-7xl) */}
      {/* ========================================================================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-6xl xl:max-w-7xl my-6 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingCustomerId ? 'Edit Customer Dossier' : 'Register New Enterprise Customer'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Complete statutory address, contacts, bank details, and commercial terms
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body - Single Continuous Form */}
            <form onSubmit={handleSubmitForm} className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
              {/* 1. Basic Company Identification */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <Building2 className="w-4 h-4 text-orange-500" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Company Information
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Customer Code <span className="text-slate-400 font-normal">(Auto if blank)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CUST-1001"
                      value={formData.customerCode}
                      onChange={(e) => setFormData(p => ({ ...p, customerCode: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold uppercase focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Company Legal Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bharat Heavy Electricals Ltd / ABB India Ltd"
                      required
                      value={formData.companyName}
                      onChange={(e) => setFormData(p => ({ ...p, companyName: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Complete Address Details (Billing & Shipping) */}
              <div className="space-y-4">
                {/* Billing Address */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                    <MapPin className="w-4 h-4 text-orange-500" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Official Billing / Registered Office Address
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Address Line 1 (Plot, Building, Street) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Plot No. 24, Phase 2, Peenya Industrial Area"
                        required
                        value={formData.billingAddress.addressLine1}
                        onChange={(e) => setFormData(p => ({
                          ...p,
                          billingAddress: { ...p.billingAddress, addressLine1: e.target.value }
                        }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Address Line 2 (Area / Landmark)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Near 4th Cross, Opp Substation"
                        value={formData.billingAddress.addressLine2}
                        onChange={(e) => setFormData(p => ({
                          ...p,
                          billingAddress: { ...p.billingAddress, addressLine2: e.target.value }
                        }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Bengaluru"
                        required
                        value={formData.billingAddress.city}
                        onChange={(e) => setFormData(p => ({
                          ...p,
                          billingAddress: { ...p.billingAddress, city: e.target.value }
                        }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        State <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        list="indian-states-list"
                        placeholder="e.g. Karnataka"
                        required
                        value={formData.billingAddress.state}
                        onChange={(e) => setFormData(p => ({
                          ...p,
                          billingAddress: { ...p.billingAddress, state: e.target.value }
                        }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                      />
                      <datalist id="indian-states-list">
                        {INDIAN_STATES.map(s => <option key={s} value={s} />)}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        PIN / Postal Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 560058"
                        required
                        value={formData.billingAddress.pincode}
                        onChange={(e) => setFormData(p => ({
                          ...p,
                          billingAddress: { ...p.billingAddress, pincode: e.target.value }
                        }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Consignee / Plant Delivery Shipping Address
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={handleSyncBillingToShipping}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy From Billing Address</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Consignee Plant / Unit Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Plant Unit 3 / Works Receiving Stores"
                        value={formData.shippingAddress.consigneeName}
                        onChange={(e) => setFormData(p => ({
                          ...p,
                          shippingAddress: { ...p.shippingAddress, consigneeName: e.target.value }
                        }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Delivery Address Line 1
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Works Gate No. 2, Industrial Area"
                        value={formData.shippingAddress.addressLine1}
                        onChange={(e) => setFormData(p => ({
                          ...p,
                          shippingAddress: { ...p.shippingAddress, addressLine1: e.target.value, sameAsBilling: false }
                        }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Address Line 2 (Landmark / Gate)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Near Inward Stores Bay"
                        value={formData.shippingAddress.addressLine2}
                        onChange={(e) => setFormData(p => ({
                          ...p,
                          shippingAddress: { ...p.shippingAddress, addressLine2: e.target.value, sameAsBilling: false }
                        }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Delivery City
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Vadodara"
                        value={formData.shippingAddress.city}
                        onChange={(e) => setFormData(p => ({
                          ...p,
                          shippingAddress: { ...p.shippingAddress, city: e.target.value, sameAsBilling: false }
                        }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Delivery State
                      </label>
                      <input
                        type="text"
                        list="indian-states-list"
                        placeholder="e.g. Gujarat"
                        value={formData.shippingAddress.state}
                        onChange={(e) => setFormData(p => ({
                          ...p,
                          shippingAddress: { ...p.shippingAddress, state: e.target.value, sameAsBilling: false }
                        }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Delivery PIN Code
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 390014"
                        value={formData.shippingAddress.pincode}
                        onChange={(e) => setFormData(p => ({
                          ...p,
                          shippingAddress: { ...p.shippingAddress, pincode: e.target.value, sameAsBilling: false }
                        }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Contact Details */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <Users className="w-4 h-4 text-orange-500" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Key Contact Persons
                  </h4>
                </div>

                {/* Primary Contact */}
                <div className="p-3.5 rounded-xl border border-orange-200 bg-orange-50/20 space-y-3">
                  <span className="text-xs font-bold text-slate-800 block">
                    Primary Key Purchase Contact <span className="text-red-500">*</span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Rajesh Sharma"
                        required
                        value={formData.primaryContact.name}
                        onChange={(e) => setFormData(p => ({
                          ...p,
                          primaryContact: { ...p.primaryContact, name: e.target.value }
                        }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Designation
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sourcing Head / GM"
                        value={formData.primaryContact.designation}
                        onChange={(e) => setFormData(p => ({
                          ...p,
                          primaryContact: { ...p.primaryContact, designation: e.target.value }
                        }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Department
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Machine Procurement"
                        value={formData.primaryContact.department}
                        onChange={(e) => setFormData(p => ({
                          ...p,
                          primaryContact: { ...p.primaryContact, department: e.target.value }
                        }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. +91 98450 12345"
                        required
                        value={formData.primaryContact.mobile}
                        onChange={(e) => setFormData(p => ({
                          ...p,
                          primaryContact: { ...p.primaryContact, mobile: e.target.value }
                        }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Office Direct Phone
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. +91 80 2839 0000"
                        value={formData.primaryContact.phone}
                        onChange={(e) => setFormData(p => ({
                          ...p,
                          primaryContact: { ...p.primaryContact, phone: e.target.value }
                        }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Official Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        placeholder="e.g. rajesh.sharma@abb.com"
                        required
                        value={formData.primaryContact.email}
                        onChange={(e) => setFormData(p => ({
                          ...p,
                          primaryContact: { ...p.primaryContact, email: e.target.value }
                        }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Contacts */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Additional Contacts (Accounts, Quality, Receiving)
                    </span>
                    <button
                      type="button"
                      onClick={handleAddContact}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Another Contact</span>
                    </button>
                  </div>

                  {formData.additionalContacts.map((contact, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-end"
                    >
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Name</label>
                        <input
                          type="text"
                          placeholder="Contact Name"
                          value={contact.name}
                          onChange={(e) => handleUpdateContact(idx, 'name', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Designation</label>
                        <input
                          type="text"
                          placeholder="e.g. Accounts Lead"
                          value={contact.designation}
                          onChange={(e) => handleUpdateContact(idx, 'designation', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Mobile</label>
                        <input
                          type="tel"
                          placeholder="+91..."
                          value={contact.mobile}
                          onChange={(e) => handleUpdateContact(idx, 'mobile', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Email</label>
                        <input
                          type="email"
                          placeholder="email@domain.com"
                          value={contact.email}
                          onChange={(e) => handleUpdateContact(idx, 'email', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>

                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveContact(idx)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove Contact"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. GST, Statutory & Bank Details */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <ShieldCheck className="w-4 h-4 text-orange-500" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Statutory, GST & Bank Details
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      GSTIN No. <span className="text-slate-400">(15 Chars)</span>
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      placeholder="e.g. 29AAACM1234F1Z5"
                      value={formData.gstin}
                      onChange={(e) => handleGstinChange(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      PAN Number <span className="text-slate-400">(10 Chars)</span>
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="e.g. AAACM1234F"
                      value={formData.pan}
                      onChange={(e) => setFormData(p => ({ ...p, pan: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Corporate CIN No.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. L32202KA1949PLC032923"
                      value={formData.cin}
                      onChange={(e) => setFormData(p => ({ ...p, cin: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      TAN (Tax Deduction Acc)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BLRR01234F"
                      value={formData.tan}
                      onChange={(e) => setFormData(p => ({ ...p, tan: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      MSME / Udyam Reg. No.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. UDYAM-KR-03-0012345"
                      value={formData.msmeRegistrationNo}
                      onChange={(e) => setFormData(p => ({ ...p, msmeRegistrationNo: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                </div>

                {/* Bank fields */}
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-xs font-bold text-slate-800 block mb-2">
                    Bank Account Reconciliation Details
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Beneficiary Account Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Bharat Heavy Electricals Ltd"
                        value={formData.bankDetails.accountName}
                        onChange={(e) => setFormData(p => ({
                          ...p,
                          bankDetails: { ...p.bankDetails, accountName: e.target.value }
                        }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. State Bank of India / HDFC Bank"
                        value={formData.bankDetails.bankName}
                        onChange={(e) => setFormData(p => ({
                          ...p,
                          bankDetails: { ...p.bankDetails, bankName: e.target.value }
                        }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Account Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 000201019283"
                        value={formData.bankDetails.accountNumber}
                        onChange={(e) => setFormData(p => ({
                          ...p,
                          bankDetails: { ...p.bankDetails, accountNumber: e.target.value }
                        }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. SBIN0040182"
                        value={formData.bankDetails.ifscCode}
                        onChange={(e) => setFormData(p => ({
                          ...p,
                          bankDetails: { ...p.bankDetails, ifscCode: e.target.value.toUpperCase() }
                        }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Branch Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Peenya Industrial Branch"
                        value={formData.bankDetails.branchName}
                        onChange={(e) => setFormData(p => ({
                          ...p,
                          bankDetails: { ...p.bankDetails, branchName: e.target.value }
                        }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Swift / BIC Code
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. SBININBB482"
                        value={formData.bankDetails.swiftCode}
                        onChange={(e) => setFormData(p => ({
                          ...p,
                          bankDetails: { ...p.bankDetails, swiftCode: e.target.value.toUpperCase() }
                        }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Commercial Terms & Notes */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <FileText className="w-4 h-4 text-orange-500" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Commercial Terms & Relationship Notes
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Billing Currency
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData(p => ({ ...p, currency: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <option value="INR">INR (₹ - Indian Rupee)</option>
                      <option value="USD">USD ($ - US Dollar)</option>
                      <option value="EUR">EUR (€ - Euro)</option>
                      <option value="GBP">GBP (£ - British Pound)</option>
                      <option value="JPY">JPY (¥ - Japanese Yen)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Credit Period (Days)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.creditPeriodDays}
                      onChange={(e) => setFormData(p => ({ ...p, creditPeriodDays: parseInt(e.target.value, 10) || 0 }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Credit Limit (₹ Amount)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.creditLimitINR}
                      onChange={(e) => setFormData(p => ({ ...p, creditLimitINR: parseInt(e.target.value, 10) || 0 }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Standard Payment Terms
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. 30% Advance with PO, 60% Against Proforma Invoice before dispatch, 10% on successful site commissioning."
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData(p => ({ ...p, paymentTerms: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Special Packaging & Shipping Instructions
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Export seaworthy wooden pallet packing with moisture barrier foil."
                      value={formData.specialShippingInstructions}
                      onChange={(e) => setFormData(p => ({ ...p, specialShippingInstructions: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Internal Relationship Remarks
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Regular client since 2022, annual winding machine maintenance order."
                      value={formData.notes}
                      onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  <span className="text-red-500">*</span> Required identification fields
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFormModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isCreating || isUpdating}
                    className="flex items-center justify-center gap-1.5 px-5 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {(isCreating || isUpdating) ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Customer...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{editingCustomerId ? 'Update Customer Record' : 'Save Customer Record'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CUSTOMER PREVIEW DOSSIER MODAL (STANDARDIZED DESKTOP WIDTH: max-w-6xl xl:max-w-7xl) */}
      {/* ========================================================================= */}
      {isPreviewModalOpen && selectedCustomerForPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-6xl xl:max-w-7xl my-6 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0 font-bold text-lg">
                  {selectedCustomerForPreview.customerCode?.substring(0, 4)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      {selectedCustomerForPreview.companyName}
                    </h3>
                    <span className="font-mono text-xs font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md">
                      {selectedCustomerForPreview.customerCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Currency: <strong className="text-slate-700">{selectedCustomerForPreview.currency || 'INR'}</strong>
                    {selectedCustomerForPreview.creditPeriodDays ? ` • ${selectedCustomerForPreview.creditPeriodDays} Days Credit` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPreviewModalOpen(false);
                    handleOpenEdit(selectedCustomerForPreview);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5 text-slate-500" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Dossier Content */}
            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5 text-xs text-slate-700">
              {/* Addresses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Billing */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-orange-500" />
                      Billing Address
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(
                        `${selectedCustomerForPreview.billingAddress?.addressLine1}, ${selectedCustomerForPreview.billingAddress?.city}, ${selectedCustomerForPreview.billingAddress?.state} - ${selectedCustomerForPreview.billingAddress?.pincode}`,
                        'Billing Address'
                      )}
                      className="text-slate-400 hover:text-slate-700 text-[10px] flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>

                  <p className="font-semibold text-slate-900">
                    {selectedCustomerForPreview.companyName}
                  </p>
                  <p className="text-slate-600">
                    {selectedCustomerForPreview.billingAddress?.addressLine1}
                    {selectedCustomerForPreview.billingAddress?.addressLine2 ? `, ${selectedCustomerForPreview.billingAddress.addressLine2}` : ''}
                  </p>
                  <p className="text-slate-700 font-medium">
                    {selectedCustomerForPreview.billingAddress?.city}, {selectedCustomerForPreview.billingAddress?.state} - {selectedCustomerForPreview.billingAddress?.pincode}
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Country: {selectedCustomerForPreview.billingAddress?.country || 'India'}
                  </p>
                </div>

                {/* Shipping */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      Consignee / Plant Delivery Address
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(
                        `${selectedCustomerForPreview.shippingAddress?.addressLine1 || selectedCustomerForPreview.billingAddress?.addressLine1}, ${selectedCustomerForPreview.shippingAddress?.city || selectedCustomerForPreview.billingAddress?.city}, ${selectedCustomerForPreview.shippingAddress?.state || selectedCustomerForPreview.billingAddress?.state} - ${selectedCustomerForPreview.shippingAddress?.pincode || selectedCustomerForPreview.billingAddress?.pincode}`,
                        'Shipping Address'
                      )}
                      className="text-slate-400 hover:text-slate-700 text-[10px] flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>

                  <p className="font-semibold text-slate-900">
                    {selectedCustomerForPreview.shippingAddress?.consigneeName || selectedCustomerForPreview.companyName}
                  </p>
                  <p className="text-slate-600">
                    {selectedCustomerForPreview.shippingAddress?.addressLine1 || selectedCustomerForPreview.billingAddress?.addressLine1}
                    {selectedCustomerForPreview.shippingAddress?.addressLine2 ? `, ${selectedCustomerForPreview.shippingAddress.addressLine2}` : ''}
                  </p>
                  <p className="text-slate-700 font-medium">
                    {selectedCustomerForPreview.shippingAddress?.city || selectedCustomerForPreview.billingAddress?.city}, {selectedCustomerForPreview.shippingAddress?.state || selectedCustomerForPreview.billingAddress?.state} - {selectedCustomerForPreview.shippingAddress?.pincode || selectedCustomerForPreview.billingAddress?.pincode}
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Country: {selectedCustomerForPreview.shippingAddress?.country || 'India'}
                  </p>
                </div>
              </div>

              {/* Contacts & Tax Compliance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contacts */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5 pb-1.5 border-b border-slate-100">
                    <Users className="w-3.5 h-3.5 text-orange-500" />
                    Key Contact Persons
                  </span>

                  <div className="p-2.5 rounded-lg bg-orange-50/30 border border-orange-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{selectedCustomerForPreview.primaryContact?.name}</span>
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-100/60 px-1.5 py-0.2 rounded">
                        PRIMARY
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      {selectedCustomerForPreview.primaryContact?.designation || 'Purchase Contact'} • {selectedCustomerForPreview.primaryContact?.department || 'Procurement'}
                    </p>
                    <div className="flex items-center gap-3 pt-1 text-slate-700">
                      <a
                        href={`tel:${selectedCustomerForPreview.primaryContact?.mobile}`}
                        className="inline-flex items-center gap-1 hover:text-orange-600"
                      >
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{selectedCustomerForPreview.primaryContact?.mobile}</span>
                      </a>
                      <a
                        href={`mailto:${selectedCustomerForPreview.primaryContact?.email}`}
                        className="inline-flex items-center gap-1 hover:text-orange-600"
                      >
                        <Mail className="w-3 h-3" />
                        <span>{selectedCustomerForPreview.primaryContact?.email}</span>
                      </a>
                    </div>
                  </div>

                  {selectedCustomerForPreview.additionalContacts && selectedCustomerForPreview.additionalContacts.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Additional Team Contacts
                      </span>
                      {selectedCustomerForPreview.additionalContacts.map((c, i) => (
                        <div key={i} className="text-xs p-2 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="font-semibold text-slate-800">{c.name}</span>
                          {c.designation && <span className="text-slate-500 text-[11px]"> • {c.designation}</span>}
                          <div className="flex items-center gap-3 text-[11px] text-slate-600 mt-0.5">
                            {c.mobile && <span>Ph: {c.mobile}</span>}
                            {c.email && <span>Email: {c.email}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tax & Bank */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5 pb-1.5 border-b border-slate-100">
                    <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
                    Statutory, Tax & Bank Details
                  </span>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">GSTIN</span>
                      <span className="font-mono font-bold text-slate-900">{selectedCustomerForPreview.gstin || 'Unregistered'}</span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">PAN</span>
                      <span className="font-mono font-bold text-slate-900">{selectedCustomerForPreview.pan || '—'}</span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Bank Name</span>
                      <span className="font-semibold text-slate-900">{selectedCustomerForPreview.bankDetails?.bankName || '—'}</span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">IFSC Code</span>
                      <span className="font-mono font-bold text-slate-900">{selectedCustomerForPreview.bankDetails?.ifscCode || '—'}</span>
                    </div>

                    <div className="col-span-2 p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Bank Account Number</span>
                        <span className="font-mono font-bold text-slate-900">{selectedCustomerForPreview.bankDetails?.accountNumber || '—'}</span>
                      </div>
                      {selectedCustomerForPreview.bankDetails?.accountNumber && (
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedCustomerForPreview.bankDetails?.accountNumber || '', 'Account Number')}
                          className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                          title="Copy Account Number"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Commercial Terms */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-orange-500" />
                  Commercial Agreement & Payment Terms
                </span>
                <p className="text-slate-700">
                  {selectedCustomerForPreview.paymentTerms || 'Standard machine order payment terms.'}
                </p>
                <div className="flex items-center gap-4 text-xs pt-1 text-slate-600">
                  <span>Credit Period: <strong className="text-slate-900">{selectedCustomerForPreview.creditPeriodDays ?? 30} Days</strong></span>
                  <span>Credit Limit: <strong className="text-slate-900 font-mono">₹{selectedCustomerForPreview.creditLimitINR?.toLocaleString('en-IN') || '0'}</strong></span>
                  <span>Currency: <strong className="text-slate-900">{selectedCustomerForPreview.currency || 'INR'}</strong></span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      <CustomerBulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={() => {
          setIsBulkImportOpen(false);
          refetch();
          showToast('Customer directory refreshed after bulk import!', 'success');
        }}
      />

      {/* Delete Customer Friendly Confirmation Modal */}
      <ConfirmModal
        isOpen={!!customerToDelete}
        onClose={() => setCustomerToDelete(null)}
        onConfirm={handleConfirmDeleteCustomer}
        title="Delete Customer Record?"
        message={`Are you sure you want to delete "${customerToDelete?.companyName}" (${customerToDelete?.customerCode})? Once removed, you won't be able to recover this record.`}
        confirmText="Yes, delete customer"
        cancelText="Keep it"
        variant="danger"
        isLoading={isDeletingCustomer}
      />
    </div>
  );
}
